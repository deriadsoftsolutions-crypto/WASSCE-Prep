/**
 * POST /api/lesson-upload?name=<file name>
 * Teachers only. Body: an image. Stores it under lessons/ in R2 and returns its public address.
 * Lesson images are teaching material, readable by anyone with the (unguessable) address,
 * so learners' tablets can cache them for offline reading.
 */
import { isTeacher, json, verifyRequest, type Env } from '../_lib/auth';

const MAX_BYTES = 5 * 1024 * 1024;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyRequest(request, env);
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  if (!(await isTeacher(user, env))) return json({ error: 'Only teachers can add lesson images.' }, 403);

  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) return json({ error: 'Lesson images must be JPEG, PNG, WebP or GIF.' }, 415);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: 'The file is empty.' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'That image is bigger than 5 MB.' }, 413);

  const rawName = (new URL(request.url).searchParams.get('name') ?? 'image').slice(0, 80);
  const safeName = rawName.replace(/[^A-Za-z0-9._-]+/g, '_') || 'image';
  const key = `lessons/${crypto.randomUUID()}-${safeName}`;
  await env.SUBMISSIONS.put(key, body, { httpMetadata: { contentType: type }, customMetadata: { uid: user.uid } });
  return json({ key, url: `/api/lesson-file/${key}` });
};
