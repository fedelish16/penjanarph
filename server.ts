import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  DailyAutoDraft,
  DocumentKind,
  RphDraftOutput,
  RphRequestInput,
  TeacherWorkspaceState,
} from './src/types/rph.ts';
import {
  createDefaultEmptyWorkspace,
  createDemoTeacherWorkspace,
} from './server/demoPack.ts';
import {
  findMatchingRptEntry,
  findMatchingSyllabus,
  getMalayDayName,
  loadWorkspace,
  saveWorkspace,
} from './server/workspaceStore.ts';
import { parseUploadedTeacherDocument } from './server/documentParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const SYSTEM_INSTRUCTION = `# PERANAN
Anda ialah pembantu perancangan pengajaran untuk guru Malaysia. Tugas anda
menyediakan DRAF Rancangan Pengajaran Harian (RPH) yang praktikal,
sepadan dengan Rancangan Pengajaran Tahunan (RPT) guru. Guru ialah pembuat
keputusan akhir. Anda hanya mencadangkan.

# PERATURAN KETAT (tidak boleh dilanggar)
1. Standard kandungan, standard pembelajaran dan tema HANYA boleh disalin
   verbatim daripada DATA_RPT_MINGGU. Jangan reka, ubah atau parafrasa.
2. Jika DATA_RPT_MINGGU kosong, tidak lengkap atau minggu itu cuti/peperiksaan,
   JANGAN jana RPH. Pulangkan status "PERLU_MAKLUMAT" dan satu soalan jelas
   kepada guru.
3. Jumlah minit semua aktiviti mesti TEPAT sama dengan tempoh waktu.
   Semak sendiri sebelum memulangkan output.
4. Jangan sertakan nama atau data peribadi murid.
5. Jangan reka rujukan, sumber, statistik atau pautan. Jika mencadangkan
   bahan luar, huraikan jenis bahan sahaja dan minta guru mengesahkan.
6. Setiap output mesti bertanda: "Draf AI – perlu disemak guru".
7. Gunakan Bahasa Melayu baku yang ringkas, dalam istilah yang digunakan
   dalam dokumen kurikulum Malaysia.

# KAEDAH PENJANAAN (ikut turutan ini)
Langkah 1 - Objektif dahulu (rekaan terbalik, Wiggins & McTighe):
  Tulis 1 hingga 2 objektif yang boleh diukur (guna kata kerja tindakan)
  dan kriteria kejayaan yang boleh dicerap dalam waktu itu.
Langkah 2 - Bukti pembelajaran & Pentaksiran Bilik Darjah (PBD):
  Tentukan apa yang murid hasilkan atau lakukan untuk membuktikan objektif
  tercapai. Dalam medan "pentaksiran", nyatakan kaedah PBD yang jelas
  (Pemerhatian, Lisan atau Penulisan) serta rujukan Tahap Penguasaan
  (TP1–TP6) dalam "rubrik_ringkas" mengikut dokumen kurikulum KSSR/KSSM.
Langkah 3 - Susun aktiviti mengikut struktur pengajaran jelas (Rosenshine, 2012):
  a. Set induksi / semakan pengetahuan lalu (kira-kira 10% masa)
  b. Pengenalan dan model oleh guru (kira-kira 20-25%)
  c. Amalan berpandu (kira-kira 25-30%)
  d. Amalan bebas / hasil murid (kira-kira 25-30%)
  e. Penutup, semakan kefahaman dan refleksi murid (kira-kira 10%)
  Nisbah ini panduan. Laraskan mengikut sifat mata pelajaran dan tempoh waktu.
  Susun fasa sebagai "set_induksi", beberapa langkah "perkembangan" (merangkumi
  pengenalan & model oleh guru, amalan berpandu, dan amalan bebas), serta "penutup".
Langkah 4 - Aras kognitif:
  Padankan objektif dan soalan dengan Taksonomi Bloom Semakan
  (Anderson & Krathwohl, 2001). Sertakan sekurang-kurangnya satu soalan atau
  tugasan aras menganalisis ke atas (KBAT).
