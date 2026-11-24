# Lesson decks and ready-made lessons

Each ready-made lesson has:

| Part | Where |
|---|---|
| Lesson, quick test, practical (site content) | `src/data/ready/<key>.ts`, listed in `src/data/ready/index.ts` |
| Slide deck spec | `scripts/decks/lessons/<key>.cjs` |
| Deck, slide pictures, figures, starter-files zip (published) | `public/teaching/<key>/` |
| VS Code starter files and answers (answers never published) | `teaching/<key>/vscode-files/`, `teaching/<key>/answers/` |

## Build a deck

```bash
npm install                                   # once: pptxgenjs and jszip are dev dependencies
node scripts/decks/build.cjs python-2         # writes the .pptx, slide pictures, and src/data/slideDecks.json
python3 scripts/zip-teaching.py python-2      # starter-files zip, if the lesson has VS Code files
```

Turning slides into pictures needs LibreOffice (`soffice`) and `pdftoppm` (Poppler). If plain `soffice` hangs or fails, set `SOFFICE` to a wrapper command, for example `SOFFICE="python3 /path/to/soffice.py"`. Add `--no-images` to build only the .pptx.

## Write a deck spec

A spec exports `{ file, title, footer, build({ L }, { images }) }`. `build` calls the layouts in `lib.cjs`, in slide order:

- `title`
- `plan` (objectives and timings)
- `divider` (starts a section)
- `figure` (book figure with points)
- `code` (code, output, and steps, points, an image or a tip)
- `cards` (2 to 4 cards)
- `table`
- `rows` (icon rows)
- `activity` (tasks, timer, example code and output)
- `quiz` (exit check)
- `summary` (with homework)

Every layout takes `notes`, which become the speaker notes (teaching script, timings, book pages). Code panels shrink their text to fit. Still check the rendered pictures in `public/teaching/<key>/slides/` before committing.

Icons are PNG files in `scripts/decks/icons/` (white, for coloured circles). Book figures used by decks are in `scripts/decks/images/`.

## Tests

`npm test` checks that every file a ready-made lesson links to exists in `public/`, that lesson text renders cleanly (no em dashes, no broken code blocks), that test answer keys are complete and that marks add up.
