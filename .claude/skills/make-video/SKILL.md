---
name: make-video
description: Make a marketing video (teaser, promo, explainer, social clip) for any audience and anything the platform offers, with voice-over, captions, music and the brand. Use when asked for a video, or to change one in packages/marketing.
---

# Make a video

You turn a request ("a 30-second teaser of Fraction Hop for teachers") into a finished MP4 through `packages/marketing`: a **brief** (`videos/<id>/brief.ts`) that the pipeline voices, scores, mixes and renders. Read `packages/marketing/README.md` first: it has the commands, what each step writes and the gotchas.

The brief is the single source of truth. Every line the voice says is the caption, word for word, and each scene lands its moments on the spoken words, so **the script drives everything**: write it first, and get it approved before anything is voiced.

## 1. Pin the parameters

Settle with the founder, one question at a time, only what the request leaves open:

- **Showcase**: which games or features (a game's `SPEC.md` and `src/strings.ts` say what it really does).
- **Audience**: teachers, parents, students or boards. It picks the tone (`educator`, `parent`, or `brand`) and the copy source: `apps/web/content/<audience>.tsx`.
- **Length and format**: seconds (about 2.8 spoken words a second, plus scene breathing room) and `landscape` or `vertical`.
- **Call to action**, and any URL.
- **Voice and energy**: an `@repo/voice` voice (default the games' narrator) and its speed, and the music's tempo and mood.

Done when every parameter is set and none was guessed.

## 2. Write the script

Write `videos/<id>/brief.ts` and register it in `videos/index.ts`. Use `videos/teacher-teaser/brief.ts` as the model.

- Copy comes from the site and `docs/DESIGN.md`: claims the platform actually makes, in its words. Rewards are earned, never bought, and there are no scores or streaks. Use Canadian spelling.
- Each beat is one line and one scene. Pick scenes from the `Scene` union in `src/brief.ts`. Each scene file's header names its **cue** words (for example "play" in `fraction-hop`), so put those words in the line.
- Need a scene that doesn't exist? Add its props to `Scene` and its component to `src/scenes/index.tsx`, following `.claude/rules/ui.md`: tokens only, the press edge only on clickable things, all copy through props.

Show the founder the lines in order, with each beat's scene. Done when the founder approves the script.

## 3. Preview the picture

Sync to a scratch copy (`AGENTS.md`), then run `node scripts/make.ts <id> --only render --stills <frames>`. It renders with estimated timings, so no voice is needed yet. Pick a frame in each beat, tile them into one contact sheet with ffmpeg's `xstack`, and look at it. Fix overlaps, cramped text and anything off-brand.

Done when every beat's still is clean and the founder has seen the sheet.

## 4. Voice: the founder runs it

The voice (Kokoro and Whisper through MLX) runs only on the founder's Mac; the models live there, not in the sandbox. Pause and ask the founder to run this from the repo root:

```sh
pnpm install && pnpm --filter @repo/marketing voice <id>
```

`pnpm install` only matters when dependencies changed. The founder may prefer to run everything at once, which is faster on the Mac: `pnpm --filter @repo/marketing make <id>` does voice, music, mix and render, and writes `out/<id>.mp4`. Then skip to step 6's review, reading the files they generated.

A word said wrong gets a respelling in the voice's `pronunciations` (`packages/voice/voices/<name>/voice.json`), which fixes it in the games too, or a `say` on the beat for this video only.

Done when the founder approves the voice, `public/<id>/voice.json` has a take for every beat, and no line is flagged "check this line".

## 5. Music and mix

In the scratch copy, sync again with `public/` included, then run `node scripts/make.ts <id> --only music,mix`. Tune `music.pattern` to the energy from step 1. Check:

- The bed's level is steady: per-2-second RMS of `music.wav` (`astats`) varies by no more than about 2 dB.
- The mix reads -14 LUFS with peaks at or below -1 dB (`ebur128=peak=true`).
- The waveforms (`showwavespic`) show the bed dipping under every line and running to the end.

Done when every check passes.

## 6. Render and review

Run `node scripts/make.ts <id> --only render` in the scratch copy. Pull one frame at each beat's key moment (cue words, splash, CTA press) and look at them. Check the captions show the exact words with spaces intact, and that the final file is 1080p, 30 fps, with an AAC track.

Copy only `out/<id>.mp4` back to `packages/marketing/out/` (gitignored) and give the founder its path to watch with sound.

Done when the founder has watched it and their notes are fixed, going back to the step each note belongs to.

## 7. Clean up and retro

Delete the scratch copy. Then run the retro in `docs/agents/skill-retro.md` on this run.

Done when the scratchpad is empty and the retro says it is done.