Langkah 5 - Pembezaan:
  Cadangkan satu aktiviti sokongan (pemulihan) dan satu pengayaan yang
  berkait terus dengan objektif yang sama, bukan tugasan lain.
Langkah 6 - Realistik:
  Hanya guna bahan dalam SUMBER_ADA. Aktiviti mesti boleh dilaksanakan
  dalam bilik darjah biasa kecuali guru nyatakan lain.
Langkah 7 - Semakan kendiri sebelum output:
  [ ] Standard disalin tepat daripada RPT
  [ ] Setiap aktiviti menyokong objektif
  [ ] Jumlah minit = tempoh waktu
  [ ] Ada KBAT, EMK dan pentaksiran
  [ ] Tiada data peribadi murid
  Jika ada yang gagal, betulkan dahulu.

Medan "refleksi" sentiasa kosong (""). Guru mengisinya selepas mengajar.`;

const RPH_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      description: 'Mesti "SIAP" atau "PERLU_MAKLUMAT".',
    },
    soalan_kepada_guru: {
      type: Type.STRING,
      description:
        'Satu soalan jelas kepada guru jika status ialah PERLU_MAKLUMAT, selain itu kosong.',
    },
    tanda: {
      type: Type.STRING,
      description: 'Sentiasa "Draf AI – perlu disemak guru".',
    },
    maklumat: {
      type: Type.OBJECT,
      properties: {
        mata_pelajaran: { type: Type.STRING },
        kelas: { type: Type.STRING },
        tarikh: { type: Type.STRING },
        masa: { type: Type.STRING },
        minggu_rpt: { type: Type.STRING },
      },
      required: ['mata_pelajaran', 'kelas', 'tarikh', 'masa', 'minggu_rpt'],
    },
    kurikulum: {
      type: Type.OBJECT,
      properties: {
        tema: { type: Type.STRING },
        standard_kandungan: { type: Type.STRING },
        standard_pembelajaran: { type: Type.STRING },
      },
      required: ['tema', 'standard_kandungan', 'standard_pembelajaran'],
    },
    objektif: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    kriteria_kejayaan: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    aktiviti: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fasa: {
            type: Type.STRING,
            description: 'Salah satu daripada: set_induksi, perkembangan, penutup',
          },
          minit: { type: Type.INTEGER },
          huraian: { type: Type.STRING },
          peranan_guru: { type: Type.STRING },
          peranan_murid: { type: Type.STRING },
        },
        required: ['fasa', 'minit', 'huraian', 'peranan_guru', 'peranan_murid'],
      },
    },
    jumlah_minit: { type: Type.INTEGER },
    bbm: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    emk: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    kbat: {
      type: Type.OBJECT,
      properties: {
        aras_bloom: { type: Type.STRING },
        soalan_atau_tugasan: { type: Type.STRING },
      },
      required: ['aras_bloom', 'soalan_atau_tugasan'],
    },
    pentaksiran: {
      type: Type.OBJECT,
      properties: {
        jenis: { type: Type.STRING, description: 'formatif atau sumatif' },
        kaedah: { type: Type.STRING },
        soalan_atau_tugasan: { type: Type.STRING },
        rubrik_ringkas: { type: Type.STRING },
      },
      required: ['jenis', 'kaedah', 'soalan_atau_tugasan', 'rubrik_ringkas'],
    },
    pembezaan: {
      type: Type.OBJECT,
      properties: {
        pemulihan: { type: Type.STRING },
        pengayaan: { type: Type.STRING },
      },
      required: ['pemulihan', 'pengayaan'],
    },
    refleksi: {
      type: Type.STRING,
      description: 'Sentiasa rentetan kosong "".',
    },
  },
  required: [
    'status',
    'soalan_kepada_guru',
    'tanda',
    'maklumat',
    'kurikulum',
    'objektif',
    'kriteria_kejayaan',
    'aktiviti',
    'jumlah_minit',
    'bbm',
    'emk',
    'kbat',
    'pentaksiran',
    'pembezaan',
    'refleksi',
  ],
};

function sanitizeDraftOutput(
  raw: RphDraftOutput,
  input: RphRequestInput
): RphDraftOutput {
  const normalizedStatus: 'SIAP' | 'PERLU_MAKLUMAT' =
    raw.status === 'PERLU_MAKLUMAT' ? 'PERLU_MAKLUMAT' : 'SIAP';

  const result: RphDraftOutput = {
    ...raw,
    status: normalizedStatus,
    tanda: 'Draf AI – perlu disemak guru',
    refleksi: '',
  };

  if (normalizedStatus === 'PERLU_MAKLUMAT') {
    result.soalan_kepada_guru =
      raw.soalan_kepada_guru?.trim() ||
      'Data RPT minggu ini kelihatan tidak lengkap atau merupakan minggu cuti/peperiksaan. Sila kemas kini Standard Kandungan dan Standard Pembelajaran daripada RPT atau sahkan jadual PdPc minggu ini.';
    result.maklumat = {
      mata_pelajaran: input.mata_pelajaran,
      kelas: input.tingkatan_tahun,
      tarikh: input.jadual.tarikh,
      masa: `${input.jadual.masa_mula} - ${input.jadual.masa_tamat} (${input.jadual.tempoh_minit} minit)`,
      minggu_rpt: input.data_rpt_minggu.minggu,
    };
    result.kurikulum = {
      tema: input.data_rpt_minggu.tema || '',
      standard_kandungan: input.data_rpt_minggu.standard_kandungan || '',
      standard_pembelajaran: input.data_rpt_minggu.standard_pembelajaran || '',
    };
    result.aktiviti = [];
    result.jumlah_minit = 0;
    return result;
  }

  // Peraturan Ketat #1: Salin verbatim tema, standard_kandungan, standard_pembelajaran
  result.kurikulum = {
    tema: input.data_rpt_minggu.tema,
    standard_kandungan: input.data_rpt_minggu.standard_kandungan,
    standard_pembelajaran: input.data_rpt_minggu.standard_pembelajaran,
  };

  result.maklumat = {
    mata_pelajaran: input.mata_pelajaran,
    kelas: input.tingkatan_tahun,
    tarikh: input.jadual.tarikh,
    masa: `${input.jadual.masa_mula} - ${input.jadual.masa_tamat} (${input.jadual.tempoh_minit} minit)`,
    minggu_rpt: input.data_rpt_minggu.minggu,
  };

  const targetMinutes = Math.max(
    5,
    Math.round(Number(input.jadual.tempoh_minit) || 60)
  );
  const activities = Array.isArray(raw.aktiviti) ? raw.aktiviti : [];

  if (activities.length > 0) {
    const cleaned = activities.map((act) => ({
      ...act,
      fasa:
        act.fasa === 'set_induksi' || act.fasa === 'penutup'
          ? act.fasa
          : ('perkembangan' as const),
      minit: Math.max(1, Math.round(Number(act.minit) || 0)),
    }));

    const currentSum = cleaned.reduce((acc, a) => acc + a.minit, 0);
    if (currentSum !== targetMinutes) {
      const diff = targetMinutes - currentSum;
      let targetIdx = cleaned.findIndex((a) => a.fasa === 'perkembangan');
      if (targetIdx === -1) {
        targetIdx = cleaned.length - 1;
      }
      const adjusted = cleaned[targetIdx].minit + diff;
      if (adjusted >= 1) {
        cleaned[targetIdx].minit = adjusted;
      } else {
        const ratio = targetMinutes / Math.max(1, currentSum);
        let running = 0;
        for (let i = 0; i < cleaned.length; i++) {
          if (i === cleaned.length - 1) {
            cleaned[i].minit = Math.max(1, targetMinutes - running);
          } else {
            const m = Math.max(1, Math.round(cleaned[i].minit * ratio));
            cleaned[i].minit = m;
            running += m;
          }
        }
      }
    }
    result.aktiviti = cleaned;
    result.jumlah_minit = cleaned.reduce((acc, a) => acc + a.minit, 0);
  } else {
    result.jumlah_minit = 0;
  }

  result.pentaksiran = {
    ...result.pentaksiran,
    jenis: result.pentaksiran?.jenis === 'sumatif' ? 'sumatif' : 'formatif',
  };

  result.soalan_kepada_guru = '';
  return result;
}

function buildUserPrompt(input: RphRequestInput): string {
  return `Sila sediakan draf RPH berdasarkan pemboleh ubah berikut:

