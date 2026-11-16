import React, { useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileCheck2,
  FileDown,
  FileJson,
  LayoutList,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { exportRphToDocx } from '../utils/exportDocx';
import type {
  RphActivity,
  RphDraftOutput,
  RphRequestInput,
  SchoolFormatConfig,
} from '../types/rph';

interface RphDocumentPreviewProps {
  input: RphRequestInput;
  draft: RphDraftOutput | null;
  teacherReflection: string;
  onTeacherReflectionChange: (val: string) => void;
  onDraftUpdate: (updated: RphDraftOutput) => void;
  onSaveDraft: () => void;
  onLoadSampleAndGenerate: () => void;
  onFocusRptSection: () => void;
  isGenerating: boolean;
  errorMessage: string | null;
  schoolFormat?: SchoolFormatConfig;
}

type ViewTab = 'dokumen' | 'pedagogi' | 'json';

function phaseLabel(fasa: RphActivity['fasa']): string {
  switch (fasa) {
    case 'set_induksi':
      return 'Set Induksi';
    case 'perkembangan':
      return 'Perkembangan';
    case 'penutup':
      return 'Penutup';
    default:
      return fasa;
  }
}

export const RphDocumentPreview: React.FC<RphDocumentPreviewProps> = ({
  input,
  draft,
  teacherReflection,
  onTeacherReflectionChange,
  onDraftUpdate,
  onSaveDraft,
  onLoadSampleAndGenerate,
  onFocusRptSection,
  isGenerating,
  errorMessage,
  schoolFormat,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dokumen');
  const [copiedType, setCopiedType] = useState<'json' | 'text' | null>(null);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  const handleExportWord = async () => {
    if (!draft || draft.status !== 'SIAP') return;
    setIsExportingWord(true);
    try {
      await exportRphToDocx({ draft, teacherReflection, schoolFormat });
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleCopyJson = async () => {
    if (!draft) return;
    const strictJson: RphDraftOutput = {
      ...draft,
      refleksi: '',
    };
    await navigator.clipboard.writeText(JSON.stringify(strictJson, null, 2));
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyPlainText = async () => {
    if (!draft) return;
    const lines = [
      `RANCANGAN PENGAJARAN HARIAN (${draft.tanda})`,
      `Mata Pelajaran: ${draft.maklumat.mata_pelajaran}`,
      `Kelas: ${draft.maklumat.kelas}`,
      `Tarikh: ${draft.maklumat.tarikh} | Masa: ${draft.maklumat.masa} | ${draft.maklumat.minggu_rpt}`,
      '',
      `Tema: ${draft.kurikulum.tema}`,
      `Standard Kandungan: ${draft.kurikulum.standard_kandungan}`,
      `Standard Pembelajaran: ${draft.kurikulum.standard_pembelajaran}`,
      '',
      'Objektif Pembelajaran:',
      ...draft.objektif.map((o, i) => `${i + 1}. ${o}`),
      '',
      'Kriteria Kejayaan:',
      ...draft.kriteria_kejayaan.map((k, i) => `- ${k}`),
      '',
      `Aktiviti PdPc (Jumlah: ${draft.jumlah_minit} minit):`,
      ...draft.aktiviti.map(
        (a) =>
          `[${phaseLabel(a.fasa)} - ${a.minit} minit] ${a.huraian}\n  Guru: ${a.peranan_guru}\n  Murid: ${a.peranan_murid}`
      ),
      '',
      `BBM: ${draft.bbm.join(', ')}`,
      `EMK: ${draft.emk.join(', ')}`,
      `KBAT (${draft.kbat.aras_bloom}): ${draft.kbat.soalan_atau_tugasan}`,
      `Pentaksiran (${draft.pentaksiran.jenis} - ${draft.pentaksiran.kaedah}): ${draft.pentaksiran.soalan_atau_tugasan}`,
      `Pembezaan Pemulihan: ${draft.pembezaan.pemulihan}`,
      `Pembezaan Pengayaan: ${draft.pembezaan.pengayaan}`,
      `Refleksi Guru: ${teacherReflection || '(Diisi oleh guru selepas sesi PdPc)'}`,
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSaveClick = () => {
    onSaveDraft();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  // Loading Skeleton
  if (isGenerating) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="space-y-2">
            <div className="h-5 w-56 bg-slate-200 rounded animate-pulse" />
            <div className="h-3.5 w-80 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-8 w-44 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Error Banner
  if (errorMessage) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Penjanaan Draf Tidak Berjaya
            </h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!draft) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 lg:p-10 space-y-6">
        <div className="max-w-xl space-y-3">
          <p className="text-xs font-medium text-sky-700">
            Ruang Semakan Guru · Rekaan Terbalik &amp; Struktur Rosenshine
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Sediakan draf RPH yang sepadan tepat dengan RPT mingguan anda
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Lengkapkan pemboleh ubah di sebelah kiri atau pilih contoh RPT yang
            disediakan. Sistem akan memadankan Standard Kandungan dan Standard
            Pembelajaran secara verbatim, membina objektif boleh ukur, serta
            mengagihkan masa aktiviti tepat mengikut jadual kelas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-900">
              01. Salinan Verbatim RPT
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Standard dan tema tidak diubah atau diparafrasa daripada DSKP.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-900">
              02. Ketepatan Masa PdPc
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jumlah minit Set Induksi, Perkembangan dan Penutup tepat sama
              dengan tempoh waktu.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-900">
              03. Sumber Bilik Darjah Sebenar
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Aktiviti hanya menggunakan bahan yang benar-benar wujud dalam
              senarai sumber anda.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onLoadSampleAndGenerate}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <FileCheck2 className="w-4 h-4" />
            Jana Contoh PSV Tingkatan 4 Sekarang
          </button>
        </div>
      </div>
    );
  }

  // Computed audits for SIAP state
  const totalActivityMinutes = draft.aktiviti.reduce(
    (sum, item) => sum + (Number(item.minit) || 0),
    0
  );
  const targetMinutes = Number(input.jadual.tempoh_minit) || 0;
  const minutesExactMatch = totalActivityMinutes === targetMinutes;

  const verbatimTemaMatch =
    draft.kurikulum.tema.trim() === input.data_rpt_minggu.tema.trim();
  const verbatimSkMatch =
    draft.kurikulum.standard_kandungan.trim() ===
    input.data_rpt_minggu.standard_kandungan.trim();
  const verbatimSpMatch =
    draft.kurikulum.standard_pembelajaran.trim() ===
    input.data_rpt_minggu.standard_pembelajaran.trim();
  const allVerbatimMatch = verbatimTemaMatch && verbatimSkMatch && verbatimSpMatch;

  const hasKbatEmkAssessment =
    Boolean(draft.kbat?.soalan_atau_tugasan) &&
    draft.emk?.length > 0 &&
    Boolean(draft.pentaksiran?.kaedah);

  const hasDifferentiation =
    Boolean(draft.pembezaan?.pemulihan) && Boolean(draft.pembezaan?.pengayaan);

  const hasStrictLabel = draft.tanda === 'Draf AI – perlu disemak guru';

  const handleObjectiveChange = (idx: number, val: string) => {
    const next = [...draft.objektif];
    next[idx] = val;
    onDraftUpdate({ ...draft, objektif: next });
  };

  const handleSuccessCriteriaChange = (idx: number, val: string) => {
    const next = [...draft.kriteria_kejayaan];
    next[idx] = val;
    onDraftUpdate({ ...draft, kriteria_kejayaan: next });
  };

  const handleActivityChange = <K extends keyof RphActivity>(
    idx: number,
    field: K,
    val: RphActivity[K]
  ) => {
    const nextActs = draft.aktiviti.map((act, i) =>
      i === idx ? { ...act, [field]: val } : act
    );
    const nextSum = nextActs.reduce((acc, a) => acc + (Number(a.minit) || 0), 0);
    onDraftUpdate({ ...draft, aktiviti: nextActs, jumlah_minit: nextSum });
  };

  // Breakdown for Rosenshine analysis
  const phaseTotals = {
    set_induksi: draft.aktiviti
      .filter((a) => a.fasa === 'set_induksi')
      .reduce((s, a) => s + a.minit, 0),
    perkembangan: draft.aktiviti
      .filter((a) => a.fasa === 'perkembangan')
      .reduce((s, a) => s + a.minit, 0),
    penutup: draft.aktiviti
      .filter((a) => a.fasa === 'penutup')
      .reduce((s, a) => s + a.minit, 0),
  };

  return (
    <div className="space-y-4 print-only-full">
      {/* Toolbar (No-Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Status Indicator: Icon + Explicit Text */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {draft.status === 'SIAP' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-800 font-semibold">Status: SIAP</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800 font-semibold">
                Status: PERLU_MAKLUMAT
              </span>
            </>
          )}
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-700 font-medium">{draft.tanda}</span>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('dokumen')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dokumen'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Dokumen RPH
            </button>
            {draft.status === 'SIAP' && (
              <button
                type="button"
                onClick={() => setActiveTab('pedagogi')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'pedagogi'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Analisis Pedagogi
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('json')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'json'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              JSON Sahih
            </button>
          </div>

          {draft.status === 'SIAP' && (
            <>
              <button
                type="button"
                onClick={handleSaveClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Disimpan
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    Simpan
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyPlainText}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                {copiedType === 'text' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Disalin
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    Salin Teks
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleExportWord()}
                disabled={isExportingWord}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-700 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isExportingWord ? 'Menjana Word...' : 'Eksport Word (.docx)'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* JSON Sahih Tab */}
      {activeTab === 'json' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Output JSON Sahih Mengikut Skema
              </h3>
              <p className="text-xs text-slate-500">
                Medan &ldquo;refleksi&rdquo; dikekalkan kosong (&quot;&quot;)
                untuk diisi guru selepas mengajar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {copiedType === 'json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  JSON Disalin
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Salin JSON
                </>
              )}
            </button>
          </div>
          <pre className="p-5 overflow-x-auto font-mono text-xs leading-relaxed text-slate-800 bg-white">
            {JSON.stringify({ ...draft, refleksi: '' }, null, 2)}
          </pre>
        </div>
      )}

      {/* PERLU_MAKLUMAT View */}
      {activeTab !== 'json' && draft.status === 'PERLU_MAKLUMAT' && (
        <div className="bg-white border border-amber-300 rounded-xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div className="text-xs font-medium text-amber-800">
                Peraturan Ketat 2 · Draf RPH Tidak Dijana ({draft.tanda})
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Maklumat RPT Diperlukan Sebelum Menjana RPH
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-amber-50/70 border border-amber-200 rounded-lg p-4">
                {draft.soalan_kepada_guru}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Sistem tidak menjana RPH apabila DATA_RPT_MINGGU kosong, tidak
              lengkap, atau minggu cuti/peperiksaan.
            </span>
            <button
              type="button"
              onClick={onFocusRptSection}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              Kemas Kini Data RPT
            </button>
          </div>
        </div>
      )}

      {/* Pedagogical Analysis Tab */}
      {activeTab === 'pedagogi' && draft.status === 'SIAP' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Agihan Masa Struktur Pengajaran (Rosenshine, 2012)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Panduan nisbah: Set Induksi (~10%) · Perkembangan (~75–80%) ·
                  Penutup (~10%)
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {totalActivityMinutes} / {targetMinutes} minit
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="h-4 w-full rounded-lg overflow-hidden flex bg-slate-100 border border-slate-200">
              {totalActivityMinutes > 0 && (
                <>
                  <div
                    style={{
                      width: `${(phaseTotals.set_induksi / totalActivityMinutes) * 100}%`,
                    }}
                    className="bg-sky-700 h-full"
                    title={`Set Induksi: ${phaseTotals.set_induksi} minit`}
                  />
                  <div
                    style={{
                      width: `${(phaseTotals.perkembangan / totalActivityMinutes) * 100}%`,
                    }}
                    className="bg-slate-700 h-full"
                    title={`Perkembangan: ${phaseTotals.perkembangan} minit`}
                  />
                  <div
                    style={{
                      width: `${(phaseTotals.penutup / totalActivityMinutes) * 100}%`,
                    }}
                    className="bg-emerald-600 h-full"
                    title={`Penutup: ${phaseTotals.penutup} minit`}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1 text-xs">
              <div>
                <div className="font-medium text-sky-800">Set Induksi</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {phaseTotals.set_induksi} minit (
                  {totalActivityMinutes > 0
                    ? Math.round(
                        (phaseTotals.set_induksi / totalActivityMinutes) * 100
                      )
                    : 0}
                  %)
                </div>
              </div>
              <div>
                <div className="font-medium text-slate-800">Perkembangan</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {phaseTotals.perkembangan} minit (
                  {totalActivityMinutes > 0
                    ? Math.round(
                        (phaseTotals.perkembangan / totalActivityMinutes) * 100
                      )
                    : 0}
                  %)
                </div>
              </div>
              <div>
                <div className="font-medium text-emerald-800">Penutup</div>
                <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {phaseTotals.penutup} minit (
                  {totalActivityMinutes > 0
                    ? Math.round(
                        (phaseTotals.penutup / totalActivityMinutes) * 100
                      )
                    : 0}
                  %)
                </div>
              </div>
            </div>
          </div>

          {/* Backward Design Alignment */}
          <div className="p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Penjajaran Rekaan Terbalik (Wiggins &amp; McTighe)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <div className="text-xs font-semibold text-sky-800">
                  Langkah 1 · Hasil Diharapkan
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {draft.objektif.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <div className="text-xs font-semibold text-sky-800">
                  Langkah 2 · Bukti Pembelajaran
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    {draft.pentaksiran.jenis.toUpperCase()} ({draft.pentaksiran.kaedah}):
                  </span>{' '}
                  {draft.pentaksiran.soalan_atau_tugasan}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Rubrik: {draft.pentaksiran.rubrik_ringkas}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 space-y-2">
                <div className="text-xs font-semibold text-sky-800">
                  Langkah 4–5 · KBAT &amp; Pembezaan
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold">
                    Aras {draft.kbat.aras_bloom}:
                  </span>{' '}
                  {draft.kbat.soalan_atau_tugasan}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium">Pemulihan:</span>{' '}
                  {draft.pembezaan.pemulihan}
                </p>
              </div>
            </div>
          </div>

          {/* 7-Point Compliance Checklist */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Semakan Pematuhan Kendiri (Langkah 7)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    allVerbatimMatch ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>
                  Standard &amp; tema disalin verbatim daripada RPT (
                  {allVerbatimMatch ? 'Tepat' : 'Disunting guru'})
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    minutesExactMatch ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>
                  Jumlah minit = tempoh waktu ({totalActivityMinutes}/
                  {targetMinutes} minit)
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    hasKbatEmkAssessment ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>Ada KBAT, EMK dan Pentaksiran</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    hasDifferentiation ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>Ada Pembezaan (Pemulihan &amp; Pengayaan)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Tiada nama atau data peribadi murid</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    hasStrictLabel ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <span>Bertanda &ldquo;Draf AI – perlu disemak guru&rdquo;</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dokumen RPH View */}
      {activeTab === 'dokumen' && draft.status === 'SIAP' && (
        <article className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 print:border-slate-300">
          {/* Document Title & Stamp */}
          <div className="p-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              {schoolFormat?.namaSekolah?.trim() && (
                <p className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  {schoolFormat.namaSekolah}
                </p>
              )}
              <p className="text-xs font-medium text-slate-500">
                {input.kurikulum} · {input.templat_rph.split('(')[0].trim()}
                {schoolFormat?.namaGuru?.trim()
                  ? ` · Guru: ${schoolFormat.namaGuru}`
                  : ''}
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
                {schoolFormat?.tajukRph?.trim() ||
                  'Rancangan Pengajaran Harian (RPH)'}
              </h2>
            </div>
            <div className="border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50">
              {draft.tanda}
            </div>
          </div>

          {/* Maklumat Am Table */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs">
            <div className="p-4">
              <div className="text-slate-500">Mata Pelajaran</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {draft.maklumat.mata_pelajaran}
              </div>
            </div>
            <div className="p-4">
              <div className="text-slate-500">Kelas</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {draft.maklumat.kelas}
              </div>
            </div>
            <div className="p-4">
              <div className="text-slate-500">Minggu RPT</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {draft.maklumat.minggu_rpt}
              </div>
            </div>
            <div className="p-4">
              <div className="text-slate-500">Tarikh</div>
              <div className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                {draft.maklumat.tarikh}
              </div>
            </div>
            <div className="p-4 col-span-2 sm:col-span-1">
              <div className="text-slate-500">Masa</div>
              <div className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                {draft.maklumat.masa}
              </div>
            </div>
          </div>

          {/* Kurikulum (Verbatim RPT) */}
          <div className="p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Kurikulum &amp; Standard RPT
              </h3>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {allVerbatimMatch
                  ? 'Disalin verbatim daripada DATA_RPT_MINGGU'
                  : 'Telah diselaraskan'}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                <dt className="text-xs font-medium text-slate-500">Tema</dt>
                <dd className="sm:col-span-3 text-slate-900 font-medium">
                  {draft.kurikulum.tema}
                </dd>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                <dt className="text-xs font-medium text-slate-500">
                  Standard Kandungan
                </dt>
                <dd className="sm:col-span-3 text-slate-800 leading-relaxed">
                  {draft.kurikulum.standard_kandungan}
                </dd>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                <dt className="text-xs font-medium text-slate-500">
                  Standard Pembelajaran
                </dt>
                <dd className="sm:col-span-3 text-slate-800 leading-relaxed">
                  {draft.kurikulum.standard_pembelajaran}
                </dd>
              </div>
            </dl>
          </div>

          {/* Objektif & Kriteria Kejayaan */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Objektif Pembelajaran
                </h3>
                <span className="no-print text-[11px] text-slate-400">
                  Klik untuk sunting
                </span>
              </div>
              <div className="space-y-2">
                {draft.objektif.map((obj, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-slate-400 mt-2 tabular-nums">
                      {idx + 1}.
                    </span>
                    <textarea
                      rows={2}
                      value={obj}
                      onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                      className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 leading-relaxed focus:outline-none resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Kriteria Kejayaan
                </h3>
                <span className="no-print text-[11px] text-slate-400">
                  Klik untuk sunting
                </span>
              </div>
              <div className="space-y-2">
                {draft.kriteria_kejayaan.map((kk, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-slate-400 mt-2">
                      ·
                    </span>
                    <textarea
                      rows={2}
                      value={kk}
                      onChange={(e) =>
                        handleSuccessCriteriaChange(idx, e.target.value)
                      }
                      className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 leading-relaxed focus:outline-none resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aktiviti PdPc (Struktur Rosenshine) */}
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Aktiviti Pengajaran &amp; Pembelajaran (PdPc)
                </h3>
                <p className="text-xs text-slate-500">
                  Disusun mengikut struktur Rosenshine (Set Induksi, Model
                  Guru, Amalan Berpandu, Amalan Bebas, Penutup).
                </p>
              </div>
              <div
                className={`font-mono text-xs font-semibold tabular-nums ${
                  minutesExactMatch ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                Jumlah Masa: {totalActivityMinutes} / {targetMinutes} minit{' '}
                {minutesExactMatch ? '· Tepat' : '· Tidak sepadan'}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <th className="py-2.5 px-3 w-28">Fasa</th>
                    <th className="py-2.5 px-3 w-20 text-right">Minit</th>
                    <th className="py-2.5 px-3">Huraian Aktiviti</th>
                    <th className="py-2.5 px-3">Peranan Guru</th>
                    <th className="py-2.5 px-3">Peranan Murid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 align-top">
                  {draft.aktiviti.map((act, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-xs font-semibold text-slate-800">
                        {phaseLabel(act.fasa)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          min={1}
                          max={240}
                          value={act.minit}
                          onChange={(e) =>
                            handleActivityChange(
                              idx,
                              'minit',
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          aria-label={`Minit ${phaseLabel(act.fasa)}`}
                          className="w-14 rounded border border-slate-200 px-1.5 py-1 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums focus:border-sky-700 focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <textarea
                          rows={3}
                          value={act.huraian}
                          onChange={(e) =>
                            handleActivityChange(idx, 'huraian', e.target.value)
                          }
                          className="w-full min-w-[160px] rounded border border-transparent hover:border-slate-200 focus:border-sky-700 p-1 text-xs text-slate-800 leading-relaxed focus:outline-none resize-y"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <textarea
                          rows={3}
                          value={act.peranan_guru}
                          onChange={(e) =>
                            handleActivityChange(
                              idx,
                              'peranan_guru',
                              e.target.value
                            )
                          }
                          className="w-full min-w-[150px] rounded border border-transparent hover:border-slate-200 focus:border-sky-700 p-1 text-xs text-slate-700 leading-relaxed focus:outline-none resize-y"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <textarea
                          rows={3}
                          value={act.peranan_murid}
                          onChange={(e) =>
                            handleActivityChange(
                              idx,
                              'peranan_murid',
                              e.target.value
                            )
                          }
                          className="w-full min-w-[150px] rounded border border-transparent hover:border-slate-200 focus:border-sky-700 p-1 text-xs text-slate-700 leading-relaxed focus:outline-none resize-y"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BBM, EMK, KBAT, Pentaksiran (PBD), Pembezaan (Semua Boleh Disunting) */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="edit-bbm"
                    className="text-xs font-semibold text-slate-500"
                  >
                    Bahan Bantu Mengajar (BBM)
                  </label>
                  <span className="no-print text-[11px] text-slate-400">
                    Pisahkan dengan koma
                  </span>
                </div>
                <input
                  id="edit-bbm"
                  type="text"
                  value={draft.bbm.join(', ')}
                  onChange={(e) =>
                    onDraftUpdate({
                      ...draft,
                      bbm: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="edit-emk"
                    className="text-xs font-semibold text-slate-500"
                  >
                    Elemen Merentas Kurikulum (EMK)
                  </label>
                  <span className="no-print text-[11px] text-slate-400">
                    Pisahkan dengan koma
                  </span>
                </div>
                <input
                  id="edit-emk"
                  type="text"
                  value={draft.emk.join(', ')}
                  onChange={(e) =>
                    onDraftUpdate({
                      ...draft,
                      emk: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Kemahiran Berfikir Aras Tinggi (KBAT)
                  </span>
                  <input
                    type="text"
                    value={draft.kbat.aras_bloom}
                    onChange={(e) =>
                      onDraftUpdate({
                        ...draft,
                        kbat: { ...draft.kbat, aras_bloom: e.target.value },
                      })
                    }
                    aria-label="Aras Bloom KBAT"
                    className="w-32 rounded border border-transparent hover:border-slate-200 focus:border-sky-700 px-1.5 py-0.5 text-right text-xs font-medium text-sky-800 focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  value={draft.kbat.soalan_atau_tugasan}
                  onChange={(e) =>
                    onDraftUpdate({
                      ...draft,
                      kbat: {
                        ...draft.kbat,
                        soalan_atau_tugasan: e.target.value,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 leading-relaxed focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Pentaksiran Bilik Darjah (PBD ·{' '}
                    {draft.pentaksiran.jenis.toUpperCase()})
                  </span>
                  <input
                    type="text"
                    value={draft.pentaksiran.kaedah}
                    onChange={(e) =>
                      onDraftUpdate({
                        ...draft,
                        pentaksiran: {
                          ...draft.pentaksiran,
                          kaedah: e.target.value,
                        },
                      })
                    }
                    aria-label="Kaedah PBD"
                    className="w-44 rounded border border-transparent hover:border-slate-200 focus:border-sky-700 px-1.5 py-0.5 text-right text-xs font-medium text-slate-700 focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  value={draft.pentaksiran.soalan_atau_tugasan}
                  onChange={(e) =>
                    onDraftUpdate({
                      ...draft,
                      pentaksiran: {
                        ...draft.pentaksiran,
                        soalan_atau_tugasan: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-sm text-slate-800 leading-relaxed focus:outline-none resize-y"
                />
                <div className="flex items-start gap-1.5 text-xs text-slate-600">
                  <span className="font-medium text-slate-700 mt-1 shrink-0">
                    Rubrik / TP:
                  </span>
                  <textarea
                    rows={2}
                    value={draft.pentaksiran.rubrik_ringkas}
                    onChange={(e) =>
                      onDraftUpdate({
                        ...draft,
                        pentaksiran: {
                          ...draft.pentaksiran,
                          rubrik_ringkas: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 focus:bg-slate-50/40 px-2 py-1 text-xs text-slate-700 leading-relaxed focus:outline-none resize-y"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <h4 className="text-xs font-semibold text-slate-500">
                  Pembezaan PdPc
                </h4>
                <div className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 mt-1 shrink-0">
                    Pemulihan:
                  </span>
                  <textarea
                    rows={2}
                    value={draft.pembezaan.pemulihan}
                    onChange={(e) =>
                      onDraftUpdate({
                        ...draft,
                        pembezaan: {
                          ...draft.pembezaan,
                          pemulihan: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 px-2 py-1 text-xs text-slate-700 leading-relaxed focus:outline-none resize-y"
                  />
                </div>
                <div className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900 mt-1 shrink-0">
                    Pengayaan:
                  </span>
                  <textarea
                    rows={2}
                    value={draft.pembezaan.pengayaan}
                    onChange={(e) =>
                      onDraftUpdate({
                        ...draft,
                        pembezaan: {
                          ...draft.pembezaan,
                          pengayaan: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-md border border-transparent hover:border-slate-200 focus:border-sky-700 px-2 py-1 text-xs text-slate-700 leading-relaxed focus:outline-none resize-y"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ruangan Refleksi Guru */}
          <div className="p-6 space-y-2 bg-slate-50/40 rounded-b-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="teacher-reflection"
                className="text-sm font-semibold text-slate-900"
              >
                Refleksi Guru (Diisi selepas mengajar)
              </label>
              <span className="text-xs text-slate-500">
                Medan &ldquo;refleksi&rdquo; dalam JSON AI sentiasa kosong
                (&quot;&quot;)
              </span>
            </div>
            <textarea
              id="teacher-reflection"
              rows={3}
              value={teacherReflection}
              onChange={(e) => onTeacherReflectionChange(e.target.value)}
              placeholder="Catatkan bilangan murid yang mencapai objektif dan tindakan susulan selepas sesi pengajaran tamat..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            />

            {schoolFormat?.sertakanTandatanganPk && (
              <div className="hidden print:grid grid-cols-2 gap-8 pt-6 text-xs text-slate-700">
                <div className="space-y-8">
                  <div className="font-semibold">Disediakan oleh:</div>
                  <div className="border-t border-slate-400 pt-1">
                    {schoolFormat.namaGuru?.trim() || 'Guru Mata Pelajaran'}
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="font-semibold">Disemak oleh (PK / GPK):</div>
                  <div className="border-t border-slate-400 pt-1">
                    Tandatangan &amp; Tarikh Semakan
                  </div>
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
};
