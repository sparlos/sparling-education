// The locker, and the small locker on home that opens it, rendered over the
// stand-ins: what a student sees, hears and can do.

import { stickers } from "@repo/rewards";
import { UIProvider } from "@repo/ui/provider";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hosted } from "../games.ts";
import type { HomePort, Membership, Student } from "../platform/ports.ts";
import {
  standInGiveKeepsakes,
  standInGrant,
  standInHome,
  standInRecognise,
} from "../platform/stand-ins/home.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import {
  standInClasses,
  standInGames,
  standInMemberships,
} from "../platform/stand-ins/memberships.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import {
  standInSession,
  standInSignIn,
} from "../platform/stand-ins/session.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { App } from "./App.tsx";
import { lockerDoor } from "./Locker.tsx";
import {
  type DoorFrame,
  type DoorPoint,
  screenPoint,
} from "./locker-geometry.ts";

const games = {
  "shell-check": hosted(() => import("../dev/shell-check.tsx")),
  "fraction-hop": hosted(() => import("../dev/shell-check.tsx")),
};
const classGames = standInGames(["fraction-hop", "shell-check"]);

const student: Student = {
  id: "student-1",
  locale: "en-CA",
  look: {
    body: "skin-07",
    hair: "hair-12",
    hat: "hat-07",
    top: "top-08",
    bottom: "bottom-09",
    shoes: "shoes-05",
  },
  classes: [
    {
      classId: "class-1",
      className: "Room 12",
      classColour: "teal",
      grades: [4],
      grade: 4,
      games: classGames,
    } satisfies Membership,
  ],
};

const instruction =
  "This is your locker. Stick your stickers on its door, and tap the handle to open it.";

function setUp({
  path = "/play/locker",
  storage = memoryStorage(),
  beforeRender = (_storage: KeyValueStore) => {},
  homePort = undefined as HomePort | undefined,
  momentMs = 0,
} = {}) {
  beforeRender(storage);
  standInSignIn(storage, student);
  const navigate = vi.fn();
  const spoken: string[] = [];
  render(
    <UIProvider>
      <App
        url={new URL(path, "https://app.test")}
        base="/play/"
        platform={{
          name: "test",
          session: standInSession(storage),
          memberships: standInMemberships(storage, standInClasses(classGames)),
          home: homePort ?? standInHome(storage),
          records: standInRecords(),
          links: standInLinks({ base: "/play/" }),
        }}
        games={games}
        storage={storage}
        navigate={navigate}
        newId={() => "id"}
        lockerTiming={{ swingMs: 0, momentMs }}
        // Speech that finishes at once, so lines said before an action don't hold it up.
        speak={(text, _locale, onEnd) => {
          spoken.push(text);
          queueMicrotask(() => onEnd?.());
          return () => {};
        }}
      />
    </UIProvider>,
  );
  return { navigate, spoken, storage, user: userEvent.setup() };
}

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({}),
});

// The locker's box is 324 × 333 px, so its door is 200 px wide; the tray is below.
const box = rect(0, 0, 324, 333);
const trayBox = rect(0, 400, 324, 92);

/** The locker, measured. */
async function lockerOpened() {
  const front = await screen.findByRole("group", {
    name: "Your locker's door",
  });
  const area = front.closest("[data-locker-area]") as HTMLElement;
  vi.spyOn(area, "getBoundingClientRect").mockReturnValue(box);
  const tray = area.closest("main")?.lastElementChild as HTMLElement;
  vi.spyOn(tray, "getBoundingClientRect").mockReturnValue(trayBox);
  return front;
}

/** Where a spot on the face of the door that's showing is on screen. */
function onScreen(open: boolean, spot: DoorPoint) {
  const frame: DoorFrame = {
    ...box,
    doorRoom: lockerDoor.doorRoom,
    angle: open ? lockerDoor.openAngle : 0,
    perspective: lockerDoor.perspective,
  };
  return screenPoint(frame, spot);
}

const front = () => screen.getByRole("group", { name: "Your locker's door" });
const inside = () =>
  screen.getByRole("group", { name: "The inside of your locker's door" });
const tray = () => screen.getByRole("list", { name: "Your stickers" });
const inTray = () =>
  within(tray()).getAllByRole("button", { name: "A sticker" });

const [first = "", second = ""] = stickers.map((s) => s.id);
const owning = (storage: KeyValueStore) =>
  standInGrant(storage, [first, second]);

