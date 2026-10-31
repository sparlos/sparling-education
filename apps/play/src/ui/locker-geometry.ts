// Where a point on screen is on the locker's door, exactly, even when the
// door stands open at an angle. The door is drawn in CSS 3D: it turns
// `rotateY(-angle)` about its hinge (its left edge), inside the locker's box,
// which has `perspective` with its origin in the middle. A bounding box is
// only close for an angled door, so this undoes that projection instead.

/** The locker's box on screen and how its door is turned. */
export interface DoorFrame {
  /** The locker's box: its client rect (`getBoundingClientRect`). */
  left: number;
  top: number;
  width: number;
  height: number;
  /**
   * The room left of the locker for the open door, as a share of the door's
   * width. The box is the door's width times (1 + doorRoom) wide.
   */
  doorRoom: number;
  /** How far the door has turned open, in degrees: 0 is closed. */
  angle: number;
  /** The box's CSS `perspective`, in px. */
  perspective: number;
}

/** A point on the face of the door that's showing, as fractions of it. */
export interface DoorPoint {
  /** 0 is the face's left edge as the student sees it, 1 its right. */
  x: number;
  /** 0 is the top, 1 the bottom. */
  y: number;
}

/** Which face of the door shows at an angle: the front until it's past side-on. */
export const faceShowing = (angle: number) =>
  Math.abs(angle) > 90 ? "inside" : "front";

function parts(frame: DoorFrame) {
  const doorWidth = frame.width / (1 + frame.doorRoom);
  const radians = (-frame.angle * Math.PI) / 180;
  return {
    doorWidth,
    hinge: doorWidth * frame.doorRoom,
    cos: Math.cos(radians),
    // rotateY sends a point `u` along the door to depth -u·sin.
    depth: -Math.sin(radians),
    ox: frame.width / 2,
    oy: frame.height / 2,
    d: frame.perspective,
  };
}

/**
 * The point on the showing face under a point on screen. It can be outside
 * 0–1 when the screen point is off the door.
 */
export function pointOnDoor(
  frame: DoorFrame,
  clientX: number,
  clientY: number,
): DoorPoint {
  const { doorWidth, hinge, cos, depth, ox, oy, d } = parts(frame);
  const px = clientX - frame.left;
  const py = clientY - frame.top;
  // Screen x = ox + (hinge + u·cos − ox) · d / (d − u·depth), solved for u.
  const u = (d * (px - hinge)) / (cos * d + (px - ox) * depth);
  const scale = d / (d - u * depth);
  const y = oy + (py - oy) / scale;
  const along = u / doorWidth;
  return {
    // The inside face is the front's back, so it reads the other way.
    x: faceShowing(frame.angle) === "front" ? along : 1 - along,
    y: y / frame.height,
  };
}

/** Where a point on the showing face is drawn on screen: `pointOnDoor` undone. */
export function screenPoint(
  frame: DoorFrame,
  { x, y }: DoorPoint,
): { clientX: number; clientY: number } {
  const { doorWidth, hinge, cos, depth, ox, oy, d } = parts(frame);
  const u = (faceShowing(frame.angle) === "front" ? x : 1 - x) * doorWidth;
  const scale = d / (d - u * depth);
  return {
    clientX: frame.left + ox + (hinge + u * cos - ox) * scale,
    clientY: frame.top + oy + (y * frame.height - oy) * scale,
  };
}

/** Whether a point on the door is on it. */
export const isOnDoor = ({ x, y }: DoorPoint) =>
  x >= 0 && x <= 1 && y >= 0 && y <= 1;
