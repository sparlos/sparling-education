// @vitest-environment node
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { generatePlay } from "../rules/generate.ts";
import { makeLap, runTrip } from "../rules/lap.ts";
import { lapLines, missLines } from "../rules/task.ts";
import { type StringId, strings } from "../strings.ts";
import { typedText } from "./Climb.tsx";
import { captionText } from "./caption.ts";
import { beatsFor, runMs, tallyText } from "./playback.ts";
import {
  gateAt,
  gateOf,
  gates,
  gateWaitAt,
  pastGateAt,
  pointAt,
  routeAngleAt,
  startAt,
  stopAt,
  stopSign,
  stretchAt,
  stretchClose,
  stretchFar,
  summit,
  trackY,
  valley,
  viewBox,
  waitingFor,
  zoomOn,
} from "./track.ts";

const t = (id: StringId) => strings[id] as string;
const lap = makeLap(0, 387, [{ place: "farm", loads: false, amount: 136 }], {
  what: "start",
});

describe("captions", () => {
  it("show numbers as numerals, as the spec writes the story", () => {
    expect(captionText(lapLines(lap), t)).toBe(
      "The train leaves with some crates. It drops off 136 crates at the farm. It must arrive with 251 crates. How many should it leave with?",
    );
    expect(captionText(missLines(lap, runTrip(lap, 377)), t)).toBe(
      "The train arrived with 241 crates. The gate's sign says 251.",
    );
    expect(
      captionText(
        [
          "run.only-has",
          "num.57",
          "num.thousand",
          "num.9",
          "num.hundred",
          "num.3",
          "unit.crates-end",
        ],
        t,
      ),
    ).toBe("The train only has 57 903 crates.");
  });
});

describe("the missing sign", () => {
  it("shows what's typed as numbers are written", () => {
    expect(typedText("")).toBe("?");
    expect(typedText("20997")).toBe("20 997");
    expect(typedText("4512")).toBe("4512");
    expect(typedText("123456")).toBe("123 456");
    expect(typedText("2.")).toBe("2.");
    expect(typedText("12.05")).toBe("12.05");
  });
});

describe("the trip's sum", () => {
  const stations = [{ place: "windmill", loads: true, amount: 293 }] as const;
  const end = makeLap(0, 225, stations, { what: "end" });

  it("builds up stop by stop, with the result when the load is on show", () => {
    const run = runTrip(lap, 377);
    expect(tallyText(lap, run, 0)).toBe("377");
    expect(tallyText(lap, run, 1)).toBe("377 − 136 = 241");
  });

  it("keeps the result back when what it arrives with is missing, until it's right", () => {
    const wrong = runTrip(end, 519);
    expect(tallyText(end, wrong, 1)).toBe("225 + 293 = ?");
    expect(tallyText(end, wrong, 1, true)).toBe("225 + 293 = ?");
    const right = runTrip(end, 518);
    expect(tallyText(end, right, 1)).toBe("225 + 293 = ?");
    expect(tallyText(end, right, 1, true)).toBe("225 + 293 = 518");
  });

  it("shows the drop-off a stalled train couldn't make, and a typed amount", () => {
    expect(tallyText(lap, runTrip(lap, 115), 0, true)).toBe("115 − 136");
    const change = makeLap(
      0,
      452,
      [{ place: "windmill", loads: false, amount: 137 }],
      {
        what: "change",
        at: 0,
      },
    );
    expect(tallyText(change, runTrip(change, 12), 1)).toBe("452 − 12 = 440");
  });

  it("writes two stops and decimals as the signs do", () => {
    const two = makeLap(
      0,
      57_903,
      [
        { place: "farm", loads: false, amount: 28_542 },
        { place: "windmill", loads: true, amount: 5032 },
      ],
      { what: "start" },
    );
    expect(tallyText(two, runTrip(two, 57_903), 2)).toBe(
      "57 903 − 28 542 + 5032 = 34 393",
    );
    const tenths = makeLap(
      2,
      218,
      [{ place: "quarry", loads: false, amount: 40 }],
      {
        what: "start",
      },
    );
    expect(tallyText(tenths, runTrip(tenths, 218), 1)).toBe(
      "2.18 − 0.4 = 1.78",
    );
  });
});

describe("a stretch", () => {
  it("climbs from left to right, on screen", () => {
    expect(trackY(startAt)).toBeGreaterThan(trackY(gateAt));
    expect(pointAt(startAt).angle).toBeLessThan(0);
    expect(trackY(0)).toBeLessThan(viewBox.height);
    expect(pastGateAt).toBeGreaterThan(viewBox.width + 104);
  });

  it("stops the wagon under each sign, before the gate", () => {
    for (const count of [1, 2])
      for (let i = 0; i < count; i++) {
        expect(stopAt(count, i)).toBeLessThan(gateWaitAt);
        expect(stopSign(count, i).y).toBeLessThan(trackY(stopSign(count, i).x));
      }
    expect(gateWaitAt).toBeLessThan(gateAt);
    expect(stopSign(1, 0).x).toBeGreaterThan(startAt - 104);
  });
});

