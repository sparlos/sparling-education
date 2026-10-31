// A screenshot of one of the platform's apps in a browser window: the window
// rises in showing the top of the page, then the camera glides to one part
// and lights it up while the rest dims. A recording plays from its first
// frame instead, its key moment landing on the cue.
// Cues: `cue` (a word in the line) starts the move, or the recording's key
// moment.
import { radius, shadow } from "@repo/tokens";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useBeat, usePop, useRamp } from "../beat.tsx";
import { color, fonts, palette, toneOf } from "../brand.tsx";
import type { Rect, Scene } from "../brief.ts";
import { screens } from "../screens.ts";

type Props = Extract<Scene, { kind: "screen" }>;

/** Most the camera zooms in, so screen text stays sharp. */
const maxZoom = 2.2;

export function Screen({ screen, label, focus, cue }: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const tone = toneOf(beat.tone);
  const shot = screens[screen];
  const unit = Math.min(width, height) / 40;

  const maxW = Math.min(width * 0.76, unit * 56);
  const winH = Math.min(height * 0.7, maxW * 0.56);
  const barH = unit * 1.3;
  const viewH = winH - barH;
  // With nowhere to move to, the window fits the whole screen.
  const winW = focus
    ? maxW
    : Math.min(maxW, (viewH * shot.width) / shot.height);
  const viewW = winW;

  const enter = usePop(0, false);
  const at = beat.cue(cue, 0.4);
  const move = useRamp(at - 6, at + 24);
  const light = usePop(at + 14, false);

  // The camera: a zoom and the image point at the view's centre.
  const fit = viewW / shot.width;
  const start = clampCamera(
    { zoom: 1, x: shot.width / 2, y: 0 },
    shot,
    fit,
    viewW,
    viewH,
  );
  const end = focus ? focusCamera(focus) : start;
  function focusCamera(focus: Rect) {
    const fx = (focus.x + focus.w / 2) * shot.width;
    const fy = (focus.y + focus.h / 2) * shot.height;
    return clampCamera(
      {
        zoom: Math.max(
          1,
          Math.min(
            maxZoom,
            (viewW * 0.84) / (focus.w * shot.width * fit),
            (viewH * 0.72) / (focus.h * shot.height * fit),
          ),
        ),
        x: fx,
        y: fy,
      },
      shot,
      fit,
      viewW,
      viewH,
    );
  }
  // A slow drift before the move, so the still never sits dead.
  const drift = 1 + 0.025 * interpolate(frame, [0, at], [0, 1], clamp);
  const zoom = (start.zoom + (end.zoom - start.zoom) * move) * drift;
  const camX = start.x + (end.x - start.x) * move;
  const camY = start.y + (end.y - start.y) * move;
  const scale = fit * zoom;
  const left = viewW / 2 - camX * scale;
  const top = viewH / 2 - camY * scale;
  const spotBox = focus && toView(focus, shot, scale, left, top);
  const clip = "clip" in shot ? shot.clip : undefined;
  const imageBox = {
    position: "absolute",
    left,
    top,
    width: shot.width * scale,
    height: shot.height * scale,
    maxWidth: "none",
  } as const;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: height * 0.1,
        fontFamily: fonts.body,
      }}
    >
      <div
        style={{
          transform: `translateY(${(1 - enter) * height * 0.6}px) rotate(${(1 - enter) * 4}deg)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: unit * 0.8,
            letterSpacing: unit * 0.05,
            textTransform: "uppercase",
            color: tone.text,
            marginBottom: unit * 0.5,
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: winW,
            height: winH,
            borderRadius: radius.xl,
            boxShadow: shadow.xl,
            overflow: "hidden",
            background: color.surface.raised,
          }}
        >
          <div
            style={{
              height: barH,
              display: "flex",
              alignItems: "center",
              gap: unit * 0.4,
              paddingLeft: unit * 0.8,
              background: palette.slate[1],
              borderBottom: `2px solid ${color.border.subtle}`,
            }}
          >
            {[palette.ember[4], palette.sunshine[4], palette.leaf[4]].map(
              (c) => (
                <div
                  key={c}
                  style={{
                    width: unit * 0.5,
                    height: unit * 0.5,
                    borderRadius: radius.round,
                    background: c,
                  }}
                />
              ),
            )}
          </div>
          <div
            style={{
              position: "relative",
              width: viewW,
              height: viewH,
              overflow: "hidden",
            }}
          >
            <Img src={shot.src} style={imageBox} />
            {clip && (
              <Sequence from={Math.round(at - clip.cueAt * fps)} layout="none">
                <OffthreadVideo src={clip.src} muted style={imageBox} />
              </Sequence>
            )}
            {spotBox && frame >= at + 14 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    ...spotBox,
                    borderRadius: radius.lg,
                    boxShadow: `0 0 0 ${width * 2}px ${color.scrim}`,
                    opacity: 0.35 * light,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    ...spotBox,
                    borderRadius: radius.lg,
                    border: `${unit * 0.18}px solid ${tone.fill}`,
                    boxShadow: `0 0 0 ${unit * 0.35 * light}px ${tone.soft}`,
                    transform: `scale(${1.08 - 0.08 * light})`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

interface Camera {
  zoom: number;
  x: number;
  y: number;
}

/** Keeps the view inside the image (or centred on it where it's smaller). */
function clampCamera(
  cam: Camera,
  shot: { width: number; height: number },
  fit: number,
  viewW: number,
  viewH: number,
): Camera {
  const scale = fit * cam.zoom;
  const halfW = viewW / 2 / scale;
  const halfH = viewH / 2 / scale;
  const keep = (v: number, half: number, size: number) =>
    half * 2 >= size ? size / 2 : Math.min(Math.max(v, half), size - half);
  return {
    zoom: cam.zoom,
    x: keep(cam.x, halfW, shot.width),
    y: keep(cam.y, halfH, shot.height),
  };
}

function toView(
  r: Rect,
  shot: { width: number; height: number },
  scale: number,
  left: number,
  top: number,
) {
  return {
    left: left + r.x * shot.width * scale,
    top: top + r.y * shot.height * scale,
    width: r.w * shot.width * scale,
    height: r.h * shot.height * scale,
  };
}
