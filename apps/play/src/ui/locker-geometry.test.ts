import { describe, expect, it } from "vitest";
import {
  type DoorFrame,
  isOnDoor,
  pointOnDoor,
  screenPoint,
} from "./locker-geometry.ts";

const closed: DoorFrame = {
  left: 100,
  top: 50,
  width: 324,
  height: 333,
  doorRoom: 0.62,
  angle: 0,
  perspective: 1800,
};
const open: DoorFrame = { ...closed, angle: 132 };

describe("a point on the locker's door", () => {
  it("is plain fractions of the door when it's closed", () => {
    // The door is 200 px wide, starting 124 px in.
    expect(pointOnDoor(closed, 100 + 124 + 50, 50 + 333 / 4)).toEqual({
      x: 0.25,
      y: 0.25,
    });
  });

  it("finds the same spot it was drawn at, on the open door", () => {
    for (const spot of [
      { x: 0.5, y: 0.5 },
      { x: 0.1, y: 0.9 },
      { x: 0.85, y: 0.2 },
    ]) {
      const { clientX, clientY } = screenPoint(open, spot);
      const back = pointOnDoor(open, clientX, clientY);
      expect(back.x).toBeCloseTo(spot.x, 9);
      expect(back.y).toBeCloseTo(spot.y, 9);
    }
  });

  it("reads the open door's inside from its free edge, on the left, to its hinge", () => {
    const hinge = screenPoint(open, { x: 1, y: 0.5 });
    const free = screenPoint(open, { x: 0, y: 0.5 });
    expect(hinge.clientX).toBeCloseTo(100 + 124, 9);
    expect(free.clientX).toBeLessThan(hinge.clientX);
  });

  it("isn't where a flat box would put it, since the near edge looms larger", () => {
    const { clientX, clientY } = screenPoint(open, { x: 0.1, y: 0.1 });
    // The free edge swings toward the student, so it's drawn above the box's top.
    expect(clientY).toBeLessThan(open.top + 0.1 * open.height);
    expect(isOnDoor(pointOnDoor(open, clientX, clientY))).toBe(true);
  });

  it("knows a point off the door", () => {
    expect(isOnDoor(pointOnDoor(closed, 105, 60))).toBe(false);
    expect(isOnDoor(pointOnDoor(open, 100 + 300, 200))).toBe(false);
  });
});
