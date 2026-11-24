import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

export type ChatbotRoleMode = 'perunding_rph' | 'idea_pantas';

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

interface ChatMessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  roleMode?: ChatbotRoleMode;
  createdAt: string;
}

interface TeacherChatbotDrawerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  teacherUid: string;
  getIdToken: () => Promise<string>;
  workspaceContext?: ChatWorkspaceContext;
}

const STARTER_PROMPTS: Array<{ label: string; prompt: string; roleMode: ChatbotRoleMode }> = [
  {
    label: 'Idea Set Induksi 5 minit',
    prompt:
      'Cadangkan 3 idea Set Induksi berdurasi 5 minit yang menarik tanpa memerlukan sambungan internet.',
    roleMode: 'idea_pantas',
  },
  {
    label: 'Soalan KBAT aras Menganalisis',
    prompt:
      'Bina 2 soalan KBAT aras Menganalisis atau Menilai (Taksonomi Bloom Semakan) lengkap dengan cadangan jawapan murid.',
    roleMode: 'perunding_rph',
  },
  {
    label: 'Aktiviti Pemulihan & Pengayaan',
    prompt:
      'Cadangkan satu aktiviti sokongan pemulihan (TP1–TP2) dan satu pengayaan (TP5–TP6) yang masih berkait terus dengan objektif yang sama.',
    roleMode: 'perunding_rph',
  },
  {
    label: 'Rubrik PBD TP1–TP6',
    prompt:
      'Cadangkan rubrik Pentaksiran Bilik Darjah (PBD) ringkas daripada TP1 hingga TP6 berserta instrumen pemerhatian/penulisan.',
    roleMode: 'perunding_rph',
  },
];

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const formatInlineBold = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-bold text-[#060D3D]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${listKey++}`} className="list-disc pl-4 space-y-1 my-1.5">
        {listItems.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {formatInlineBold(item)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bulletMatch = /^[-*•]\s+(.+)$/.exec(trimmed);
    const numMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }
    if (numMatch) {
      flushList();
      elements.push(
        <p key={`num-${index}`} className="leading-relaxed my-1">
          {formatInlineBold(trimmed)}
        </p>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${index}`} className="leading-relaxed my-1">
        {formatInlineBold(trimmed)}
      </p>
    );
  });

  flushList();
  return elements.length > 0 ? elements : text;
}

export const TeacherChatbotDrawer: React.FC<TeacherChatbotDrawerProps> = ({
  open,
  onOpenChange,
  teacherUid,
  getIdToken,
  workspaceContext,
}) => {
  const storageKey = `pelanrph_chat_${teacherUid}`;

  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as ChatMessageItem[];
      return Array.isArray(parsed) ? parsed.slice(-40) : [];
    } catch {
      return [];
    }
  });

  const [roleMode, setRoleMode] = useState<ChatbotRoleMode>('perunding_rph');
  const [includeContext, setIncludeContext] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Persist thread per teacher
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-40))
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [messages, storageKey]);

  // Reload stored thread if teacherUid changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(`pelanrph_chat_${teacherUid}`);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessageItem[];
        setMessages(Array.isArray(parsed) ? parsed.slice(-40) : []);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [teacherUid]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, isStreaming]);

  // Cancel stream if unmounted
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClearChat = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages([]);
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSendMessage = async (
    overridePrompt?: string,
    overrideRole?: ChatbotRoleMode
  ) => {
    const trimmed = (overridePrompt ?? inputText).trim();
    if (!trimmed || isStreaming) return;

    const activeRole = overrideRole ?? roleMode;
    if (overrideRole) {
      setRoleMode(overrideRole);
    }

    setErrorMsg(null);
    if (!overridePrompt) {
      setInputText('');
    }

    const userMsg: ChatMessageItem = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    const assistantId = `m_${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessageItem = {
      id: assistantId,
      role: 'model',
      text: '',
      roleMode: activeRole,
      createdAt: new Date().toISOString(),
    };

    const priorTurns = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          messages: priorTurns,
          roleMode: activeRole,
          workspaceContext: includeContext ? workspaceContext : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errBody.error || `Gagal berhubung dengan pembantu Gemini (${res.status}).`
        );
      }

      if (!res.body) {
        throw new Error('Strim jawapan tidak tersedia daripada pelayan.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          const dataLine = evt
            .split('\n')
            .find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          const jsonStr = dataLine.slice(6).trim();
          if (!jsonStr) continue;

          const parsed = JSON.parse(jsonStr) as {
            delta?: string;
            done?: boolean;
            error?: string;
          };

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: m.text + parsed.delta }
                  : m
              )
            );
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      const msg =
        err instanceof Error
          ? err.message
          : 'Ralat tidak dijangka semasa berhubung dengan pembantu Gemini.';
      setErrorMsg(msg);
      // Remove empty assistant placeholder if no text arrived
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantId && !m.text.trim()))
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const hasActiveContext = Boolean(
    workspaceContext?.mataPelajaran ||
      workspaceContext?.kelas ||
      workspaceContext?.mingguSemasa
  );

  return (
    <>
      {/* Floating Launcher Button (always hidden in print) */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Buka Pembantu Chat Gemini PelanRPH"
          className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-md border-2 border-[#00B4F0] bg-[#060D3D] px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white shadow-xl hover:bg-[#0D1B69] transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#14E2D8]" />
          <span>Soal Pembantu RPH</span>
        </button>
      )}

      {/* Multi-turn Slide-Over Chat Drawer */}
      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex justify-end bg-[#060D3D]/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teacher-chat-title"
        >
          <div className="bg-[#F4F7FB] border-l border-slate-200 w-full max-w-lg h-full flex flex-col shadow-2xl">
            {/* Midnight Navy Header */}
            <div className="bg-[#060D3D] text-white px-5 py-4 flex items-center justify-between gap-3 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md border border-[#00B4F0] bg-[#0D1D6E] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#14E2D8]" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="teacher-chat-title"
                    className="text-sm font-bold text-white truncate"
                  >
                    Pembantu Pedagogi &amp; RPH
                  </h2>
                  <p className="text-[11px] text-[#14E2D8] truncate">
                    Perbualan berbilang pusingan · KSSR · KSSM · PBD
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Mulakan perbualan baharu"
                    className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baharu</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Tutup pembantu chat"
                  className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Role Selector + Active Context Bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleMode('perunding_rph')}
                  className={`rounded border px-3 py-2 text-left transition-colors cursor-pointer ${
                    roleMode === 'perunding_rph'
                      ? 'border-[#00B4F0] bg-cyan-50/70 text-[#060D3D]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <BookOpen className="w-3.5 h-3.5 text-[#008EC7] shrink-0" />
                    <span>Perunding RPH</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Pedagogi, PBD &amp; KBAT mendalam
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRoleMode('idea_pantas')}
                  className={`rounded border px-3 py-2 text-left transition-colors cursor-pointer ${
                    roleMode === 'idea_pantas'
                      ? 'border-[#00B4F0] bg-cyan-50/70 text-[#060D3D]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-[#008EC7] shrink-0" />
                    <span>Idea Pantas</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Set induksi &amp; aktiviti ringkas
                  </div>
                </button>
              </div>

              {hasActiveContext && (
                <label className="flex items-center justify-between gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100 cursor-pointer">
                  <span className="truncate">
                    Konteks aktif:{' '}
                    <strong className="text-[#060D3D]">
                      {workspaceContext?.mataPelajaran || 'Ruang Kerja'}
                      {workspaceContext?.kelas
                        ? ` · ${workspaceContext.kelas}`
                        : ''}
                      {workspaceContext?.mingguSemasa
                        ? ` · Minggu ${workspaceContext.mingguSemasa}`
                        : ''}
                    </strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="rounded border-slate-300 text-[#00B4F0] focus:ring-[#00B4F0] shrink-0"
                  />
                </label>
              )}
            </div>

            {/* Scrollable Multi-Turn Conversation Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-bold text-[#060D3D]">
                      Selamat datang ke Pembantu Pedagogi PelanRPH
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tanya apa-apa tentang penambahbaikan RPH, pembinaan soalan
                      KBAT, rubrik PBD (TP1–TP6), atau aktiviti PAK-21 bilik
                      darjah. Perbualan anda diingati merentas soalan susulan.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500 px-1">
                      Cadangan Soalan Pantas
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {STARTER_PROMPTS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() =>
                            void handleSendMessage(item.prompt, item.roleMode)
                          }
                          className="text-left rounded-md border border-slate-200 bg-white hover:border-[#00B4F0] hover:bg-cyan-50/40 px-3.5 py-2.5 transition-colors cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[#060D3D]">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {item.prompt}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-4 py-3 text-xs sm:text-[13px] ${
                        msg.role === 'user'
                          ? 'bg-[#060D3D] text-white'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      ) : msg.text ? (
                        <div className="space-y-1">
                          {renderFormattedText(msg.text)}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-slate-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00B4F0]" />
                          Sedang menyusun cadangan...
                        </span>
                      )}
                    </div>

                    {msg.role === 'model' && msg.text && !isStreaming && (
                      <div className="mt-1 flex items-center gap-3 px-1">
                        <button
                          type="button"
                          onClick={() => void handleCopyMessage(msg.id, msg.text)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#060D3D] cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Disalin
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Salin cadangan
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {errorMsg && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div ref={threadEndRef} />
            </div>

            {/* Bottom Input Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="bg-white border-t border-slate-200 p-3.5 space-y-2"
            >
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tulis soalan atau minta ubah suai aktiviti, KBAT, atau PBD..."
                  disabled={isStreaming}
                  className="flex-1 resize-none rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-[#060D3D] placeholder:text-slate-400 focus:border-[#00B4F0] focus:bg-white focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !inputText.trim()}
                  aria-label="Hantar mesej"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#00B4F0] hover:bg-[#0099D6] px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer h-[42px]"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hantar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Tekan Enter untuk hantar · Shift+Enter untuk baris baharu.
                Elakkan memasukkan nama murid.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
