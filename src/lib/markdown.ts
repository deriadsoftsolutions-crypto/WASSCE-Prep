import { esc } from './dom';

/**
 * A small, safe Markdown subset for lesson text. Everything is escaped first, so a lesson
 * can never inject HTML. Supported:
 *   # / ## / ### headings, - or * bullet lists, 1. numbered lists, blank line = new paragraph,
 *   **bold**, *italic* or _italic_, `code`, [link text](https://...), bare https:// links,
 *   and code blocks between lines of three backticks (```), shown exactly as typed.
 */
function inline(s: string): string {
  // Code spans first, kept aside so * and _ inside them are not read as bold or italic.
  const spans: string[] = [];
  const text = esc(s).replace(/`([^`]+)`/g, (_m, c: string) => `\u0000${spans.push(c) - 1}\u0000`);
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${spans[Number(i)]}</code>`);
}

export function markdown(src: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  let code: string[] | null = null;
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    if (/^\s*```/.test(raw)) {
      if (code) { out.push(`<pre class="lesson-code"><code>${esc(code.join('\n'))}</code></pre>`); code = null; }
      else { flushPara(); closeList(); code = []; }
      continue;
    }
    if (code) { code.push(raw.replace(/\s+$/, '')); continue; }
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if (h) { flushPara(); closeList(); const lvl = h[1].length + 1; out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  if (code) out.push(`<pre class="lesson-code"><code>${esc(code.join('\n'))}</code></pre>`);
  flushPara();
  closeList();
  return out.join('\n');
}
