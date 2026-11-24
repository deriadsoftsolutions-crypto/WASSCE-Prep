# Learner Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-learner, per-STEM-year Robotics portfolio. Results from the site fill it automatically and learners add photos and reflections. Teachers review it and mark it /40 on the Ministry scheme. It prints as a single PDF.

**Architecture:**
- A pure module (`src/lib/portfolioCore.ts`) turns raw records (attempts, submissions and feedback, test results, learner items, meta) into sections of items.
- A Firestore module (`src/firebase/portfolio.ts`) loads and saves those records.
- Three pages render them: the learner page, the teacher tab and the print layout.
- Photos reuse the private `/api/upload` and `/api/file` functions with the assignment id `portfolio`.

**Tech Stack:** Vite 6 + vanilla TS, Firebase Auth/Firestore (emulators for tests), Cloudflare Pages Functions + R2, Playwright (preinstalled) for end-to-end checks, and `node --test` with Node 22 type stripping for unit tests.

**Spec:** `docs/superpowers/specs/2026-11-24-portfolio-design.md`

## Global Constraints

- No em dashes anywhere in the UI text.
- Tap targets at least 48px (the sweep accepts 44 or more for main controls and 40 or more for selects). No horizontal overflow at 768×1024 or 1280×800.
- Sections, in this order, with these maximums:
  - `assignments` "Assignments and exercises" 10
  - `projects` "Projects and case studies" 10
  - `tests` "Quizzes and tests" 10
  - `reflections` "Reflective pieces" 5
  - `semester` "Mid-semester and end-of-semester papers" 5
  - `other` "Certificates, awards and other documents" 0 (not marked)
- The total is out of 40.
- Learners cannot edit automatic scores, cannot read other learners' portfolios, and cannot write `status` values other than `building` and `handed-in`.
- Photos are shrunk with the existing `shrinkImage()` and uploaded through `uploadFile('portfolio', file)`. The 10 MB limit comes from `/api/upload`.
- Commit messages end with the session's attribution lines. Push only to `claude/wassce-robotics-practice-site-a0vtvk`.

## Review Focus

1. **A learner with no results and no items.** Every section shows an empty state with a short hint, and the print layout still has a cover page and contents. This is tested in Task 1 (`empty input`) and Task 5 (print of an empty portfolio).
2. **Handing in while offline or editing after handing in.** Editing controls are disabled while the status is `handed-in` or `marked`, and the rules reject learner item writes while handed in. This is tested in Task 2 (rules) and Task 4 (UI lock).
3. **A learner who changes STEM year.** The new year starts empty, and the old year is still reachable through a year switch. This is tested in Task 1 (`filters by year`) and Task 4.
4. **A photo upload failing part-way or a non-image file.** The item is saved with the files that did upload, and an error names the failed file. This is tested in Task 4 by uploading `evil.exe` renamed with a `.jpg` content type, which the server rejects.
5. **A teacher test whose results are not released yet.** It must not appear. Once released, it shows `total/max`. This is tested in Task 1 (`unreleased test hidden`).

---

### Task 1: Pure portfolio builder + unit tests

**Files:**
- Create: `src/lib/portfolioCore.ts`
- Create: `tests/portfolioCore.test.ts`
- Modify: `package.json` (add `"test": "node --test tests/"`)

