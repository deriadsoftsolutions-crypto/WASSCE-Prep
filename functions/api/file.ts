/**
 * GET    /api/file?key=<key>   download a file (owner or teacher)
 * DELETE /api/file?key=<key>   remove a file (owner only, e.g. before submitting)
 * Header: Authorization: Bearer <Firebase ID token>.
 */
import { isTeacher, json, verifyRequest, type Env } from '../_lib/auth';

function keyFrom(request: Request): string | null {
  const key = new URL(request.url).searchParams.get('key') ?? '';
  return /^submissions\/[A-Za-z0-9]{1,128}\/[A-Za-z0-9_-]{1,64}\/[^/]{1,200}$/.test(key) ? key : null;
}
const ownerOf = (key: string) => key.split('/')[1];

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyRequest(request, env);
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  const key = keyFrom(request);
  if (!key) return json({ error: 'Bad file key.' }, 400);
  if (ownerOf(key) !== user.uid && !(await isTeacher(user, env))) return json({ error: 'Not allowed.' }, 403);

  const obj = await env.SUBMISSIONS.get(key);
  if (!obj) return json({ error: 'File not found.' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyRequest(request, env);
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  const key = keyFrom(request);
  if (!key) return json({ error: 'Bad file key.' }, 400);
  if (ownerOf(key) !== user.uid) return json({ error: 'Not allowed.' }, 403);
  await env.SUBMISSIONS.delete(key);
  return json({ ok: true });
};
