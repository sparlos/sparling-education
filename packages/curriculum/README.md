# @repo/curriculum

Ontario curriculum data in two layers ([ADR 0001](../../docs/adr/0001-two-layer-curriculum-package.md)).

## Reference layer: `reference/`

The official text of each curriculum, imported from the Ontario Digital Curriculum Platform (DCP): every specific expectation with its code, wording and elaborations (examples, key concepts, sample tasks). It's © King's Printer for Ontario and we hold no licence to reproduce it commercially, so:

- **Agents and humans read it while designing games. Apps never import it, and its text never appears in the product.** The package's `exports` don't include it.
- Start from `reference/<edition>/index.md`, which lists every expectation ID by grade and strand and names the file holding its text. Load only the strand files you need: one strand for one grade is up to ~95 KB.
- `reference/<edition>.json` is the same data in machine-readable form, for tests and scripts.
- Never write curriculum from memory. If a subject isn't here, ask a human to import it.

### Importing

```sh
pnpm import-dcp --curriculum <dcp codename> --edition <id>
# e.g. pnpm import-dcp --curriculum elementary___math --edition math-2020
```

The DCP API is undocumented: run the script only when needed, never in CI, and review the diff. `--from <file>` re-runs against a saved response instead of fetching.

## Product layer: `src/`

What apps import: each expectation ID (e.g. `math-2020.g4.B1.5`) with a description written by Kindling, plus the Learning Skills and Work Habits. Entries are added as games need them, in `src/<edition>.ts`.

- Write each description from what the expectation means; don't edit the official sentence. The tests fail if a description shares six or more consecutive words with the official text.
- Describe the whole expectation, in plain words a teacher reads at a glance, not just the part a game evidences: teachers read it as the expectation.
- Each entry has a `link` to its expectation's official page on the DCP. Every screen that shows the code links to it, so the official wording is one tap away without Kindling reproducing it. Links come from the reference layer when its import recorded them, otherwise from a human, one per entry.
- A human checks each ID against the DCP before it's merged.
