/**
 * POST /api/upload?assignment=<id>&name=<file name>
 * Body: the raw file. Header: Authorization: Bearer <Firebase ID token>.
 * Stores the file in R2 under submissions/<uid>/<assignment>/ and returns its key.
 */
import { json, verifyRequest, type Env } from '../_lib/auth';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  /^image\/(jpeg|png|webp|gif|heic|heif)$/,
  /^application\/pdf$/,
  /^application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet)|vnd\.ms-powerpoint|vnd\.ms-excel)$/,
  /^text\/plain$/,
];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await verifyRequest(request, env);
  if (!user) return json({ error: 'Please sign in again.' }, 401);

  const url = new URL(request.url);
  const assignment = url.searchParams.get('assignment') ?? '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(assignment)) return json({ error: 'Unknown assignment.' }, 400);

  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED.some((re) => re.test(type))) return json({ error: 'Only photos, PDF, Word, PowerPoint, Excel and text files can be uploaded.' }, 415);

  const size = Number(request.headers.get('content-length') ?? '0');
  if (size > MAX_BYTES) return json({ error: 'That file is bigger than 10 MB.' }, 413);

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'The file is empty.' }, 400);
  if (body.byteLength > MAX_BYTES) return json({ error: 'That file is bigger than 10 MB.' }, 413);

  const rawName = (url.searchParams.get('name') ?? 'file').slice(0, 120);
  const safeName = rawName.replace(/[^A-Za-z0-9._ -]+/g, '_').trim() || 'file';
  const key = `submissions/${user.uid}/${assignment}/${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  await env.SUBMISSIONS.put(key, body, {
    httpMetadata: { contentType: type, contentDisposition: `inline; filename="${safeName.replace(/"/g, '')}"` },
    customMetadata: { uid: user.uid, assignment, originalName: rawName },
  });
  return json({ key, name: rawName, size: body.byteLength, type });
};
