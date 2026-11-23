/**
 * POST /api/lesson-upload?name=<file name>
 * Teachers only. Body: the file. Stores it under lessons/ in R2 and returns its public address.
 * Used for lesson images and for unit materials (notes, slides, short videos).
 * These are teaching materials, readable by anyone with the unguessable address, so learners'
 * tablets can keep them for offline reading.
 */
import { isTeacher, json, verifyRequest, type Env } from '../_lib/auth';

const MB = 1024 * 1024;
const KINDS: { re: RegExp; max: number; label: string }[] = [
  { re: /^image\/(jpeg|png|webp|gif)$/, max: 5 * MB, label: 'Images' },
  { re: /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet)|application\/vnd\.ms-(powerpoint|excel)|text\/plain)$/, max: 40 * MB, label: 'Documents' },
  { re: /^video\/(mp4|webm)$/, max: 95 * MB, label: 'Videos' },
];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyRequest(request, env);
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  if (!(await isTeacher(user, env))) return json({ error: 'Only teachers can upload teaching materials.' }, 403);

  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const kind = KINDS.find((k) => k.re.test(type));
  if (!kind) return json({ error: 'Upload a PDF, Word, PowerPoint or Excel file, an image (JPEG, PNG, WebP, GIF) or a video (MP4, WebM).' }, 415);
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > kind.max) return json({ error: `${kind.label} can be up to ${kind.max / MB} MB.` }, 413);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: 'The file is empty.' }, 400);
  if (body.byteLength > kind.max) return json({ error: `${kind.label} can be up to ${kind.max / MB} MB.` }, 413);

  const rawName = (new URL(request.url).searchParams.get('name') ?? 'file').slice(0, 80);
  const safeName = rawName.replace(/[^A-Za-z0-9._-]+/g, '_') || 'file';
  const key = `lessons/${crypto.randomUUID()}-${safeName}`;
  await env.SUBMISSIONS.put(key, body, {
    httpMetadata: { contentType: type, contentDisposition: `inline; filename="${safeName}"` },
    customMetadata: { uid: user.uid },
  });
  return json({ key, url: `/api/lesson-file/${key}` });
};
