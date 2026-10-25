// Lays a brief out in time from its voice takes. Shared by the mixer (where
// each voice clip goes) and the composition (where each scene and caption
// goes), so picture and sound can't drift apart.
//
// Every transition's midpoint is snapped to the music's beat grid, so cuts
// land on the beat, and the video ends on a bar line, where the music ends.

import type { Beat, Brief, TransitionKind } from "./brief.ts";

export interface Word {
  text: string;
  /** From the start of the beat's voice clip. */
  startMs: number;
  endMs: number;
}

/** What the voice step measured for one beat (voice/<id>.json). */
export interface Take {
  id: string;
  /** Hash of what was synthesised; a stale take is regenerated. */
  hash: string;
  durationMs: number;
  words: Word[];
}

export interface VoiceManifest {
  takes: Record<string, Take>;
}

export interface PlacedBeat {
  beat: Beat;
  /** Where the beat's own sequence starts, in frames. */
  from: number;
  durationInFrames: number;
  /** Transition into this beat, in frames (0 on the first). */
  transitionInFrames: number;
  /** Where its voice starts, in absolute frames. */
  voiceFrom: number;
  take: Take;
}

export interface Timeline {
  beats: PlacedBeat[];
  durationInFrames: number;
  fps: number;
  bars: number;
  barSeconds: number;
}

export const transitionSeconds: Record<TransitionKind, number> = {
  slide: 0.5,
  wipe: 0.5,
  flip: 0.6,
  iris: 0.6,
  "clock-wipe": 0.6,
  zoom: 0.5,
  push: 0.4,
  fade: 0.4,
  cut: 0,
};

const defaults = { leadIn: 0.35, tail: 0.5, lastTail: 1.6 };

export function layout(brief: Brief, voice: VoiceManifest): Timeline {
  const { fps } = brief.format;
  const beatSeconds = 60 / brief.music.bpm;
  const barSeconds = beatSeconds * 4;
  const placed: PlacedBeat[] = [];
  // Seconds: when the current beat's incoming transition starts.
  let start = 0;
  brief.beats.forEach((beat, i) => {
    const take = voice.takes[beat.id];
    if (!take) throw new Error(`no voice take for beat "${beat.id}"`);
    const next = brief.beats[i + 1];
    const into = i === 0 ? 0 : transitionSeconds[beat.transition ?? "slide"];
    const out = next ? transitionSeconds[next.transition ?? "slide"] : 0;
    const leadIn = Math.max(beat.leadIn ?? defaults.leadIn, into * 0.6);
    // The next transition never starts before this beat's voice has ended.
    const tail = Math.max(
      beat.tail ?? (next ? defaults.tail : defaults.lastTail),
      out,
    );
    const needed = Math.max(
      leadIn + take.durationMs / 1000 + tail,
      beat.minSeconds ?? 0,
    );
    let end: number;
    if (next) {
      // Snap the next transition's midpoint onto the beat grid.
      const mid = start + needed - out / 2;
      end = Math.ceil(mid / beatSeconds - 1e-6) * beatSeconds + out / 2;
    } else {
      end = Math.ceil((start + needed) / barSeconds - 1e-6) * barSeconds;
    }
    const from = Math.round(start * fps);
    const endFrame = Math.round(end * fps);
    placed.push({
      beat,
      from,
      durationInFrames: endFrame - from,
      transitionInFrames: Math.round(into * fps),
      voiceFrom: Math.round((start + leadIn) * fps),
      take,
    });
    start = end - out;
  });
  const last = placed.at(-1);
  const durationInFrames = last ? last.from + last.durationInFrames : 0;
  return {
    beats: placed,
    durationInFrames,
    fps,
    bars: Math.round(durationInFrames / fps / barSeconds),
    barSeconds,
  };
}

/**
 * Stand-in takes before the voice exists (about 2.8 words a second, evenly
 * spaced), so a brief can be previewed in the Studio straight away.
 */
export function estimateVoice(brief: Brief): VoiceManifest {
  const takes: Record<string, Take> = {};
  for (const beat of brief.beats) {
    const words = beat.vo.split(/\s+/).filter(Boolean);
    const step = 1000 / 2.8;
    takes[beat.id] = {
      id: beat.id,
      hash: "estimate",
      durationMs: Math.round(words.length * step),
      words: words.map((text, i) => ({
        text,
        startMs: Math.round(i * step),
        endMs: Math.round((i + 1) * step),
      })),
    };
  }
  return { takes };
}
