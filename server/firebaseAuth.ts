import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface CertCache {
  certs: Record<string, string>;
  expiresAtMs: number;
}

let certCache: CertCache | null = null;

function readFirebaseProjectId(): string {
  const configPath = path.join(__dirname, '..', 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as { projectId?: string };
  if (!parsed.projectId) {
    throw new Error('projectId tidak ditemui dalam firebase-applet-config.json');
  }
  return parsed.projectId;
}

const FIREBASE_PROJECT_ID = readFirebaseProjectId();

function decodeBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

function parseJwtJsonSegment<T>(segment: string): T {
  try {
    return JSON.parse(decodeBase64Url(segment).toString('utf8')) as T;
  } catch {
    throw new Error('Format token pengesahan tidak sah.');
  }
}

async function getGooglePublicCerts(
  forceRefresh = false
): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && certCache && certCache.expiresAtMs > now) {
    return certCache.certs;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Gagal memuat turun sijil pengesahan Firebase (${res.status}).`);
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  const certs = (await res.json()) as Record<string, string>;
  certCache = {
    certs,
    expiresAtMs: now + Math.max(60, maxAgeSec) * 1000,
  };
  return certs;
}

export interface VerifiedTeacherClaims {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

export async function verifyFirebaseIdToken(
  token: string
): Promise<VerifiedTeacherClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Format token pengesahan tidak sah.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = parseJwtJsonSegment<{
    alg?: string;
    kid?: string;
  }>(headerB64);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Algoritma atau pengenal kunci token tidak sah.');
  }

  let certs = await getGooglePublicCerts(false);
  let pem = certs[header.kid];
  if (!pem) {
    certs = await getGooglePublicCerts(true);
    pem = certs[header.kid];
  }
  if (!pem) {
    throw new Error('Sijil kunci awam bagi token ini tidak ditemui.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const signature = decodeBase64Url(signatureB64);
  const isSignatureValid = verifier.verify(pem, signature);
  if (!isSignatureValid) {
    throw new Error('Tandatangan token pengesahan tidak sah.');
  }

  const payload = parseJwtJsonSegment<{
    exp?: number;
    iat?: number;
    auth_time?: number;
    aud?: string;
    iss?: string;
    sub?: string;
    email?: string;
    email_verified?: boolean;
  }>(payloadB64);

  const nowSec = Math.floor(Date.now() / 1000);
  const clockSkewSec = 300;

  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Sesi token telah tamat tempoh. Sila log masuk semula.');
  }
  if (
    typeof payload.iat !== 'number' ||
    payload.iat > nowSec + clockSkewSec
  ) {
    throw new Error('Masa terbit token tidak sah.');
  }
  if (
    typeof payload.auth_time !== 'number' ||
    payload.auth_time > nowSec + clockSkewSec
  ) {
    throw new Error('Masa pengesahan token tidak sah.');
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Token bukan untuk projek Firebase aplikasi ini.');
  }
  if (
    payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
  ) {
    throw new Error('Penerbit token Firebase tidak sah.');
  }
  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    payload.sub.length > 128
  ) {
    throw new Error('Identiti pengguna (UID) dalam token tidak sah.');
  }

  return {
    uid: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
  };
}

export async function requireTeacherAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    res.status(401).json({
      error:
        'Pengesahan guru diperlukan. Sila log masuk dengan akaun Google terlebih dahulu.',
    });
    return;
  }

  try {
    const claims = await verifyFirebaseIdToken(match[1]);
    if (!claims.emailVerified) {
      res.status(403).json({
        error:
          'Akaun Google anda belum mengesahkan alamat e-mel. Sila gunakan akaun yang disahkan.',
      });
      return;
    }
    res.locals.teacherUid = claims.uid;
    res.locals.teacherEmail = claims.email;
    next();
  } catch (err: unknown) {
    res.status(401).json({
      error:
        err instanceof Error
          ? err.message
          : 'Sesi log masuk guru tidak sah atau telah tamat.',
    });
  }
}
