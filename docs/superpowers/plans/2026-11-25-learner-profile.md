# Learner Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a learner Profile page with a teacher-approved photo (a small data URL in Firestore) and a Change PIN form.

**Architecture:**
- A pure module (`src/lib/avatar.ts`) holds the square-crop sizing maths and the initials.
- `src/firebase/profilePhoto.ts` reads and writes `learners/{uid}/profile/photo`.
- There is one page for learners (`/profile`) and one teacher tab (`Photos`).
- The top-bar name button opens `/profile`, which also holds Sign out.

**Tech Stack:** Vite + TS, Firebase Auth (`reauthenticateWithCredential`, `updatePassword`) and Firestore, Playwright end-to-end against the emulators, and `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-25-learner-profile-design.md`

## Global Constraints

- No em dashes in the UI text. Tap targets of 48px or more. No overflow at 768 or 1280.
- Photos are visible only to the learner and teachers, and only `approved` is shown, except that the learner also sees their own pending photo.
- Photo: 256×256 JPEG data URL, under 90,000 characters (rules) and aimed at under 60 KB.
- PIN: exactly 6 digits.
- Commit messages carry the attribution lines. Push to `claude/wassce-robotics-practice-site-a0vtvk`.

## Review Focus

1. **A learner tries to approve their own photo by writing `approved` through REST.** The rules reject it. This is tested in Task 1 (rules script).
2. **A huge or non-JPEG data URL.** It is rejected by the rules (over the size limit, or not `data:image/jpeg`). This is tested in Task 1.
3. **A wrong current PIN, or a new PIN that isn't 6 digits or doesn't match.** Each gets a clear message, and nothing changes. This is tested in Task 2 (end-to-end).
4. **A new photo uploaded while an approved one exists.** The old approved photo stays shown until the new one is approved. This is tested in Task 2 (end-to-end).
5. **A teacher with no learners, or no photos waiting.** The Photos tab shows the line "No photos waiting". This is tested in Task 3 (end-to-end).

---

### Task 1: Photo data, crop maths, rules

**Files:**
- Create: `src/lib/avatar.ts`, `tests/avatar.test.ts`
- Create: `src/firebase/profilePhoto.ts`
- Modify: `firestore.rules`

**Interfaces (produced):**
- `cropBox(w: number, h: number): { sx: number; sy: number; size: number }`, the centred square.
- `initials(name: string): string` (at most 2 capital letters, `'?'` if empty).
- `avatarHTML(name: string, dataUrl: string | null, size = 40): string`. It returns an `<img class="avatar">` or a `<span class="avatar avatar-initials">`, with `width` and `height` set and an escaped alt text.
- In `profilePhoto.ts`:
  - `type PhotoDoc = { pending: string|null; pendingAt: number|null; approved: string|null; approvedAt: number|null; rejectedReason: string|null }`
  - `getPhoto(uid): Promise<PhotoDoc>` (empty defaults)
  - `submitPhoto(uid, dataUrl)`, which merges `pending`, `pendingAt` and `rejectedReason: null`
  - `approvePhoto(uid)`
  - `rejectPhoto(uid, reason)`
  - `allPhotos(): Promise<(PhotoDoc & {uid})[]>` (collection group `profile`)
  - `photoFromFile(file: File): Promise<string>` (canvas, 256 px, JPEG quality stepped from 0.85 down to 0.5 until under 60,000 characters)
  - an in-memory cache `approvedPhotoOf(uid): string|null` filled by `allPhotos()` / `getPhoto()`

- [ ] **Step 1: Write the tests.**
  - `tests/avatar.test.ts`:
    - `cropBox(400,300)` equals `{sx:50,sy:0,size:300}`;
    - `cropBox(300,500)` equals `{sx:0,sy:100,size:300}`;
    - `initials('Ama Mensah')` is `'AM'`;
    - `initials('kofi')` is `'K'`;
    - `initials('')` is `'?'`;
    - `avatarHTML('A <b>', null)` contains `&lt;b&gt;` and no `<b>`.
  - `scratchpad/photo-rules.cjs` (REST, like `port-rules.cjs`):
    - the learner writes their own pending JPEG data URL: 200;
    - the learner writes `approved`: 403;
    - the learner writes a PNG data URL: 403;
    - the learner writes 100,000 characters: 403;
    - another learner reads it: 403;
    - the teacher reads it: 200;
    - the teacher writes approved: 200;
    - the learner reads it: 200;
    - the learner re-submits pending while approved exists, keeping approved: 200;
    - the teacher's collection-group query: 200, and the learner's: 403.
- [ ] **Step 2:** Run `npm test` and `node scratchpad/photo-rules.cjs`. Both fail.
- [ ] **Step 3:** Implement the code and the rules (inside `match /learners/{uid}`, `match /profile/{doc}`; plus the group rule `{path=**}/profile/{id}` for teacher reads). The learner update must keep `approved` and `approvedAt` equal to the existing values, or null on create.
- [ ] **Step 4:** Run both again; both pass. `npx tsc --noEmit` is clean.
- [ ] **Step 5:** Commit with the message "Add profile photo data and rules".

