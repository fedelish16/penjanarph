import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AlertCircle, Cloud, Loader2, LogOut } from 'lucide-react';
import { DailyAutomationView } from './components/DailyAutomationView';
import { DocumentSetupView } from './components/DocumentSetupView';
import { PedagogyGuideModal } from './components/PedagogyGuideModal';
import { RphDocumentPreview } from './components/RphDocumentPreview';
import { RphInputForm } from './components/RphInputForm';
import { SavedDraftsDrawer } from './components/SavedDraftsDrawer';
import { TeacherAuthGate } from './components/TeacherAuthGate';
import { RPT_PRESETS } from './data/presets';
import { auth } from './firebase';
import {
  clearAllDailyDrafts,
  createEmptyClientWorkspace,
  deleteSavedDraftFromCloud,
  ensureTeacherProfile,
  saveDraftToCloudArchive,
  saveWorkspaceToCloud,
  subscribeDailyDrafts,
  subscribeSavedDrafts,
  subscribeWorkspace,
  upsertDailyDraft,
} from './services/firestoreWorkspace';
import type {
  DailyAutoDraft,
  DocumentKind,
  DskpSyllabusContext,
  RphDraftOutput,
  RphRequestInput,
  RptEntry,
  SavedRphEntry,
  TeacherWorkspaceState,
  TimetableSlot,
} from './types/rph';

type WorkspaceMode = 'automasi' | 'dokumen' | 'manual';

interface ParsedDocumentResponse {
  parsed?: {
    kind: DocumentKind;
    summary: string;
    timetable?: TimetableSlot[];
    rptEntries?: RptEntry[];
    syllabus?: DskpSyllabusContext;
  };
  fileName?: string;
  uploadedAt?: string;
  error?: string;
}

function getInitialSchoolDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 6) {
    now.setDate(now.getDate() + 2);
  } else if (day === 0) {
    now.setDate(now.getDate() + 1);
  }
  return now.toISOString().slice(0, 10);
}

