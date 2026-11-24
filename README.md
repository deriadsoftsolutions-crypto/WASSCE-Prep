# WASSCE Robotics Practice

An offline-capable Robotics learning site for learners at Koase STEM SHS on tablets: lessons and materials for **STEM 1, STEM 2 and STEM 3** (organised by the NaCCA SHS Robotics curriculum), plus WASSCE practice (Paper 1 objectives and Paper 2 essay).

- **Vite + vanilla TypeScript**, no framework. About 35 kB of gzipped JavaScript on first load; each activity loads on demand.
- **Tablet first**: 48px minimum tap targets, portrait and landscape, touch drag-and-drop with Pointer Events (plus tap-to-place as a fallback).
- **Offline PWA**: the service worker precaches the whole site, so it keeps working when the Wi-Fi drops. It can be installed to the home screen.
- **Firebase accounts**: learners sign in with name, class and a 6-digit PIN, so progress follows them to any device; teachers see the whole class. All storage goes through a `StorageAdapter` interface, and an on-device (`localStorage`) mode remains available.

## Contents

| Page | Route |
|---|---|
| Home: today's circuit, your year's units, linked practice topics | `/` |
| Learn: units for STEM 1, 2 and 3 grouped by strand, year books and resources | `/learn` |
| Unit page: summary, what you will be able to do, lessons, materials, linked WASSCE topics | `/learn/u1-1-1` ... |
| WASSCE Prep: Paper 1 mock, Paper 2, the 10 practice topics | `/wassce` |
| Topic page: summary, key ideas, activities, that topic's Paper 1 questions | `/topic/1` to `/topic/10` |
| Full Paper 1 mock: 40 questions, optional timer, shuffle, review with explanations and score per topic | `/mock` |
| Paper 2 practice: parts, model answers, self-mark checklists, embedded step checker and activities | `/paper2`, `/paper2/Q1` ... |
| My Progress: scores per topic, weakest topics, mock history, reset | `/progress` |
| Teacher page (hidden, PIN protected): timer, shuffle, progress on this tablet, CSV export | `/teacher` |

Activities: logic gate simulator, truth table builder (Q4 and random expressions), gate identifier, flowchart builder and symbol quiz, step-by-step calculation checker with random practice, PID tuner, open vs closed loop sorter, sensor calibration lab, ADC converter, potentiometer wiring puzzle, and matching or sorting games for topics 1, 2, 4, 9 and 10.

## Requirements

- Node.js 20 or newer (`node -v`)
- npm (comes with Node)

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the address shown in the terminal. To try it on a tablet on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" address on the tablet.

The service worker is only registered in production builds, so offline mode is tested with the build (see below).

## Build

```bash
npm run build        # type-checks, then writes the site to dist/
npm run preview      # serves dist/ at http://localhost:4173
```

`dist/` is the complete static site. The build also writes `dist/sw.js` with a list of every file to precache.

### Test offline mode

1. `npm run build && npm run preview`, open http://localhost:4173 in Chrome.
2. Wait a second for "Ready to work offline", or check DevTools > Application > Service workers.
3. DevTools > Network > set throttling to **Offline** (or Application > Service workers > Offline).
4. Reload and visit any page. Everything, including activities, should still work. An "Offline" pill appears in the top bar.

## Deploy to Cloudflare Pages

### Option A: Git-connected (automatic deploys)

1. Push this repository to GitHub (or GitLab).
2. In the Cloudflare dashboard go to **Workers & Pages > Create > Pages > Connect to Git**.
3. Choose the repository and the branch to deploy (for example `main`).
4. Build settings:
   - **Framework preset**: None (or Vite)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variable** (optional): `NODE_VERSION` = `22`
5. Click **Save and Deploy**. You get a URL such as `https://wassce-robotics.pages.dev`.
6. Every push to that branch redeploys. Other branches get preview URLs.

### Option B: Direct upload with Wrangler

```bash
npm run build
npx wrangler login                                    # first time only, opens the browser
npx wrangler pages deploy dist --project-name kostechrobotics
```

The first run asks to create the project. After that, `npm run deploy` does the build and upload in one step.

