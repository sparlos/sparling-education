---
name: add-curriculum
description: Import an Ontario curriculum subject or edition from the DCP into @repo/curriculum's reference layer, reviewed by a human. Use when a game needs a curriculum or grade that packages/curriculum/reference/ doesn't have.
---

# Add a curriculum

You add one curriculum (a subject's edition, e.g. Language 2023) to the reference layer, so games can be designed against its official text. Read `packages/curriculum/README.md` and [ADR 0001](../../../docs/adr/0001-two-layer-curriculum-package.md) first.

**The DCP API is undocumented and has no published terms.** Fetch it once per curriculum, never in CI, and only with the human's go-ahead. Every later run works from the saved response.

## 1. Pin down what to import

Check `packages/curriculum/reference/` doesn't already have it. Then get from the human:

- **The DCP codename**, from the curriculum's page on dcp.edu.gov.on.ca (e.g. `elementary___math`). Never guess one: a wrong guess is a wasted request.
- **The edition ID**: the subject and the year it was issued, as one lowercase word, a hyphen and the year (`math-2020`, `language-2023`, `science-2022`). Expectation IDs must parse with `parseExpectationId` in `src/index.ts`, which takes `[a-z]+-\d{4}` and single-digit grades. Secondary grades (9–12) or a longer edition name need that pattern changed first: propose it to the human.

Done when the human has given the codename and agreed the edition ID.

## 2. Fetch once

With the human's go-ahead, save the raw response:

```sh
curl -sf 'https://ws.api.dcp.edu.gov.on.ca/content/api/items/<codename>?depth=8&language=en-CA' \
  -o <scratchpad>/dcp-<edition>.json
```

A 403 is the sandbox firewall: read the body and follow `CLAUDE.md`'s network section. Copy the saved file somewhere that outlives the session if the import might need more than one sitting (the human's choice; it's Crown-copyright text, so never commit it).

Done when the response is saved and is valid JSON.

## 3. Import

```sh
pnpm --filter @repo/curriculum import-dcp --curriculum <codename> --edition <edition> --from <scratchpad>/dcp-<edition>.json
```

The script was written against Math 2020. Another subject may be shaped differently (other item types, other element keys, a missing grade tag) and fail. Fix the script against the saved response, keeping the Math 2020 path working, and re-run with `--from`. If it says to raise the request depth, that needs a new fetch: ask the human.

Done when `reference/<edition>/` and `reference/<edition>.json` are written.

## 4. Check it

- `reference/<edition>/index.md` lists every grade the curriculum covers, every strand per grade, and plausible expectation counts. Read one strand file in full: the text, examples and sample tasks are readable, with no HTML left over.
- Pick a few expectations across grades and strands and ask the human to compare them with the DCP page.
- **Page links.** Every product-layer entry links to its expectation's page on dcp.edu.gov.on.ca, so teachers are one tap from the official wording (see the README's product layer). Search the saved response for what builds those links: a URL or slug element on each specific expectation, or on its course and strand. If it's there, make the script record each expectation's `link` in `reference/<edition>.json`, and have the human open three, across grades and strands, to confirm each lands on its expectation. If it isn't, tell the human and note it under the edition in the README's Importing section: links then come from the human, one per entry, as `design-game` adds them.
- Add `src/<edition>.ts` as an empty product layer (copy the header of `src/math-2020.ts`), and spread it into `descriptions` in `src/index.ts`. `design-game` adds entries as games need them.
- Run `pnpm --filter @repo/curriculum test` and `pnpm --filter play test` (the lab's grounding test reads the reference layer).

Done when the tests pass, the human has reviewed the diff and the spot checks, and the links are either recorded and spot-checked or noted as coming one per entry.

## 5. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. Done when it says it is.
