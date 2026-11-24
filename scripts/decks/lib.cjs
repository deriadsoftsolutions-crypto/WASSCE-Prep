/**
 * Shared slide-deck toolkit for ready-made lessons ("circuit ink" theme, same look as the Python 1 deck).
 * A lesson spec (scripts/decks/lessons/<key>.cjs) exports { file, title, footer, build(d) }, where build()
 * calls the slide layouts below. Run:  node scripts/decks/build.cjs <key>   (see scripts/decks/README.md)
 */
const path = require('path');
const pptxgen = require('pptxgenjs');

const THEME = {
  headFontFace: 'Arial', bodyFontFace: 'Calibri',
  colors: { dk1: '13233A', lt1: 'FFFFFF', dk2: '006B3F', lt2: 'F4F6F1', accent1: '006B3F', accent2: 'F5B700', accent3: 'CE1126', accent4: '1E1E1E', accent5: '2E6FBF', accent6: '5B6B7F', hlink: '006B3F', folHlink: '5B6B7F' },
};
const HEX = THEME.colors;
const MONO = 'Courier New';
const ICONS = path.join(__dirname, 'icons');
const KW_BLUE = new Set(['True', 'False', 'None', 'import', 'if', 'elif', 'else', 'for', 'in', 'while', 'def', 'return', 'and', 'or', 'not', 'break', 'continue', 'try', 'except', 'pass', 'from', 'as', 'with', 'is']);
const KW_FUNC = new Set(['print', 'type', 'input', 'int', 'float', 'str', 'bool', 'len', 'range', 'list', 'sum', 'max', 'min', 'append', 'insert', 'remove', 'pop', 'sort', 'round', 'abs']);

