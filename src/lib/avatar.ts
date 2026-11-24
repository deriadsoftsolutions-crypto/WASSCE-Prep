/** Profile picture helpers. Pure (no DOM, no Firebase) so the unit tests can run them with Node. */

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The centred square to crop from a w×h picture. */
export function cropBox(w: number, h: number): { sx: number; sy: number; size: number } {
  const size = Math.min(w, h);
  return { sx: Math.round((w - size) / 2), sy: Math.round((h - size) / 2), size };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

/** A round profile picture, or the learner's initials when there is no approved photo. */
export function avatarHTML(name: string, dataUrl: string | null, size = 40): string {
  const alt = escAttr(name);
  if (dataUrl && dataUrl.startsWith('data:image/jpeg;base64,')) {
    return `<img class="avatar" src="${escAttr(dataUrl)}" width="${size}" height="${size}" alt="${alt}" />`;
  }
  return `<span class="avatar avatar-initials" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px" role="img" aria-label="${alt}">${escAttr(initials(name))}</span>`;
}
