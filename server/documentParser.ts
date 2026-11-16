import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  DocumentKind,
  DskpSyllabusContext,
  HariMinggu,
  RptEntry,
  TimetableSlot,
} from '../src/types/rph.ts';
import { computeDurationMinutes } from './workspaceStore.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function createAiClient(apiKey: string) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fileToGeminiContentParts(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  promptText: string
) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.docx')) {
    const res = await mammoth.extractRawText({ buffer: fileBuffer });
    return [
      {
        text: `${promptText}\n\n--- KANDUNGAN DOKUMEN WORD (${fileName}) ---\n${res.value}`,
      },
    ];
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetsText = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `=== Helaian: ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n\n');
    return [
      {
        text: `${promptText}\n\n--- KANDUNGAN HAMPARAN EXCEL (${fileName}) ---\n${sheetsText}`,
      },
    ];
  }

  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json') ||
    mimeType.startsWith('text/')
  ) {
    const text = fileBuffer.toString('utf8');
    return [
      {
        text: `${promptText}\n\n--- KANDUNGAN FAIL TEKS (${fileName}) ---\n${text}`,
      },
    ];
  }

  // PDF or image (PNG, JPG, WEBP) sent directly as multimodal inlineData
  const resolvedMime =
    lower.endsWith('.pdf')
      ? 'application/pdf'
      : lower.endsWith('.png')
        ? 'image/png'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : mimeType || 'image/jpeg';

  return [
    {
      inlineData: {
        mimeType: resolvedMime,
        data: fileBuffer.toString('base64'),
      },
    },
    {
      text: promptText,
    },
  ];
}

const VALID_DAYS: HariMinggu[] = [
  'Ahad',
  'Isnin',
  'Selasa',
  'Rabu',
  'Khamis',
  'Jumaat',
  'Sabtu',
];

function normalizeDay(day: string): HariMinggu {
  const lower = (day || '').toLowerCase();
  if (lower.includes('ahad') || lower.includes('sun')) return 'Ahad';
  if (lower.includes('isn') || lower.includes('mon')) return 'Isnin';
  if (lower.includes('sel') || lower.includes('tue')) return 'Selasa';
  if (lower.includes('rab') || lower.includes('wed')) return 'Rabu';
  if (lower.includes('kha') || lower.includes('thu')) return 'Khamis';
  if (lower.includes('jum') || lower.includes('fri')) return 'Jumaat';
  if (lower.includes('sab') || lower.includes('sat')) return 'Sabtu';
  return VALID_DAYS.includes(day as HariMinggu) ? (day as HariMinggu) : 'Isnin';
}

export interface ParsedDocumentResult {
  kind: DocumentKind;
  summary: string;
  timetable?: TimetableSlot[];
  rptEntries?: RptEntry[];
  syllabus?: DskpSyllabusContext;
}

export async function parseUploadedTeacherDocument(params: {
  apiKey: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  fileBuffer?: Buffer;
  rawText?: string;
}): Promise<ParsedDocumentResult> {
  const ai = createAiClient(params.apiKey);

  if (params.kind === 'jadual') {
    const prompt = `Ekstrak semua slot waktu mengajar guru daripada dokumen JADUAL MENGAJAR ini ke dalam JSON.
