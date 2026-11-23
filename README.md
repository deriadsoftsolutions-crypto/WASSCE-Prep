# WASSCE Robotics Practice

An interactive, offline-capable practice micro-site for the WASSCE Robotics mock (Paper 1 objectives and Paper 2 essay), built for learners at Koase STEM SHS to use on tablets.

- **Vite + vanilla TypeScript**, no framework. About 35 kB of gzipped JavaScript on first load; each activity loads on demand.
- **Tablet first**: 48px minimum tap targets, portrait and landscape, touch drag-and-drop with Pointer Events (plus tap-to-place as a fallback).
- **Offline PWA**: the service worker precaches the whole site, so it keeps working when the Wi-Fi drops. It can be installed to the home screen.
- **Firebase accounts**: learners sign in with name, class and a 6-digit PIN, so progress follows them to any device. Teachers see the whole class. All storage goes through a `StorageAdapter` interface, with an on-device (`localStorage`) mode as a fallback.

## Contents

| Page | Route |
|---|---|
| Home: greeting, 10 topic cards with progress rings | `/` |
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
npx wrangler pages deploy dist --project-name wassce-robotics
```

The first run asks to create the project. After that, `npm run deploy` does the build and upload in one step.

### Notes for Cloudflare

- **Single-page app routing**: there is no `404.html`, so Cloudflare Pages serves `index.html` for routes like `/topic/7` and `/teacher`. Nothing else is needed.
- **Caching**: `public/_headers` makes `sw.js` always revalidate and lets hashed files in `/assets/` cache forever. After a new deploy, tablets download the update in the background and show "A new version of the site is ready. Reload".
- **Custom domain**: Pages project > Custom domains.

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

- `STORAGE`: `'firebase'` (sign-in, progress in the cloud) or `'local'` (no sign-in, progress stays on each tablet).
- `TEACHER_PIN`: PIN for `/teacher`, used only in `'local'` mode (currently `5454`).
- `DEFAULT_MOCK_MINUTES`, `DEFAULT_SHUFFLE`: defaults until a teacher changes them.
- `CALC_TOLERANCE`: accepted error in the calculation checker.

`src/firebase/config.ts` holds the Firebase web config. These values are public by design; the data is protected by `firestore.rules`.

## Teacher page

Go to `/teacher` and sign in with the teacher account (see "Firebase" below for the one-time approval). You can:

- set the Paper 1 mock timer in minutes (0 = no timer) and turn shuffle on or off for the whole class;
- see every learner, their best mock and topic scores (under 50% in red);
- export a **summary CSV** (one row per learner) and an **all attempts CSV** (one row per quiz, activity, mock or Paper 2 part), which open in Excel or Google Sheets;
- delete all learner results.

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
  firebase/             Firebase setup, sign-in helpers, class settings
  data/                 all question content (JSON)
  pages/                home, topic, mock, paper2, progress, teacher
  quiz/quiz.ts          Paper 1 engine (practice and mock modes)
  activities/           one file per interactive activity
  lib/                  dom helpers, drag and drop, gates, maths parser, UI bits
scripts/
  sw-template.js        service worker template (filled in at build time)
  make-icons.cjs        regenerates PNG icons from public/icons/icon.svg
public/                 manifest, icons, Cloudflare _headers
firestore.rules         Firestore security rules (publish in the Firebase console)
```

## Firebase (learner and teacher accounts)

Project: `roboticsclass-b0eaf`. Firestore location: europe-west1.

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
learners/{uid}                  name, className, createdAt
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
