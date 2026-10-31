// One video: its beats in a TransitionSeries, each scene on the backdrop
// with its beat's timings in context, light leaks where the brief asks,
// captions over everything and the finished mix underneath.
import { LightLeak } from "@remotion/light-leaks";
import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Backdrop } from "./Backdrop.tsx";
import { BeatContext } from "./beat.tsx";
import { palette, toneOf, Wordmark } from "./brand.tsx";
import type { Tone } from "./brief.ts";
import { Captions } from "./Captions.tsx";
import { SceneView } from "./scenes/index.tsx";
import type { Timeline } from "./timeline.ts";
import { presentation } from "./transitions.ts";

export interface VideoProps extends Record<string, unknown> {
  id: string;
  tone: Tone;
  timeline: Timeline | null;
  /** The mix exists (scripts/make.ts has run); silent preview otherwise. */
  hasMix: boolean;
}

const easing = Easing.bezier(0.65, 0, 0.35, 1);
/** Scenes that carry the wordmark themselves. */
const ownsBrand = new Set(["logo", "end-card"]);

export function Video({ id, tone, timeline, hasMix }: VideoProps) {
  const { width, height } = useVideoConfig();
  if (!timeline) return null;
  const tints = [
    toneOf(tone).soft,
    palette.sunshine[1],
    palette.sky[1],
    palette.violet[1],
    palette.leaf[1],
  ];
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {timeline.beats.map((placed, i) => (
          <Fragment key={placed.beat.id}>
            {i > 0 && (
              <TransitionSeries.Transition
                presentation={presentation(
                  placed.beat.transition ?? "slide",
                  i,
                  { width, height },
                )}
                timing={linearTiming({
                  durationInFrames: placed.transitionInFrames,
                  easing,
                })}
              />
            )}
            <TransitionSeries.Sequence
              durationInFrames={placed.durationInFrames}
              name={placed.beat.id}
            >
              <BeatContext.Provider
                value={{
                  tone,
                  durationInFrames: placed.durationInFrames,
                  voiceFrom: placed.voiceFrom - placed.from,
                  voiceFrames: Math.round(
                    (placed.take.durationMs / 1000) * timeline.fps,
                  ),
                  words: placed.take.words,
                }}
              >
                <Backdrop
                  tint={tints[i % tints.length]}
                  accent={tints[(i + 2) % tints.length]}
                  seed={i}
                />
                <SceneView scene={placed.beat.scene} />
                {!ownsBrand.has(placed.beat.scene.kind) && <Corner />}
              </BeatContext.Provider>
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
      </TransitionSeries>
      {timeline.beats
        .filter((p) => p.beat.lightLeak)
        .map((p) => (
          <LightLeak
            key={p.beat.id}
            from={Math.max(0, p.from - 6)}
            durationInFrames={Math.round(timeline.fps * 1.4)}
            seed={p.from}
            hueShift={30}
          />
        ))}
      <Captions timeline={timeline} />
      {hasMix && <Audio src={staticFile(`${id}/mix.wav`)} />}
    </AbsoluteFill>
  );
}

/** A small wordmark in the corner, so every frame carries the brand. */
function Corner() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 40;
  return (
    <Sequence>
      <div
        style={{
          position: "absolute",
          left: unit * 1.6,
          top: unit * 1.4,
          opacity: Math.min(1, frame / 10) * 0.9,
        }}
      >
        <Wordmark size={unit * 1.1} />
      </div>
    </Sequence>
  );
}
