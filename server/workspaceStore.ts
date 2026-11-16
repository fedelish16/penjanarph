import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DskpSyllabusContext,
  HariMinggu,
  RptEntry,
  TeacherWorkspaceState,
  TimetableSlot,
} from '../src/types/rph.ts';
import { createDefaultEmptyWorkspace } from './demoPack.ts';

const DATA_DIR = path.join(process.cwd(), '.pelanrph-data');
const WORKSPACE_FILE = path.join(DATA_DIR, 'workspace.json');

export async function loadWorkspace(): Promise<TeacherWorkspaceState> {
  try {
    const raw = await fs.readFile(WORKSPACE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as TeacherWorkspaceState;
    return {
      ...createDefaultEmptyWorkspace(),
      ...parsed,
    };
  } catch {
    return createDefaultEmptyWorkspace();
  }
}

export async function saveWorkspace(state: TeacherWorkspaceState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WORKSPACE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

const DAY_NAMES: HariMinggu[] = [
  'Ahad',
  'Isnin',
  'Selasa',
  'Rabu',
  'Khamis',
  'Jumaat',
  'Sabtu',
];

export function getMalayDayName(dateIso: string): HariMinggu {
  const parts = dateIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return 'Isnin';
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return DAY_NAMES[d.getUTCDay()] ?? 'Isnin';
}

export function computeDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 60;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 60;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

function normalizeToken(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLevelToken(val: string): string {
  const lower = val.toLowerCase();
  const tingkatanMatch = lower.match(/(?:tingkatan|t)\s*(\d+)/);
  if (tingkatanMatch) return `t${tingkatanMatch[1]}`;
  const tahunMatch = lower.match(/(?:tahun|y)\s*(\d+)/);
  if (tahunMatch) return `y${tahunMatch[1]}`;
  const numOnly = lower.match(/\b(\d+)\b/);
  return numOnly ? numOnly[1] : normalizeToken(val);
}

function subjectMatches(a: string, b: string): boolean {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;

  // Common Malaysian subject abbreviations
  const aliases: Record<string, string[]> = {
    psv: ['pendidikan seni visual', 'seni visual'],
    bm: ['bahasa melayu', 'bahasa malaysia'],
    bi: ['bahasa inggeris', 'english'],
    mt: ['matematik', 'math'],
    sej: ['sejarah'],
    sn: ['sains', 'science'],
    pi: ['pendidikan islam'],
    pm: ['pendidikan moral'],
    rbt: ['reka bentuk dan teknologi'],
    ask: ['asas sains komputer'],
    pjk: ['pendidikan jasmani dan kesihatan', 'pj'],
  };

  for (const [abbr, fulls] of Object.entries(aliases)) {
    const aMatches = na === abbr || fulls.some((f) => na.includes(f));
    const bMatches = nb === abbr || fulls.some((f) => nb.includes(f));
    if (aMatches && bMatches) return true;
  }
  return false;
}

export function findMatchingRptEntry(
  slot: TimetableSlot,
  mingguNombor: number,
  rptEntries: RptEntry[]
): RptEntry | null {
  const slotLevel = extractLevelToken(slot.kelas);

  // First try exact week + subject + level
  const exact = rptEntries.find((entry) => {
    const weekMatch =
      entry.minggu_nombor === mingguNombor ||
      normalizeToken(entry.minggu).includes(`minggu ${mingguNombor}`);
    if (!weekMatch) return false;
    if (!subjectMatches(slot.mata_pelajaran, entry.mata_pelajaran)) return false;
    const entryLevel = extractLevelToken(entry.tingkatan_tahun);
    if (!entryLevel || !slotLevel) return true;
    return entryLevel === slotLevel || slotLevel.endsWith(entryLevel) || entryLevel.endsWith(slotLevel);
  });

  if (exact) return exact;

  // Fallback: week + subject only
  return (
    rptEntries.find((entry) => {
      const weekMatch =
        entry.minggu_nombor === mingguNombor ||
        normalizeToken(entry.minggu).includes(`minggu ${mingguNombor}`);
      return weekMatch && subjectMatches(slot.mata_pelajaran, entry.mata_pelajaran);
    }) ?? null
  );
}

export function findMatchingSyllabus(
  slot: TimetableSlot,
  syllabi: DskpSyllabusContext[]
): DskpSyllabusContext | null {
  const slotLevel = extractLevelToken(slot.kelas);
  const exact = syllabi.find((s) => {
    if (!subjectMatches(slot.mata_pelajaran, s.mata_pelajaran)) return false;
    const sLevel = normalizeToken(s.tingkatan_tahun);
    if (!sLevel) return true;
    return sLevel.includes(slotLevel.replace(/^[ty]/, ''));
  });
  if (exact) return exact;

  return (
    syllabi.find((s) => subjectMatches(slot.mata_pelajaran, s.mata_pelajaran)) ?? null
  );
}
