import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Cloud,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Printer,
  Upload,
} from 'lucide-react';
import { DailyAutomationView } from './components/DailyAutomationView';
import { DocumentSetupView } from './components/DocumentSetupView';
import { HeroBackdropArt } from './components/HeroBackdropArt';
import { PedagogyGuideModal } from './components/PedagogyGuideModal';
import { RphDocumentPreview } from './components/RphDocumentPreview';
import { RphInputForm } from './components/RphInputForm';
import { SavedDraftsDrawer } from './components/SavedDraftsDrawer';
import { TeacherAuthGate } from './components/TeacherAuthGate';
import {
  TeacherChatbotDrawer,
  type ChatWorkspaceContext,
} from './components/TeacherChatbotDrawer';
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
  SchoolFormatConfig,
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

  const [mode, setMode] = useState<WorkspaceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('pelanrph_preferred_mode');
      if (saved === 'manual' || saved === 'dokumen' || saved === 'automasi') {
        return saved;
      }
    }
    return 'automasi';
  });
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
  const [chatOpen, setChatOpen] = useState<boolean>(false);
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

  const getTeacherIdToken = useCallback(async (): Promise<string> => {
    const currentUser = auth.currentUser ?? user;
    if (!currentUser) {
      throw new Error(
        'Sila log masuk dengan akaun Google terlebih dahulu.'
      );
    }
    return currentUser.getIdToken();
  }, [user]);

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

        const token = await getTeacherIdToken();
        const res = await fetch('/api/documents/parse', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    [user, workspace, handleWorkspaceUpdate, getTeacherIdToken]
  );

  const handleLoadDemoPack = useCallback(async () => {
    if (!user) return;
    setUploadError(null);
    setDailyError(null);
    try {
      const token = await getTeacherIdToken();
      const res = await fetch('/api/workspace/load-demo-pack', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
  }, [user, handleWorkspaceUpdate, getTeacherIdToken]);

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
        const token = await getTeacherIdToken();
        const res = await fetch('/api/rph/generate-daily', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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
    [
      user,
      workspaceCore,
      dailyDrafts,
      workspace,
      handleWorkspaceUpdate,
      getTeacherIdToken,
    ]
  );

  // Manual RPH generation
  const handleGenerateManual = async (overrideInput?: RphRequestInput) => {
    if (!user) return;
    const payload = overrideInput ?? input;
    setIsGeneratingManual(true);
    setManualError(null);

    try {
      const token = await getTeacherIdToken();
      const res = await fetch('/api/rph/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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

  const handleSchoolFormatUpdate = useCallback(
    (patch: Partial<SchoolFormatConfig>) => {
      const current: SchoolFormatConfig = workspace.automation.schoolFormat ?? {
        namaSekolah: '',
        namaGuru: '',
        tajukRph: 'Rancangan Pengajaran Harian (RPH)',
        sertakanTandatanganPk: true,
      };
      void handleWorkspaceUpdate({
        ...workspace,
        automation: {
          ...workspace.automation,
          schoolFormat: { ...current, ...patch },
        },
      });
    },
    [workspace, handleWorkspaceUpdate]
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      setCloudError(
        err instanceof Error ? err.message : 'Gagal log keluar daripada akaun.'
      );
    }
  };

  const availableWeeks = useMemo(() => {
    const nums = Array.from(
      new Set(workspace.rptEntries.map((r) => r.minggu_nombor))
    ).sort((a, b) => a - b);
    const activeWk = workspace.automation.mingguSemasa || 12;
    if (!nums.includes(activeWk)) {
      nums.push(activeWk);
      nums.sort((a, b) => a - b);
    }
    return nums;
  }, [workspace.rptEntries, workspace.automation.mingguSemasa]);

  const chatWorkspaceContext: ChatWorkspaceContext = useMemo(() => {
    const mingguSemasa = workspace.automation.mingguSemasa || 12;
    if (mode === 'manual') {
      return {
        mode,
        mingguSemasa,
        mataPelajaran: input.mata_pelajaran,
        kelas: input.tingkatan_tahun,
        tema: input.data_rpt_minggu.tema,
        standardKandungan: input.data_rpt_minggu.standard_kandungan,
        standardPembelajaran: input.data_rpt_minggu.standard_pembelajaran,
        tempohMinit: input.jadual.tempoh_minit,
      };
    }

    const firstDailyForDate = Object.values(dailyDrafts).find(
      (d) => d.date === selectedDate
    );
    if (firstDailyForDate) {
      return {
        mode,
        mingguSemasa,
        mataPelajaran: firstDailyForDate.slot.mata_pelajaran,
        kelas: firstDailyForDate.slot.kelas,
        tema: firstDailyForDate.requestInput.data_rpt_minggu.tema,
        standardKandungan:
          firstDailyForDate.requestInput.data_rpt_minggu.standard_kandungan,
        standardPembelajaran:
          firstDailyForDate.requestInput.data_rpt_minggu.standard_pembelajaran,
        tempohMinit: firstDailyForDate.slot.tempoh_minit,
      };
    }

    return {
      mode,
      mingguSemasa,
    };
  }, [mode, workspace.automation.mingguSemasa, input, dailyDrafts, selectedDate]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#060D3D] flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-md px-6 py-5 flex items-center gap-3 text-sm font-medium text-[#060D3D] shadow-xl">
          <Loader2 className="w-4 h-4 animate-spin text-[#00B4F0]" />
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
        ? 'CETAK 1 MUKA A4'
        : 'JANA DRAF RPH'
      : mode === 'dokumen'
        ? hasDocs
          ? 'AUTOMASI HARIAN'
          : 'MUAT SET CONTOH'
        : hasDocs
          ? 'JANA RPH HARI INI'
          : 'MUAT NAIK DOKUMEN';

  const handleHeroWeekChange = (nextWeek: number) => {
    void handleWorkspaceUpdate({
      ...workspace,
      automation: {
        ...workspace.automation,
        mingguSemasa: nextWeek,
      },
    });
  };

  return (
    <div
      id="top"
      className="min-h-screen print:min-h-0 flex flex-col bg-[#F4F7FB] print:bg-white text-[#060D3D]"
    >
      {/* Tier 1: Midnight Navy Brand & Teacher Session Bar */}
      <header className="no-print bg-[#060D3D] text-white">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-4 min-w-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setMode('automasi');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center px-2.5 py-1 border-2 border-[#00B4F0] text-white font-extrabold text-base tracking-tight whitespace-nowrap shrink-0"
            >
              pelan<span className="text-[#14E2D8]">RPH</span>
            </a>
            <span className="hidden lg:inline-block text-xs text-slate-300 font-medium truncate">
              Ruang Kerja RPH Guru Malaysia ·{' '}
              <span className="text-[#14E2D8] font-semibold">
                Storan Awan Kekal
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-200">
              {cloudLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#14E2D8]" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-[#14E2D8]" />
              )}
              <span className="truncate max-w-[180px] font-medium">
                {user.displayName || user.email || 'Guru'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="inline-flex items-center justify-center rounded bg-[#213175] hover:bg-[#2C3F92] px-3.5 py-2 text-[11px] font-bold tracking-wider uppercase text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ARKIB DRAF{savedEntries.length > 0 ? ` (${savedEntries.length})` : ''}
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-200 hover:text-[#14E2D8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LOG KELUAR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tier 2: Crisp White Workspace Navigation Bar */}
      <nav
        aria-label="Navigasi utama ruang kerja"
        className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-[0_1px_2px_rgba(6,13,61,0.04)]"
      >
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-7 overflow-x-auto h-full">
            <button
              type="button"
              onClick={() => setMode('automasi')}
              className={`h-full inline-flex items-center border-b-2 text-[11px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'automasi'
                  ? 'border-[#00B4F0] text-[#060D3D]'
                  : 'border-transparent text-slate-600 hover:text-[#060D3D]'
              }`}
            >
              Automasi Harian
            </button>
            <button
              type="button"
              onClick={() => setMode('dokumen')}
              className={`h-full inline-flex items-center border-b-2 text-[11px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'dokumen'
                  ? 'border-[#00B4F0] text-[#060D3D]'
                  : 'border-transparent text-slate-600 hover:text-[#060D3D]'
              }`}
            >
              Dokumen &amp; Jadual
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`h-full inline-flex items-center border-b-2 text-[11px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'manual'
                  ? 'border-[#00B4F0] text-[#060D3D]'
                  : 'border-transparent text-slate-600 hover:text-[#060D3D]'
              }`}
            >
              Draf Manual
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="h-full inline-flex items-center border-b-2 border-transparent text-[11px] font-bold tracking-wider uppercase text-slate-600 hover:text-[#060D3D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Arkib ({savedEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="h-full inline-flex items-center border-b-2 border-transparent text-[11px] font-bold tracking-wider uppercase text-slate-600 hover:text-[#060D3D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Panduan
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-[#060D3D] whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-[#00B4F0]" />
              <span className="font-mono tabular-nums">
                MINGGU {workspace.automation.mingguSemasa}
              </span>
            </span>
            <button
              type="button"
              onClick={handlePrimaryHeaderAction}
              disabled={isGeneratingDaily || isGeneratingManual}
              className="rounded bg-[#00B4F0] hover:bg-[#0099D6] px-3.5 py-1.5 text-[11px] font-extrabold tracking-wider uppercase text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {primaryCtaLabel}
            </button>
          </div>
        </div>
      </nav>

      {/* Compact BuiltIn-Inspired Command Hero Strip */}
      <section className="no-print relative hero-navy-teal-bg text-white overflow-hidden">
        <HeroBackdropArt compact />
        <div className="relative z-10 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-5">
          <div className="space-y-2.5 max-w-3xl">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-sky-200">
              {mode === 'automasi'
                ? 'AUTOMASI RPH HARIAN · PADANAN VERBATIM RPT'
                : mode === 'dokumen'
                  ? 'PENGURUSAN JADUAL, RPT, DSKP & LOGO SEKOLAH'
                  : 'PENYEDIAAN DRAF RPH TUNGGAL & EKSPORT'}
            </p>
            <h1 className="font-editorial text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight text-white text-balance">
              {mode === 'automasi' ? (
                <>
                  Rancang<span className="text-[#14E2D8]">.</span> Semak
                  <span className="text-[#14E2D8]">.</span> Siapkan RPH hari ini
                  <span className="text-[#14E2D8]">.</span>
                </>
              ) : mode === 'dokumen' ? (
                <>
                  Muat Naik<span className="text-[#14E2D8]">.</span> Susun
                  <span className="text-[#14E2D8]">.</span> Segerakkan dokumen
                  <span className="text-[#14E2D8]">.</span>
                </>
              ) : (
                <>
                  Bina<span className="text-[#14E2D8]">.</span> Sunting
                  <span className="text-[#14E2D8]">.</span> Cetak 1 muka A4
                  <span className="text-[#14E2D8]">.</span>
                </>
              )}
            </h1>
            <p className="text-xs font-bold tracking-wider uppercase text-white/90 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>
                <span className="text-[#14E2D8] font-mono tabular-nums">
                  {workspace.timetable.length}
                </span>{' '}
                SLOT JADUAL
              </span>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span>
                <span className="text-[#14E2D8] font-mono tabular-nums">
                  {workspace.rptEntries.length}
                </span>{' '}
                ENTRI RPT
              </span>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span>
                <span className="text-[#14E2D8] font-mono tabular-nums">
                  {workspace.syllabi.length}
                </span>{' '}
                DOKUMEN DSKP
              </span>
              <span className="text-white/40" aria-hidden="true">
                ·
              </span>
              <span>
                <span className="text-[#14E2D8] font-mono tabular-nums">
                  MINGGU {workspace.automation.mingguSemasa}
                </span>
              </span>
            </p>
          </div>

          {/* Floating White Quick-Command Bar */}
          <div className="bg-white text-[#060D3D] rounded-md shadow-xl p-4 sm:px-5 sm:py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 max-w-4xl">
            <div className="font-editorial text-base sm:text-lg font-extrabold text-[#060D3D] whitespace-nowrap shrink-0">
              {mode === 'automasi'
                ? 'RPH Hari Ini'
                : mode === 'dokumen'
                  ? 'Dokumen Guru'
                  : 'Draf Manual'}
              <span className="text-[#00B4F0]">.</span>
            </div>

            {mode === 'automasi' && hasDocs ? (
              <>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label htmlFor="hero-date-picker" className="sr-only">
                      Tarikh PdPc
                    </label>
                    <input
                      id="hero-date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-[#00B4F0] py-1.5 font-mono text-xs sm:text-sm font-semibold text-[#060D3D] tabular-nums focus:outline-none focus:border-[#060D3D]"
                    />
                  </div>
                  <div className="relative">
                    <label htmlFor="hero-week-select" className="sr-only">
                      Minggu RPT
                    </label>
                    <select
                      id="hero-week-select"
                      value={workspace.automation.mingguSemasa || 12}
                      onChange={(e) =>
                        handleHeroWeekChange(Number(e.target.value))
                      }
                      className="w-full appearance-none bg-transparent border-b-2 border-[#00B4F0] py-1.5 pr-7 text-xs sm:text-sm font-semibold text-[#060D3D] focus:outline-none focus:border-[#060D3D] cursor-pointer"
                    >
                      {availableWeeks.map((wk) => (
                        <option key={wk} value={wk}>
                          Minggu RPT {wk}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#00B4F0] pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingDaily}
                  onClick={() =>
                    void handleGenerateDaily({
                      date: selectedDate,
                      mingguNombor: workspace.automation.mingguSemasa || 12,
                      forceRegenerate: true,
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGeneratingDaily ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      MENJANA...
                    </>
                  ) : (
                    'JANA RPH HARI INI'
                  )}
                </button>
              </>
            ) : mode === 'automasi' ? (
              <>
                <p className="flex-1 text-xs sm:text-sm text-slate-600 border-b-2 border-[#00B4F0]/50 py-1.5">
                  Muat naik Jadual &amp; RPT anda atau cuba set contoh lengkap
                  untuk memulakan automasi harian.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('dokumen')}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  MUAT NAIK DOKUMEN
                </button>
              </>
            ) : mode === 'dokumen' ? (
              <>
                <p className="flex-1 text-xs sm:text-sm text-slate-600 border-b-2 border-[#00B4F0]/50 py-1.5">
                  Muat naik Jadual, RPT, DSKP atau tetapkan Nama &amp; Logo
                  Sekolah untuk cetakan 1 muka A4.
                </p>
                <button
                  type="button"
                  onClick={handlePrimaryHeaderAction}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {primaryCtaLabel}
                </button>
              </>
            ) : (
              <>
                <p className="flex-1 text-xs sm:text-sm font-medium text-[#060D3D] border-b-2 border-[#00B4F0]/60 py-1.5 truncate">
                  {input.mata_pelajaran || 'Mata Pelajaran'} ·{' '}
                  {input.tingkatan_tahun || 'Kelas'} ({input.jadual.tempoh_minit}{' '}
                  minit)
                </p>
                <button
                  type="button"
                  disabled={isGeneratingManual}
                  onClick={handlePrimaryHeaderAction}
                  className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] hover:bg-[#0099D6] px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGeneratingManual ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      MENJANA...
                    </>
                  ) : (
                    primaryCtaLabel
                  )}
                </button>
              </>
            )}
          </div>

          {/* 3 Quick-Jump Links Strip */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs font-semibold text-white">
            <button
              type="button"
              onClick={() => setMode('automasi')}
              className="inline-flex items-center gap-2 group cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#14E2D8]" />
              <span className="border-b border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                Jadual &amp; RPH Harian
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('dokumen')}
              className="inline-flex items-center gap-2 group cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#14E2D8]" />
              <span className="border-b border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                Muat Naik Dokumen &amp; Logo Sekolah
              </span>
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-2 group cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#14E2D8]" />
              <span className="border-b border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                7 Peraturan Pematuhan DSKP
              </span>
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 group cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#14E2D8]" />
              <span className="border-b border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                Soal Pembantu Pedagogi AI
              </span>
            </button>
            {mode === 'manual' && draft?.status === 'SIAP' && (
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 group cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#14E2D8]" />
                <span className="border-b border-[#14E2D8] pb-0.5 group-hover:text-[#14E2D8] transition-colors">
                  Cetak 1 Muka A4
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1380px] print:max-w-full w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 print:p-0 print:m-0 space-y-6 print:space-y-0">
        {cloudError && (
          <div className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-center justify-between gap-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block">
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
                onSchoolFormatUpdate={handleSchoolFormatUpdate}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-white/10 bg-[#060D3D] text-slate-300 mt-auto">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span>
            <strong className="text-white">PelanRPH</strong> · Storan awan
            kekal &amp; cadangan draf RPH harian guru
          </span>
          <span className="text-[#14E2D8] font-medium">
            Guru kekal sebagai pembuat keputusan akhir PdPc.
          </span>
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
      <TeacherChatbotDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        teacherUid={user.uid}
        getIdToken={getTeacherIdToken}
        workspaceContext={chatWorkspaceContext}
      />
    </div>
  );
}