**Interfaces:**
- Produces:
  - `type SectionId = 'assignments'|'projects'|'tests'|'reflections'|'semester'|'other'`
  - `SECTIONS: { id: SectionId; title: string; max: number; hint: string }[]`, in the order above
  - `interface PItem { id: string; section: SectionId; title: string; date: number; result?: string; description: string; files: { key: string; name: string; size: number; type: string }[]; auto: boolean; hidden: boolean; isFinal?: boolean; source?: string }`
  - `interface PMeta { hidden: string[]; notes: Record<string,string>; finalReflection: string; status: 'building'|'handed-in'|'returned'|'marked'; submittedAt: number|null; updatedAt: number }`
  - `const emptyMeta: () => PMeta`
  - `interface BuildInput { year: 1|2|3; yearOf: (ts: number) => 1|2|3; attempts: {id:string; kind:string; itemId:string; score:number; max:number; timestamp:number}[]; submissions: {assignmentId:string; title:string; portfolioSection?:'assignments'|'projects'; submittedAt:number; files:PItem['files']; text:string; mark?: {mark:number; maxMarks:number; comment:string}}[]; testResults: {assessmentId:string; title:string; portfolioSection?:'tests'|'semester'; total:number; max:number; comment:string; releasedAt:number}[]; items: (Omit<PItem,'auto'|'hidden'> & { year: number })[]; meta: PMeta }`
  - `buildPortfolio(input: BuildInput): { sections: { id: SectionId; title: string; max: number; items: PItem[] }[]; hiddenItems: PItem[] }`
  - `numberItems(sections) : { num: string; item: PItem }[]` (the "1.1", "1.2" numbering, visible items only, empty sections skipped)
  - `markTotal(scores: Partial<Record<SectionId, number>>): number` (clamps each section to `0..max`)
- Rules the builder implements:
  - Automatic ids: `asg:<assignmentId>`, `test:<assessmentId>`, `mock:<attemptId>` (kind `mock`), `p2:<attemptId>` (kind `paper2`), and one `practice:y<year>` summary built from all `topic-quiz` and `activity` attempts that year. The summary shows the count of attempts and the best score per item, with `result` like "12 quizzes and activities, average best 74%". `lesson` attempts are ignored.
  - Automatic items take their description from `meta.notes[id]`, or `''` if there is none.
  - An item goes in a year when `yearOf(timestamp) === input.year`. Learner items use their own `year` field.
  - Items in `meta.hidden` move to `hiddenItems`.
  - Items are sorted by date ascending within a section.
  - `result` formats: assignment marked "7 / 10", not yet marked "Handed in, not marked yet"; test "15 / 20"; mock "31 / 40".

- [ ] **Step 1: Write the failing tests** in `tests/portfolioCore.test.ts` (with `node:test` and `node:assert/strict`):
  - `empty input`: all 6 sections are present, every `items` array is empty, and `numberItems` returns `[]`.
  - `sorts sources into sections`: given one assignment submission (no section), one project submission (`portfolioSection:'projects'`), a released semester test, a mock attempt and a paper2 attempt, they land in `assignments`, `projects`, `semester`, `tests` and `tests` respectively. All are `auto:true`.
  - `practice summary`: 3 topic-quiz attempts and 1 activity attempt become exactly one `tests` item with id `practice:y1`, and its `result` includes "4 quizzes and activities".
  - `unreleased test hidden`: test results only arrive released, so the input is empty and nothing appears in `tests`. Also check that a feedback-less submission shows `result === 'Handed in, not marked yet'`.
  - `filters by year`: a mock in year 1 and a mock in year 2 with `year:2` gives only the year 2 mock.
  - `hidden and notes`: `meta.hidden=['mock:a']` moves it to `hiddenItems`, and `meta.notes={'mock:a':'x'}` sets its description.
  - `numbering`: two visible items in `assignments` and one in `reflections` give `['1.1','1.2','4.1']`.
  - `markTotal`: `{assignments:12, tests:9, reflections:-1}` gives `19` (12 clamps to 10 and -1 clamps to 0).
- [ ] **Step 2:** Run `node --test tests/` and expect it to fail because the module is not found.
- [ ] **Step 3:** Implement `src/lib/portfolioCore.ts` with only `import type`, no JSON imports and no Firebase, so Node can run it. Use `.ts` extension-free imports only in app code. Tests import `../src/lib/portfolioCore.ts`, so set `allowImportingTsExtensions` in tsconfig only if tsc complains. Otherwise exclude `tests/` from the app tsconfig.
- [ ] **Step 4:** Run `node --test tests/` and expect every test to pass. Run `npx tsc --noEmit` and expect it to be clean.
- [ ] **Step 5:** Commit with the message "Add the portfolio builder".

