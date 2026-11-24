# Learner Portfolio: design

## Why

The new SHS curriculum makes the portfolio a formal assessment. The Year 2 Robotics Teacher Manual, Appendix A (p. 29), lists the contents, marks it out of 40 and asks for a cover page, a table of contents and a short description of each item. Learners start it in week 2, the teacher reviews it every 3 to 4 weeks, and it is due in week 20, on paper or "through the school's online submission system". The teacher wants this site to be that system. Every assessment a learner takes here should land in the portfolio automatically, and learners should be able to add photos of their own work (notebook pages, circuits, robot builds, certificates).

## Goals

- One portfolio per learner per STEM year, organised in the Ministry's categories.
- Results from the site appear automatically. Learners never re-enter them.
- Learners add their own items with photos, write a description for every item, and write reflections, including a final reflection.
- The teacher reviews portfolios at check-ins, leaves feedback, and marks them out of 40 on the Ministry scheme.
- One tap gives a printable, single-file version with a cover page, table of contents and item descriptions. This covers both the paper and the "single file" ways of handing it in.

## Non-goals

- Group projects (Appendix B). They are a separate feature.
- Peer viewing or a public showcase. Portfolios are private to the learner and teachers.
- Marking individual items inside the portfolio. Marks come from the tests and assignments themselves; the portfolio mark is the overall /40.

## Anti-goals

- Learners losing work, or seeing another learner's portfolio.
- A learner being able to change a score that came from a test or assignment.
- Photos so large that they fill tablets or the free storage.

## Approaches considered

- **A. Auto-filled portfolio that the learner organises (chosen).** Results flow in by category, and learners add, describe, hide and reflect. It is the only option that does both what the teacher asked and what the Ministry asks.
- B. Learners add every item by hand. This is closer to a paper portfolio, but it drops the teacher's requirement that every assessment is saved automatically.
- C. Build it as a special assignment. This is cheaper to build, but results cannot flow in and the categories do not fit.

## Ministry categories and what fills them

| Section (marks) | Filled automatically from | Learner can add |
|---|---|---|
| Assignments and exercises (10) | Assignments the learner handed in, with the teacher's mark and comment once marked | Photos of class exercises |
| Projects and case studies (10) | Assignments the teacher tagged "Project" | Photos and descriptions of builds and projects |
| Quizzes and tests (10) | Teacher tests with released results; every Paper 1 mock and Paper 2 practice; a single "Practice record" summary of topic quizzes and activities | Photos of paper quizzes |
| Reflective pieces (5) | (none) | Written reflections (with optional photos); one is marked as the **Final reflection** |
| Semester papers (5) | Teacher tests tagged "Semester paper" | Photos of mid- and end-of-semester scripts |
| Other documents (not marked) | (none) | Certificates, awards, testimonials, other documents |

New teacher fields that make this sorting possible:

- Assignment: **Portfolio section**, either Assignment (the default) or Project.
- Test: **Portfolio section**, either Quiz or test (the default) or Semester paper.

## Learner experience

New **Portfolio** page (`/portfolio`), linked from the menu.

- **Header:** STEM year, the due date set by the teacher, the item count per section, and the status (Building / Handed in / Returned for changes / Marked n/40).
- **Sections:** one per Ministry category. Each item card shows its title, date, result if any, description and photo thumbnails.
  - **Automatic items** have a lock icon, and their score cannot be edited. The learner can add or change the description and can hide the item. Hidden items are listed at the bottom, where the learner can show them again.
  - **Learner items** can be edited and deleted.
- **+ Add to my portfolio:** choose a section, enter a title, date and description, then add photos with **Take a photo** (camera) or **Choose files**. Several photos per item are allowed, so a learner can capture each page of a script. Photos are shrunk on the tablet before uploading, as assignments already do.
- **Final reflection:** a text box at the end.
- **Teacher feedback:** check-in comments with their dates, and the final mark with a breakdown when it exists.
- **Hand in my portfolio:** this locks editing. The teacher can **Return for changes**, which unlocks it (the Ministry's revision grace period).
- **Print or save as PDF:** opens the print layout, described below.

## Teacher experience

New **Portfolios** tab on the teacher dashboard.

- **Settings:** the due date for each STEM year and the period label for the cover page (for example "2026/2027 Academic Year").
- **List:** filter by class or year. Each row shows the learner, the item count, the last update, the status, the mark, and an **Open** button.
- **Opening a portfolio** shows the same view as the learner's, read-only, plus:
  - **Add check-in feedback:** a dated comment the learner sees.
  - **Mark:** five boxes with the Ministry maximums (10, 10, 10, 5, 5), an automatic total out of 40, and a comment. Saving releases the mark to the learner. The mark can also be added to the CSV export.
  - **Return for changes**.
  - **Print** for that learner.

## Print layout (`/portfolio/print`, also used by the teacher)

1. **Cover page:** "Robotics Portfolio", the learner's name, class, STEM year, period, and the school name from the config.
2. **Table of contents:** sections and numbered items (1.1, 1.2 ...). Browsers cannot work out real page numbers, so items are numbered instead.
3. **One block per item:** number, title, date, result, description and photos, each kept on one page where possible.
4. **Final reflection**, then the teacher's mark if there is one.

It uses the browser's Print dialog, and "Save as PDF" produces the single file.

## Data (Firestore and R2)

```
learners/{uid}/portfolio/y{year}          meta: hidden auto-item ids, notes for auto items {autoId: description},
                                          finalReflection, status, submittedAt, updatedAt
learners/{uid}/portfolioItems/{id}        learner items: year, section, title, date, description,
                                          files[] (SubmittedFile), isFinal?, createdAt
learners/{uid}/portfolioReviews/{id}      teacher check-ins: year, comment, at, teacherName
learners/{uid}/portfolioMark/y{year}      teacher mark: scores per section, total, max 40, comment, markedAt
settings/portfolio                        due dates per year, period label
```

- Photos go through the existing `/api/upload` with the assignment id `portfolio`, so they are stored under `submissions/<uid>/portfolio/...` (private: only the owner and teachers can read them).
- Automatic items are worked out when the page loads from attempts, submissions with feedback, and released test results. Nothing is copied, so scores always match the source. An automatic item's id is its source, for example `asg:<id>`, `test:<id>` or `mock:<attemptId>`.
- Year: every item belongs to the learner's STEM year at the time it was made. A learner who changes year starts a new portfolio, and the old one stays readable.

Rules:

- The learner reads and writes their own `portfolio` and `portfolioItems`, but cannot write `status` to "marked" or "returned".
- The learner reads `portfolioReviews` and `portfolioMark`; only teachers write them.
- Teachers read everything.

## Constraints

- Uses the existing stack: Vite and TypeScript, Firebase, and the R2 upload functions. No em dashes in the UI text. 48px tap targets. Must work on 768px-wide tablets.
- Offline: the portfolio can be read offline once it has loaded. Adding photos needs internet; text changes queue and sync later.

## Left to the builder

- Exact card layout, following the existing "circuit ink" styles.
- Whether the "Practice record" summary shows best scores or attempt counts.
- How the teacher list is sorted.