describe("the mountain", () => {
  it("climbs every gate higher than the last, up to the summit", () => {
    const route = [valley, ...gates, summit];
    for (const [i, p] of route.entries()) {
      const next = route[i + 1];
      if (!next) continue;
      expect(next.y).toBeLessThan(p.y);
      expect(next.x).toBeGreaterThan(p.x);
    }
  });

  it("lies the tiny train along the stretch of route it's on", () => {
    const angle = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    expect(routeAngleAt(valley)).toBeCloseTo(angle(valley, gateOf(1)));
    expect(routeAngleAt(waitingFor(3))).toBeCloseTo(
      angle(gateOf(2), gateOf(3)),
    );
    // At a gate it's about to head on up the next stretch.
    expect(routeAngleAt(gateOf(3))).toBeCloseTo(angle(gateOf(3), gateOf(4)));
    expect(routeAngleAt(summit)).toBeCloseTo(angle(gateOf(6), summit));
  });

  it("waits partway to the next gate, past the last one", () => {
    expect(waitingFor(1).x).toBeGreaterThan(valley.x);
    expect(waitingFor(1).x).toBeLessThan(gateOf(1).x);
    expect(waitingFor(4).x).toBeGreaterThan(gateOf(3).x);
    expect(waitingFor(4).x).toBeLessThan(gateOf(4).x);
  });

  it("keeps each stretch on the picture, so the camera never shows past its edge", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 6]) {
      const at = stretchAt(n);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.x + at.width).toBeLessThanOrEqual(viewBox.width);
      expect(at.y + at.height).toBeLessThanOrEqual(viewBox.height);
    }
  });

  it("zooms so the stretch just overfills the picture, on every side", () => {
    for (const n of [0, 1, 6]) {
      const at = stretchAt(n);
      const found = /translate\((.+)%, (.+)%\) scale\((.+)\)/.exec(zoomOn(n));
      const tx = (Number(found?.[1]) / 100) * viewBox.width;
      const ty = (Number(found?.[2]) / 100) * viewBox.height;
      const k = Number(found?.[3]);
      expect(tx + at.x * k).toBeLessThan(0);
      expect(ty + at.y * k).toBeLessThan(0);
      expect(tx + (at.x + at.width) * k).toBeGreaterThan(viewBox.width);
      expect(ty + (at.y + at.height) * k).toBeGreaterThan(viewBox.height);
      expect(k).toBeLessThan(1.01 / 0.12);
    }
  });

  it("moves the stretch in step with the mountain, so it stays on the same spot", () => {
    const parts = (move: string) =>
      (/translate\((.+)%, (.+)%\) scale\((.+)\)/.exec(move) ?? [])
        .slice(1)
        .map(Number) as [number, number, number];
    for (const n of [0, 1, 6]) {
      const at = stretchAt(n);
      const [mx, my, mk] = parts(zoomOn(n));
      const [sx, sy, sk] = parts(stretchClose(n));
      expect(sx).toBeCloseTo(mx + ((at.x * mk) / viewBox.width) * 100);
      expect(sy).toBeCloseTo(my + ((at.y * mk) / viewBox.height) * 100);
      expect(sk).toBeCloseTo(mk * 0.12);
      const [fx, fy, fk] = parts(stretchFar(n));
      expect(fx).toBeCloseTo((at.x / viewBox.width) * 100);
      expect(fy).toBeCloseTo((at.y / viewBox.height) * 100);
      expect(fk).toBeCloseTo(0.12);
    }
  });
});

describe("a run's beats", () => {
  it("stop at each stop, then reach the gate, and go through it", () => {
    const beats = beatsFor(lap, runTrip(lap, 387));
    expect(beats.map((b) => b.kind)).toEqual([
      "drive",
      "station",
      "drive",
      "check",
      "gate",
      "drive",
    ]);
    expect(beats[4]).toMatchObject({ open: true });
    expect(beats[5]).toMatchObject({ to: pastGateAt });
  });

  it("end at a stall, or at a shut gate", () => {
    expect(beatsFor(lap, runTrip(lap, 115)).map((b) => b.kind)).toEqual([
      "drive",
      "stall",
    ]);
    const shut = beatsFor(lap, runTrip(lap, 377));
    expect(shut.at(-1)).toMatchObject({ kind: "gate", open: false });
    expect(shut.at(-2)).toMatchObject({ kind: "check" });
    expect(shut.at(-3)).toMatchObject({ kind: "drive", to: gateWaitAt });
  });

  it("keep a lap's run short, and shorter still with reduced motion", () => {
    for (const l of generatePlay("g5", seeded(2))) {
      const run = runTrip(l, l.end);
      expect(runMs(beatsFor(l, run))).toBeLessThan(9000);
      expect(runMs(beatsFor(l, run, true))).toBeLessThan(3000);
    }
  });
});
