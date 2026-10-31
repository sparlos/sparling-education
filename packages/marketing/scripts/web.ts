// The marketing site's copy of a video: re-encoded small enough for a page
// (H.264, 1080p, web-optimised so it starts before it's fully downloaded),
// plus a JPEG poster from the brief's poster beat.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Brief } from "../src/brief.ts";
import type { Timeline } from "../src/timeline.ts";
import { paths } from "./files.ts";

function ffmpeg(args: string[]) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], {
    encoding: "utf8",
  });
  if (run.status !== 0) {
    throw new Error(`ffmpeg failed:\n${run.stderr.slice(-1500)}`);
  }
}

/**
 * Seconds into the video for the poster: just after the beat's line ends,
 * once its caption has gone and before the next transition.
 */
function posterSeconds(brief: Brief, timeline: Timeline | null): number {
  const beat = timeline?.beats.find((b) => b.beat.id === brief.web?.posterBeat);
  if (!beat) return 0;
  return beat.voiceFrom / brief.format.fps + beat.take.durationMs / 1000 + 0.4;
}

export function makeWebVideo(brief: Brief, timeline: Timeline | null) {
  const { root, out } = paths(brief.id);
  const dir = join(root, "..", "..", "apps", "web", "public", "videos");
  mkdirSync(dir, { recursive: true });
  const video = join(dir, `${brief.id}.mp4`);
  const poster = join(dir, `${brief.id}-poster.jpg`);
  ffmpeg([
    "-i",
    out,
    ...["-c:v", "libx264", "-preset", "slow", "-crf", "27"],
    ...["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    ...["-c:a", "aac", "-b:a", "128k"],
    video,
  ]);
  ffmpeg([
    "-ss",
    posterSeconds(brief, timeline).toFixed(2),
    "-i",
    out,
    ...["-frames:v", "1", "-q:v", "3"],
    poster,
  ]);
  console.log(`web: ${video}\nweb: ${poster}`);
}