### Task 2: Firestore data layer, rules, and portfolio-section fields on assignments and tests

**Files:**
- Create: `src/firebase/portfolio.ts`
- Modify: `firestore.rules`
- Modify: `src/firebase/assignments.ts` (`Assignment.portfolioSection?: 'assignments'|'projects'`)
- Modify: `src/firebase/assessments.ts` (`Assessment.portfolioSection?: 'tests'|'semester'`, read in `fromDoc`, written in `saveAssessment`)
- Modify: `src/pages/teacherAssignments.ts` and `src/pages/teacherTests.ts` (add a "Portfolio section" select to the editors)

**Interfaces:**
- Consumes: `PMeta`, `PItem`, `emptyMeta` (Task 1).
- Produces (all in `src/firebase/portfolio.ts`; `uid` is the target learner):
  - `getMeta(uid, year): Promise<PMeta>`
  - `saveMeta(uid, year, patch: Partial<PMeta>): Promise<void>` (a merge that sets `updatedAt`)
  - `listItems(uid): Promise<(PItem & { year:number; createdAt:number })[]>`
  - `saveItem(uid, item): Promise<string>`
  - `deleteItem(uid, id): Promise<void>` (also calls `deleteFile` for each file key; ignore errors)
  - `listReviews(uid, year): Promise<{id:string; comment:string; at:number; teacherName:string}[]>`
  - `addReview(uid, year, comment, teacherName)`
  - `getMark(uid, year): Promise<PMark|null>`
  - `saveMark(uid, year, m: PMark)` where `PMark = { scores: Partial<Record<SectionId,number>>; total:number; max:40; comment:string; markedAt:number }`. Saving a mark also sets the meta status to `'marked'`.
  - `getPortfolioSettings(): Promise<{ dueAt: Record<'1'|'2'|'3', number|null>; period: string }>`
  - `savePortfolioSettings(s)`
  - `loadBuildInput(uid, year, learnerYearOf): Promise<BuildInput>`. This gathers attempts (`storage.getAttempts({learnerId})`), submissions with feedback and the assignment titles and sections, released results (`learners/{uid}/assessmentResults`) with assessment titles and sections, items, and meta.
  - `yearOf` rule (my call): use the learner's current year for every record. Records keep a `year` stamp only once Task 4 starts stamping attempts. To support the old-portfolio switch, learner items carry `year`, and automatic records before the learner's `yearSetAt` belong to the previous year. Store `yearSetAt` on the learner profile when the year changes (in `askYear` in `src/lib/session.ts`). `yearOf(ts) = ts < yearSetAt ? (prevYear ?? year) : year`, with `prevYear` stored alongside.
- Paths: `learners/{uid}/portfolio/y{year}`, `learners/{uid}/portfolioItems/{id}`, `learners/{uid}/portfolioReviews/{id}`, `learners/{uid}/portfolioMark/y{year}`, `settings/portfolio`.
- Rules to add inside `match /learners/{uid}`:
  - `portfolio/{y}`: the owner reads; the owner writes only when `request.resource.data.status in ['building','handed-in']`, and only if the existing status is not `'marked'`. The teacher reads and writes.
  - `portfolioItems/{id}`: the owner reads and writes when `get(/databases/$(database)/documents/learners/$(uid)/portfolio/$('y' + string(request.resource.data.year))).data.status` is not one of `['handed-in','marked']` (on create or update; on delete use `resource.data.year`), or when that doc does not exist. The teacher reads.
  - `portfolioReviews/{id}`, `portfolioMark/{y}`: the owner reads; the teacher reads and writes.
  - Collection-group reads for the teacher: `{path=**}/portfolio/{id}`, `{path=**}/portfolioMark/{id}`.
  - `settings/portfolio` is already covered by the existing `settings/{id}` rule. Check that learners can read it.

