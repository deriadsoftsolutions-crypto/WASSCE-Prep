/**
 * GET /api/lesson-file/lessons/<id>-<name>
 * Serves a lesson image. Public (addresses are unguessable) and cacheable forever,
 * because a changed image always gets a new address.
 */
import type { Env } from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const parts = Array.isArray(params.path) ? params.path : [String(params.path ?? '')];
  const key = parts.join('/');
  if (!/^lessons\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.SUBMISSIONS.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers });
};