### Task 2: Profile page, Change PIN, name button

**Files:**
- Create: `src/pages/profile.ts`
- Modify: `src/firebase/account.ts`, adding `changePin(current: string, next: string): Promise<void>`. It reauthenticates with `EmailAuthProvider.credential(user.email, current)` and then calls `updatePassword`. The errors `auth/wrong-password` and `auth/invalid-credential` map to "Your current PIN is not right."
- Modify: `src/main.ts`:
  - add the route `/profile` (nav `progress`);
  - the name button navigates to `/profile` in Firebase mode, and keeps today's behaviour in local mode;
  - the name button shows `avatarHTML` with the approved photo only.
- Modify: `src/pages/progress.ts`. Replace the year button with `<a class="btn" href="/profile">My profile</a>`.
- Modify: `src/lib/session.ts`. Change the sign-in modal text "tap your name at the top and choose Sign out" to "tap your name at the top, then Sign out".
- Modify: `scripts/sw-template.js` (add `/profile` to APP_ROUTES).
- Modify: `src/styles.css` (`.avatar`, the profile header).

Page for a learner:
- a large avatar (120px) with the photo status line:
  - pending: "Waiting for your teacher to approve your new photo." (plus a small preview);
  - rejected: "Your teacher did not approve your last photo: <reason>";
- `[data-photo-cam]` Take a photo and `[data-photo-file]` Choose a photo, which call `photoFromFile` then `submitPhoto`;
- details: name, class, `STEM n`, with `[data-act=year]` "Change my year";
- this year's portfolio status (`getMeta`) with a link to `/portfolio`;
- the `[data-pinform]` form: `cur`, `new1` and `new2` (`inputmode=numeric`, `maxlength=6`, `type=password`) and `[data-pinsave]`;
- `[data-act=signout]` Sign out.

Page for a teacher: name and Sign out only.

- [ ] **Step 1: Write `scratchpad/profile.cjs`.**
  1. The learner signs up. Tapping the name button lands on `/profile` and shows initials.
  2. Upload `work.png` via `[data-photo-file]`. The status shows "Waiting", and the name button still shows initials.
  3. The teacher approves the photo through REST as owner (Task 3 builds the UI). After a reload, the name button has an `img.avatar` with `naturalWidth` 256.
  4. Upload again. The pending status shows, and the name button still shows the approved image.
  5. PIN checks:
     - wrong current PIN gives an error containing "not right";
     - mismatched new PINs gives "do not match";
     - `12345` gives "6 digits";
     - a correct change succeeds.
     Then sign out and sign in with the new PIN, which works; signing in with the old PIN fails.
  6. Check there were no page errors.
- [ ] **Step 2:** Run it. It fails because there is no route.
- [ ] **Step 3:** Implement the changes.
- [ ] **Step 4:** Run it again; it passes.
- [ ] **Step 5:** Commit with the message "Add the learner profile page".

### Task 3: Teacher Photos tab and avatars in teacher views

**Files:**
- Create: `src/pages/teacherPhotos.ts`, `mountTeacherPhotos(host)`.
  - It lists pending photos: avatar preview (96px), name, class, uploaded date, `[data-approve=uid]`, and `[data-reject=uid]`, which opens a reason input and `[data-rsend]`.
  - Below that, a collapsible list of approved photos with `[data-remove=uid]`, which sets `approved` to null.
  - The empty state is "No photos waiting for approval."
- Modify: `src/pages/teacher.ts`:
  - add the tab `['photos','Photos']` after Portfolios;
  - the menu count shows "n waiting" (urgent);
  - Overview shows a line linking to the tab when n > 0.
- Modify: `src/pages/teacherPortfolios.ts`. Show `avatarHTML` (32px) beside each learner's name in the list and the opened heading. Call `allPhotos()` once in `load`.
- Modify: `src/pages/teacherAssignments.ts`. Show the same 32px avatar beside the learner's name in the marking list.

- [ ] **Step 1: Extend `profile.cjs`.**
  1. The teacher opens Photos with nothing waiting and sees "No photos waiting".
  2. The learner uploads. The teacher reloads, the menu shows "1 waiting", the list shows the learner, and Approve works; the learner's name button then shows the photo.
  3. The learner uploads again. The teacher rejects it with "Please use a photo of your face". The learner's profile shows that reason.
  4. In the teacher Portfolios list, the learner's row has an `img.avatar`.
- [ ] **Step 2:** Run it. It fails.
- [ ] **Step 3:** Implement the changes.
- [ ] **Step 4:** Run `profile.cjs`, `photo-rules.cjs`, `npm test`, then the regressions `portfolio.cjs`, `fbtest`, `tests`, `asg`, `lessons` and `curr`, then `sweep2.cjs` (adding `/profile` and the teacher Photos tab). All pass.
- [ ] **Step 5:** Add a README section "Learner profile and photos" (approval flow, Change PIN, the rules to publish). Run a production build, grep for em dashes, commit with the message "Add teacher photo approval", and push.
