import { esc } from './dom';
import { viewerHref } from './viewable';

/** Where a link goes: web links open in a new tab; site files (/teaching/...) open in the built-in viewer when it can show them. */
function target(url: string): { href: string; ext: boolean } {
  if (/^https?:\/\//.test(url)) return { href: url, ext: true };
  return { href: viewerHref(url) ?? url, ext: false };
}
const a = (url: string, label: string) => {
  const t = target(url);
  return `<a href="${esc(t.href)}"${t.ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
};

/**
 * Plain text to HTML: line breaks, clickable web links, and [label](link) links,
 * where the link is a web address or a file on this site such as /teaching/society-1/scenarios.pdf.
 */
export function richText(s: string): string {
  const links: string[] = [];
  const keep = (html: string) => `\u0000${links.push(html) - 1}\u0000`;
  let out = esc(s).replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|\/teaching\/)[^\s)]+)\)/g, (_m, label: string, url: string) => keep(a(url.replace(/&amp;/g, '&'), label)));
  out = out.replace(/https?:\/\/[^\s<\u0000]+/g, (m) => {
    const url = m.replace(/[).,;:!?]+$/, ''); // leave closing punctuation outside the link
    return keep(a(url.replace(/&amp;/g, '&'), url)) + m.slice(url.length);
  });
  out = out.replace(/(^|[\s(])(\/teaching\/[A-Za-z0-9_\-./]+[A-Za-z0-9_])/g, (_m, pre: string, url: string) => pre + keep(a(url, url.split('/').pop()!)));
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i) => links[Number(i)]).replace(/\n/g, '<br>');
}