- [ ] **Step 1: Write the failing rules test** `scratchpad/port-rules.cjs`, using the emulator REST API with learner ID tokens as in `curr.cjs`:
  - learner A writes its own item → 200;
  - learner A writes learner B's item → 403;
  - learner A sets its own meta status `'marked'` → 403;
  - after A hands in (`status:'handed-in'`), A creating an item for that year → 403;
  - A writes `portfolioMark` → 403;
  - the teacher writes `portfolioMark` → 200.
- [ ] **Step 2:** Run it against the emulators with the current rules and expect at least the handed-in and status checks to fail.
- [ ] **Step 3:** Implement the rules, `src/firebase/portfolio.ts`, the two new optional fields and the editor selects. The select labels are "Portfolio section: Assignment / Project" and "Portfolio section: Quiz or test / Semester paper". Existing documents without the field default to `assignments` and `tests`.
- [ ] **Step 4:** Run `node scratchpad/port-rules.cjs` and expect every line to show the expected status. Then `npx tsc --noEmit`, which should be clean.
- [ ] **Step 5:** Commit with the message "Add portfolio data and rules".

### Task 3: Shared portfolio view

**Files:**
- Create: `src/pages/portfolioView.ts`
- Modify: `src/styles.css` (portfolio cards, thumbnails, `@media print` rules for Task 5)

**Interfaces:**
- Consumes: `buildPortfolio`, `SECTIONS`, `PItem` (Task 1); `openFile` and `SubmittedFile` from `src/firebase/assignments.ts`.
- Produces:
  - `portfolioSectionsHTML(built, opts: { editable: boolean; locked: boolean }): string`. Each section is rendered as `<section data-sec="<id>">` with a heading and maximum, item cards `<article class="p-item" data-pid="<id>">` with a lock icon when `auto`, the result pill, the description, and `<button data-thumb="<key>">` thumbnails. With `editable && !locked` it adds `[data-pedit]` and `[data-phide]` buttons (and `[data-pdel]` for learner items). There is an empty state per section.
  - `loadThumbs(root: HTMLElement): Promise<void>`. This fetches each `[data-thumb]` image through `/api/file` with the ID token into a blob URL and sets it on an `<img>`. Tapping a thumbnail calls `openFile`.

- [ ] **Step 1:** Check it in Task 4's end-to-end test. This view has no separate test, because the reviewer checks it through Task 4.
- [ ] **Step 2:** Implement it with the existing `.card`, `.pill` and `icon('check'|'file')` patterns. Add a `lock` icon path to `src/lib/icons.ts`: `'M7 11V8a5 5 0 0110 0v3M5.5 11h13v10h-13z'`.
- [ ] **Step 3:** Run `npx tsc --noEmit`, which should be clean.
- [ ] **Step 4:** Commit together with Task 4.

### Task 4: Learner Portfolio page

**Files:**
- Create: `src/pages/portfolio.ts`
- Modify: `src/main.ts` (route `/portfolio`, nav key `portfolio`, icon `file`)
- Modify: `index.html` (nav link "Portfolio" after Classwork, hidden unless Firebase)
- Modify: `scripts/sw-template.js` (add `/portfolio` and `/portfolio/print` to APP_ROUTES and bump SCHEMA to 5)
- Modify: `src/lib/session.ts` (`askYear` stores `yearSetAt` and `prevYear`)

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces: `portfolioPage(el: HTMLElement): Promise<void>`.

Page contents:
- A header with "STEM n Portfolio", the due date from settings ("Due 12 Mar 2027" or "No due date yet"), a status pill, and the totals per section.
- A year switch, shown only when `prevYear` exists.
- The sections from Task 3.
- `[data-padd]` "+ Add to my portfolio" opens an inline form with:
  - a section select (all six; `reflections` adds a "This is my final reflection" checkbox);
  - title, date (today by default) and description;
  - `<label class="btn"><input type=file accept="image/*" capture="environment" data-pcam hidden>Take a photo</label>`;
  - `<label class="btn"><input type=file multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" data-pfiles hidden>Choose files</label>`;
  - a progress line, then Save.