- MATA_PELAJARAN: ${input.mata_pelajaran}
- TINGKATAN/TAHUN: ${input.tingkatan_tahun}
- KURIKULUM: ${input.kurikulum}
- DATA_RPT_MINGGU: ${JSON.stringify(input.data_rpt_minggu, null, 2)}
- PROFIL_KELAS: Bilangan murid: ${input.profil_kelas.bil_murid}; Tahap penguasaan umum: ${input.profil_kelas.tahap_penguasaan_umum}; Keperluan khas secara umum: ${input.profil_kelas.keperluan_khas_umum}
- JADUAL: Tarikh ${input.jadual.tarikh}, Masa mula ${input.jadual.masa_mula}, Masa tamat ${input.jadual.masa_tamat}, Tempoh dalam minit: ${input.jadual.tempoh_minit} minit
- SUMBER_ADA: ${input.sumber_ada.length > 0 ? input.sumber_ada.join(', ') : 'Papan putih dan buku teks sahaja'}
- TEMPLAT_RPH: ${input.templat_rph}
- CATATAN_GURU: ${input.catatan_guru || 'Tiada catatan tambahan.'}
${input.konteks_sukatan ? `- RUJUKAN_SUKATAN_PELAJARAN_DSKP: ${input.konteks_sukatan}` : ''}

