# WASSCE Robotics Practice

An interactive, offline-capable practice micro-site for the WASSCE Robotics mock (Paper 1 objectives and Paper 2 essay), built for learners at Koase STEM SHS to use on tablets.

- **Vite + vanilla TypeScript**, no framework. About 35 kB of gzipped JavaScript on first load; each activity loads on demand.
- **Tablet first**: 48px minimum tap targets, portrait and landscape, touch drag-and-drop with Pointer Events (plus tap-to-place as a fallback).
- **Offline PWA**: the service worker precaches the whole site, so it keeps working when the Wi-Fi drops. It can be installed to the home screen.
- **No backend yet**: progress is saved on each tablet through a `StorageAdapter` interface, ready to switch to Firebase later.

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

- `TEACHER_PIN`: PIN for `/teacher` (currently `5454`).
- `DEFAULT_MOCK_MINUTES`, `DEFAULT_SHUFFLE`: defaults until a teacher changes them on a tablet.
- `CALC_TOLERANCE`: accepted error in the calculation checker.

The PIN is a light lock for a classroom, not real security: it is in the JavaScript bundle. Real teacher accounts should come with Firebase Authentication.

## Teacher page

Go to `/teacher` on each tablet and enter the PIN. You can:

- set the Paper 1 mock timer in minutes (0 = no timer) and turn shuffle on or off for that tablet;
- see every learner who has used that tablet, their best mock and topic scores (under 50% in red);
- export a **summary CSV** (one row per learner) and an **all attempts CSV** (one row per quiz, activity, mock or Paper 2 part), which open in Excel or Google Sheets;
- delete all learner data on that tablet.

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
    FirebaseAdapter.ts  stub for later
    progress.ts         computeProgress(): same logic for every adapter
    index.ts            picks the adapter (one line to change)
  data/                 all question content (JSON)
  pages/                home, topic, mock, paper2, progress, teacher
  quiz/quiz.ts          Paper 1 engine (practice and mock modes)
  activities/           one file per interactive activity
  lib/                  dom helpers, drag and drop, gates, maths parser, UI bits
scripts/
  sw-template.js        service worker template (filled in at build time)
  make-icons.cjs        regenerates PNG icons from public/icons/icon.svg
public/                 manifest, icons, Cloudflare _headers
```

## Adding Firebase later

All reads and writes of learner data go through `storage` from `src/storage/index.ts`, typed as `StorageAdapter`:

```ts
interface StorageAdapter {
  saveAttempt(attempt): Promise<Attempt>;
  getAttempts(filter?): Promise<Attempt[]>;
  getProgress(learnerId): Promise<Progress>;
  clearProgress(learnerId?): Promise<void>;
  getLearner(): Promise<Learner | null>;
  setLearner(learner | null): Promise<void>;
}
```

So moving to Firebase means filling in `src/storage/FirebaseAdapter.ts` and changing one line.

1. **Create the project.** In the Firebase console, add a project, then a **Web app**. Enable **Authentication** (Google, email link or anonymous sign-in) and **Cloud Firestore**.
2. **Install the SDK.** `npm install firebase`
3. **Add config.** Create `.env` (do not commit it) and add the same variables in Cloudflare Pages > Settings > Environment variables:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
4. **Implement the adapter.** Uncomment the imports and setup at the top of `FirebaseAdapter.ts` and fill in each method. Example code is in the comments. Suggested layout:
   ```
   learners/{learnerId}                  name, className, createdAt
   learners/{learnerId}/attempts/{id}    one Attempt
   ```
   - `saveAttempt`: `addDoc(collection(db, 'learners', learnerId, 'attempts'), attempt)`.
   - `getAttempts`: query the learner's sub-collection, or `collectionGroup(db, 'attempts')` for the teacher.
   - `getProgress`: fetch attempts and return `computeProgress(learnerId, attempts, topics)` so results match the local version.
   - `getLearner` / `setLearner`: use the signed-in user (`auth.currentUser.uid` as the learner id) and their `learners/{uid}` document.
5. **Keep it offline.** Use `initializeFirestore(app, { localCache: persistentLocalCache() })`. Writes made offline are queued and sent when the Wi-Fi returns.
6. **Switch.** In `src/storage/index.ts` change `new LocalStorageAdapter()` to `new FirebaseAdapter()`.
7. **Login screen.** Replace the name and class dialog in `src/lib/session.ts` (`askLearner`) with a Firebase sign-in, then call `storage.setLearner(...)` with the user's name and class.
8. **Security rules** (starting point):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{db}/documents {
       match /learners/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /{path=**}/attempts/{id} {
         allow read: if request.auth != null && request.auth.token.teacher == true;
       }
     }
   }
   ```
   Give teacher accounts a `teacher: true` custom claim (with the Admin SDK), then the teacher page can read every learner's attempts.
9. **Migrate old data (optional).** Before switching, export CSVs from each tablet's teacher page, or add a one-off button that reads `LocalStorageAdapter.getAttempts()` and saves each through the Firebase adapter.

The Firebase domains are not precached by the service worker (it only handles same-origin requests), so Firebase's own offline cache does that job.
