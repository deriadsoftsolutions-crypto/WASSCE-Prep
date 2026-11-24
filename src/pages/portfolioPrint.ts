/**
 * Portfolio print layout (/portfolio/print, teachers: /portfolio/print/<uid>), ?y=<STEM year>.
 * Cover page, table of contents and every item, laid out for the browser's Print or Save as PDF
 * (the Ministry's "single file" submission).
 */
import { esc } from '../lib/dom';
import { CONFIG } from '../config';
import { learner } from '../lib/session';
import { buildPortfolio, numberItems, type Year } from '../lib/portfolioCore';
import { fmtDay, loadThumbs, thumbsHTML } from './portfolioView';
import { markTableHTML } from './portfolio';
import { getMark, getPortfolioSettings, loadBuildInput, profileOf, yearInfo } from '../firebase/portfolio';

export async function portfolioPrintPage(el: HTMLElement, params: Record<string, string>) {
  const me = learner();
  const uid = params.uid || me?.id;
  if (!uid) { el.innerHTML = '<h1>Portfolio</h1><p class="muted">Sign in to see your portfolio.</p>'; return; }
  el.innerHTML = '<div class="skel"><span class="tall"></span><span></span></div>';
  try {
    const [info, prof, settings] = await Promise.all([yearInfo(uid), profileOf(uid), getPortfolioSettings()]);
    if (!params.uid && me?.year) info.year = me.year as Year;
    const q = Number(new URLSearchParams(location.search).get('y'));
    const year = ([1, 2, 3].includes(q) ? q : info.year) as Year;
    const [input, mark] = await Promise.all([loadBuildInput(uid, year, info), getMark(uid, year).catch(() => null)]);
    const built = buildPortfolio(input);
    const numbered = numberItems(built.sections);
    const num = new Map(numbered.map((n) => [n.item.id, n.num]));
    const period = settings.period || `${new Date().getFullYear()}`;
    el.innerHTML = `
      <div class="row no-print" style="margin-bottom:16px">
        <a class="btn" href="${params.uid ? '/teacher' : '/portfolio'}">Back</a>
        <button class="btn btn-primary" data-doprint type="button">Print or save as PDF</button>
        <span class="muted small">In the print window, choose "Save as PDF" to make a single file.</span>
      </div>
      <article class="pp">
        <section class="pp-cover">
          <p class="pp-school">${esc(CONFIG.SCHOOL)}</p>
          <h1>Robotics Portfolio</h1>
          <dl>
            <dt>Name</dt><dd>${esc(prof.name)}</dd>
            <dt>Class</dt><dd>${esc(prof.className)}</dd>
            <dt>Subject</dt><dd>Robotics, STEM ${year}</dd>
            <dt>Period</dt><dd>${esc(period)}</dd>
          </dl>
          <p class="muted small">Printed ${fmtDay(Date.now())}${input.meta.submittedAt ? `. Handed in ${fmtDay(input.meta.submittedAt)}` : ''}</p>
        </section>
        <section class="pp-toc">
          <h2>Contents</h2>
          ${numbered.length ? built.sections.filter((s) => s.items.length).map((s) => `
            <h3>${built.sections.indexOf(s) + 1}. ${esc(s.title)}</h3>
            <ol class="pp-toclist">${s.items.map((it) => `<li><span>${num.get(it.id)}</span> ${esc(it.title)}</li>`).join('')}</ol>`).join('')
            : '<p>Nothing in this portfolio yet.</p>'}
          <p class="small">Final reflection${mark ? ', teacher\'s mark' : ''} at the end.</p>
        </section>
        ${built.sections.filter((s) => s.items.length).map((s) => `
          <section class="pp-sec">
            <h2>${built.sections.indexOf(s) + 1}. ${esc(s.title)}</h2>
            ${s.items.map((it) => `<div class="pp-item">
              <h3>${num.get(it.id)} ${esc(it.title)}</h3>
              <p class="muted small">${fmtDay(it.date)}${it.result ? `. Result: ${esc(it.result)}` : ''}${it.auto ? '. From the class Robotics site' : ''}</p>
              ${it.description ? `<p>${esc(it.description)}</p>` : ''}
              ${thumbsHTML(it.files, true)}
            </div>`).join('')}
          </section>`).join('')}
        <section class="pp-final">
          <h2>Final reflection</h2>
          <p>${input.meta.finalReflection ? esc(input.meta.finalReflection) : '<span class="muted">Not written yet.</span>'}</p>
        </section>
        ${mark ? `<section class="pp-mark"><h2>Teacher's mark</h2>${markTableHTML(mark)}</section>` : ''}
      </article>`;
    void loadThumbs(el);
    el.querySelector('[data-doprint]')!.addEventListener('click', async () => {
      await loadThumbs(el);
      window.print();
    });
  } catch (ex) {
    console.error(ex);
    el.innerHTML = '<h1>Portfolio</h1><p class="mark-bad">Could not load the portfolio. Check your internet connection.</p>';
  }
}