### Notes for Cloudflare

- **Single-page app routing**: there is no `404.html`, so Cloudflare Pages serves `index.html` for routes like `/topic/7` and `/teacher`. Nothing else is needed.
- **Caching**: `public/_headers` makes `sw.js` always revalidate and lets hashed files in `/assets/` cache forever. After a new deploy, tablets download the update in the background and show "A new version of the site is ready. Reload".
- **Custom domain**: Pages project > Custom domains.

### If new pushes stop deploying

If the Cloudflare **Deployments** tab shows "This project is disconnected from your Git account" (or new commits never appear there):

1. On GitHub open **Settings > Applications > Installed GitHub Apps > Cloudflare Workers and Pages > Configure** and make sure **WASSCE-Prep** is included under **Repository access**. Save.
2. In Cloudflare open the project > **Settings > Build > Git repository > Manage** and reconnect if asked.
3. Push any new commit. Retrying an old deployment only rebuilds that old commit.

## Editing questions and content

All content is JSON in `src/data/`. Edit, then rebuild or redeploy. No code changes are needed.

| File | What it holds |
|---|---|
| `topics.json` | The 10 topics: title, summary, key ideas, Paper 1 and Paper 2 mapping, which activities appear |
| `paper1.json` | The 40 objective questions: `topic`, `question`, `options` A to D, `answer`, `explanation` |
| `paper2.json` | Paper 2 questions and parts: `marks`, `type` (`written`, `calc`, `activity`), `model` answer and marking `points` |
| `calculations.json` | Calculation types (formula choices, variables, units, hints) and the fixed problems |
| `activities.json` | Matching sets, sorting sets and the flowchart puzzle |

Rules to keep in mind:
- A Paper 1 question's `topic` must match a topic whose `paper1` list contains its number.
- To show an activity on a topic page, add its id to that topic's `activities` list. Ids are listed in `src/activities/index.ts` (matching and sorting sets use their key in `activities.json`).
- In `calculations.json`, each variable accepts any value in its list (for example `"g": [9.8, 10]`), and `altAnswers` lists other accepted final answers. Answers within plus or minus 1% (set in `src/config.ts`) or correctly rounded to 2 decimal places are accepted.
- Avoid em dashes in UI text.

## Configuration

`src/config.ts`:

- `STORAGE`: `'firebase'` (current: sign-in, progress in the cloud; see "Firebase" below) or `'local'` (no sign-in, progress stays on each device).
- `TEACHER_PIN`: PIN for `/teacher` in `'local'` mode (currently `5454`).
- `DEFAULT_MOCK_MINUTES`, `DEFAULT_SHUFFLE`: defaults until a teacher changes them.
- `CALC_TOLERANCE`: accepted error in the calculation checker.

- `WASSCE_DATE`, `WASSCE_LABEL`: the countdown on the home page. The date is an estimate: set it to the first Robotics paper on the official WAEC timetable.

### Changing the teacher PIN

1. Open `src/config.ts` and change `TEACHER_PIN: '5454'` to the new PIN (keep the quotes).
2. Commit and push. Cloudflare Pages rebuilds and redeploys automatically.
3. Tablets pick up the new version the next time they are online (they show "A new version of the site is ready", tap Reload).

**The PIN is not real security.** It is part of the JavaScript sent to every browser, so anyone who opens the browser's developer tools or reads the repository can find it. It only discourages learners from wandering into the teacher page. Do not reuse a PIN that protects anything else. For real teacher accounts, switch to Firebase mode, where `/teacher` uses a proper sign-in and the database rules decide who can see class data.

## Teacher page

Go to `/teacher` and enter the PIN (in Firebase mode: sign in with the teacher account). You can:

- set the Paper 1 mock timer in minutes (0 = no timer) and turn shuffle on or off (per device in local mode, for the whole class in Firebase mode);
- see every learner, their best mock and topic scores (under 50% in red);
- export a **summary CSV** (one row per learner) and an **all attempts CSV** (one row per quiz answer, activity, mock or Paper 2 part), which open in Excel or Google Sheets;
- delete all learner results.

### How topic scores are calculated

