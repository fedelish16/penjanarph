/**
 * Dirty Dozen Security Test Specification for PelanRPH Firestore Rules.
 * Executed against Firebase Emulator (@firebase/rules-unit-testing) when emulator is available.
 */
export interface DirtyDozenScenario {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Unauthenticated workspace read',
    actorUid: null,
    emailVerified: false,
    operation: 'get',
    path: 'teachers/teacherA/workspaces/main',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email profile create',
    actorUid: 'teacherA',
    emailVerified: false,
    operation: 'create',
    path: 'teachers/teacherA',
    payload: {
      uid: 'teacherA',
      displayName: 'Cikgu A',
      email: 'a@school.edu.my',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-tenant workspace read',
    actorUid: 'teacherB',
    emailVerified: true,
    operation: 'get',
    path: 'teachers/teacherA/workspaces/main',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-tenant dailyDraft create',
    actorUid: 'teacherB',
    emailVerified: true,
    operation: 'create',
    path: 'teachers/teacherA/dailyDrafts/2026-11-16_slot-1',
    payload: { id: '2026-11-16_slot-1', uid: 'teacherB' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Teachers collection list enumeration',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'list',
    path: 'teachers',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Ghost field injection (isAdmin)',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'create',
    path: 'teachers/teacherA',
    payload: {
      uid: 'teacherA',
      displayName: 'Cikgu A',
      email: 'a@school.edu.my',
      isAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'UID spoofing on workspace create',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'create',
    path: 'teachers/teacherA/workspaces/main',
    payload: { uid: 'teacherB' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable createdAt mutation on update',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'update',
    path: 'teachers/teacherA/dailyDrafts/2026-11-16_slot-1',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-forged createdAt timestamp on create',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'create',
    path: 'teachers/teacherA/savedDrafts/entry-1',
    payload: {
      id: 'entry-1',
      uid: 'teacherA',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Invalid statusSemakan enum value',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'update',
    path: 'teachers/teacherA/dailyDrafts/2026-11-16_slot-1',
    payload: { statusSemakan: 'approved_by_hacker' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized teacherReflection string (> 4000 chars)',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'update',
    path: 'teachers/teacherA/savedDrafts/entry-1',
    payload: { teacherReflection: 'x'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Malformed document ID poisoning',
    actorUid: 'teacherA',
    emailVerified: true,
    operation: 'create',
    path: 'teachers/teacherA/savedDrafts/bad$id!',
    payload: { id: 'bad$id!', uid: 'teacherA' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
