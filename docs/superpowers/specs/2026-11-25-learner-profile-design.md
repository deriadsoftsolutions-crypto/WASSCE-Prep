# Learner Profile: design (short)

## Why

Learners want a profile with their own picture, and the teacher wants to put faces to names. Learners are minors, so the picture is private (only the learner and teachers) and shows only after the teacher approves it. Learners can also change their own PIN, which today only happens by deleting the account.

## Goals

- A new **Profile** page (`/profile`) showing:
  - photo;
  - name, class and STEM year, with **Change my year** (moved from My Progress, where a link to Profile replaces it);
  - portfolio status for this year;
  - **Change my PIN**.
- **Photo flow:**
  1. The learner picks or takes a photo.
  2. The tablet crops it to a centred square, resizes it to 256×256 JPEG and checks it is under 60 KB.
  3. It is saved as **pending**. The learner sees it marked "Waiting for your teacher to approve it".
  4. The teacher approves or rejects it. Rejecting can carry an optional reason that the learner sees.
  5. A new upload replaces the pending one. An already-approved photo keeps showing until the new one is approved.
- An approved photo shows on:
  - the learner's top-bar name button;
  - their Profile page;
  - the teacher's Portfolios list;
  - the marking views (portfolio, assignments) where the learner's name is a heading.
- **Teacher dashboard:** a **Profile photos** item on Overview shows the count waiting, and the new **Photos** tab lists them with Approve and Reject.
- **Change my PIN:** current PIN, new PIN, then the new PIN again (6 digits). It uses Firebase re-authentication, then `updatePassword`. Error messages are clear for a wrong current PIN and for being offline.

## Non-goals

- Classmates seeing photos.
- Bios or "about me" text.
- Teachers resetting a forgotten PIN (that needs a server with admin rights; the README process stays).

## Approaches

- **A (chosen):** store the small photo as a data URL in Firestore at `learners/{uid}/profile/photo`. It loads instantly and works offline, with no storage functions.
- B: a full-size photo in R2 through `/api/upload`. It is sharper, but needs a token fetch per photo, loads lists slower, and doesn't show offline.

## Data and rules

`learners/{uid}/profile/photo` holds:
- `pending: string | null` (data URL);
- `pendingAt`;
- `approved: string | null`;
- `approvedAt`;
- `rejectedReason: string | null`.

Rules:
- The learner may write only `pending`, `pendingAt` and `rejectedReason: null`. Specifically, `approved` and `approvedAt` must be unchanged, and `pending` must be a string under 90,000 characters starting with `data:image/jpeg;base64,`, or null.
- The teacher reads and writes everything.
- The learner and teachers read it. Nobody else does.
- A collection-group read is allowed for teachers, for the approval queue and the lists.

The teacher's approve action copies `pending` to `approved` and clears `pending`. Reject clears `pending` and sets the reason.

## Left to the builder

- The exact layout, in the existing "circuit ink" styles.
- A placeholder avatar showing the learner's initials when there is no approved photo.