Each topic's score (the rings on the home page, My Progress and the T1 to T10 columns on the teacher page) is the average of:

- the **topic quiz**: the share of that topic's Paper 1 questions the learner has answered correctly on the topic page (saved after every answer);
- the **Paper 1 mock**: the learner's best mock result on that topic's questions;
- each of the topic's **activities**: the learner's best score.

Anything not tried yet counts as 0.

## Assignments (file uploads with Cloudflare R2)

Teachers set assignments on `/teacher` > **Assignments** (title, instructions, class, due date, marks, typed answer and/or files). Learners see them on **Assignments** (only those for their class), type an answer and/or attach up to 5 files (photos, PDF, Word, PowerPoint, Excel, text; 10 MB each; large photos are shrunk on the device first), and submit. They can change their work until it is marked. The teacher opens each learner's files, gives a mark and a comment, and the learner sees it straight away.

How it fits together:

- Records (assignments, submissions, marks) are in Firestore: `assignments/{id}`, `learners/{uid}/submissions/{assignmentId}`, `learners/{uid}/feedback/{assignmentId}`.
- Files are in the Cloudflare R2 bucket `wassce-submissions`, under `submissions/{uid}/{assignmentId}/`.
- `functions/api/upload.ts` and `functions/api/file.ts` are Cloudflare Pages Functions. Every request must carry the learner's Firebase sign-in token, which the function checks against Google's public keys (`functions/_lib/auth.ts`). Learners can only upload, open and delete their own files; teachers (accounts in `teachers`) can open everyone's.
- `wrangler.toml` binds the bucket to the site as `SUBMISSIONS`.

### One-time setup

1. Cloudflare dashboard > **R2 Object Storage**. If asked, add a payment method and activate the free R2 plan (10 GB storage free each month).
2. **Create bucket**, name `wassce-submissions`, location **Automatic**. Leave public access off.
3. Firebase console > Firestore > **Rules**: paste `firestore.rules` and **Publish** (it adds the assignment rules).
4. Push to GitHub. The Pages build reads `wrangler.toml` and connects the bucket.

### Testing locally

```bash
npx firebase-tools emulators:start --only auth,firestore          # terminal 1
VITE_FIREBASE_EMULATOR=1 npm run build
printf 'FIREBASE_AUTH_EMULATOR=1\nFIRESTORE_EMULATOR_HOST=127.0.0.1:8080\n' > .dev.vars
npx wrangler pages dev dist                                         # terminal 2: site + functions + local R2
```

`.dev.vars` is for local testing only and is ignored by git. Never set `FIREBASE_AUTH_EMULATOR` on the live site.

## Tests (teacher-made assessments)

On `/teacher` > **Tests** the teacher builds a test from multiple-choice questions (auto-marked), calculation questions (auto-marked, accepts answers within a set percentage, fractions and `pi`) and short written answers (teacher-marked). **From Paper 1 questions** adds any of the 40 Paper 1 questions with their answers and explanations in one tap. Each test has a class, an optional opening and closing time, an optional time limit, and a results setting: straight after submitting, after it closes, or only when the teacher releases them. Leave **Published** off while building.

Learners find tests on **Classwork**. They take each test once; answers are kept on the device as they go, and a timed test submits itself when time runs out. The **Results** view shows who has started and submitted, time taken, auto-marked scores and a per-question success rate; the teacher marks written answers, adds a comment and releases results (or **Release all** for fully auto-marked tests), exports a CSV, or uses **Allow retake**.

Protection against cheating, enforced by `firestore.rules` rather than the browser:

- Questions are stored apart from the test settings and cannot be read before the test opens. The answer key is stored separately again and a learner can read it only after submitting, and only if the results setting allows it.
- The start time is stamped by Firebase's server clock. A submission is accepted only within the time limit (plus 2 minutes' grace for slow connections) and before the closing time (plus 2 minutes).
- Answers can be submitted once and never changed; only teachers can write results or allow a retake.

Data: `assessments/{id}`, `assessments/{id}/content/questions`, `assessments/{id}/content/key`, and per learner `assessmentStarts`, `assessmentAttempts`, `assessmentResults` under `learners/{uid}/`.