Peraturan:
- Abaikan waktu rehat, perhimpunan, atau masa kosong (free period).
- Tukar nama hari ke Bahasa Melayu baku: "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", atau "Ahad".
- Format masa dalam HH:mm (24 jam, contoh 08:10, 13:40).
- Kira tempoh_minit dengan tepat berdasarkan masa_mula dan masa_tamat.
- Kenal pasti mata_pelajaran, kelas (contoh "Tingkatan 4 Bestari" atau "Tahun 5 Arif"), kurikulum (contoh "KSSM (DSKP Semakan Terkini)" atau "KSSR Semakan (DSKP Terkini)"), dan bilik jika dinyatakan.`;

    const parts = params.fileBuffer
      ? await fileToGeminiContentParts(
          params.fileBuffer,
          params.fileName,
          params.mimeType,
          prompt
        )
      : [{ text: `${prompt}\n\n--- TEKS JADUAL ---\n${params.rawText ?? ''}` }];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ringkasan: { type: Type.STRING },
            slots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hari: { type: Type.STRING },
                  masa_mula: { type: Type.STRING },
                  masa_tamat: { type: Type.STRING },
                  tempoh_minit: { type: Type.INTEGER },
                  mata_pelajaran: { type: Type.STRING },
                  kelas: { type: Type.STRING },
                  kurikulum: { type: Type.STRING },
                  bilik: { type: Type.STRING },
                },
                required: [
                  'hari',
                  'masa_mula',
                  'masa_tamat',
                  'tempoh_minit',
                  'mata_pelajaran',
                  'kelas',
                ],
              },
            },
          },
          required: ['ringkasan', 'slots'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      ringkasan?: string;
      slots?: Array<Omit<TimetableSlot, 'id'>>;
    };

    const timetable: TimetableSlot[] = (parsed.slots ?? []).map((s, idx) => ({
      id: `slot-${Date.now()}-${idx}`,
      hari: normalizeDay(s.hari),
      masa_mula: s.masa_mula || '08:00',
      masa_tamat: s.masa_tamat || '09:00',
      tempoh_minit:
        s.tempoh_minit > 0
          ? s.tempoh_minit
          : computeDurationMinutes(s.masa_mula, s.masa_tamat),
      mata_pelajaran: s.mata_pelajaran || 'Mata Pelajaran',
      kelas: s.kelas || 'Kelas',
      kurikulum: s.kurikulum || 'KSSM (DSKP Semakan Terkini)',
      bilik: s.bilik || '',
    }));

    return {
      kind: 'jadual',
      summary:
        parsed.ringkasan ||
        `${timetable.length} slot waktu mengajar berjaya diekstrak daripada ${params.fileName}.`,
      timetable,
    };
  }

  if (params.kind === 'rpt') {
    const prompt = `Ekstrak semua entri mingguan daripada dokumen RANCANGAN PENGAJARAN TAHUNAN (RPT) ini ke dalam JSON.
PERATURAN KETAT:
- Salin tema, standard_kandungan, dan standard_pembelajaran secara VERBATIM daripada dokumen asal tanpa memarafrasa atau memendekkan ayat rasmi kurikulum.
- Jika sesuatu minggu adalah minggu cuti, peperiksaan, atau pentaksiran sekolah tanpa PdPc baharu, kekalkan entri minggu itu dan nyatakan dengan jelas dalam medan catatan (serta biarkan standard_kandungan dan standard_pembelajaran kosong jika tiada dalam dokumen).
- Ekstrak minggu_nombor sebagai nombor bulat (contoh "Minggu 12" -> 12).`;

    const parts = params.fileBuffer
      ? await fileToGeminiContentParts(
          params.fileBuffer,
          params.fileName,
          params.mimeType,
          prompt
        )
      : [{ text: `${prompt}\n\n--- TEKS RPT ---\n${params.rawText ?? ''}` }];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ringkasan: { type: Type.STRING },
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  mata_pelajaran: { type: Type.STRING },
                  tingkatan_tahun: { type: Type.STRING },
                  minggu: { type: Type.STRING },
                  minggu_nombor: { type: Type.INTEGER },
                  tema: { type: Type.STRING },
                  standard_kandungan: { type: Type.STRING },
                  standard_pembelajaran: { type: Type.STRING },
                  catatan: { type: Type.STRING },
                },
                required: [
                  'mata_pelajaran',
                  'tingkatan_tahun',
                  'minggu',
                  'minggu_nombor',
                  'tema',
                  'standard_kandungan',
                  'standard_pembelajaran',
                  'catatan',
                ],
              },
            },
          },
          required: ['ringkasan', 'entries'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      ringkasan?: string;
      entries?: Array<Omit<RptEntry, 'id'>>;
    };

    const rptEntries: RptEntry[] = (parsed.entries ?? []).map((e, idx) => {
      const weekNum =
        Number(e.minggu_nombor) ||
        Number((e.minggu || '').match(/\d+/)?.[0]) ||
        idx + 1;
      return {
        id: `rpt-${Date.now()}-${idx}`,
        mata_pelajaran: e.mata_pelajaran || 'Mata Pelajaran',
        tingkatan_tahun: e.tingkatan_tahun || 'Tingkatan / Tahun',
        minggu: e.minggu || `Minggu ${weekNum}`,
        minggu_nombor: weekNum,
        tema: e.tema || '',
        standard_kandungan: e.standard_kandungan || '',
        standard_pembelajaran: e.standard_pembelajaran || '',
        catatan: e.catatan || '',
      };
    });

    return {
      kind: 'rpt',
      summary:
        parsed.ringkasan ||
        `${rptEntries.length} entri mingguan RPT berjaya diekstrak daripada ${params.fileName}.`,
      rptEntries,
    };
  }

  // kind === 'sukatan'
  const prompt = `Ekstrak maklumat rujukan SUKATAN PELAJARAN / DSKP ini ke dalam JSON untuk membantu pembinaan aktiviti, pentaksiran TP1–TP6, dan EMK dalam RPH.