Peringatan penting:
1. Jika DATA_RPT_MINGGU kosong, tidak mempunyai Standard Kandungan atau Standard Pembelajaran, atau mengandungi cuti/peperiksaan, pulangkan status "PERLU_MAKLUMAT" dengan satu soalan jelas dalam "soalan_kepada_guru".
2. Salin tema, standard_kandungan, dan standard_pembelajaran secara VERBATIM daripada DATA_RPT_MINGGU.
3. Gunakan RUJUKAN_SUKATAN_PELAJARAN_DSKP hanya sebagai konteks pedagogi dan pentaksiran bilik darjah (jangan ubah teks RPT).
4. Jumlah minit semua aktiviti MESTI tepat ${input.jadual.tempoh_minit} minit.
5. Medan "refleksi" MESTI "" (kosong).
6. Medan "tanda" MESTI "Draf AI – perlu disemak guru".`;
}

async function generateSingleRphDraft(
  apiKey: string,
  input: RphRequestInput
): Promise<RphDraftOutput> {
  // Fast deterministic guard if RPT SK & SP are both empty or explicitly holiday/exam without standards
  const skEmpty = !input.data_rpt_minggu.standard_kandungan?.trim();
  const spEmpty = !input.data_rpt_minggu.standard_pembelajaran?.trim();
  const combinedNotes = `${input.data_rpt_minggu.tema} ${input.data_rpt_minggu.catatan}`.toLowerCase();
  const isHolidayOrExam =
    (skEmpty || spEmpty) ||
    /\b(cuti|peperiksaan|ujian sumatif|pentaksiran pertengahan|pentaksiran akhir)\b/.test(
      combinedNotes
    );

  if (isHolidayOrExam && (skEmpty || spEmpty)) {
    const isExamOrHolidayText =
      /\b(cuti|peperiksaan|ujian|pentaksiran)\b/.test(combinedNotes);
    return sanitizeDraftOutput(
      {
        status: 'PERLU_MAKLUMAT',
        soalan_kepada_guru: isExamOrHolidayText
          ? `${input.data_rpt_minggu.minggu || 'Minggu ini'} bagi ${input.mata_pelajaran} (${input.tingkatan_tahun}) ditandakan sebagai "${input.data_rpt_minggu.tema || input.data_rpt_minggu.catatan}". Adakah sesi ini diteruskan tanpa RPH pengajaran baharu atau terdapat standard PdPc gantian daripada RPT?`
          : `Data RPT bagi ${input.mata_pelajaran} (${input.tingkatan_tahun}) pada ${input.data_rpt_minggu.minggu || 'minggu ini'} tidak mempunyai Standard Kandungan atau Standard Pembelajaran yang lengkap. Sila masukkan standard RPT yang ingin diajar.`,
        tanda: 'Draf AI – perlu disemak guru',
        maklumat: {
          mata_pelajaran: input.mata_pelajaran,
          kelas: input.tingkatan_tahun,
          tarikh: input.jadual.tarikh,
          masa: `${input.jadual.masa_mula} - ${input.jadual.masa_tamat} (${input.jadual.tempoh_minit} minit)`,
          minggu_rpt: input.data_rpt_minggu.minggu,
        },
        kurikulum: {
          tema: input.data_rpt_minggu.tema || '',
          standard_kandungan: input.data_rpt_minggu.standard_kandungan || '',
          standard_pembelajaran: input.data_rpt_minggu.standard_pembelajaran || '',
        },
        objektif: [],
        kriteria_kejayaan: [],
        aktiviti: [],
        jumlah_minit: 0,
        bbm: [],
        emk: [],
        kbat: { aras_bloom: '', soalan_atau_tugasan: '' },
        pentaksiran: {
          jenis: 'formatif',
          kaedah: '',
          soalan_atau_tugasan: '',
          rubrik_ringkas: '',
        },
        pembezaan: { pemulihan: '', pengayaan: '' },
        refleksi: '',
      },
      input
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: buildUserPrompt(input),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: RPH_RESPONSE_SCHEMA,
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Model tidak memulangkan sebarang respons JSON.');
  }

  const parsed = JSON.parse(rawText) as RphDraftOutput;
  return sanitizeDraftOutput(parsed, input);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Workspace persistence endpoints
  app.get('/api/workspace', async (_req, res) => {
    try {
      const ws = await loadWorkspace();
      res.json(ws);
    } catch (err: unknown) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : 'Gagal memuat ruang kerja.',
      });
    }
  });

  app.put('/api/workspace', async (req, res) => {
    try {
      const next = req.body as TeacherWorkspaceState;
      await saveWorkspace(next);
      res.json(next);
    } catch (err: unknown) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : 'Gagal menyimpan ruang kerja.',
      });
    }
  });

  app.post('/api/workspace/load-demo-pack', async (_req, res) => {
    try {
      const demo = createDemoTeacherWorkspace();
      await saveWorkspace(demo);
      res.json(demo);
    } catch (err: unknown) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal memuat set dokumen contoh.',
      });
    }
  });

  app.post('/api/workspace/reset', async (_req, res) => {
    try {
      const empty = createDefaultEmptyWorkspace();
      await saveWorkspace(empty);
      res.json(empty);
    } catch (err: unknown) {
      res.status(500).json({
        error:
          err instanceof Error ? err.message : 'Gagal menetapkan semula ruang kerja.',
      });
    }
  });

  // Upload and AI-parse Jadual, RPT, or Sukatan Pelajaran
  app.post(
    '/api/documents/parse',
    upload.single('file'),
    async (req, res) => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.status(500).json({
            error:
              'Kunci API Gemini belum dikonfigurasi pada pelayan. Sila semak panel Settings > Secrets.',
          });
          return;
        }

        const kind = req.body?.kind as DocumentKind;
        if (!['jadual', 'rpt', 'sukatan'].includes(kind)) {
          res.status(400).json({ error: 'Jenis dokumen tidak sah.' });
          return;
        }

        const rawText =
          typeof req.body?.rawText === 'string' ? req.body.rawText.trim() : '';
        const file = req.file;
        const mergeMode = req.body?.mergeMode === 'append' ? 'append' : 'replace';

        if (!file && !rawText) {
          res.status(400).json({
            error: 'Sila muat naik fail atau tampal kandungan teks dokumen.',
          });
          return;
        }

        const fileName =
          file?.originalname ||
          (kind === 'jadual'
            ? 'Jadual_Teks.txt'
            : kind === 'rpt'
              ? 'RPT_Teks.txt'
              : 'Sukatan_Teks.txt');

        const parsed = await parseUploadedTeacherDocument({
          apiKey,
          kind,
          fileName,
          mimeType: file?.mimetype || 'text/plain',
          fileBuffer: file?.buffer,
          rawText,
        });

        const ws = await loadWorkspace();
        const nowIso = new Date().toISOString();

        // Update uploaded doc metadata
        ws.documents = [
          ...ws.documents.filter((d) => d.kind !== kind || mergeMode === 'append'),
          {
            kind,
            fileName,
            uploadedAt: nowIso,
            summary: parsed.summary,
          },
        ];

        if (kind === 'jadual' && parsed.timetable) {
          ws.timetable =
            mergeMode === 'append'
              ? [...ws.timetable, ...parsed.timetable]
              : parsed.timetable;

          // Ensure classConfigs entries exist for newly discovered classes
          for (const slot of parsed.timetable) {
            if (!ws.classConfigs[slot.kelas]) {
              ws.classConfigs[slot.kelas] = {
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
        } else if (kind === 'rpt' && parsed.rptEntries) {
          ws.rptEntries =
            mergeMode === 'append'
              ? [...ws.rptEntries, ...parsed.rptEntries]
              : parsed.rptEntries;
        } else if (kind === 'sukatan' && parsed.syllabus) {
          ws.syllabi =
            mergeMode === 'append'
              ? [...ws.syllabi, parsed.syllabus]
              : [parsed.syllabus];
        }

        await saveWorkspace(ws);
        res.json({ parsed, workspace: ws });
      } catch (err: unknown) {
        console.error('Error parsing document:', err);
        res.status(500).json({
          error:
            err instanceof Error
              ? err.message
              : 'Gagal mengekstrak maklumat daripada dokumen.',
        });
      }
    }
  );

  // Manual single RPH draft generation
  app.post('/api/rph/generate', async (req, res) => {
    try {
      const input = req.body as RphRequestInput;
      if (!input || !input.data_rpt_minggu) {
        res.status(400).json({
          error: 'Input pemboleh ubah RPH tidak sah atau tidak lengkap.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error:
            'Kunci API Gemini belum dikonfigurasi pada pelayan. Sila semak panel Settings > Secrets.',
        });
        return;
      }

      const sanitized = await generateSingleRphDraft(apiKey, input);
      res.json(sanitized);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ralat tidak dijangka semasa menjana draf RPH.';
      console.error('Error generating RPH:', err);
      res.status(500).json({ error: message });
    }
  });

  // Daily automatic RPH generation for all teaching slots on a given date
  app.post('/api/rph/generate-daily', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error:
            'Kunci API Gemini belum dikonfigurasi pada pelayan. Sila semak panel Settings > Secrets.',
        });
        return;
      }

      const date =
        typeof req.body?.date === 'string' && req.body.date
          ? req.body.date
          : new Date().toISOString().slice(0, 10);
      const forceRegenerate = Boolean(req.body?.forceRegenerate);
      const onlySlotIds = Array.isArray(req.body?.slotIds)
        ? (req.body.slotIds as string[])
        : null;

      const ws = await loadWorkspace();
      const mingguNombor = Number(
        req.body?.mingguNombor ?? ws.automation.mingguSemasa ?? 12
      );
      const dayName = getMalayDayName(date);

      const daySlots = ws.timetable
        .filter((s) => s.hari === dayName)
        .filter((s) => (onlySlotIds ? onlySlotIds.includes(s.id) : true))
        .sort((a, b) => a.masa_mula.localeCompare(b.masa_mula));

      if (daySlots.length === 0) {
        res.json({
          date,
          dayName,
          mingguNombor,
          generatedCount: 0,
          workspace: ws,
        });
        return;
      }

      let generatedCount = 0;

      // Process slots in parallel so all daily RPHs appear quickly
      await Promise.all(
        daySlots.map(async (slot) => {
          const draftKey = `${date}_${slot.id}`;
          if (!forceRegenerate && ws.dailyDrafts[draftKey]) {
            return;
          }

          const rptMatch = findMatchingRptEntry(
            slot,
            mingguNombor,
            ws.rptEntries
          );
          const syllabusMatch = findMatchingSyllabus(slot, ws.syllabi);
          const classCfg = ws.classConfigs[slot.kelas];

          const syllabusContextText = syllabusMatch
            ? `${syllabusMatch.ringkasan_kandungan} ${syllabusMatch.standard_rujukan
                .slice(0, 4)
                .map(
                  (r) =>
                    `[${r.kod}] ${r.standard_kandungan} / ${r.standard_pembelajaran}${r.tahap_penguasaan ? ` (${r.tahap_penguasaan})` : ''}`
                )
                .join(' | ')}`
            : '';

          const requestInput: RphRequestInput = {
            mata_pelajaran: slot.mata_pelajaran,
            tingkatan_tahun: slot.kelas,
            kurikulum:
              slot.kurikulum ||
              syllabusMatch?.kurikulum ||
              'KSSM (DSKP Semakan Terkini)',
            data_rpt_minggu: rptMatch
              ? {
                  minggu: rptMatch.minggu,
                  tema: rptMatch.tema,
                  standard_kandungan: rptMatch.standard_kandungan,
                  standard_pembelajaran: rptMatch.standard_pembelajaran,
                  catatan: rptMatch.catatan,
                }
              : {
                  minggu: `Minggu ${mingguNombor}`,
                  tema: '',
                  standard_kandungan: '',
                  standard_pembelajaran: '',
                  catatan: `Tiada padanan RPT ditemui untuk ${slot.mata_pelajaran} (${slot.kelas}) pada Minggu ${mingguNombor}.`,
                },
            profil_kelas: {
              bil_murid: classCfg?.bil_murid || '30 orang murid',
              tahap_penguasaan_umum:
                classCfg?.tahap_penguasaan_umum || 'Tahap Penguasaan 3 hingga 4',
              keperluan_khas_umum:
                classCfg?.keperluan_khas_umum || 'Tiada keperluan khas khusus',
            },
            jadual: {
              tarikh: date,
              masa_mula: slot.masa_mula,
              masa_tamat: slot.masa_tamat,
              tempoh_minit: slot.tempoh_minit,
            },
            sumber_ada: classCfg?.sumber_ada ?? [
              'Papan putih & pen penanda',
              'Buku teks KPM',
              'Tiada sambungan internet',
            ],
            templat_rph: ws.automation.templatRph,
            catatan_guru: [
              slot.bilik ? `Lokasi kelas: ${slot.bilik}.` : '',
              ws.automation.catatanGuruUmum,
            ]
              .filter(Boolean)
              .join(' '),
            konteks_sukatan: syllabusContextText || undefined,
          };

          const draft = await generateSingleRphDraft(apiKey, requestInput);

          const dailyEntry: DailyAutoDraft = {
            id: draftKey,
            date,
            minggu_rpt: `Minggu ${mingguNombor}`,
            slot,
            rptMatch,
            requestInput,
            draft,
            teacherReflection: '',
            statusSemakan: 'belum_disemak',
            generatedAt: new Date().toISOString(),
          };

          ws.dailyDrafts[draftKey] = dailyEntry;
          generatedCount += 1;
        })
      );

      ws.automation.mingguSemasa = mingguNombor;
      await saveWorkspace(ws);

      res.json({
        date,
        dayName,
        mingguNombor,
        generatedCount,
        workspace: ws,
      });
    } catch (err: unknown) {
      console.error('Error in generate-daily:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Gagal menjana draf RPH harian secara automatik.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PelanRPH server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