## Design ("circuit ink")

- **Colours** (tokens at the top of `src/styles.css`): green `#006B3F` for anything you can act on, gold `#F5B700` for "energised" things (progress, lit wires, mastery), red `#CE1126` only for urgent items, navy ink `#13233A` for text and panel outlines on a cool off-white `#F4F6F1`. Dark mode redefines the same tokens.
- **Type**: Atkinson Hyperlegible (designed for legibility) for all reading, Barlow Condensed only for big numbers. Both are bundled with the site (`@fontsource`), so they work offline.
- **Icons**: line icons in `src/lib/icons.ts` (no emoji, which look different on every tablet).
- **Navigation**: a top menu on wide screens; a bottom tab bar under 1024 px wide, with a badge on Classwork for work still to do.
- **Home**: WASSCE countdown, "Today's circuit" (three suggested steps joined by a trace that lights up as they are done), due work, and topic tiles whose LED bar shows mastery (Not started, Learning, Practising, Nearly there, Mastered).

## Activity screens

Each activity opens on its own screen at `/topic/<id>/<activity>` (the topic page lists them as cards). The screen has a back button, steps across the top when the activity has stages, the activity itself, and an action bar fixed to the bottom with its main buttons and **Next activity** (or **Topic questions** after the last one). The tab bar is hidden there to give the activity room. Inside Paper 2 questions the same activities appear inline, with the bar at the bottom of the card.

The shell (`mountActivity` in `src/activities/index.ts`) keeps activities simple. An activity only marks things in its own HTML:

- `data-bar` on a button that belongs in the action bar (Check, Try again, Next round...). The shell shows it in the bar and hides the original; tapping the bar button clicks the original.
- `data-bar-status` on an element whose text should show on the left of the bar (for example "Round 3 of 6").
- `<span data-steps="Read|Offset|Verify" data-step="1" hidden></span>` for a step indicator; change `data-step` as the learner moves on.

## Lessons

On `/teacher` > **Lessons** the teacher writes lessons from blocks: **Text** (with simple formatting: `# Heading`, `**bold**`, `*italic*`, `- bullet`, `1. numbered`, `[link](https://...)`), **Image** (uploaded to R2 under `lessons/`, shrunk on the device first), **YouTube video** (learners tap to play, so it only uses data when they choose), **Activity** (opens one of the 13 activities), **Quick check** (multiple choice with an explanation) and **Link**. Each lesson has a topic (or General), a class (or all classes) and a **Published** switch; the list shows how many learners have finished each lesson.

Learners find lessons on **Classwork**, on the matching **topic page**, and as the first step of **Today's circuit** when a lesson is new and nothing is due. **Mark as finished** saves an attempt of kind `lesson` (item `lesson:<id>`) with the quick-check score, so it appears in the teacher's CSV. Lesson text is escaped before formatting, so a lesson can never run code on a learner's tablet. Lessons and their images stay readable offline once opened.

- Firestore: `lessons/{id}` (readable when signed in, written by teachers).
- Functions: `POST /api/lesson-upload` (teachers only: images up to 5 MB, documents up to 40 MB, videos up to 95 MB) and `GET /api/lesson-file/lessons/...` (public, cached forever: addresses are unguessable and never reused).

## STEM 1 to 3: units and materials

Each learner picks their year (STEM 1, 2 or 3) when they create an account. Accounts made before this existed are asked once; learners can change it on **My Progress**. The year decides what **Home** shows: STEM 1 and 2 see their units and the WASSCE topics linked to them; STEM 3 also sees the WASSCE countdown. Every learner can browse the other years on **Learn**.

### Setting up the curriculum (teacher, one time)

1. Publish the latest `firestore.rules` (it adds `units` and `materials`).
2. `/teacher` > **Curriculum** > **Load the 21 NaCCA units as drafts**. This creates 8 units for STEM 1, 8 for STEM 2 and 5 for STEM 3 from `src/data/curriculum.json`, with the official learning outcomes and indicators, and a short draft summary.
3. Open each unit, check the title and summary, tick the linked WASSCE practice topics, and switch on **Published** (or use **Publish all STEM n drafts**). Learners see only published units. Use the arrows to change the order.

