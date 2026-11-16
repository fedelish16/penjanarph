# PelanRPH Firestore Security Specification

## 1. Data Invariants
1. **Strict Tenant Isolation**: All teacher data lives under `/teachers/{teacherId}/...`. Only a verified authenticated user (`request.auth != null && request.auth.token.email_verified == true`) whose `request.auth.uid == teacherId` may read or write any document under their subtree.
2. **No Cross-Teacher List/Scrape**: Listing `/teachers` is strictly forbidden. Subcollection `allow list` rules (`dailyDrafts`, `savedDrafts`) explicitly check `resource.data.uid == request.auth.uid` on the rule side without relying on client filtering.
3. **Identity & Temporal Immutability**: `uid`, `id`, and `createdAt` are immutable after creation. `createdAt` and `updatedAt` MUST match `request.time` on create and update respectively.
4. **Strict Key & Size Bounds**: Every create validates `hasAll` and `hasOnly` allowed keys. Every update wraps `isValid*()` and restricts changed keys via `affectedKeys().hasOnly(...)`. Every string and list enforces upper size bounds.
5. **Path ID Hardening**: All single-document operations validate `isValidId()` (`^[a-zA-Z0-9_\-]+$`, length 1..128).

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Read/Write**: Anonymous user attempts `get(/teachers/uidA/workspaces/main)` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Signed-in user with `email_verified: false` attempts `setDoc(/teachers/uidA)` -> `PERMISSION_DENIED`.
3. **Cross-Tenant Read**: Teacher B (`uidB`) attempts `get(/teachers/uidA/workspaces/main)` -> `PERMISSION_DENIED`.
4. **Cross-Tenant Write**: Teacher B (`uidB`) attempts `setDoc(/teachers/uidA/dailyDrafts/d1, { uid: 'uidB', ... })` -> `PERMISSION_DENIED`.
5. **Teacher Directory Enumeration**: Signed-in user attempts `getDocs(collection(db, 'teachers'))` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: Teacher A sends `create` on `/teachers/uidA` with extra field `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` check).
7. **UID Spoofing**: Teacher A attempts `create` on `/teachers/uidA/workspaces/main` with `uid: 'uidB'` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Teacher A attempts `update` on `dailyDrafts/d1` altering `createdAt` or `uid` -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamp**: Teacher A attempts `create` with a backdated `createdAt` (`Timestamp.fromMillis(1000)`) instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
10. **Invalid Status Enum**: Teacher A attempts `update` on `dailyDrafts/d1` setting `statusSemakan: 'hacked'` -> `PERMISSION_DENIED`.
11. **Value/Size Poisoning**: Teacher A attempts `setDoc` on `savedDrafts/e1` with `teacherReflection` > 4000 characters -> `PERMISSION_DENIED`.
12. **Path ID Poisoning**: Teacher A attempts `setDoc` with invalid doc ID `'bad/id$123'` or > 128 chars -> `PERMISSION_DENIED` (`isValidId`).
