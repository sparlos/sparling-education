// @vitest-environment node
// The picture's geometry and captions, on their own.
import { seeded } from "@repo/game-kit/random";
import { describe, expect, it } from "vitest";
import { numeral, partLabel } from "../rules/teacher.ts";
import { volleyAt } from "../rules/volley.ts";
import { arrivalLine, solvedLine } from "../rules/wave.ts";
import {
  byPlace,
  generatePlay,
  makeWave,
  partTotal,
  type TierId,
} from "../rules/waves.ts";
import { fixedStrings, type StringId, strings } from "../strings.ts";
import { captionText } from "./caption.ts";
import { paneBreaking, paneIsBroken } from "./Effects.tsx";
import { greenhouseAt } from "./Field.tsx";
import { mix, nightColours, sunHeight } from "./night.ts";
import {
  area,
  bugAt,
  frontOf,
  labelHeight,
  leastBug,
  leastSliver,
  overlap,
  placeLabels,
  placeSwarm,
  standing,
} from "./swarm.ts";

const t = (id: StringId) => strings[id] as string;
const tiers: TierId[] = ["g3", "g4", "g5"];
const allWaves = tiers.flatMap((tier) =>
  Array.from({ length: 150 }, (_, seed) =>
    generatePlay(tier, seeded(seed)),
  ).flat(),
);

describe("how a swarm is drawn", () => {
  it("is separate bugs at Grade 3, and for as long as a bug is 14 px", () => {
    for (const wave of generatePlay("g3", seeded(1)))
      expect(placeSwarm(wave).mode).toBe("bugs");
    expect(leastBug).toBe(14);
    for (const wave of allWaves) {
      const swarm = placeSwarm(wave);
      if (swarm.mode === "bugs") expect(swarm.cell).toBeGreaterThanOrEqual(14);
      else
        expect(
          Math.min(area.width / wave.second, area.height / wave.first),
        ).toBeLessThan(14);
    }
  });

  it("draws big waves as a block a part, one per product", () => {
    const swarm = placeSwarm(makeWave([5], byPlace(136)));
    expect(swarm.mode).toBe("blocks");
    expect(swarm.parts).toHaveLength(3);
    const big = placeSwarm(makeWave(byPlace(41), byPlace(32)));
    expect(big.mode).toBe("blocks");
    expect(big.parts).toHaveLength(4);
  });

  it("stays in its room", () => {
    for (const wave of allWaves)
      for (const p of placeSwarm(wave).parts) {
        expect(p.x).toBeGreaterThanOrEqual(area.x - 0.01);
        expect(p.y).toBeGreaterThanOrEqual(area.y - 0.01);
        expect(p.x + p.width).toBeLessThanOrEqual(area.x + area.width + 0.01);
        expect(p.y + p.height).toBeLessThanOrEqual(area.y + area.height + 0.01);
      }
    expect(area.x + area.width).toBeLessThan(greenhouseAt.x);
  });

  it("keeps labels clear of each other and of the greenhouse, hints or not", () => {
    for (const wave of allWaves) {
      const swarm = placeSwarm(wave);
      for (const texts of [
        wave.parts.map(partLabel),
        wave.parts.map((p) => `${partLabel(p)} = ${numeral(partTotal(p))}`),
      ]) {
        const labels = placeLabels(swarm, texts);
        labels.forEach((a, i) => {
          expect(a.x).toBeGreaterThanOrEqual(area.x - 0.01);
          expect(a.x + a.width).toBeLessThanOrEqual(greenhouseAt.x);
          expect(a.height).toBe(labelHeight);
          labels.forEach((b, j) => {
            if (j > i) expect(overlap(a, b)).toBe(false);
          });
        });
        // Marched: the room slides along with the swarm, so labels stay off the towers.
        const slid = 200;
        placeLabels(swarm, texts, area.x + slid, slid).forEach((a, i, all) => {
          expect(a.x).toBeGreaterThanOrEqual(area.x + slid - 0.01);
          all.forEach((b, j) => {
            if (j > i) expect(overlap(a, b)).toBe(false);
          });
        });
      }
    }
  });
});