/** What's on the locker, the one underneath first, without tilts, to a millionth. */
async function placed(storage: KeyValueStore) {
  const near = (n: number) => Math.round(n * 1e6) / 1e6;
  return (await standInHome(storage).current()).placements.map(
    ({ sticker, surface, x, y }) => ({
      sticker,
      surface,
      x: near(x),
      y: near(y),
    }),
  );
}

function stickOn(
  storage: KeyValueStore,
  ...on: {
    sticker: string;
    surface: "front" | "inside";
    x: number;
    y: number;
  }[]
) {
  for (const { sticker, ...spot } of on)
    void standInHome(storage).place(sticker, spot);
}

/** Taps a point on the face showing, while a sticker is held. */
async function tapDoor(
  user: ReturnType<typeof userEvent.setup>,
  open: boolean,
  spot: DoorPoint,
) {
  await user.pointer({
    keys: "[MouseLeft]",
    target: screen.getByRole("button", { name: "Stick it here" }),
    coords: onScreen(open, spot),
  });
}

const drag = (from: HTMLElement, to: { clientX: number; clientY: number }) => {
  const at = (clientX: number, clientY: number) => ({
    button: 0,
    pointerId: 1,
    clientX,
    clientY,
  });
  fireEvent.pointerDown(from, at(5, 450));
  fireEvent.pointerMove(from, at(60, 380));
  fireEvent.pointerUp(from, at(to.clientX, to.clientY));
};

describe("the small locker on home", () => {
  it("opens the locker", async () => {
    setUp({ path: "/play/" });
    expect(
      await screen.findByRole("link", { name: "Your locker" }),
    ).toHaveAttribute("href", "/play/locker");
  });

  it("shows the stickers on the front of the door, each at its tilt", async () => {
    setUp({
      path: "/play/",
      beforeRender: (storage) => {
        owning(storage);
        stickOn(
          storage,
          { sticker: first, surface: "front", x: 0.3, y: 0.6 },
          { sticker: second, surface: "inside", x: 0.5, y: 0.5 },
        );
      },
    });
    const small = await screen.findByRole("link", { name: "Your locker" });
    await waitFor(() =>
      expect(small.querySelector(`[data-sticker="${first}"]`)).not.toBeNull(),
    );
    expect(small.querySelector(`[data-sticker="${second}"]`)).toBeNull();
    const on = small.querySelector(`[data-sticker="${first}"]`)
      ?.parentElement as HTMLElement;
    expect(on).toHaveStyle({ left: "30%", top: "60%" });
    expect(on.style.getPropertyValue("--tilt")).toMatch(/^-?\d+(\.\d+)?deg$/);
  });

  it("glows while a sticker isn't on the locker yet", async () => {
    setUp({ path: "/play/", beforeRender: owning });
    const small = await screen.findByRole("link", { name: "Your locker" });
    await waitFor(() => expect(small).toHaveAttribute("data-glow"));
  });

  it("glows while there's a new keepsake", async () => {
    setUp({
      path: "/play/",
      beforeRender: (storage) =>
        standInGiveKeepsakes(storage, ["fraction-hop"]),
    });
    const small = await screen.findByRole("link", { name: "Your locker" });
    await waitFor(() => expect(small).toHaveAttribute("data-glow"));
  });

  it("doesn't glow once every sticker is on and every keepsake seen", async () => {
    setUp({
      path: "/play/",
      beforeRender: (storage) => {
        standInGiveKeepsakes(storage, ["fraction-hop"], { seen: true });
        standInGrant(storage, [first]);
        stickOn(storage, { sticker: first, surface: "inside", x: 0.5, y: 0.5 });
      },
    });
    const small = await screen.findByRole("link", { name: "Your locker" });
    await waitFor(() =>
      expect(small.querySelector("[data-slot]")).not.toBeNull(),
    );
    expect(small).not.toHaveAttribute("data-glow");
  });

  it("stops glowing once the student sticks on their last sticker and sees their new keepsake", async () => {
    const storage = memoryStorage();
    standInGrant(storage, [first]);
    standInGiveKeepsakes(storage, ["fraction-hop"]);
    const { user } = setUp({ storage });
    await lockerOpened();
    await user.click(inTray()[0] as HTMLElement);
    await tapDoor(user, false, { x: 0.5, y: 0.5 });
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    await waitFor(async () =>
      expect((await standInHome(storage).current()).newKeepsakes).toEqual([]),
    );
    await waitFor(async () => expect(await placed(storage)).toHaveLength(1));
    cleanup();
    setUp({ storage, path: "/play/" });
    const small = await screen.findByRole("link", { name: "Your locker" });
    await waitFor(() =>
      expect(small.querySelector(`[data-sticker="${first}"]`)).not.toBeNull(),
    );
    expect(small).not.toHaveAttribute("data-glow");
  });
});