Sertakan:
- mata_pelajaran, tingkatan_tahun, kurikulum
- ringkasan_kandungan (huraian ringkas fokus kurikulum, kemahiran utama, dan panduan pentaksiran bilik darjah daripada dokumen ini)
- standard_rujukan (senarai hingga 15 standard utama beserta kod, standard_kandungan, standard_pembelajaran, dan tahap_penguasaan jika ada).`;

  const parts = params.fileBuffer
    ? await fileToGeminiContentParts(
        params.fileBuffer,
        params.fileName,
        params.mimeType,
        prompt
      )
    : [{ text: `${prompt}\n\n--- TEKS SUKATAN / DSKP ---\n${params.rawText ?? ''}` }];

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ringkasan: { type: Type.STRING },
          mata_pelajaran: { type: Type.STRING },
          tingkatan_tahun: { type: Type.STRING },
          kurikulum: { type: Type.STRING },
          ringkasan_kandungan: { type: Type.STRING },
          standard_rujukan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kod: { type: Type.STRING },
                standard_kandungan: { type: Type.STRING },
                standard_pembelajaran: { type: Type.STRING },
                tahap_penguasaan: { type: Type.STRING },
              },
              required: ['kod', 'standard_kandungan', 'standard_pembelajaran'],
            },
          },
        },
        required: [
          'ringkasan',
          'mata_pelajaran',
          'tingkatan_tahun',
          'kurikulum',
          'ringkasan_kandungan',
          'standard_rujukan',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    ringkasan?: string;
    mata_pelajaran?: string;
    tingkatan_tahun?: string;
    kurikulum?: string;
    ringkasan_kandungan?: string;
    standard_rujukan?: DskpSyllabusContext['standard_rujukan'];
  };

  const syllabus: DskpSyllabusContext = {
    id: `dskp-${Date.now()}`,
    fileName: params.fileName,
    uploadedAt: new Date().toISOString(),
    mata_pelajaran: parsed.mata_pelajaran || 'Mata Pelajaran',
    tingkatan_tahun: parsed.tingkatan_tahun || 'Umum',
    kurikulum: parsed.kurikulum || 'KSSM / KSSR Semakan',
    ringkasan_kandungan: parsed.ringkasan_kandungan || '',
    standard_rujukan: parsed.standard_rujukan ?? [],
  };

  return {
    kind: 'sukatan',
    summary:
      parsed.ringkasan ||
      `Sukatan pelajaran ${syllabus.mata_pelajaran} (${syllabus.standard_rujukan.length} standard rujukan) diekstrak daripada ${params.fileName}.`,
    syllabus,
  };
}