### Adding materials

Inside a unit (or under **Books and resources for the whole of STEM n**):

- **Upload files**: PDF, Word, PowerPoint, Excel and text up to 40 MB, MP4 or WebM videos up to 95 MB, images up to 5 MB. Files go to R2 under `lessons/`.
- **+ YouTube video** and **+ Website link**.
- **+ Section of a book**: points at a PDF already uploaded for that year and opens it at a page. Upload a whole book once as a year resource, then add a section to each unit.
- **Who sees it**: Learners, **Teachers only** (for teacher manuals and TV versions) or Hidden. Tick **New uploads are for teachers only** before uploading a teacher version.

Learners can read PDFs, Word files and slides they have opened once without internet (files up to 30 MB; videos are not kept).

### Which Ministry book goes with which unit

| Book | Units |
|---|---|
| Year 1 "Robotics Section 1 to 8" (LV = learner, TV = teacher) | Sections 1 to 8 = 1.1.1, 1.1.2, 1.1.3, 1.2.1, 1.2.2, 1.3.1, 1.3.2, 1.3.3 |
| Year 2 Learner Edition and Teacher Manual | Sections 1 to 8 = 2.1.1 to 2.3.3. Learner Edition section starts at PDF pages 7, 27, 58, 88, 146, 167, 181, 231 |
| Year 3 Teacher Manual | Sections 1 to 5 = 3.1.1, 3.1.2, 3.1.3, 3.2.1, 3.3.2 |

Upload LV files and Learner Editions for learners, and TV files and Teacher Manuals as **Teachers only**.

### Lessons in units

In the lesson editor choose a **Year** and a **Curriculum unit**, or tap **Write a lesson for this unit** on the unit page. Lessons appear on the unit page and on Home as **Your unit**.

### Data

```
units/{id}       code, year, strand, subStrand, title, summary, outcomes, indicators, wassceTopics, section, order, published
materials/{id}   unitId ('' = whole-year resource), year, title, kind (file, video, youtube, link), url, page, audience, published
```

Learners can read units and only the materials with audience `learners`; only teachers can write either.

## Portfolio (Ministry portfolio assessment)

Built from Appendix A of the Year 2 Robotics Teacher Manual: one portfolio per learner per STEM year, in the Ministry's sections, marked out of 40.

| Section (marks) | Added automatically | Learners add |
|---|---|---|
| Assignments and exercises (10) | Assignments they hand in, with your mark once marked | Photos of class exercises |
| Projects and case studies (10) | Assignments you set as **Portfolio section: Project** | Photos of builds, with a description |
| Quizzes and tests (10) | Your tests (the score appears once results are released), every Paper 1 mock and Paper 2 practice, and one "Practice record" for topic quizzes and activities | Photos of paper quizzes |
| Reflective pieces (5) | | Written reflections |
| Semester papers (5) | Tests you set as **Portfolio section: Semester paper** | Photos of marked scripts |
| Certificates and other documents (not marked) | | Certificates, awards, testimonials |

**Learners** (`/portfolio`): add items with **Take a photo** or **Choose files** (photos are shrunk on the tablet; up to 10 MB each), describe every item, add a note to or hide automatic items (their scores cannot be changed), write the **Final reflection**, then **Hand in my portfolio**. Handing in locks it. **Print or save as PDF** (`/portfolio/print`) gives a cover page (name, class, subject, period), a numbered table of contents and every item with its photos, for paper submission or a single PDF file.

**Teachers** (`/teacher` > **Portfolios**): set the due date for each STEM year and the period printed on the cover; see every learner's status and mark; open a portfolio to add **check-in feedback** (the Ministry asks for one every 3 to 4 weeks), enter the **mark** in the five sections (the total out of 40 is worked out for you; the learner sees it), **Return for changes** (unlocks it for revisions), or print it.

When a learner changes STEM year they start a new portfolio; the previous year's stays available on a STEM tab.