- A final reflection textarea `[data-final]`, saved on blur (`saveMeta`).
- Teacher feedback list and the mark breakdown, when present.
- `[data-handin]` "Hand in my portfolio" asks for confirmation, then sets the status to `handed-in` and records `submittedAt`. When the status is `handed-in` or `marked`, every edit control is disabled and a notice explains why.
- `[data-print]` links to `/portfolio/print`.

- [ ] **Step 1: Write the failing end-to-end test** `scratchpad/portfolio.cjs`, run against wrangler on port 8788 with the emulators, reusing the helpers in `curr.cjs`:
  1. The teacher creates an assignment tagged Project and a test tagged Semester paper (1 question). The learner submits the assignment and takes the test. The teacher marks the assignment 7/10 and releases the test result.
  2. The learner does one topic quiz and one Paper 1 mock (short-circuit by writing attempts through `storage` is not allowed from Node, so drive the UI: `/topic/7` quiz, and the `/mock` submit-early path).
  3. On `/portfolio`, check:
     - `[data-sec=projects] .p-item` contains "7 / 10";
     - `[data-sec=semester]` has 1 item;
     - `[data-sec=tests]` has the mock and the "Practice record";
     - the lock icon is present on automatic items.
  4. Add an item: section `assignments`, title "Logic gates exercise", two photos via `[data-pfiles]` (`work.png` twice), Save. The card shows 2 thumbnails, and `loadThumbs` gives them `naturalWidth > 0`.
  5. A bad file: upload `evil.exe` through `[data-pfiles]` with the content type forced to `image/jpeg`. The error text names the file, and the item still saves with its other files.
  6. Hide the mock and confirm it moves to the hidden list. Show it again.
  7. Type a final reflection, reload, and confirm it persisted.
  8. Hand in, then confirm `[data-padd]` is disabled and that a direct REST item create by the learner returns 403.
  9. Change the year with `askYear` to STEM 2 and confirm `/portfolio` shows STEM 2, empty, with a year switch back to STEM 1 that still shows the items.
  10. Check there were no page errors.
- [ ] **Step 2:** Run `node scratchpad/portfolio.cjs` and expect it to fail on `/portfolio`, because the route does not exist yet.
- [ ] **Step 3:** Implement the page, route, nav, service-worker routes and the `askYear` stamps.
- [ ] **Step 4:** Build with the emulator flag, run the test, and expect every check to pass.
- [ ] **Step 5:** Commit with the message "Add the learner portfolio page".

### Task 5: Print layout

**Files:**
- Create: `src/pages/portfolioPrint.ts`
- Modify: `src/main.ts` (routes `/portfolio/print` and `/portfolio/print/:uid` for teachers, with `?y=` for the year)

**Interfaces:**
- Consumes: `buildPortfolio`, `numberItems`, `loadBuildInput`, `getMark`, `getPortfolioSettings`, `loadThumbs`.
- Produces: `portfolioPrintPage(el, params)`, which renders:
  - `.pp-cover` with "Robotics Portfolio", name, class, `STEM n`, `settings.period`, `CONFIG.SCHOOL` and the date printed;
  - `.pp-toc` listing sections and `numberItems` entries;
  - one `.pp-item` per visible item with number, title, date, result, description and full-width images;
  - the final reflection;
  - the mark table if marked.
- A `[data-doprint]` button calls `window.print()` once images have loaded. CSS `@media print` hides the header, nav and buttons, uses `page-break-after: always` on the cover and the table of contents, and `break-inside: avoid` on `.pp-item`.

- [ ] **Step 1: Extend `portfolio.cjs`.**
  - Go to `/portfolio/print` and check:
    - `.pp-cover` contains the learner name, "STEM 1" and "Koase STEM SHS";
    - `.pp-toc` lists "1.1";
    - every `.pp-item img` has `naturalWidth > 0`.
  - `page.pdf()` (Chromium headless) succeeds and is over 1 page.
  - An empty learner's print page still renders the cover and the line "Nothing in this portfolio yet".
