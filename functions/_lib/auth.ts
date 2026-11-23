/**
 * Verifies Firebase ID tokens inside Cloudflare Pages Functions (no Firebase Admin SDK needed).
 * A token is a JWT signed by Google; we check the signature against Google's public keys,
 * then the issuer, audience (our project) and expiry.
 */
export interface Env {
  SUBMISSIONS: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  /** Local testing only: accept unsigned tokens from the Firebase Auth emulator. */
  FIREBASE_AUTH_EMULATOR?: string;
  /** Local testing only: e.g. "127.0.0.1:8080". */
  FIRESTORE_EMULATOR_HOST?: string;
}

export interface AuthUser {
  uid: string;
  token: string;
}

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache: { keys: Record<string, CryptoKey>; expires: number } | null = null;

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const decodeJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function googleKeys(): Promise<Record<string, CryptoKey>> {
  if (jwksCache && jwksCache.expires > Date.now()) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Could not fetch Google public keys');
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  const { keys } = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  const out: Record<string, CryptoKey> = {};
  for (const k of keys) {
    out[k.kid] = await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }
  jwksCache = { keys: out, expires: Date.now() + maxAge * 1000 };
  return out;
}

/** Returns the signed-in user, or null if the request has no valid Firebase token. */
export async function verifyRequest(request: Request, env: Env): Promise<AuthUser | null> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = decodeJson(parts[0]) as { alg: string; kid?: string };
    const p = decodeJson(parts[1]) as { aud: string; iss: string; exp: number; iat: number; sub: string };
    const now = Math.floor(Date.now() / 1000);
    if (p.aud !== env.FIREBASE_PROJECT_ID || p.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) return null;
    if (!p.sub || p.exp < now || p.iat > now + 300) return null;

    if (env.FIREBASE_AUTH_EMULATOR === '1' && header.alg === 'none') return { uid: p.sub, token };
    if (header.alg !== 'RS256' || !header.kid) return null;
    const key = (await googleKeys())[header.kid];
    if (!key) return null;
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return ok ? { uid: p.sub, token } : null;
  } catch {
    return null;
  }
}

/** True if teachers/{uid} exists. Asked as the user, so the Firestore security rules apply. */
export async function isTeacher(user: AuthUser, env: Env): Promise<boolean> {
  const host = env.FIRESTORE_EMULATOR_HOST ? `http://${env.FIRESTORE_EMULATOR_HOST}` : 'https://firestore.googleapis.com';
  const url = `${host}/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/teachers/${encodeURIComponent(user.uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } });
  return res.ok;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