describe("what's left of a part", () => {
  it("bugs go from the near side, a column at a time", () => {
    const wave = makeWave([6], [20, 7]);
    const swarm = placeSwarm(wave);
    const p = swarm.parts[0];
    if (!p) throw new Error("no part");
    expect(standing(swarm, p, 120)).toEqual([
      { x: p.x, y: p.y, width: p.width, height: p.height },
    ]);
    expect(standing(swarm, p, 0)).toEqual([]);
    const [front, rest] = standing(swarm, p, 117);
    // 3 gone of the first column of 6: its lower 3 stand.
    expect(front).toEqual({
      x: p.x,
      y: p.y + 3 * swarm.cell,
      width: swarm.cell,
      height: 3 * swarm.cell,
    });
    expect(rest?.x).toBe(p.x + swarm.cell);
    expect(rest?.width).toBe(19 * swarm.cell);
    const [one] = standing(swarm, p, 1);
    expect(one?.x).toBeCloseTo(p.x + 19 * swarm.cell);
    expect(one?.height).toBe(swarm.cell);
  });

  it("a block goes from its near side in proportion, always showing the last bug", () => {
    const wave = makeWave([5], byPlace(136));
    const swarm = placeSwarm(wave);
    const p = swarm.parts[0];
    if (!p) throw new Error("no part");
    const [half] = standing(swarm, p, 250);
    expect(half?.width).toBeCloseTo(p.width / 2);
    expect((half?.x ?? 0) + (half?.width ?? 0)).toBeCloseTo(p.x + p.width);
    expect(standing(swarm, p, 1)[0]?.width).toBe(leastSliver);
  });

  it("the front is what stands nearest", () => {
    const wave = makeWave([6], [20, 7]);
    const swarm = placeSwarm(wave);
    const near = swarm.parts[0]?.x ?? 0;
    expect(frontOf(swarm, volleyAt(wave, 0).left)).toBe(near);
    expect(frontOf(swarm, volleyAt(wave, 162).left)).toBeNull();
    expect(frontOf(swarm, volleyAt(wave, 120).left)).toBe(
      near + 20 * swarm.cell,
    );
  });
});

describe("where the darts land", () => {
  it("each dart lands on the bug it stops, in the order they go", () => {
    const wave = makeWave([6], [20, 7]);
    const swarm = placeSwarm(wave);
    for (let spent = 0; spent < wave.total; spent++) {
      const bug = bugAt(swarm, spent);
      const placed = swarm.parts[bug?.part ?? -1];
      if (!bug || !placed) throw new Error(`no bug ${spent}`);
      const before = standing(
        swarm,
        placed,
        volleyAt(wave, spent).left[bug.part] ?? 0,
      );
      const inside = (r: {
        x: number;
        y: number;
        width: number;
        height: number;
      }) =>
        bug.x > r.x &&
        bug.x < r.x + r.width &&
        bug.y > r.y &&
        bug.y < r.y + r.height;
      const after = standing(
        swarm,
        placed,
        volleyAt(wave, spent + 1).left[bug.part] ?? 0,
      );
      expect(before.some(inside)).toBe(true);
      expect(after.some(inside)).toBe(false);
    }
    expect(bugAt(swarm, wave.total)).toBeNull();
  });

  it("names the panes in the order they break", () => {
    for (let k = 0; k < 18; k++) {
      expect(paneIsBroken(paneBreaking(k), k)).toBe(false);
      expect(paneIsBroken(paneBreaking(k), k + 1)).toBe(true);
    }
  });
});

describe("the night", () => {
  it("runs from indigo through to blue morning", () => {
    const dark = nightColours(0);
    const morning = nightColours(1);
    expect(dark.sky).not.toBe(morning.sky);
    expect(dark.field).not.toBe(morning.field);
    expect(dark.farHills).not.toBe(morning.farHills);
    expect(dark.nearHills).not.toBe(morning.nearHills);
    expect(dark.stars).toBeGreaterThan(morning.stars);
    expect(dark.clouds).toBeLessThan(morning.clouds);
    expect(mix(["#000000", "#ffffff"], 0.5)).toBe("rgb(128,128,128)");
  });

  it("hides the sun at first and clears the hills after wave 5", () => {
    expect(sunHeight(0)).toBeLessThan(-28);
    expect(sunHeight(5 / 6)).toBeGreaterThan(28);
  });
});

describe("captions", () => {
  it("show a wave as numerals and symbols, from the same strings", () => {
    expect(captionText(arrivalLine(makeWave([6], [20, 7]), false), t)).toBe(
      `6 × 20 + 6 × 7. ${fixedStrings["wave.ask"]}`,
    );
  });

  it("show the solve", () => {
    expect(captionText(solvedLine(makeWave([6], [20, 7])), t)).toBe(
      "Every bug stopped, and the greenhouse is safe! 6 × 27 = 162.",
    );
  });

  it("show a hint", () => {
    expect(
      captionText(
        [
          "num.6",
          "op.times",
          "num.20",
          "op.is",
          "num.1",
          "num.hundred",
          "num.20",
        ],
        t,
      ),
    ).toBe("6 × 20 = 120.");
    expect(captionText(["num.5"], t)).toBe("5.");
  });

  it("pass plain sentences through", () => {
    expect(captionText(["run.short"], t)).toBe(fixedStrings["run.short"]);
  });
});
