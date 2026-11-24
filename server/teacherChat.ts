import { GoogleGenAI, type Content, type GenerateContentResponse } from '@google/genai';

export type ChatbotRoleMode = 'perunding_rph' | 'idea_pantas';

export interface ChatTurnMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatWorkspaceContext {
  mode?: string;
  mingguSemasa?: number;
  mataPelajaran?: string;
  kelas?: string;
  tema?: string;
  standardKandungan?: string;
  standardPembelajaran?: string;
  tempohMinit?: number;
}

export function resolveChatModel(roleMode: ChatbotRoleMode): string {
  // General pedagogy & RPH consultation -> gemini-4-hydrogen
  // Fast classroom activity brainstorming & quick summaries -> gemini-3.1-flash-lite
  return roleMode === 'idea_pantas'
    ? 'gemini-3.1-flash-lite'
    : 'gemini-4-hydrogen';
}

export function buildChatSystemInstruction(
  roleMode: ChatbotRoleMode,
  context?: ChatWorkspaceContext
): string {
  const baseRole =
    roleMode === 'idea_pantas'
      ? `PERANAN ANDA: Pembantu Idea Aktiviti PdPc Pantas untuk guru Malaysia.
Tugas anda ialah memberi cadangan pantas, praktikal, dan terus boleh dilaksanakan di bilik darjah biasa (Set Induksi 3-5 minit, aktiviti PAK-21, penutup ringkas, dan BBM mudah tanpa bergantung kepada internet melainkan diminta). Jawapan hendaklah ringkas, berstruktur dengan poin jelas, dan padat.`
      : `PERANAN ANDA: Pakar Perunding Pedagogi & Kurikulum Malaysia (KSSR, KSSM, DSKP, PBD TP1-TP6, Taksonomi Bloom Semakan Anderson & Krathwohl 2001, Rekaan Terbalik Wiggins & McTighe, dan Prinsip Pengajaran Rosenshine 2012).
Tugas anda ialah membantu guru menambah baik objektif boleh ukur, kriteria kejayaan, soalan KBAT (aras menganalisis ke atas), kaedah pentaksiran bilik darjah (PBD TP1-TP6), serta aktiviti pemulihan dan pengayaan yang selari dengan objektif PdPc.`;

  const strictRules = `PERATURAN KETAT:
1. Gunakan Bahasa Melayu baku yang jelas, sopan, dan menggunakan istilah kurikulum Malaysia (SK, SP, BBM, EMK, KBAT, PBD, TP1-TP6, PdPc).
2. JANGAN reka kod DSKP, nombor Standard Kandungan/Pembelajaran, statistik, atau pautan URL jika tidak dibekalkan oleh guru. Jika guru meminta kod DSKP yang tiada dalam konteks, nyatakan bahawa guru perlu merujuk dokumen DSKP/RPT rasmi KPM untuk kod tepat.
3. JANGAN minta atau paparkan nama atau maklumat peribadi murid.
4. Guru kekal sebagai pembuat keputusan akhir sebelum penghantaran RPH kepada PK / GPK.`;

  const contextLines: string[] = [];
  if (context?.mingguSemasa) {
    contextLines.push(`- Minggu RPT Semasa: Minggu ${context.mingguSemasa}`);
  }
  if (context?.mataPelajaran) {
    contextLines.push(`- Mata Pelajaran Aktif: ${context.mataPelajaran}`);
  }
  if (context?.kelas) {
    contextLines.push(`- Kelas / Tingkatan: ${context.kelas}`);
  }
  if (context?.tempohMinit) {
    contextLines.push(`- Tempoh Waktu: ${context.tempohMinit} minit`);
  }
  if (context?.tema) {
    contextLines.push(`- Tema RPT: ${context.tema}`);
  }
  if (context?.standardKandungan) {
    contextLines.push(`- Standard Kandungan: ${context.standardKandungan}`);
  }
  if (context?.standardPembelajaran) {
    contextLines.push(
      `- Standard Pembelajaran: ${context.standardPembelajaran}`
    );
  }

  const contextBlock =
    contextLines.length > 0
      ? `\n\nKONTEKS RPH SEMASA GURU (guna sebagai rujukan apabila relevan):\n${contextLines.join('\n')}`
      : '';

  return `${baseRole}\n\n${strictRules}${contextBlock}`;
}

export function buildValidatedChatHistory(
  priorTurns: ChatTurnMessage[]
): Content[] {
  // Gemini Chats history must start with 'user' and alternate 'user' <-> 'model'
  const normalized: Content[] = [];

  for (const turn of priorTurns) {
    const trimmed = typeof turn.text === 'string' ? turn.text.trim() : '';
    if (!trimmed) continue;

    const role: 'user' | 'model' = turn.role === 'model' ? 'model' : 'user';
    if (normalized.length === 0 && role !== 'user') {
      continue;
    }

    const last = normalized[normalized.length - 1];
    if (last && last.role === role) {
      const prevText = last.parts?.[0]?.text ?? '';
      last.parts = [{ text: `${prevText}\n\n${trimmed}` }];
    } else {
      normalized.push({ role, parts: [{ text: trimmed }] });
    }
  }

  // History before sendMessageStream must end with a 'model' turn so the next message is 'user'
  if (normalized.length > 0 && normalized[normalized.length - 1].role === 'user') {
    normalized.pop();
  }

  return normalized.slice(-24);
}

export async function streamTeacherChatReply(params: {
  apiKey: string;
  roleMode: ChatbotRoleMode;
  priorTurns: ChatTurnMessage[];
  latestUserMessage: string;
  workspaceContext?: ChatWorkspaceContext;
  onDelta: (chunkText: string) => void;
}): Promise<void> {
  const ai = new GoogleGenAI({
    apiKey: params.apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const model = resolveChatModel(params.roleMode);
  const systemInstruction = buildChatSystemInstruction(
    params.roleMode,
    params.workspaceContext
  );
  const history = buildValidatedChatHistory(params.priorTurns);

  const chat = ai.chats.create({
    model,
    history,
    config: {
      systemInstruction,
    },
  });

  const stream = await chat.sendMessageStream({
    message: params.latestUserMessage,
  });

  for await (const chunk of stream) {
    const response = chunk as GenerateContentResponse;
    if (response.text) {
      params.onDelta(response.text);
    }
  }
}