function createCleanArchiveId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);

  const [mode, setMode] = useState<WorkspaceMode>('automasi');
  const [workspaceCore, setWorkspaceCore] = useState<
    Omit<TeacherWorkspaceState, 'dailyDrafts'>
  >(() => createEmptyClientWorkspace());
  const [dailyDrafts, setDailyDrafts] = useState<Record<string, DailyAutoDraft>>(
    {}
  );
  const [selectedDate, setSelectedDate] = useState<string>(getInitialSchoolDate);
  const [uploadingKind, setUploadingKind] = useState<DocumentKind | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState<boolean>(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // Manual mode state
  const [input, setInput] = useState<RphRequestInput>(() =>
    JSON.parse(JSON.stringify(RPT_PRESETS[0].data))
  );
  const [draft, setDraft] = useState<RphDraftOutput | null>(null);
  const [teacherReflection, setTeacherReflection] = useState<string>('');
  const [isGeneratingManual, setIsGeneratingManual] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [savedEntries, setSavedEntries] = useState<SavedRphEntry[]>([]);

  const rptSectionRef = useRef<HTMLDivElement | null>(null);

  const workspace: TeacherWorkspaceState = useMemo(
    () => ({
      ...workspaceCore,
      dailyDrafts,
    }),
    [workspaceCore, dailyDrafts]
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        setAuthError(null);
        if (!nextUser) {
          setWorkspaceCore(createEmptyClientWorkspace());
          setDailyDrafts({});
          setSavedEntries([]);
          setCloudError(null);
          setCloudLoading(false);
        }
      },
      (err) => {
        setAuthReady(true);
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Ralat pengesahan sesi log masuk.'
        );
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Cloud Firestore data for the signed-in teacher
  useEffect(() => {
    if (!user) return;

    let active = true;
    setCloudLoading(true);
    setCloudError(null);

    void ensureTeacherProfile(user).catch((err: unknown) => {
      if (active) {
        setCloudError(
          err instanceof Error
            ? err.message
            : 'Gagal menyegerakkan profil guru ke awan.'
        );
      }
    });

    const unsubWs = subscribeWorkspace(
      user.uid,
      (wsData) => {
        if (!active) return;
        if (wsData) {
          setWorkspaceCore(wsData);
        } else {
          const initial = createEmptyClientWorkspace();
          if (!initial.automation.schoolFormat?.namaGuru && user.displayName) {
            initial.automation.schoolFormat = {
              namaSekolah: '',
              namaGuru: user.displayName,
              tajukRph: 'Rancangan Pengajaran Harian (RPH)',
              sertakanTandatanganPk: true,
            };
          }
          setWorkspaceCore(initial);
        }
        setCloudLoading(false);
      },
      (err) => {
        if (active) {
          setCloudLoading(false);
          setCloudError(
            `Ralat segerak ruang kerja awan: ${err.message}`
          );
        }
      }
    );

    const unsubDrafts = subscribeDailyDrafts(
      user.uid,
      (draftsMap) => {
        if (active) {
          setDailyDrafts(draftsMap);
        }
      },
      (err) => {
        if (active) {
          setCloudError(`Ralat segerak draf harian awan: ${err.message}`);
        }
      }
    );

    const unsubSaved = subscribeSavedDrafts(
      user.uid,
      (entries) => {
        if (active) {
          setSavedEntries(entries);
        }
      },
      (err) => {
        if (active) {
          setCloudError(`Ralat segerak arkib draf awan: ${err.message}`);
        }
      }
    );

    return () => {
      active = false;
      unsubWs();
      unsubDrafts();
      unsubSaved();
    };
  }, [user]);

  const handleWorkspaceUpdate = useCallback(
    async (next: TeacherWorkspaceState) => {
      const { dailyDrafts: nextDailyDrafts, ...core } = next;
      setWorkspaceCore(core);
      if (nextDailyDrafts && nextDailyDrafts !== dailyDrafts) {
        setDailyDrafts(nextDailyDrafts);
      }
      if (!user) return;
      try {
        setCloudError(null);
        await saveWorkspaceToCloud(user.uid, next);
      } catch (err: unknown) {
        setCloudError(
          err instanceof Error
            ? `Gagal menyimpan ruang kerja ke awan: ${err.message}`
            : 'Gagal menyimpan ruang kerja ke awan.'
        );
      }
    },
    [user, dailyDrafts]
  );

  const handleDailyDraftUpdate = useCallback(
    async (entry: DailyAutoDraft) => {
      setDailyDrafts((prev) => ({
        ...prev,
        [entry.id]: entry,
      }));
      if (!user) return;
      try {
        setCloudError(null);
        await upsertDailyDraft(user.uid, entry);
      } catch (err: unknown) {
        setCloudError(
          err instanceof Error
            ? `Gagal menyimpan kemas kini RPH ke awan: ${err.message}`
            : 'Gagal menyimpan kemas kini RPH ke awan.'
        );
      }
    },
    [user]
  );

  const handleUploadDocument = useCallback(
    async (params: {
      kind: DocumentKind;
      file?: File;
      rawText?: string;
      mergeMode: 'replace' | 'append';
    }) => {
      if (!user) return;
      setUploadingKind(params.kind);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append('kind', params.kind);
        formData.append('mergeMode', params.mergeMode);
        if (params.file) {
          formData.append('file', params.file);
        }
        if (params.rawText) {
          formData.append('rawText', params.rawText);
        }

        const res = await fetch('/api/documents/parse', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as ParsedDocumentResponse;
        if (!res.ok || !data.parsed) {
          throw new Error(data?.error || 'Gagal memproses dokumen.');
        }

        const parsed = data.parsed;
        const fileName = data.fileName || params.file?.name || 'Dokumen';
        const uploadedAt = data.uploadedAt || new Date().toISOString();

        const nextWorkspace: TeacherWorkspaceState = {
          ...workspace,
          documents: [
            ...workspace.documents.filter(
              (d) => d.kind !== params.kind || params.mergeMode === 'append'
            ),
            {
              kind: params.kind,
              fileName,
              uploadedAt,
              summary: parsed.summary,
            },
          ],
          classConfigs: { ...workspace.classConfigs },
        };

        if (params.kind === 'jadual' && parsed.timetable) {
          nextWorkspace.timetable =
            params.mergeMode === 'append'
              ? [...workspace.timetable, ...parsed.timetable]
              : parsed.timetable;

          for (const slot of parsed.timetable) {
            if (!nextWorkspace.classConfigs[slot.kelas]) {
              nextWorkspace.classConfigs[slot.kelas] = {
                kelas: slot.kelas,
                bil_murid: '30 orang murid',
                tahap_penguasaan_umum: 'Tahap Penguasaan 3 hingga 4',
                keperluan_khas_umum: 'Tiada keperluan khas khusus dinyatakan',
                sumber_ada: [
                  'Papan putih & pen penanda',
                  'Buku teks KPM',
                  'Tiada sambungan internet',
                ],
              };
            }
          }
        } else if (params.kind === 'rpt' && parsed.rptEntries) {
          nextWorkspace.rptEntries =
            params.mergeMode === 'append'
              ? [...workspace.rptEntries, ...parsed.rptEntries]
              : parsed.rptEntries;
        } else if (params.kind === 'sukatan' && parsed.syllabus) {
          nextWorkspace.syllabi =
            params.mergeMode === 'append'
              ? [...workspace.syllabi, parsed.syllabus]
              : [parsed.syllabus];
        }

        await handleWorkspaceUpdate(nextWorkspace);
      } catch (err: unknown) {
        setUploadError(
          err instanceof Error
            ? err.message
            : 'Ralat semasa memuat naik dan mengekstrak dokumen.'
        );
      } finally {
        setUploadingKind(null);
      }
    },
    [user, workspace, handleWorkspaceUpdate]
  );

  const handleLoadDemoPack = useCallback(async () => {
    if (!user) return;
    setUploadError(null);
    setDailyError(null);
    try {
      const res = await fetch('/api/workspace/load-demo-pack', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal memuat set dokumen contoh.');
      }
      const demo = data as TeacherWorkspaceState;
      await handleWorkspaceUpdate(demo);
      setSelectedDate(getInitialSchoolDate());
      setMode('automasi');
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal memuat set dokumen contoh.'
      );
    }
  }, [user, handleWorkspaceUpdate]);

  const handleResetWorkspace = useCallback(async () => {
    if (!user) return;
    const empty = createEmptyClientWorkspace();
    if (user.displayName && empty.automation.schoolFormat) {
      empty.automation.schoolFormat.namaGuru = user.displayName;
    }
    const existingIds = Object.keys(dailyDrafts);
    setDailyDrafts({});
    await handleWorkspaceUpdate(empty);
    if (existingIds.length > 0) {
      try {
        await clearAllDailyDrafts(user.uid, existingIds);
      } catch (err: unknown) {
        setCloudError(
          err instanceof Error
            ? err.message
            : 'Gagal mengosongkan draf harian di awan.'
        );
      }
    }
  }, [user, dailyDrafts, handleWorkspaceUpdate]);

  const handleGenerateDaily = useCallback(
    async (params: {
      date: string;
      mingguNombor: number;
      forceRegenerate?: boolean;
      slotIds?: string[];
    }) => {
      if (!user) return;
      setIsGeneratingDaily(true);
      setDailyError(null);
      try {
        const res = await fetch('/api/rph/generate-daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...params,
            workspaceData: workspaceCore,
            existingDraftKeys: Object.keys(dailyDrafts),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data?.error || 'Gagal menjana cadangan RPH harian.'
          );
        }

        const generated = Array.isArray(data?.generatedDrafts)
          ? (data.generatedDrafts as DailyAutoDraft[])
          : [];

        if (generated.length > 0) {
          setDailyDrafts((prev) => {
            const next = { ...prev };
            for (const entry of generated) {
              next[entry.id] = entry;
            }
            return next;
          });
          await Promise.all(
            generated.map((entry) => upsertDailyDraft(user.uid, entry))
          );
        }

        if (params.mingguNombor !== workspaceCore.automation.mingguSemasa) {
          await handleWorkspaceUpdate({
            ...workspace,
            automation: {
              ...workspace.automation,
              mingguSemasa: params.mingguNombor,
            },
          });
        }
      } catch (err: unknown) {
        setDailyError(
          err instanceof Error
            ? err.message
            : 'Ralat rangkaian semasa menjana RPH harian.'
        );
      } finally {
        setIsGeneratingDaily(false);
      }
    },
    [user, workspaceCore, dailyDrafts, workspace, handleWorkspaceUpdate]
  );

  // Manual RPH generation
  const handleGenerateManual = async (overrideInput?: RphRequestInput) => {
    const payload = overrideInput ?? input;
    setIsGeneratingManual(true);
    setManualError(null);

    try {
      const res = await fetch('/api/rph/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || 'Pelayan gagal memproses permohonan penjanaan RPH.'
        );
      }

      setDraft(data as RphDraftOutput);
      setTeacherReflection('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Ralat rangkaian semasa menghubungi pelayan.';
      setManualError(msg);
    } finally {
      setIsGeneratingManual(false);
    }
  };

  const handleLoadSampleAndGenerateManual = () => {
    const sample: RphRequestInput = JSON.parse(
      JSON.stringify(RPT_PRESETS[0].data)
    );
    setInput(sample);
    void handleGenerateManual(sample);
  };

  const handleSaveManualDraft = async () => {
    if (!user || !draft || draft.status !== 'SIAP') return;
    const entry: SavedRphEntry = {
      id: createCleanArchiveId(),
      createdAt: new Date().toISOString(),
      input: JSON.parse(JSON.stringify(input)),
      draft: JSON.parse(JSON.stringify(draft)),
      teacherReflection,
    };
    try {
      await saveDraftToCloudArchive(user.uid, entry);
    } catch (err: unknown) {
      setCloudError(
        err instanceof Error
          ? `Gagal menyimpan draf ke arkib awan: ${err.message}`
          : 'Gagal menyimpan draf ke arkib awan.'
      );
    }
  };

  const handleSaveDailyDraftToArchive = async (daily: DailyAutoDraft) => {
    if (!user || daily.draft.status !== 'SIAP') return;
    const entry: SavedRphEntry = {
      id: createCleanArchiveId(),
      createdAt: new Date().toISOString(),
      input: JSON.parse(JSON.stringify(daily.requestInput)),
      draft: JSON.parse(JSON.stringify(daily.draft)),
      teacherReflection: daily.teacherReflection,
    };
    try {
      await saveDraftToCloudArchive(user.uid, entry);
    } catch (err: unknown) {
      setCloudError(
        err instanceof Error
          ? `Gagal menyimpan draf ke arkib awan: ${err.message}`
          : 'Gagal menyimpan draf ke arkib awan.'
      );
    }
  };

  const handleLoadSavedEntry = (entry: SavedRphEntry) => {
    setMode('manual');
    setInput(JSON.parse(JSON.stringify(entry.input)));
    setDraft(JSON.parse(JSON.stringify(entry.draft)));
    setTeacherReflection(entry.teacherReflection || '');
    setManualError(null);
  };

  const handleDeleteSavedEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteSavedDraftFromCloud(user.uid, id);
    } catch (err: unknown) {
      setCloudError(
        err instanceof Error
          ? `Gagal memadam draf daripada arkib awan: ${err.message}`
          : 'Gagal memadam draf daripada arkib awan.'
      );
    }
  };

  const handleFocusRptSection = () => {
    rptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal log keluar daripada akaun.'
      );
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex items-center gap-3 text-sm text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
          <span>Memeriksa sesi log masuk guru...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <TeacherAuthGate externalError={authError} />;
  }

  const hasDocs =
    workspace.timetable.length > 0 && workspace.rptEntries.length > 0;

  const handlePrimaryHeaderAction = () => {
    if (mode === 'manual') {
      if (draft && draft.status === 'SIAP') {
        window.print();
      } else {
        void handleGenerateManual();
      }
      return;
    }

    if (mode === 'dokumen') {
      if (hasDocs) {
        setMode('automasi');
      } else {
        void handleLoadDemoPack();
      }
      return;
    }

    // mode === 'automasi'
    if (!hasDocs) {
      setMode('dokumen');
    } else {
      void handleGenerateDaily({
        date: selectedDate,
        mingguNombor: workspace.automation.mingguSemasa || 12,
        forceRegenerate: true,
      });
    }
  };

  const primaryCtaLabel =
    mode === 'manual'
      ? draft && draft.status === 'SIAP'
        ? 'Cetak RPH'
        : 'Jana Draf'
      : mode === 'dokumen'
        ? hasDocs
          ? 'Automasi Harian'
          : 'Muat Contoh'
        : hasDocs
          ? 'Jana Hari Ini'
          : 'Muat Dokumen';

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setMode('automasi');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PelanRPH
          </a>

          {/* Zone 2: 5 Concise Single-line Navigation Links */}
          <nav
            aria-label="Navigasi utama"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => setMode('automasi')}
              className={`hover:text-slate-900 underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                mode === 'automasi'
                  ? 'text-slate-900 font-semibold underline'
                  : 'hover:underline'
              }`}
            >
              Automasi Harian
            </button>
            <button
              type="button"
              onClick={() => setMode('dokumen')}
              className={`hover:text-slate-900 underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                mode === 'dokumen'
                  ? 'text-slate-900 font-semibold underline'
                  : 'hover:underline'
              }`}
            >
              Dokumen &amp; Jadual
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`hover:text-slate-900 underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                mode === 'manual'
                  ? 'text-slate-900 font-semibold underline'
                  : 'hover:underline'
              }`}
            >
              Draf Manual
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Arkib Draf{savedEntries.length > 0 ? ` (${savedEntries.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Panduan
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handlePrimaryHeaderAction}
              disabled={isGeneratingDaily || isGeneratingManual}
              className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Clean Contextual Intro + Teacher Cloud Session Strip + Mobile Switcher */}
        <div className="no-print flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 text-balance">
              {mode === 'automasi'
                ? 'Penjanaan Cadangan RPH Harian Automatik'
                : mode === 'dokumen'
                  ? 'Muat Naik Jadual, RPT & Sukatan Pelajaran'
                  : 'Penyediaan Draf RPH Tunggal (Manual)'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{workspace.timetable.length} slot jadual</span>
              <span aria-hidden="true">·</span>
              <span>{workspace.rptEntries.length} entri RPT</span>
              <span aria-hidden="true">·</span>
              <span>{workspace.syllabi.length} dokumen DSKP</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Minggu {workspace.automation.mingguSemasa}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4">
            {/* Mobile Mode Links */}
            <div className="flex md:hidden flex-wrap items-center gap-3 text-xs font-medium text-slate-700">
              <button
                type="button"
                onClick={() => setMode('automasi')}
                className={mode === 'automasi' ? 'text-sky-700 underline' : ''}
              >
                Automasi
              </button>
              <button
                type="button"
                onClick={() => setMode('dokumen')}
                className={mode === 'dokumen' ? 'text-sky-700 underline' : ''}
              >
                Dokumen
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={mode === 'manual' ? 'text-sky-700 underline' : ''}
              >
                Manual
              </button>
              <button type="button" onClick={() => setArchiveOpen(true)}>
                Arkib ({savedEntries.length})
              </button>
            </div>

            {/* Signed-in Teacher Account & Cloud Status */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                {cloudLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-700" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-sky-700" />
                )}
                <span className="truncate max-w-[200px]">
                  {user.displayName || user.email || 'Guru'}
                </span>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Keluar
              </button>
            </div>
          </div>
        </div>

        {cloudError && (
          <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{cloudError}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudError(null)}
              className="font-semibold text-red-700 hover:underline shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Mode Views */}
        {mode === 'automasi' && (
          <DailyAutomationView
            workspace={workspace}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onDailyDraftUpdate={handleDailyDraftUpdate}
            onGenerateDaily={handleGenerateDaily}
            onLoadDemoPack={handleLoadDemoPack}
            onGoToSetup={() => setMode('dokumen')}
            onSaveDraftToArchive={(entry) => void handleSaveDailyDraftToArchive(entry)}
            isGeneratingDaily={isGeneratingDaily}
            dailyError={dailyError}
          />
        )}

        {mode === 'dokumen' && (
          <DocumentSetupView
            workspace={workspace}
            onWorkspaceUpdate={handleWorkspaceUpdate}
            onUploadDocument={handleUploadDocument}
            onLoadDemoPack={handleLoadDemoPack}
            onResetWorkspace={handleResetWorkspace}
            onGoToDailyAutomation={() => setMode('automasi')}
            uploadingKind={uploadingKind}
            uploadError={uploadError}
          />
        )}

        {mode === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="no-print lg:col-span-5">
              <RphInputForm
                value={input}
                onChange={setInput}
                onSubmit={() => void handleGenerateManual()}
                isGenerating={isGeneratingManual}
                rptSectionRef={rptSectionRef}
              />
            </div>

            <div className="lg:col-span-7 print-only-full">
              <RphDocumentPreview
                input={input}
                draft={draft}
                teacherReflection={teacherReflection}
                onTeacherReflectionChange={setTeacherReflection}
                onDraftUpdate={setDraft}
                onSaveDraft={() => void handleSaveManualDraft()}
                onLoadSampleAndGenerate={handleLoadSampleAndGenerateManual}
                onFocusRptSection={handleFocusRptSection}
                isGenerating={isGeneratingManual}
                errorMessage={manualError}
                schoolFormat={workspace.automation.schoolFormat}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            PelanRPH · Storan awan kekal &amp; cadangan draf RPH harian guru
          </span>
          <span>Guru kekal sebagai pembuat keputusan akhir PdPc.</span>
        </div>
      </footer>

      <PedagogyGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <SavedDraftsDrawer
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        entries={savedEntries}
        onLoadEntry={handleLoadSavedEntry}
        onDeleteEntry={(id) => void handleDeleteSavedEntry(id)}
      />
    </div>
  );
}