- Firestore: `learners/{uid}/portfolio/y{year}` (hidden items, notes, final reflection, status), `learners/{uid}/portfolioItems/{id}`, `learners/{uid}/portfolioReviews/{id}`, `learners/{uid}/portfolioMark/y{year}`, `settings/portfolio`. Automatic items are worked out from results each time (`src/lib/portfolioCore.ts`), never copied, so they always match.
- Photos use the private assignment upload (`/api/upload`, assignment id `portfolio`): only the learner and teachers can open them.
- Rules: publish the latest `firestore.rules`. Learners can only set their own portfolio to building or handed in, cannot change it once handed in or marked, and cannot write marks or feedback.
- Unit tests for the sorting and marking logic: `npm test`.

## Learner profile and photos

Tapping their name at the top opens **My profile** (`/profile`). It holds the learner's photo, name, class and STEM year (**Change my year**), this year's portfolio status, **Change my PIN** and **Sign out**.

- **Photo:** **Take a photo** or **Choose a photo**. The tablet crops it to a square and shrinks it to 256 by 256 pixels (well under 60 KB) before sending. It waits for approval. On `/teacher` > **Photos** (the menu shows how many are waiting, and so does Overview) you **Approve** or **Reject** with a reason the learner sees. An approved photo stays until a new one is approved, and you can **Take down** any approved photo. Only the learner and teachers can ever see photos; they appear on the learner's name button and beside their name in your Portfolios and assignment marking lists.
- **Change my PIN:** the learner types their current PIN and the new 6-digit PIN twice. A forgotten PIN still needs the console steps above.
- Firestore: `learners/{uid}/profile/photo` (`pending`, `approved`, `rejectedReason`, times). The rules let a learner set only a pending JPEG under 90,000 characters; they cannot approve their own photo or read anyone else's. Publish the latest `firestore.rules`.

## Python practice page

