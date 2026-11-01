// The moments the gems make a sound, from the real physics. The game's own
// tests can't reach these: jsdom has no layout, so GemLayer stays inert there.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Place } from "../strings.ts";
import { GemTubes, landGapMs } from "./gems.ts";

const svgNs = "http://www.w3.org/2000/svg";
const frameMs = 1000 / 60;

let frames: FrameRequestCallback[] = [];
let time = 0;

/** Runs `ms` of animation frames. */
function run(ms: number) {
  for (let t = 0; t < ms; t += frameMs) {
    time += frameMs;
    for (const frame of frames.splice(0)) frame(time);
  }
}

function setUp({ reduced = false } = {}) {
  const events = { landed: vi.fn(), fused: vi.fn() };
  const tubes = new GemTubes(
    document.createElementNS(svgNs, "g") as SVGGElement,
    [0, 1].map((i) => ({ x: 200 - 100 * i, y: 100, w: 60, h: 300 })),
    {
      gem: () => document.createElementNS(svgNs, "use"),
      flash: () => document.createElementNS(svgNs, "use"),
      radius: () => 12,
      sides: () => 6,
    },
    reduced,
    events,
  );
  return { tubes, events };
}

beforeEach(() => {
  frames = [];
  time = 0;
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.push(frame);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockImplementation(() => time);
});

afterEach(() => vi.unstubAllGlobals());

describe("the gems' sounds", () => {
  it("says a gem landed when it hits the tube, not when it starts to fall", () => {
    const { tubes, events } = setUp();
    tubes.sync([1, 0], [], false);
    run(frameMs);
    expect(events.landed).not.toHaveBeenCalled();
    run(1000);
    expect(events.landed).toHaveBeenCalledTimes(1);
    tubes.destroy();
  });

  it("doesn't count a gem's bounces, or the pile settling", () => {
    const { tubes, events } = setUp();
    tubes.sync([1, 0], [], false);
    run(3000);
    expect(events.landed).toHaveBeenCalledTimes(1);
    tubes.destroy();
  });

  it("keeps a heap of gems landing together from all sounding at once", () => {
    const { tubes, events } = setUp();
    let gems = 0;
    const longest: number[] = [];
    let last = -Infinity;
    events.landed.mockImplementation(() => {
      gems++;
      longest.push(time - last);
      last = time;
    });
    tubes.sync([9, 0], [], false);
    run(4000);
    expect(gems).toBeGreaterThan(1);
    expect(gems).toBeLessThanOrEqual(9);
    expect(Math.min(...longest)).toBeGreaterThanOrEqual(landGapMs);
    tubes.destroy();
  });

  it("says ten fused when they start to pull together, and only once for a chain's moment", () => {
    const { tubes, events } = setUp();
    tubes.sync([9, 0], [], false);
    run(2000);
    expect(events.fused).not.toHaveBeenCalled();
    tubes.sync([0, 1], [0 as Place], true);
    run(2000);
    expect(events.fused).toHaveBeenCalledTimes(1);
    tubes.destroy();
  });

  it("goes quiet when the tubes empty, whatever was still falling", () => {
    const { tubes, events } = setUp();
    tubes.sync([3, 0], [], false);
    tubes.sync([0, 0], [], false);
    run(2000);
    expect(events.landed).not.toHaveBeenCalled();
    tubes.destroy();
  });

  it("with reduced motion, makes one sound when the gems appear", () => {
    const { tubes, events } = setUp({ reduced: true });
    tubes.sync([5, 0], [], false);
    expect(events.landed).toHaveBeenCalledTimes(1);
    tubes.destroy();
  });
});