function codeRuns(code) {
  const runs = [];
  code.split('\n').forEach((line, li, all) => {
    const parts = [];
    const re = /(#.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\s+)|(.)/g;
    let m;
    while ((m = re.exec(line))) {
      let color = 'D4D4D4';
      if (m[1]) color = '6A9955';
      else if (m[2]) color = 'CE9178';
      else if (m[3]) color = 'B5CEA8';
      else if (m[4]) color = KW_BLUE.has(m[4]) ? '569CD6' : KW_FUNC.has(m[4]) ? 'DCDCAA' : '9CDCFE';
      parts.push({ text: m[0], options: { color } });
    }
    if (!parts.length) parts.push({ text: ' ', options: { color: 'D4D4D4' } });
    parts[parts.length - 1].options.breakLine = li < all.length - 1;
    runs.push(...parts);
  });
  return runs;
}

/** Lines a monospaced block takes once long lines wrap, at a given width (inches) and font size (points). */
function visualLines(text, widthIn, fontSize) {
  const perLine = Math.max(10, Math.floor(widthIn / ((fontSize * 0.6) / 72)));
  return text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
}
/** Largest font size (from start down to 11 pt) at which the text fits the box height; returns [size, heightNeeded]. */
function fitMono(text, widthIn, maxH, start, lineH = 1.25) {
  for (let fs = start; fs >= 11; fs--) {
    const h = visualLines(text, widthIn, fs) * fs * lineH / 72;
    if (h <= maxH) return [fs, h];
  }
  return [11, visualLines(text, widthIn, 11) * 11 * lineH / 72];
}

function createDeck({ title, footer, subject = 'Robotics' }) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.title = title; pres.author = 'STEM Robotics'; pres.subject = subject;
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;
  const ph = (o) => ({ placeholder: { options: o, text: '' } });
  pres.defineSlideMaster({ title: 'TITLE_DARK', background: { color: HEX.dk1 }, objects: [
    ph({ name: 'title', type: 'title', x: 0.8, y: 2.0, w: 11.7, h: 1.9, fontSize: 44, bold: true, color: C.background1, valign: 'bottom', align: 'left', fontFace: THEME.headFontFace }),
    ph({ name: 'body', type: 'body', x: 0.8, y: 4.05, w: 11.7, h: 1.3, fontSize: 20, color: C.accent2, valign: 'top', align: 'left' })] });
  pres.defineSlideMaster({ title: 'SECTION', background: { color: HEX.accent1 }, objects: [
    ph({ name: 'title', type: 'title', x: 0.8, y: 2.6, w: 11.7, h: 1.4, fontSize: 44, bold: true, color: C.background1, valign: 'bottom', align: 'left' }),
    ph({ name: 'body', type: 'body', x: 0.8, y: 4.1, w: 11.7, h: 1.0, fontSize: 20, color: C.background1, valign: 'top', align: 'left' })],
    slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.background1 } });
  pres.defineSlideMaster({ title: 'CONTENT', background: { color: HEX.lt1 }, objects: [
    ph({ name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 0.85, fontSize: 34, bold: true, color: C.text1, valign: 'middle', align: 'left' }),
    { text: { text: footer, options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 10, color: C.text2 } } }],
    slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.text2 } });

  let section = 'Introduction';
  let sectionStarted = false;
  const startSection = (t) => { section = t; sectionStarted = true; pres.addSection({ title: t }); };
  const ensureSection = () => { if (!sectionStarted) startSection(section); };
  const icon = (name) => path.join(ICONS, `${name}.png`);
  const T = (s, text, o) => s.addText(text, { margin: 0, isTextBox: true, ...o });

  /* ---------- building blocks ---------- */
  const card = (s, x, y, w, h, fill = C.background2, name = 'card') => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, rectRadius: 0.12, line: { color: fill }, objectName: name });
  const dot = (s, x, y, d, fill, iconName, name = 'icon') => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: `${name} circle` });
    if (iconName) s.addImage({ path: icon(iconName), x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, altText: name });
  };
  const numDot = (s, x, y, d, n, fill = C.accent1, ink = C.background1) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    T(s, String(n), { x, y, w: d, h: d, fontSize: d > 0.65 ? 20 : 16, bold: true, align: 'center', valign: 'middle', color: ink });
  };
  const codePanel = (s, code, { x, y, w, h, fontSize = 16, label = 'program.py' }) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: C.accent4 }, rectRadius: 0.12, line: { color: C.accent4 }, objectName: 'code panel' });
    T(s, label, { x: x + 0.25, y: y + 0.12, w: w - 0.5, h: 0.32, fontSize: 12, color: 'A0A0A0', fontFace: MONO });
    T(s, codeRuns(code), { x: x + 0.25, y: y + 0.5, w: w - 0.5, h: h - 0.65, fontSize, fontFace: MONO, valign: 'top', paraSpaceAfter: 2, objectName: 'code' });
  };
  const outputPanel = (s, text, { x, y, w, h, fontSize = 15 }) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: '0C0C0C' }, rectRadius: 0.12, line: { color: '0C0C0C' }, objectName: 'terminal panel' });
    T(s, 'TERMINAL', { x: x + 0.25, y: y + 0.1, w: 2, h: 0.3, fontSize: 11, color: '8A8A8A', fontFace: MONO });
    T(s, text, { x: x + 0.25, y: y + 0.45, w: w - 0.5, h: h - 0.55, fontSize, fontFace: MONO, color: 'E5E5E5', valign: 'top', objectName: 'output' });
  };
  const fig = (s, file, { x, y, w, h, alt, caption }) => {
    s.addImage({ path: file, x, y, w, h, altText: alt, objectName: alt });
    if (caption) T(s, caption, { x, y: y + h + 0.06, w, h: 0.3, fontSize: 11, italic: true, color: C.text2 });
  };
  const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, ...o } }));
  const numbered = (items, o = {}) => items.map((t, i) => ({ text: t, options: { bullet: { type: 'number' }, breakLine: i < items.length - 1, ...o } }));
  const headBody = (head, body, hs = 18, bs = 15, mono = false) => [{ text: head, options: { bold: true, fontSize: hs, color: C.text1, breakLine: true, fontFace: mono ? MONO : undefined } }, { text: body, options: { fontSize: bs, color: C.text2 } }];
  const content = (title, notes) => { ensureSection(); const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section }); s.addText(title, { placeholder: 'title' }); if (notes) s.addNotes(notes); return s; };

  /* ---------- slide layouts ---------- */
  const L = {
    title({ title: t, subtitle, iconName = 'robot', notes }) {
      ensureSection();
      const s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: section });
      s.addText(t, { placeholder: 'title' }); s.addText(subtitle, { placeholder: 'body' });
      dot(s, 0.8, 0.8, 1.0, C.accent1, iconName, 'title icon');
      if (notes) s.addNotes(notes);
    },
    plan({ title: t = "Today's mission", objectives, plan, notes }) {
      const s = content(t, notes);
      card(s, 0.6, 1.45, 6.3, 5.3, C.background2, 'objectives card');
      T(s, 'By the end of this lesson you will be able to:', { x: 0.9, y: 1.65, w: 5.8, h: 0.45, fontSize: 18, bold: true, color: C.text1 });
      s.addText(bullets(objectives, { fontSize: 16, color: C.text1, paraSpaceAfter: 10 }), { x: 0.9, y: 2.2, w: 5.8, h: 4.3, valign: 'top', isTextBox: true });
      const step = Math.min(0.86, 5.3 / plan.length);
      plan.forEach(([time, what, dur], i) => {
        const y = 1.5 + i * step;
        numDot(s, 7.35, y + 0.08, 0.5, i + 1, i % 2 ? C.accent2 : C.accent1, i % 2 ? C.text1 : C.background1);
        T(s, [{ text: what, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } }, { text: `${time}  |  ${dur}`, options: { fontSize: 13, color: C.text2 } }], { x: 8.05, y, w: 4.7, h: 0.7, valign: 'middle' });
      });
    },
    divider({ title: t, sub, notes }) {
      startSection(t);
      const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: section });
      s.addText(t, { placeholder: 'title' }); s.addText(sub, { placeholder: 'body' });
      if (notes) s.addNotes(notes);
    },
    /** A book figure (or code) on the left, a card of points on the right, a prompt underneath. */
    figure({ title: t, image, imageSize, caption, alt, heading, points, tagline, prompt, notes }) {
      const s = content(t, notes);
      const [iw, ih] = imageSize; const w = 7.4; const h = Math.min(3.9, (w * ih) / iw); const ww = (h * iw) / ih;
      fig(s, image, { x: 0.6, y: 1.5, w: ww, h, alt, caption });
      card(s, 8.4, 1.5, 4.3, 5.2, C.background2, 'points card');
      T(s, heading, { x: 8.7, y: 1.7, w: 3.8, h: 0.45, fontSize: 20, bold: true, color: C.accent1 });
      s.addText(bullets(points, { fontSize: 16, color: C.text1, paraSpaceAfter: 10 }), { x: 8.7, y: 2.3, w: 3.8, h: 3.0, valign: 'top', isTextBox: true });
      if (tagline) T(s, tagline, { x: 8.7, y: 5.6, w: 3.8, h: 0.8, fontSize: 16, italic: true, color: C.text2 });
      if (prompt) T(s, prompt, { x: 0.6, y: 1.5 + h + 0.5, w: 7.4, h: 0.9, fontSize: 17, bold: true, color: C.text1 });
    },
    /** Code (and optional output) on the left; explanation steps or points on the right. */
    code({ title: t, code, label, fontSize = 18, output, steps, points, image, imageSize, caption, alt, tip, notes }) {
      const s = content(t, notes);
      const outFit = output ? fitMono(output, 5.9, 1.7, 15) : [15, 0];
      const outH = output ? outFit[1] + 0.65 : 0;
      const [cfs, ch] = fitMono(code, 5.9, 5.25 - (output ? outH + 0.2 : 0) - 0.65, fontSize);
      const codeH = ch + 0.7;
      codePanel(s, code, { x: 0.6, y: 1.45, w: 6.4, h: codeH, fontSize: cfs, label });
      if (output) outputPanel(s, output, { x: 0.6, y: 1.45 + codeH + 0.2, w: 6.4, h: outH, fontSize: outFit[0] });
      let y = 1.45;
      if (steps) steps.forEach(([head, body], i) => {
        numDot(s, 7.4, y, 0.7, i + 1);
        T(s, headBody(head, body, 17, 15), { x: 8.3, y: y - 0.1, w: 4.4, h: 1.05, valign: 'middle' });
        y += 1.3;
      });
      if (points) { card(s, 7.4, y, 5.3, Math.min(5.2, 0.6 + points.length * 0.8), C.background2, 'points card'); s.addText(bullets(points, { fontSize: 16, color: C.text1, paraSpaceAfter: 8 }), { x: 7.65, y: y + 0.2, w: 4.8, h: Math.min(4.8, points.length * 0.8), valign: 'top', isTextBox: true }); y += Math.min(5.2, 0.6 + points.length * 0.8) + 0.25; }
      if (image) { const [iw, ih] = imageSize; const w = 5.3; const h = Math.min(2.2, (w * ih) / iw); fig(s, image, { x: 7.4, y, w: (h * iw) / ih, h, alt, caption }); y += h + 0.55; }
      if (tip) { card(s, 7.4, y, 5.3, 1.2, C.background2, 'tip'); dot(s, 7.6, y + 0.25, 0.7, C.accent2, 'lightbulb', 'tip'); T(s, tip, { x: 8.45, y: y + 0.1, w: 4.1, h: 1.0, fontSize: 14, color: C.text1, valign: 'middle' }); }
    },
    /** 2 to 4 cards: icon, heading, subheading, example (monospace), use. */
    cards({ title: t, cards, notes }) {
      const s = content(t, notes);
      const cols = cards.length <= 2 ? cards.length : 2; const rows = Math.ceil(cards.length / cols);
      const w = (12.1 - (cols - 1) * 0.2) / cols; const h = (5.35 - (rows - 1) * 0.2) / rows;
      const fills = [C.accent1, C.accent5, C.accent2, C.accent3];
      cards.forEach((c, i) => {
        const x = 0.6 + (i % cols) * (w + 0.2); const y = 1.45 + Math.floor(i / cols) * (h + 0.2);
        card(s, x, y, w, h, C.background2, `card ${c.head}`);
        dot(s, x + 0.3, y + 0.3, 0.85, c.color ?? fills[i % 4], c.icon, c.head);
        T(s, [{ text: c.head, options: { bold: true, fontSize: c.mono ? 24 : 22, color: C.text1, fontFace: c.mono ? MONO : undefined, breakLine: !!c.sub } }, ...(c.sub ? [{ text: c.sub, options: { fontSize: 15, color: C.text2 } }] : [])], { x: x + 1.4, y: y + 0.2, w: w - 1.7, h: 1.05, valign: 'middle' });
        let yy = y + 1.35;
        if (c.example) { T(s, c.example, { x: x + 0.3, y: yy, w: w - 0.6, h: 0.45, fontSize: 16, fontFace: MONO, color: C.accent1 }); yy += 0.5; }
        if (c.text) T(s, c.text, { x: x + 0.3, y: yy, w: w - 0.6, h: y + h - yy - 0.15, fontSize: 15, color: C.text1, valign: 'top' });
      });
    },
    /** A table on the left, optional side card with a figure and a note. */
    table({ title: t, head, rows, colW, mono = [], side, notes }) {
      const s = content(t, notes);
      const width = side ? 7.3 : 12.1;
      const hd = { bold: true, color: C.background1, fill: { color: C.text1 }, fontSize: 15 };
      const data = [head.map((h) => ({ text: h, options: hd }))];
      rows.forEach((r, i) => data.push(r.map((cell, j) => ({ text: cell, options: { fontFace: mono.includes(j) ? MONO : undefined, fontSize: mono.includes(j) ? 16 : 15, bold: j === 0 && mono.includes(0), color: j === 0 && mono.includes(0) ? C.accent1 : C.text1, fill: { color: i % 2 ? C.background1 : C.background2 } } }))));
      s.addTable(data, { x: 0.6, y: 1.45, w: width, colW: colW ?? head.map(() => width / head.length), rowH: Math.min(0.6, 5.3 / (rows.length + 1)), border: { type: 'solid', pt: 0.5, color: 'D5DBD0' }, valign: 'middle', objectName: 'table' });
      if (side) {
        card(s, 8.3, 1.45, 4.4, 5.2, C.background2, 'side card');
        T(s, side.heading, { x: 8.6, y: 1.65, w: 3.8, h: 0.45, fontSize: 18, bold: true, color: C.accent1 });
        let y = 2.25;
        if (side.image) { const [iw, ih] = side.imageSize; const w = 3.8; const h = Math.min(2.2, (w * ih) / iw); fig(s, side.image, { x: 8.6, y, w: (h * iw) / ih, h, alt: side.alt, caption: side.caption }); y += h + 0.55; }
        if (side.code) { codePanel(s, side.code, { x: 8.5, y, w: 4.0, h: 0.6 + side.code.split('\n').length * 0.32, fontSize: 13, label: side.label ?? 'example.py' }); y += 0.8 + side.code.split('\n').length * 0.32; }
        if (side.text) T(s, side.text, { x: 8.6, y, w: 3.8, h: 6.5 - y, fontSize: 15, color: C.text1, valign: 'top' });
      }
    },
    /** Rows of icon + heading + text, optional figure on the left. */
    rows({ title: t, rows, image, imageSize, caption, alt, notes }) {
      const s = content(t, notes);
      let x0 = 0.6;
      if (image) { const [iw, ih] = imageSize; const h = Math.min(4.9, (4.6 * ih) / iw); const w = (h * iw) / ih; fig(s, image, { x: 0.6, y: 1.45, w, h, alt, caption }); x0 = 0.6 + w + 0.5; }
      const step = Math.min(1.3, 5.3 / rows.length);
      rows.forEach((r, i) => {
        const y = 1.45 + i * step;
        dot(s, x0, y, 0.75, r.color === 'red' ? C.accent3 : r.color === 'gold' ? C.accent2 : C.accent1, r.icon, r.head);
        T(s, headBody(r.head, r.text, 17, 15, !!r.mono), { x: x0 + 0.95, y: y - 0.1, w: 12.7 - x0 - 0.95, h: step - 0.15, valign: 'middle' });
      });
    },
    /** Pair or group task: numbered tasks in a card, example code and its output on the right. */
    activity({ title: t, intro, tasks, timer, code, label, codeSize = 14, output, footnote, notes }) {
      const s = content(t, notes);
      card(s, 0.6, 1.45, 5.0, 5.3, C.background2, 'task card');
      T(s, intro, { x: 0.9, y: 1.65, w: 4.4, h: 0.8, fontSize: 17, bold: true, color: C.text1, valign: 'top' });
      s.addText(numbered(tasks, { fontSize: 15, color: C.text1, paraSpaceAfter: 7 }), { x: 0.9, y: 2.45, w: 4.4, h: 3.2, valign: 'top', isTextBox: true });
      dot(s, 0.9, 5.75, 0.7, C.accent2, 'clock', 'timer');
      T(s, timer, { x: 1.75, y: 5.75, w: 3.6, h: 0.7, fontSize: 18, bold: true, color: C.text1, valign: 'middle' });
      if (code) {
        const outFit = output ? fitMono(output, 6.3, 1.5, 14) : [14, 0];
        const outH = output ? outFit[1] + 0.65 : 0;
        const [cfs, cth] = fitMono(code, 6.3, (footnote ? 4.45 : 5.25) - (output ? outH + 0.2 : 0) - 0.65, codeSize);
        const ch = cth + 0.7;
        codePanel(s, code, { x: 5.9, y: 1.45, w: 6.8, h: ch, fontSize: cfs, label });
        if (output) outputPanel(s, output, { x: 5.9, y: 1.45 + ch + 0.2, w: 6.8, h: outH, fontSize: outFit[0] });
      }
      if (footnote) T(s, footnote, { x: 5.9, y: 6.0, w: 6.8, h: 0.7, fontSize: 15, italic: true, color: C.text2 });
    },
    /** Exit check: numbered questions. */
    quiz({ title: t = 'Exit check', questions, notes }) {
      const s = content(t, notes);
      const step = Math.min(1.02, 5.3 / questions.length);
      questions.forEach((q, i) => {
        const y = 1.45 + i * step;
        numDot(s, 0.6, y + 0.12, 0.6, i + 1);
        T(s, q, { x: 1.45, y, w: 11.25, h: step - 0.15, fontSize: 18, color: C.text1, valign: 'middle' });
      });
    },
    summary({ title: t = 'What we learned today', points, homework, notes }) {
      ensureSection();
      const s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: section });
      s.addText(t, { placeholder: 'title' }); s.addText(points.join('  |  '), { placeholder: 'body' });
      if (homework) { dot(s, 0.8, 5.6, 0.8, C.accent2, 'home', 'homework'); T(s, [{ text: 'Homework: ', options: { bold: true, color: C.accent2 } }, { text: homework, options: { color: C.background1 } }], { x: 1.85, y: 5.45, w: 10.6, h: 1.2, fontSize: 17, valign: 'middle' }); }
      if (notes) s.addNotes(notes);
    },
  };
  return { pres, C, THEME, L, icon };
}

module.exports = { createDeck, THEME, codeRuns, visualLines, fitMono };