`/python` (linked from **Learn**) lets anyone write and run Python on a tablet or computer with no install. It uses [Pyodide](https://pyodide.org) 314.0.7 (Python compiled to WebAssembly), served from this site at `/pyodide/` (copied from `node_modules/pyodide` at build time).

- **Run**, **Stop** (ends a loop that never finishes), **Clear output**, **Save as .py** (for VS Code), and an **Input** box for programs that use `input()`.
- Errors show only the learner's own lines, for example `Your code, line 2 ... NameError`.
- Examples come from the Python 1 lesson files in `teaching/python-1/vscode-files/`, so the page and VS Code match.
- The first visit downloads about 13 MB. It is kept in its own offline cache (`pyodide-314.0.7`), which survives site updates. When upgrading Pyodide, change the version in `package.json` and the cache name in `scripts/sw-template.js`.

## Teaching materials

`teaching/` holds lesson materials that are not part of the site:

- `teaching/python-1/`: the 2-hour lesson "Python for robots: variables, data types and operations" (STEM 3, Section 5). It has `vscode-files/` (the starter files for learners' computers) and `answers/` (for the teacher only, never published). The detailed lesson plan is a separate document.
- `public/teaching/python-1/`: what learners download: the slide deck (timings and notes in the speaker notes), `python-1-starter-files.zip` and the book figures. After changing the starter files, run `python3 scripts/zip-teaching.py`. These files are not precached; a tablet keeps a copy once it is opened.

### Ready-made lessons

Teacher > Lessons > **+ Add ready-made lesson** adds a finished lesson as a draft (defined in `src/data/readyLessons.ts`), with its year, unit, text, code, book figures, quick checks and download links. It also adds the slides and files to the unit's materials. Check it, choose a class if you want to, and switch on Published. Lesson text supports code boxes: put the code between two lines of three backticks (```).

## Project structure

```
src/
  main.ts               boot: routes, theme, learner prompt, PWA
  router.ts             tiny History API router
  config.ts             PIN and defaults
  types.ts              shared types (Attempt, Progress, ...)
  storage/
    StorageAdapter.ts   the interface all app code uses
    LocalStorageAdapter.ts
    FirebaseAdapter.ts  Firestore implementation (default)
    progress.ts         computeProgress(): same logic for every adapter
    index.ts            picks the adapter (one line to change)
  firebase/             Firebase setup, sign-in helpers, class settings, assignments
  data/                 all question content (JSON)
  pages/                home, learn (units), topic, mock, paper2, progress, teacher (+ teacherCurriculum, teacherLessons, ...)
  quiz/quiz.ts          Paper 1 engine (practice and mock modes)
  activities/           one file per interactive activity
  lib/                  dom helpers, drag and drop, gates, maths parser, UI bits
scripts/
  sw-template.js        service worker template (filled in at build time)
  make-icons.cjs        regenerates PNG icons from public/icons/icon.svg
public/                 manifest, icons, Cloudflare _headers
firestore.rules         Firestore security rules (publish in the Firebase console)
functions/              Cloudflare Pages Functions: uploads and files (R2), lesson images
wrangler.toml           Cloudflare Pages config: R2 bucket binding
```

## Firebase (learner and teacher accounts)

Project: `roboticsclass-b0eaf`. Firestore location: europe-west1.

**Status: switched on** (`STORAGE: 'firebase'`). Rules published, `kostechrobotics.pages.dev` added to Authorized domains. Results saved on devices before the switch stay on those devices and are not moved to Firebase.

### How sign-in works

- **Learners** choose "I'm new here" once and enter their full name, class and a 6-digit PIN. Behind the scenes this becomes a Firebase email/password account with a made-up address such as `ama-mensah.2scia@learners.wassce-prep.app` (never emailed). Spaces and capitals in the class do not matter ("2 Sci A" = "2sci a"), but the name must be typed the same way each time.
- **Shared tablets**: learners tap their name at the top and choose **Sign out** when they finish.
- **Offline**: after the first sign-in on a device, everything works offline. Results are kept on the device and uploaded when the connection returns. The first sign-in on a new device needs internet.
- **Teachers** use `/teacher` with a real email and password.

### Approving a teacher account (one time)

1. Open `/teacher`, choose **Create teacher account**, and sign up. The page then shows your **user ID**.
2. In the Firebase console open **Firestore Database > Data**, tap **+ Start collection**, Collection ID `teachers`.
3. Document ID: paste your user ID. Add a field `name` (string) with your name. Save.
4. Back on `/teacher`, tap **Check again**.

### A learner forgot their PIN

Learners have no real email, so a PIN cannot be reset by email. In the Firebase console go to **Authentication > Users**, find the learner (their address starts with their name and class), open the menu and **Delete account**. The learner then signs up again with a new PIN. Their old results stay in the teacher's CSV export but are not linked to the new account.

### Security rules

`firestore.rules` is the source of truth. After changing it, paste it into **Firestore Database > Rules** and tap **Publish** (or run `npx firebase-tools deploy --only firestore:rules`). The rules make sure:

- learners can read and write only their own profile and results, and cannot change past results;
- only accounts listed in `teachers` can read the whole class, change class settings or delete other learners' results;
- nobody can make themselves a teacher from the website.

### Data layout

```
learners/{uid}                  name, className, year, createdAt (prevYear, yearSetAt after a year change)
learners/{uid}/attempts/{id}    one Attempt (see src/types.ts)
teachers/{uid}                  added by hand in the console
settings/global                 mockMinutes, shuffle (set from /teacher)
```

### Code

- `src/storage/FirebaseAdapter.ts` implements the same `StorageAdapter` interface as `LocalStorageAdapter`, so no page talks to Firebase directly.
- `src/firebase/` holds the app setup (with the offline cache), sign-in helpers and class settings.
- To go back to on-device storage, set `STORAGE: 'local'` in `src/config.ts`.

### Testing with the Firebase emulators

```bash
npx firebase-tools emulators:start --only auth,firestore     # terminal 1 (needs Java)
VITE_FIREBASE_EMULATOR=1 npm run dev                         # terminal 2
```

The emulators use `firestore.rules`, so the security rules are tested too, and nothing touches the real project.

### Costs

The free Spark plan allows 50,000 reads and 20,000 writes per day, which is plenty for a class. Each finished quiz or activity is one write. Opening the teacher page reads every result once (cached for a minute), so a class of 100 with a few hundred results each stays well within the limit.