describe("the locker", () => {
  it("says what to do, and goes back home", async () => {
    const { navigate, spoken, user } = setUp();
    await lockerOpened();
    await waitFor(() => expect(spoken).toEqual([instruction]));
    await user.click(screen.getByRole("button", { name: "Hear it again" }));
    expect(spoken).toEqual([instruction, instruction]);
    await user.click(screen.getByRole("button", { name: "Go home" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
  });

  it("opens on the closed door, and its handle opens and closes it, aloud", async () => {
    const { spoken, user } = setUp();
    await lockerOpened();
    expect(
      screen.queryByRole("group", { name: "Inside your locker" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", {
        name: "The inside of your locker's door",
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    expect(spoken).toContain("Open your locker");
    expect(inside()).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Inside your locker" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Your locker's door" }),
    ).not.toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close your locker" });
    expect(close).toHaveFocus();

    await user.click(close);
    expect(spoken).toContain("Close your locker");
    expect(front()).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Inside your locker" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open your locker" }),
    ).toHaveFocus();
  });

  it("offers to try again when what's in it can't be read", async () => {
    const storage = memoryStorage();
    const home = standInHome(storage);
    vi.spyOn(home, "current").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setUp({ storage, homePort: home });
    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});

describe("stickers on the locker", () => {
  it("sticks one on the front of the door where the student taps, saying what to do", async () => {
    const { spoken, storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    await user.click(inTray()[0] as HTMLElement);
    expect(spoken).toContain("Tap the door to stick it there.");
    await tapDoor(user, false, { x: 0.25, y: 0.75 });
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, surface: "front", x: 0.25, y: 0.75 },
      ]),
    );
    const stuck = within(front()).getByRole("button", { name: "A sticker" });
    expect(stuck.querySelector(`[data-sticker="${first}"]`)).not.toBeNull();
    expect(Number.parseFloat(stuck.style.left)).toBeCloseTo(25, 6);
    expect(Number.parseFloat(stuck.style.top)).toBeCloseTo(75, 6);
    const { tilt } = (await standInHome(storage).current()).placements[0] as {
      tilt: number;
    };
    await waitFor(() =>
      expect(stuck.style.getPropertyValue("--tilt")).toBe(`${tilt}deg`),
    );
    expect(tray().querySelector(`[data-sticker="${first}"]`)).toBeNull();
  });

  it("sticks one on the inside of the open door exactly where it's tapped, though the door is at an angle", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    await user.click(inTray()[0] as HTMLElement);
    await tapDoor(user, true, { x: 0.3, y: 0.4 });
    await waitFor(async () => expect(await placed(storage)).toHaveLength(1));
    const [on] = await placed(storage);
    expect(on?.surface).toBe("inside");
    expect(on?.x).toBeCloseTo(0.3, 6);
    expect(on?.y).toBeCloseTo(0.4, 6);
    expect(
      within(inside()).getByRole("button", { name: "A sticker" }),
    ).toBeInTheDocument();
  });

  it("keeps a sticker wholly on the door, near its edge", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    await user.click(inTray()[0] as HTMLElement);
    await tapDoor(user, false, { x: 0.01, y: 0.99 });
    // A sticker is a fifth of the door's width, and the door is 0.6 as wide as it's tall.
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, surface: "front", x: 0.1, y: 0.94 },
      ]),
    );
  });

  it("moves a sticker on the door, on top of the others, keeping its tilt", async () => {
    const { spoken, storage, user } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        stickOn(
          storage,
          { sticker: first, surface: "front", x: 0.5, y: 0.5 },
          { sticker: second, surface: "front", x: 0.6, y: 0.5 },
        );
      },
    });
    await lockerOpened();
    const tilt = async () =>
      (await standInHome(storage).current()).placements.find(
        (p) => p.sticker === first,
      )?.tilt;
    const was = await tilt();
    const [one] = within(front()).getAllByRole("button", { name: "A sticker" });
    await user.click(one as HTMLElement);
    expect(spoken).toContain("Tap where to move it, or put it back.");
    await tapDoor(user, false, { x: 0.75, y: 0.25 });
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: second, surface: "front", x: 0.6, y: 0.5 },
        { sticker: first, surface: "front", x: 0.75, y: 0.25 },
      ]),
    );
    expect(await tilt()).toBe(was);
  });

  it("takes a sticker off with the put-back button, or by dragging it to the tray", async () => {
    const { storage, user } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        stickOn(
          storage,
          { sticker: first, surface: "front", x: 0.5, y: 0.5 },
          { sticker: second, surface: "front", x: 0.3, y: 0.3 },
        );
      },
    });
    await lockerOpened();
    const [one] = within(front()).getAllByRole("button", { name: "A sticker" });
    await user.click(one as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Put it back" }));
    await waitFor(async () => expect(await placed(storage)).toHaveLength(1));
    expect(tray().querySelector(`[data-sticker="${first}"]`)).not.toBeNull();

    const other = within(front()).getByRole("button", { name: "A sticker" });
    drag(other, { clientX: 100, clientY: 440 });
    await waitFor(async () => expect(await placed(storage)).toEqual([]));
    expect(tray().querySelector(`[data-sticker="${second}"]`)).not.toBeNull();
  });

  it("drags a sticker from the tray onto either face of the door", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    drag(inTray()[0] as HTMLElement, onScreen(false, { x: 0.5, y: 0.5 }));
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, surface: "front", x: 0.5, y: 0.5 },
      ]),
    );
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    drag(inTray()[0] as HTMLElement, onScreen(true, { x: 0.6, y: 0.3 }));
    await waitFor(async () => expect(await placed(storage)).toHaveLength(2));
    const [, on] = await placed(storage);
    expect(on?.sticker).toBe(second);
    expect(on?.surface).toBe("inside");
    expect(on?.x).toBeCloseTo(0.6, 6);
    expect(on?.y).toBeCloseTo(0.3, 6);
  });

  it("leaves a sticker where it was when it's dropped off the door", async () => {
    const { storage, user } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        stickOn(storage, { sticker: first, surface: "inside", x: 0.5, y: 0.5 });
      },
    });
    await lockerOpened();
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    const stuck = within(inside()).getByRole("button", { name: "A sticker" });
    // Onto the locker's shelves, right of the hinge.
    drag(stuck, { clientX: 300, clientY: 150 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await placed(storage)).toEqual([
      { sticker: first, surface: "inside", x: 0.5, y: 0.5 },
    ]);
  });

  it("moves a sticker to the other face of the door by way of the tray", async () => {
    const { storage, user } = setUp({
      beforeRender: (storage) => {
        standInGrant(storage, [first]);
        stickOn(storage, { sticker: first, surface: "front", x: 0.5, y: 0.5 });
      },
    });
    await lockerOpened();
    drag(within(front()).getByRole("button", { name: "A sticker" }), {
      clientX: 100,
      clientY: 440,
    });
    await waitFor(async () => expect(await placed(storage)).toEqual([]));
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    await user.click(inTray()[0] as HTMLElement);
    await tapDoor(user, true, { x: 0.5, y: 0.5 });
    await waitFor(async () =>
      expect((await placed(storage))[0]?.surface).toBe("inside"),
    );
    await user.click(screen.getByRole("button", { name: "Close your locker" }));
    expect(
      within(front()).queryByRole("button", { name: "A sticker" }),
    ).not.toBeInTheDocument();
  });

  it("puts a sticker down again when it's tapped twice, with Escape, or when the door swings", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    const [loose] = inTray();
    await user.click(loose as HTMLElement);
    expect(loose).toHaveAttribute("aria-pressed", "true");
    await user.click(loose as HTMLElement);
    expect(loose).toHaveAttribute("aria-pressed", "false");
    await user.click(loose as HTMLElement);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", { name: "Stick it here" }),
    ).not.toBeInTheDocument();
    await user.click(loose as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    expect(
      screen.queryByRole("button", { name: "Stick it here" }),
    ).not.toBeInTheDocument();
    expect(await placed(storage)).toEqual([]);
  });

  it("sticks one on from the keyboard, in the middle", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerOpened();
    (inTray()[0] as HTMLElement).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Stick it here" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, surface: "front", x: 0.5, y: 0.5 },
      ]),
    );
  });

  it("sticks on a teacher's recognition sticker the same way", async () => {
    const { storage, user } = setUp({
      beforeRender: (storage) =>
        standInRecognise(storage, "kindness", { seen: true }),
    });
    await lockerOpened();
    await user.click(
      within(tray()).getByRole("button", {
        name: "Your teacher gave you a sticker for kindness!",
      }),
    );
    await tapDoor(user, false, { x: 0.5, y: 0.5 });
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: "recognition-kindness", surface: "front", x: 0.5, y: 0.5 },
      ]),
    );
  });

  it("goes back to what's saved when a change can't be saved", async () => {
    const storage = memoryStorage();
    owning(storage);
    const home = standInHome(storage);
    vi.spyOn(home, "place").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = setUp({ storage, homePort: home });
    await lockerOpened();
    await user.click(inTray()[0] as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Stick it here" }));
    await waitFor(() =>
      expect(
        within(front()).queryByRole("button", { name: "A sticker" }),
      ).not.toBeInTheDocument(),
    );
    expect(tray().querySelector(`[data-sticker="${first}"]`)).not.toBeNull();
  });
});

