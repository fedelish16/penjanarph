import React, { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { COMMON_RESOURCES } from '../data/presets';
import type {
  ClassContextConfig,
  DocumentKind,
  HariMinggu,
  TeacherWorkspaceState,
  TimetableSlot,
} from '../types/rph';

interface DocumentSetupViewProps {
  workspace: TeacherWorkspaceState;
  onWorkspaceUpdate: (next: TeacherWorkspaceState) => Promise<void>;
  onUploadDocument: (params: {
    kind: DocumentKind;
    file?: File;
    rawText?: string;
    mergeMode: 'replace' | 'append';
  }) => Promise<void>;
  onLoadDemoPack: () => Promise<void>;
  onResetWorkspace: () => Promise<void>;
  onGoToDailyAutomation: () => void;
  uploadingKind: DocumentKind | null;
  uploadError: string | null;
}

type InspectTab = 'jadual' | 'rpt' | 'sukatan' | 'kelas';

const DAYS_ORDER: HariMinggu[] = [
  'Isnin',
  'Selasa',
  'Rabu',
  'Khamis',
  'Jumaat',
  'Ahad',
  'Sabtu',
];

export const DocumentSetupView: React.FC<DocumentSetupViewProps> = ({
  workspace,
  onWorkspaceUpdate,
  onUploadDocument,
  onLoadDemoPack,
  onResetWorkspace,
  onGoToDailyAutomation,
  uploadingKind,
  uploadError,
}) => {
  const [inspectTab, setInspectTab] = useState<InspectTab>('jadual');
  const [pasteModalKind, setPasteModalKind] = useState<DocumentKind | null>(
    null
  );
  const [pasteText, setPasteText] = useState<string>('');
  const [mergeMode, setMergeMode] = useState<'replace' | 'append'>('replace');

  const [newSlot, setNewSlot] = useState<Omit<TimetableSlot, 'id'>>({
    hari: 'Isnin',
    masa_mula: '08:00',
    masa_tamat: '09:00',
    tempoh_minit: 60,
    mata_pelajaran: '',
    kelas: '',
    kurikulum: 'KSSM (DSKP Semakan Terkini)',
    bilik: '',
  });

  const handleFileChange = async (
    kind: DocumentKind,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await onUploadDocument({ kind, file, mergeMode });
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteModalKind || !pasteText.trim()) return;
    await onUploadDocument({
      kind: pasteModalKind,
      rawText: pasteText.trim(),
      mergeMode,
    });
    setPasteModalKind(null);
    setPasteText('');
  };

  const handleDeleteSlot = async (id: string) => {
    const next: TeacherWorkspaceState = {
      ...workspace,
      timetable: workspace.timetable.filter((s) => s.id !== id),
    };
    await onWorkspaceUpdate(next);
  };

  const handleAddManualSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlot.mata_pelajaran.trim() || !newSlot.kelas.trim()) return;
    const [sh, sm] = newSlot.masa_mula.split(':').map(Number);
    const [eh, em] = newSlot.masa_tamat.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    const slot: TimetableSlot = {
      ...newSlot,
      id: `slot-${Date.now()}`,
      tempoh_minit: diff > 0 ? diff : 60,
    };
    const nextClassConfigs = { ...workspace.classConfigs };
    if (!nextClassConfigs[slot.kelas]) {
      nextClassConfigs[slot.kelas] = {
        kelas: slot.kelas,
        bil_murid: '30 orang murid',
        tahap_penguasaan_umum: 'Tahap Penguasaan 3 hingga 4',
        keperluan_khas_umum: 'Tiada keperluan khas khusus',
        sumber_ada: ['Papan putih & pen penanda', 'Buku teks KPM'],
      };
    }
    await onWorkspaceUpdate({
      ...workspace,
      timetable: [...workspace.timetable, slot],
      classConfigs: nextClassConfigs,
    });
    setNewSlot({
      ...newSlot,
      mata_pelajaran: '',
      kelas: '',
      bilik: '',
    });
  };

  const handleDeleteRptEntry = async (id: string) => {
    await onWorkspaceUpdate({
      ...workspace,
      rptEntries: workspace.rptEntries.filter((r) => r.id !== id),
    });
  };

  const handleDeleteSyllabus = async (id: string) => {
    await onWorkspaceUpdate({
      ...workspace,
      syllabi: workspace.syllabi.filter((s) => s.id !== id),
    });
  };

  const updateClassConfig = async (
    kelas: string,
    patch: Partial<ClassContextConfig>
  ) => {
    const existing = workspace.classConfigs[kelas] ?? {
      kelas,
      bil_murid: '30 orang murid',
      tahap_penguasaan_umum: 'TP3–TP4',
      keperluan_khas_umum: '',
      sumber_ada: ['Papan putih & pen penanda', 'Buku teks KPM'],
    };
    await onWorkspaceUpdate({
      ...workspace,
      classConfigs: {
        ...workspace.classConfigs,
        [kelas]: { ...existing, ...patch },
      },
    });
  };

  const toggleClassResource = async (kelas: string, res: string) => {
    const existing = workspace.classConfigs[kelas];
    const current = existing?.sumber_ada ?? [];
    const nextRes = current.includes(res)
      ? current.filter((item) => item !== res)
      : [...current, res];
    await updateClassConfig(kelas, { sumber_ada: nextRes });
  };

  const getDocMeta = (kind: DocumentKind) =>
    workspace.documents.filter((d) => d.kind === kind);

  const sortedTimetable = [...workspace.timetable].sort((a, b) => {
    const dayDiff = DAYS_ORDER.indexOf(a.hari) - DAYS_ORDER.indexOf(b.hari);
    if (dayDiff !== 0) return dayDiff;
    return a.masa_mula.localeCompare(b.masa_mula);
  });

  const sortedRpt = [...workspace.rptEntries].sort(
    (a, b) => a.minggu_nombor - b.minggu_nombor
  );

  const isReadyForAutomation =
    workspace.timetable.length > 0 && workspace.rptEntries.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Action Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">
            Persediaan Dokumen Induk Guru
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Muat naik Jadual Mengajar, RPT dan Sukatan Pelajaran (PDF, Word
            DOCX, Excel XLSX, CSV atau gambar tangkap layar). AI mengekstrak
            struktur secara automatik untuk menjana cadangan RPH harian anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMergeMode('replace')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                mergeMode === 'replace'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ganti Data Semasa
            </button>
            <button
              type="button"
              onClick={() => setMergeMode('append')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                mergeMode === 'append'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tambah / Gabung
            </button>
          </div>

          <button
            type="button"
            onClick={() => void onLoadDemoPack()}
            disabled={uploadingKind !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-700" />
            Muat Set Contoh Lengkap
          </button>

          {workspace.documents.length > 0 && (
            <button
              type="button"
              onClick={() => void onResetWorkspace()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Kosongkan
            </button>
          )}

          {isReadyForAutomation && (
            <button
              type="button"
              onClick={onGoToDailyAutomation}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 transition-colors whitespace-nowrap"
            >
              Buka Automasi Harian
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {uploadError}
        </div>
      )}

      {/* 3 Upload Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Jadual Mengajar */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-700 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  01. Jadual Mengajar
                </h3>
              </div>
              {workspace.timetable.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {workspace.timetable.length} slot
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Muat naik jadual waktu rasmi (PDF, Excel, Word atau gambar) supaya
              sistem tahu hari, masa mula/tamat, subjek dan kelas anda.
            </p>

            {getDocMeta('jadual').length > 0 && (
              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                {getDocMeta('jadual').map((doc, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <div className="font-medium truncate">{doc.fileName}</div>
                    <div className="text-slate-500">{doc.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap">
              {uploadingKind === 'jadual' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengekstrak...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Muat Naik Jadual
                </>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.csv,.txt,.json"
                onChange={(e) => void handleFileChange('jadual', e)}
                disabled={uploadingKind !== null}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPasteModalKind('jadual');
                setPasteText('');
              }}
              disabled={uploadingKind !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Tampal Teks
            </button>
          </div>
        </section>

        {/* 2. RPT */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-sky-700 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  02. Rancangan Pengajaran Tahunan
                </h3>
              </div>
              {workspace.rptEntries.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {workspace.rptEntries.length} minggu
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Muat naik RPT (Word, Excel, PDF atau teks). Tema, Standard
              Kandungan dan Standard Pembelajaran disalin secara verbatim.
            </p>

            {getDocMeta('rpt').length > 0 && (
              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                {getDocMeta('rpt').map((doc, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <div className="font-medium truncate">{doc.fileName}</div>
                    <div className="text-slate-500">{doc.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap">
              {uploadingKind === 'rpt' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengekstrak...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Muat Naik RPT
                </>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.csv,.txt,.json"
                onChange={(e) => void handleFileChange('rpt', e)}
                disabled={uploadingKind !== null}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPasteModalKind('rpt');
                setPasteText('');
              }}
              disabled={uploadingKind !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Tampal Teks
            </button>
          </div>
        </section>

        {/* 3. Sukatan Pelajaran / DSKP */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-700 shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900">
                  03. Sukatan Pelajaran (DSKP)
                </h3>
              </div>
              {workspace.syllabi.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {workspace.syllabi.length} dokumen
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Muat naik dokumen DSKP / Sukatan Pelajaran sebagai rujukan tahap
              penguasaan (TP1–TP6), fokus kemahiran dan pentaksiran bilik
              darjah.
            </p>

            {getDocMeta('sukatan').length > 0 && (
              <div className="border-t border-slate-200 pt-2.5 space-y-1">
                {getDocMeta('sukatan').map((doc, idx) => (
                  <div key={idx} className="text-xs text-slate-700">
                    <div className="font-medium truncate">{doc.fileName}</div>
                    <div className="text-slate-500">{doc.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer transition-colors whitespace-nowrap">
              {uploadingKind === 'sukatan' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Mengekstrak...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Muat Naik DSKP
                </>
              )}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.xls,.csv,.txt,.json"
                onChange={(e) => void handleFileChange('sukatan', e)}
                disabled={uploadingKind !== null}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPasteModalKind('sukatan');
                setPasteText('');
              }}
              disabled={uploadingKind !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Tampal Teks
            </button>
          </div>
        </section>
      </div>

      {/* Extracted Data Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setInspectTab('jadual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                inspectTab === 'jadual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jadual Mengajar ({workspace.timetable.length})
            </button>
            <button
              type="button"
              onClick={() => setInspectTab('rpt')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                inspectTab === 'rpt'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entri RPT ({workspace.rptEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setInspectTab('sukatan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                inspectTab === 'sukatan'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sukatan / DSKP ({workspace.syllabi.length})
            </button>
            <button
              type="button"
              onClick={() => setInspectTab('kelas')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                inspectTab === 'kelas'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profil Kelas &amp; Sumber ({Object.keys(workspace.classConfigs).length})
            </button>
          </div>
        </div>

        {/* Tab 1: Timetable */}
        {inspectTab === 'jadual' && (
          <div className="divide-y divide-slate-200">
            {sortedTimetable.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada slot jadual dimuat naik. Muat naik fail Jadual
                Mengajar atau tambah slot secara manual di bawah.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4">Hari</th>
                      <th className="py-2.5 px-4">Masa</th>
                      <th className="py-2.5 px-4 text-right">Tempoh</th>
                      <th className="py-2.5 px-4">Mata Pelajaran</th>
                      <th className="py-2.5 px-4">Kelas</th>
                      <th className="py-2.5 px-4">Lokasi</th>
                      <th className="py-2.5 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedTimetable.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {slot.hari}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                          {slot.masa_mula} – {slot.masa_tamat}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {slot.tempoh_minit} min
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {slot.mata_pelajaran}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {slot.kelas}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {slot.bilik || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteSlot(slot.id)}
                            aria-label="Padam slot"
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add manual slot row */}
            <form
              onSubmit={(e) => void handleAddManualSlot(e)}
              className="p-4 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-7 gap-2 items-end"
            >
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Hari
                </label>
                <select
                  value={newSlot.hari}
                  onChange={(e) =>
                    setNewSlot({
                      ...newSlot,
                      hari: e.target.value as HariMinggu,
                    })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  {DAYS_ORDER.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Mula
                </label>
                <input
                  type="time"
                  value={newSlot.masa_mula}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, masa_mula: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Tamat
                </label>
                <input
                  type="time"
                  value={newSlot.masa_tamat}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, masa_tamat: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={newSlot.mata_pelajaran}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, mata_pelajaran: e.target.value })
                  }
                  placeholder="cth. Sejarah"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Kelas
                </label>
                <input
                  type="text"
                  value={newSlot.kelas}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, kelas: e.target.value })
                  }
                  placeholder="cth. Tingkatan 4 Bestari"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Slot
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: RPT Entries */}
        {inspectTab === 'rpt' && (
          <div>
            {sortedRpt.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada entri RPT dimuat naik. Muat naik dokumen RPT anda di
                atas untuk memadankan Standard Kandungan dan Standard
                Pembelajaran secara automatik setiap minggu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-4 w-24">Minggu</th>
                      <th className="py-2.5 px-4 w-44">Subjek &amp; Tingkatan</th>
                      <th className="py-2.5 px-4 w-48">Tema</th>
                      <th className="py-2.5 px-4">
                        Standard Kandungan &amp; Standard Pembelajaran (Verbatim)
                      </th>
                      <th className="py-2.5 px-4 text-right w-16">Padam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 align-top">
                    {sortedRpt.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                          {entry.minggu}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {entry.mata_pelajaran}
                          </div>
                          <div className="text-slate-500">
                            {entry.tingkatan_tahun}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {entry.tema || '—'}
                        </td>
                        <td className="py-3 px-4 space-y-1 text-slate-700 leading-relaxed">
                          {entry.standard_kandungan ? (
                            <>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  SK:
                                </span>{' '}
                                {entry.standard_kandungan}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  SP:
                                </span>{' '}
                                {entry.standard_pembelajaran}
                              </div>
                            </>
                          ) : (
                            <div className="text-amber-700 font-medium">
                              Tiada SK/SP PdPc baharu
                            </div>
                          )}
                          {entry.catatan && (
                            <div className="text-slate-500">
                              Catatan: {entry.catatan}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteRptEntry(entry.id)}
                            aria-label="Padam entri RPT"
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sukatan Pelajaran / DSKP */}
        {inspectTab === 'sukatan' && (
          <div className="divide-y divide-slate-200">
            {workspace.syllabi.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Belum ada dokumen Sukatan Pelajaran / DSKP dimuat naik.
              </div>
            ) : (
              workspace.syllabi.map((syl) => (
                <div key={syl.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileText className="w-4 h-4 text-sky-700" />
                        <span>
                          {syl.mata_pelajaran} · {syl.tingkatan_tahun}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {syl.fileName} · {syl.kurikulum}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSyllabus(syl.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {syl.ringkasan_kandungan}
                  </p>

                  {syl.standard_rujukan.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {syl.standard_rujukan.map((ref, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 p-3 text-xs space-y-1 bg-slate-50/40"
                        >
                          <div className="font-semibold text-slate-900">
                            {ref.kod} · {ref.standard_kandungan}
                          </div>
                          <div className="text-slate-600">
                            {ref.standard_pembelajaran}
                          </div>
                          {ref.tahap_penguasaan && (
                            <div className="text-sky-800 pt-1">
                              {ref.tahap_penguasaan}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Class Configs */}
        {inspectTab === 'kelas' && (
          <div className="divide-y divide-slate-200">
            {Object.keys(workspace.classConfigs).length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Profil kelas akan diwujudkan secara automatik apabila Jadual
                Mengajar dimuat naik.
              </div>
            ) : (
              Object.values(workspace.classConfigs).map((cfg) => (
                <div key={cfg.kelas} className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-700" />
                    <h4 className="text-sm font-semibold text-slate-900">
                      {cfg.kelas}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Bilangan Murid
                      </label>
                      <input
                        type="text"
                        value={cfg.bil_murid}
                        onChange={(e) =>
                          void updateClassConfig(cfg.kelas, {
                            bil_murid: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tahap Penguasaan Umum
                      </label>
                      <input
                        type="text"
                        value={cfg.tahap_penguasaan_umum}
                        onChange={(e) =>
                          void updateClassConfig(cfg.kelas, {
                            tahap_penguasaan_umum: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Keperluan Khas (Tanpa Nama Murid)
                      </label>
                      <input
                        type="text"
                        value={cfg.keperluan_khas_umum}
                        onChange={(e) =>
                          void updateClassConfig(cfg.kelas, {
                            keperluan_khas_umum: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-600">
                      Sumber Tersedia untuk Kelas Ini
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_RESOURCES.map((res) => {
                        const active = cfg.sumber_ada.includes(res);
                        return (
                          <button
                            key={res}
                            type="button"
                            onClick={() =>
                              void toggleClassResource(cfg.kelas, res)
                            }
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                              active
                                ? 'border-sky-700 bg-sky-50 text-sky-900'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {res}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Paste Raw Text Modal */}
      {pasteModalKind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => void handlePasteSubmit(e)}
            className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-lg"
          >
            <h3 className="text-base font-bold text-slate-900">
              Tampal Teks{' '}
              {pasteModalKind === 'jadual'
                ? 'Jadual Mengajar'
                : pasteModalKind === 'rpt'
                  ? 'Rancangan Pengajaran Tahunan (RPT)'
                  : 'Sukatan Pelajaran (DSKP)'}
            </h3>
            <p className="text-xs text-slate-600">
              Tampal jadual atau senarai teks daripada fail Word, Excel atau
              portal e-RPH anda. AI akan menyusunnya ke dalam jadual berstruktur.
            </p>
            <textarea
              rows={9}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Tampal kandungan teks di sini..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono text-slate-800 focus:border-sky-700 focus:outline-none"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasteModalKind(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploadingKind !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {uploadingKind ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Ekstrak dengan AI'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
