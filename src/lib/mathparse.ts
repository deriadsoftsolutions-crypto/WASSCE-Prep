/**
 * Safe evaluator for what learners type into calculation boxes.
 * Supports numbers, + - * / ^ × ÷, brackets, pi / π, sqrt(), sin/cos/tan (degrees),
 * implicit multiplication such as 2pi or 2(3+1). Returns NaN if it cannot parse.
 */
export function evaluate(input: string): number {
  const src = input.trim().toLowerCase().replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/\s+/g, '');
  if (!src) return NaN;
  let i = 0;
  const peek = () => src[i];
  const fail = (): never => { throw new Error('parse'); };

  const number = (): number => {
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(src.slice(i));
    if (!m) fail();
    i += m![0].length;
    return parseFloat(m![0]);
  };
  const ident = (): number => {
    const m = /^[a-z]+/.exec(src.slice(i))!;
    i += m[0].length;
    const name = m[0];
    if (name === 'pi') return Math.PI;
    const fns: Record<string, (x: number) => number> = {
      sqrt: Math.sqrt,
      sin: (x) => Math.sin((x * Math.PI) / 180),
      cos: (x) => Math.cos((x * Math.PI) / 180),
      tan: (x) => Math.tan((x * Math.PI) / 180),
    };
    const f = fns[name];
    if (!f) fail();
    return f(atom());
  };
  const atom = (): number => {
    const c = peek();
    if (c === '(') { i++; const v = expr(); if (peek() !== ')') fail(); i++; return v; }
    if (c === '-') { i++; return -atom(); }
    if (c === '+') { i++; return atom(); }
    if (c !== undefined && /[a-z]/.test(c)) return ident();
    return number();
  };
  const power = (): number => {
    const b = atom();
    if (peek() === '^') { i++; return Math.pow(b, power()); }
    return b;
  };
  const term = (): number => {
    let v = power();
    for (;;) {
      const c = peek();
      if (c === '*') { i++; v *= power(); }
      else if (c === '/') { i++; v /= power(); }
      else if (c === '(' || (c !== undefined && /[a-z]/.test(c))) v *= power();
      else return v;
    }
  };
  const expr = (): number => {
    let v = term();
    for (;;) {
      const c = peek();
      if (c === '+') { i++; v += term(); }
      else if (c === '-') { i++; v -= term(); }
      else return v;
    }
  };
  try {
    const v = expr();
    return i === src.length ? v : NaN;
  } catch {
    return NaN;
  }
}

/**
 * True if `given` matches `target` within a relative tolerance, or equals the
 * target correctly rounded to 2 decimal places or 2 significant figures.
 */
export function close(given: number, target: number, tol = 0.01): boolean {
  if (!isFinite(given)) return false;
  if (target === 0) return Math.abs(given) < 1e-6;
  if (Math.abs(given - target) <= Math.abs(target) * tol) return true;
  const r2dp = Math.round(target * 100) / 100;
  const r2sf = Number(target.toPrecision(2));
  return Math.abs(given - r2dp) < 1e-9 || Math.abs(given - r2sf) < 1e-9;
}