- [ ] **Step 2:** Run it and expect it to fail.
- [ ] **Step 3:** Implement the print page.
- [ ] **Step 4:** Run it and expect it to pass.
- [ ] **Step 5:** Commit with the message "Add the portfolio print layout".

### Task 6: Teacher Portfolios tab

**Files:**
- Create: `src/pages/teacherPortfolios.ts`
- Modify: `src/pages/teacher.ts` (tab `['portfolios','Portfolios']` after Assignments)
- Modify: the CSV export in `src/pages/teacher.ts` (add a `portfolio_mark_y<year>` column per learner if present; this is my call, and optional if the export is attempt-based)

**Interfaces:**
- Consumes: everything in Task 2; `portfolioSectionsHTML` and `loadThumbs`; `listLearners` and `classesOf` from assignments.
- Produces: `mountTeacherPortfolios(host: HTMLElement): Promise<void>`, which shows:
  - **Settings card:** a due date per STEM year and a period text, saved with `savePortfolioSettings`.
  - **List:** a class filter and a table of learners: name, class, year, items (visible count), last updated, status pill, mark (`n / 40` or a dash), and `[data-popen=<uid>]`. Learners who handed in come first, then the rest by name.
  - **Opened view:**
    - the read-only `portfolioSectionsHTML` with `editable:false`;
    - a check-in form `[data-review]` (textarea plus Save) and the list of past reviews;
    - a mark form: five number inputs `name="m-<section>"` with `max` set, a live total `[data-mtotal]` of `n / 40` using `markTotal`, a comment, and Save;
    - `[data-return]` "Return for changes" (sets the status to `returned`, which unlocks learner editing; the rules must treat `returned` like `building`);
    - a link to `/portfolio/print/<uid>?y=<year>`.

- [ ] **Step 1: Extend `portfolio.cjs`.**
  1. The teacher opens Portfolios and sets the STEM 1 due date. The learner page shows "Due".
  2. The learner's row shows "Handed in".
  3. Open it and check the photos load.
  4. Add a check-in "Add a photo of your circuit". The learner sees it.
  5. Enter marks 9, 8, 12, 4, 5 and check the live total shows "31 / 40" (12 clamps to 10).
  6. Save, and check the learner sees "Marked 31 / 40" with the breakdown.
  7. Return for changes, and check the learner can add an item again.
  8. The teacher print view for that learner renders the cover.
- [ ] **Step 2:** Run it and expect it to fail.
- [ ] **Step 3:** Implement the tab. Update the rules so `returned` counts as editable: the owner may write status `building`, `handed-in` from `returned`, and items may be written when the status is `returned`.
- [ ] **Step 4:** Run `portfolio.cjs`, `port-rules.cjs`, `node --test tests/` and `npx tsc --noEmit`. All should pass.
- [ ] **Step 5:** Commit with the message "Add the teacher portfolios tab".

### Task 7: Regression, layout sweep, README, push

**Files:**
- Modify: `README.md` (a new section "Portfolio": what fills each section, how learners add photos, handing in, teacher marking, print to PDF, data layout, rules to publish)
- Modify: `scratchpad/sweep2.cjs` (add `/portfolio` and `/portfolio/print` for the learner; Portfolios list and opened view for the teacher)

- [ ] **Step 1:** Run the regression suites `fbtest`, `tests`, `asg`, `lessons` and `curr` on fresh emulators, each with exit code 0 and "page errors: none".
- [ ] **Step 2:** Run `sweep2.cjs` and expect "all pages OK" at both sizes.
- [ ] **Step 3:** Run a production `npm run build`, which should be clean. Grep `src` for the em dash and expect 0 matches.
- [ ] **Step 4:** Commit with the message "Document the portfolio" and push to `claude/wassce-robotics-practice-site-a0vtvk`.
