import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
  Code2,
  FileText,
  Layers,
  Loader2,
  Plus,
  Send,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  COMMON_RESOURCES,
  CURRICULUM_OPTIONS,
  RPH_TEMPLATES,
  RPT_PRESETS,
} from '../data/presets';
import type { RphRequestInput, RptWeekData } from '../types/rph';

interface RphInputFormProps {
  value: RphRequestInput;
  onChange: (next: RphRequestInput) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  rptSectionRef?: React.RefObject<HTMLDivElement | null>;
}

function computeDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 60;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 60;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

function detectPersonalDataRisk(text: string): boolean {
  const lowered = text.toLowerCase();
  if (/\b(bin|binti|a\/l|a\/p)\b/.test(lowered)) return true;
  if (/\b\d{6}-\d{2}-\d{4}\b/.test(lowered)) return true;
  if (/\b\d{12}\b/.test(lowered)) return true;
  return false;
}

export const RphInputForm: React.FC<RphInputFormProps> = ({
  value,
  onChange,
  onSubmit,
  isGenerating,
  rptSectionRef,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('psv-t4');
  const [rptJsonMode, setRptJsonMode] = useState<boolean>(false);
  const [rptJsonText, setRptJsonText] = useState<string>('');
  const [rptJsonError, setRptJsonError] = useState<string | null>(null);
  const [customResource, setCustomResource] = useState<string>('');

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = RPT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const cloned: RphRequestInput = JSON.parse(JSON.stringify(preset.data));
      onChange(cloned);
      setRptJsonText(JSON.stringify(cloned.data_rpt_minggu, null, 2));
      setRptJsonError(null);
    }
  };

  const updateRptField = <K extends keyof RptWeekData>(field: K, val: string) => {
    const nextRpt = { ...value.data_rpt_minggu, [field]: val };
    onChange({ ...value, data_rpt_minggu: nextRpt });
  };

  const toggleRptJsonMode = () => {
    if (!rptJsonMode) {
      setRptJsonText(JSON.stringify(value.data_rpt_minggu, null, 2));
      setRptJsonError(null);
      setRptJsonMode(true);
    } else {
      setRptJsonMode(false);
    }
  };

  const handleRptJsonChange = (raw: string) => {
    setRptJsonText(raw);
    try {
      const parsed = JSON.parse(raw) as Partial<RptWeekData>;
      setRptJsonError(null);
      onChange({
        ...value,
        data_rpt_minggu: {
          minggu: String(parsed.minggu ?? ''),
          tema: String(parsed.tema ?? ''),
          standard_kandungan: String(parsed.standard_kandungan ?? ''),
          standard_pembelajaran: String(parsed.standard_pembelajaran ?? ''),
          catatan: String(parsed.catatan ?? ''),
        },
      });
    } catch {
      setRptJsonError('Format JSON tidak sah. Sila semak tanda petik dan koma.');
    }
  };

  const handleTimeChange = (field: 'masa_mula' | 'masa_tamat', val: string) => {
    const nextSchedule = { ...value.jadual, [field]: val };
    nextSchedule.tempoh_minit = computeDurationMinutes(
      nextSchedule.masa_mula,
      nextSchedule.masa_tamat
    );
    onChange({ ...value, jadual: nextSchedule });
  };

  const toggleResource = (res: string) => {
    const exists = value.sumber_ada.includes(res);
    const next = exists
      ? value.sumber_ada.filter((item) => item !== res)
      : [...value.sumber_ada, res];
    onChange({ ...value, sumber_ada: next });
  };

  const addCustomResource = () => {
    const trimmed = customResource.trim();
    if (!trimmed) return;
    if (!value.sumber_ada.includes(trimmed)) {
      onChange({ ...value, sumber_ada: [...value.sumber_ada, trimmed] });
    }
    setCustomResource('');
  };

  const privacyWarning =
    detectPersonalDataRisk(value.profil_kelas.bil_murid) ||
    detectPersonalDataRisk(value.profil_kelas.tahap_penguasaan_umum) ||
    detectPersonalDataRisk(value.profil_kelas.keperluan_khas_umum) ||
    detectPersonalDataRisk(value.catatan_guru);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rptJsonError) return;
    onSubmit();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200"
    >
      {/* 1. Preset RPT */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-700 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              Muat Contoh RPT Guru
            </h2>
          </div>
          <span className="text-xs text-slate-500">Pilihan pantas</span>
        </div>

        <label htmlFor="preset-select" className="sr-only">
          Pilih contoh RPT
        </label>
        <select
          id="preset-select"
          value={selectedPresetId}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-700/15"
        >
          {RPT_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label} — {preset.subtitle}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Maklumat Asas & Kurikulum */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-700 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900">
            Maklumat Mata Pelajaran & Kurikulum
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="mata-pelajaran"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Mata Pelajaran
            </label>
            <input
              id="mata-pelajaran"
              type="text"
              value={value.mata_pelajaran}
              onChange={(e) =>
                onChange({ ...value, mata_pelajaran: e.target.value })
              }
              placeholder="cth. Pendidikan Seni Visual"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>

          <div>
            <label
              htmlFor="tingkatan-tahun"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Tingkatan / Tahun
            </label>
            <input
              id="tingkatan-tahun"
              type="text"
              value={value.tingkatan_tahun}
              onChange={(e) =>
                onChange({ ...value, tingkatan_tahun: e.target.value })
              }
              placeholder="cth. Tingkatan 4"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="kurikulum"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Kurikulum / Dokumen
            </label>
            <select
              id="kurikulum"
              value={value.kurikulum}
              onChange={(e) =>
                onChange({ ...value, kurikulum: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            >
              {CURRICULUM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="templat-rph"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Templat RPH Sekolah / PPD
            </label>
            <select
              id="templat-rph"
              value={value.templat_rph}
              onChange={(e) =>
                onChange({ ...value, templat_rph: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            >
              {RPH_TEMPLATES.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. DATA_RPT_MINGGU */}
      <div ref={rptSectionRef} className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-700 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              Data RPT Minggu
            </h2>
          </div>

          <button
            type="button"
            onClick={toggleRptJsonMode}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            <Code2 className="w-3.5 h-3.5" />
            {rptJsonMode ? 'Mod Borang' : 'Mod JSON RPT'}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Tema, Standard Kandungan dan Standard Pembelajaran akan disalin secara{' '}
          <span className="font-medium text-slate-700">verbatim</span> ke dalam
          draf RPH tanpa sebarang perubahan kata.
        </p>

        {rptJsonMode ? (
          <div className="space-y-2">
            <textarea
              rows={8}
              value={rptJsonText}
              onChange={(e) => handleRptJsonChange(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-sky-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            />
            {rptJsonError && (
              <p className="text-xs font-medium text-red-600">{rptJsonError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="rpt-minggu"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Minggu RPT
                </label>
                <input
                  id="rpt-minggu"
                  type="text"
                  value={value.data_rpt_minggu.minggu}
                  onChange={(e) => updateRptField('minggu', e.target.value)}
                  placeholder="cth. Minggu 12"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="rpt-tema"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tema / Tajuk RPT
                </label>
                <input
                  id="rpt-tema"
                  type="text"
                  value={value.data_rpt_minggu.tema}
                  onChange={(e) => updateRptField('tema', e.target.value)}
                  placeholder="cth. Seni Halus: Seni Lukisan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rpt-sk"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Standard Kandungan (SK)
              </label>
              <textarea
                id="rpt-sk"
                rows={2}
                value={value.data_rpt_minggu.standard_kandungan}
                onChange={(e) =>
                  updateRptField('standard_kandungan', e.target.value)
                }
                placeholder="Salin tepat daripada DSKP / RPT..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              />
            </div>

            <div>
              <label
                htmlFor="rpt-sp"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Standard Pembelajaran (SP)
              </label>
              <textarea
                id="rpt-sp"
                rows={2}
                value={value.data_rpt_minggu.standard_pembelajaran}
                onChange={(e) =>
                  updateRptField('standard_pembelajaran', e.target.value)
                }
                placeholder="Salin tepat daripada DSKP / RPT..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              />
            </div>

            <div>
              <label
                htmlFor="rpt-catatan"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Catatan RPT (jika ada / cuti / peperiksaan)
              </label>
              <input
                id="rpt-catatan"
                type="text"
                value={value.data_rpt_minggu.catatan}
                onChange={(e) => updateRptField('catatan', e.target.value)}
                placeholder="cth. Cuti peristiwa / aktiviti amali"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Jadual & Tempoh */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-700 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              Jadual & Tempoh Waktu PdPc
            </h2>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-sky-800 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            <span>{value.jadual.tempoh_minit} minit</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label
              htmlFor="tarikh"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Tarikh
            </label>
            <input
              id="tarikh"
              type="date"
              value={value.jadual.tarikh}
              onChange={(e) =>
                onChange({
                  ...value,
                  jadual: { ...value.jadual, tarikh: e.target.value },
                })
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>

          <div>
            <label
              htmlFor="masa-mula"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Masa Mula
            </label>
            <input
              id="masa-mula"
              type="time"
              value={value.jadual.masa_mula}
              onChange={(e) => handleTimeChange('masa_mula', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>

          <div>
            <label
              htmlFor="masa-tamat"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Masa Tamat
            </label>
            <input
              id="masa-tamat"
              type="time"
              value={value.jadual.masa_tamat}
              onChange={(e) => handleTimeChange('masa_tamat', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>

          <div>
            <label
              htmlFor="tempoh-minit"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Tempoh (Minit)
            </label>
            <input
              id="tempoh-minit"
              type="number"
              min={10}
              max={240}
              step={5}
              value={value.jadual.tempoh_minit}
              onChange={(e) =>
                onChange({
                  ...value,
                  jadual: {
                    ...value.jadual,
                    tempoh_minit: Math.max(10, Number(e.target.value) || 30),
                  },
                })
              }
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-sm font-medium text-slate-900 tabular-nums focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
              required
            />
          </div>
        </div>
      </div>

      {/* 5. Profil Kelas */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-700 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900">
              Profil Kelas (Tanpa Data Peribadi)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="bil-murid"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Bilangan Murid
            </label>
            <input
              id="bil-murid"
              type="text"
              value={value.profil_kelas.bil_murid}
              onChange={(e) =>
                onChange({
                  ...value,
                  profil_kelas: {
                    ...value.profil_kelas,
                    bil_murid: e.target.value,
                  },
                })
              }
              placeholder="cth. 28 orang murid"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            />
          </div>

          <div>
            <label
              htmlFor="tahap-penguasaan"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Tahap Penguasaan Umum
            </label>
            <input
              id="tahap-penguasaan"
              type="text"
              value={value.profil_kelas.tahap_penguasaan_umum}
              onChange={(e) =>
                onChange({
                  ...value,
                  profil_kelas: {
                    ...value.profil_kelas,
                    tahap_penguasaan_umum: e.target.value,
                  },
                })
              }
              placeholder="cth. TP3 hingga TP4"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="keperluan-khas"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Keperluan Khas Secara Umum (jangan nyatakan nama murid)
          </label>
          <input
            id="keperluan-khas"
            type="text"
            value={value.profil_kelas.keperluan_khas_umum}
            onChange={(e) =>
              onChange({
                ...value,
                profil_kelas: {
                  ...value.profil_kelas,
                  keperluan_khas_umum: e.target.value,
                },
              })
            }
            placeholder="cth. 3 orang murid perlukan bimbingan berpandu"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
          />
        </div>

        {privacyWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Peraturan Ketat: Jangan sertakan nama penuh atau nombor pengenalan
              murid dalam profil kelas. Gunakan huraian umum sahaja.
            </span>
          </div>
        )}
      </div>

      {/* 6. Sumber Ada & Catatan Guru */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-sky-700 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-900">
            Sumber Tersedia di Bilik Darjah
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMON_RESOURCES.map((res) => {
            const active = value.sumber_ada.includes(res);
            return (
              <button
                key={res}
                type="button"
                onClick={() => toggleResource(res)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors text-left ${
                  active
                    ? 'border-sky-700 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {res}
              </button>
            );
          })}
          {value.sumber_ada
            .filter((r) => !COMMON_RESOURCES.includes(r))
            .map((custom) => (
              <button
                key={custom}
                type="button"
                onClick={() => toggleResource(custom)}
                className="inline-flex items-center gap-1 rounded-md border border-sky-700 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-900"
              >
                <span>{custom}</span>
                <X className="w-3 h-3" />
              </button>
            ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customResource}
            onChange={(e) => setCustomResource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomResource();
              }
            }}
            placeholder="Tambah sumber lain (cth. kit sains, kompas)..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
          />
          <button
            type="button"
            onClick={addCustomResource}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
        </div>

        <div>
          <label
            htmlFor="catatan-guru"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Catatan / Arahan Tambahan Guru (Pilihan)
          </label>
          <textarea
            id="catatan-guru"
            rows={2}
            value={value.catatan_guru}
            onChange={(e) =>
              onChange({ ...value, catatan_guru: e.target.value })
            }
            placeholder="cth. Fokus aktiviti kumpulan berpasangan, elakkan tugasan berinternet..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/15"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="p-5 bg-slate-50/70 rounded-b-lg flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Guru kekal sebagai pembuat keputusan akhir.
        </span>
        <button
          type="submit"
          disabled={isGenerating || Boolean(rptJsonError)}
          className="inline-flex items-center justify-center gap-2 rounded bg-[#00B4F0] px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white hover:bg-[#0099D6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4F0] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menjana Draf...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Jana Draf RPH
            </>
          )}
        </button>
      </div>
    </form>
  );
};
