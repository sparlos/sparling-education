// @vitest-environment node
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { generatePlay } from "../rules/generate.ts";
import { makeLap, runTrip } from "../rules/lap.ts";
import { lapLines, missLines } from "../rules/task.ts";
import { type StringId, strings } from "../strings.ts";
import { captionText } from "./caption.ts";
import { typedText } from "./Loop.tsx";
import { beatsFor, runMs, tallyText } from "./playback.ts";
import {
  gateWaitAt,
  loopLength,
  pointAt,
  stationAt,
  trackBox,
  yardAt,
} from "./track.ts";

const t = (id: StringId) => strings[id] as string;
const lap = makeLap(0, 387, [{ place: "farm", loads: false, amount: 136 }], {
  what: "start",
});

describe("captions", () => {
  it("show numbers as numerals, as the spec writes the story", () => {
    expect(captionText(lapLines(lap), t)).toBe(
      "The train leaves with some crates. It drops off 136 crates at the farm. It must come back with 251 crates. How many should it leave with?",
    );
    expect(captionText(missLines(lap, runTrip(lap, 377)), t)).toBe(
      "The train came back with 241 crates. The yard's sign says 251.",
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
  const stations = [{ place: "mill", loads: true, amount: 293 }] as const;
  const end = makeLap(0, 225, stations, { what: "end" });

  it("builds up stop by stop, with the result when the load is on show", () => {
    const run = runTrip(lap, 377);
    expect(tallyText(lap, run, 0)).toBe("377");
    expect(tallyText(lap, run, 1)).toBe("377 − 136 = 241");
  });

  it("keeps the result back when what comes back is missing, until it's right", () => {
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
      [{ place: "mill", loads: false, amount: 137 }],
      {
        what: "change",
        at: 0,
      },
    );
    expect(tallyText(change, runTrip(change, 12), 1)).toBe("452 − 12 = 440");
  });

  it("writes two stations and decimals as the signs do", () => {
    const two = makeLap(
      0,
      57_903,
      [
        { place: "farm", loads: false, amount: 28_542 },
        { place: "mill", loads: true, amount: 5032 },
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

describe("the track", () => {
  it("starts and ends at the yard, going right", () => {
    const start = pointAt(0);
    expect(start).toMatchObject({ x: 500, y: trackBox.bottom, angle: 0 });
    const end = pointAt(loopLength - 0.001);
    expect(end.x).toBeCloseTo(500);
    expect(end.y).toBeCloseTo(trackBox.bottom);
  });

  it("puts one station at the top, two on the sides", () => {
    expect(pointAt(stationAt(1, 0))).toMatchObject({ y: trackBox.top });
    expect(pointAt(stationAt(2, 0)).x).toBeCloseTo(trackBox.right);
    expect(pointAt(stationAt(2, 1)).x).toBeCloseTo(trackBox.left);
  });
});

describe("a run's beats", () => {
  it("stop at each station, then come back to the gate", () => {
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
    expect(beats[5]).toMatchObject({ to: loopLength + yardAt });
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