describe("keepsakes in the locker", () => {
  it("are one for each game played, in the order first played, each saying its game", async () => {
    const { spoken, user } = setUp({
      beforeRender: (storage) =>
        standInGiveKeepsakes(
          storage,
          ["shell-check", "left-game", "fraction-hop"],
          {
            seen: true,
          },
        ),
    });
    await lockerOpened();
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    const shelves = screen.getByRole("group", { name: "Inside your locker" });
    const kept = within(shelves).getAllByRole("button");
    expect(kept.map((k) => k.getAttribute("aria-label"))).toEqual([
      "You played Shell Check",
      // A game from a class they've left, whose name home doesn't know.
      "Something from a game you played",
      "You played Fraction Hop",
    ]);
    expect(kept[0]?.querySelector('[data-slot="keepsake"]')).toHaveAttribute(
      "data-placeholder",
    );
    await user.click(kept[2] as HTMLElement);
    expect(spoken.at(-1)).toBe("You played Fraction Hop");
  });

  it("have a moment when the door opens on a new one, then the voice says what it is, and it's seen", async () => {
    const storage = memoryStorage();
    standInGiveKeepsakes(storage, ["shell-check"], { seen: true });
    standInGiveKeepsakes(storage, ["fraction-hop"]);
    const { spoken, user } = setUp({ storage, momentMs: 60 });
    await lockerOpened();
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    const shelves = screen.getByRole("group", { name: "Inside your locker" });
    const hop = within(shelves).getByRole("button", {
      name: "You played Fraction Hop",
    });
    await waitFor(() => expect(hop).toHaveAttribute("data-celebrating"));
    // The moment first; the voice waits its turn.
    expect(spoken.join(" ")).not.toContain("Something new");
    expect((await standInHome(storage).current()).newKeepsakes).toEqual([
      "fraction-hop",
    ]);
    await waitFor(() =>
      expect(spoken.at(-1)).toBe(
        "Something new in your locker, for playing Fraction Hop",
      ),
    );
    expect(hop).not.toHaveAttribute("data-celebrating");
    expect(
      within(shelves)
        .getByRole("button", { name: "You played Shell Check" })
        .hasAttribute("data-celebrating"),
    ).toBe(false);
    expect((await standInHome(storage).current()).newKeepsakes).toEqual([]);

    // Not again, the next time the door opens.
    await user.click(screen.getByRole("button", { name: "Close your locker" }));
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(hop).not.toHaveAttribute("data-celebrating");
    expect(spoken.at(-1)).toBe("Open your locker");
  });

  it("stay new when the door closes during the moment", async () => {
    const storage = memoryStorage();
    standInGiveKeepsakes(storage, ["fraction-hop"]);
    const { user } = setUp({ storage, momentMs: 200 });
    await lockerOpened();
    await user.click(screen.getByRole("button", { name: "Open your locker" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "You played Fraction Hop" })
          .hasAttribute("data-celebrating"),
      ).toBe(true),
    );
    await user.click(screen.getByRole("button", { name: "Close your locker" }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect((await standInHome(storage).current()).newKeepsakes).toEqual([
      "fraction-hop",
    ]);
  });
});
