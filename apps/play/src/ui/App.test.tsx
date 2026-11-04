// The shell end to end, through the real stand-in platform and the
// shell-check game: what a student can do, and what records come out.
import { brandName } from "@repo/tokens";
import { UIProvider } from "@repo/ui/provider";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hosted } from "../games.ts";
import { sampleAttempt } from "../platform/contract.ts";
import {
  type AvatarLook,
  NotAStudent,
  type PlayRecord,
  type Student,
} from "../platform/ports.ts";
import { standInEarn, standInHome } from "../platform/stand-ins/home.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import {
  type StandInClasses,
  standInClasses,
  standInGames,
  standInMemberships,
} from "../platform/stand-ins/memberships.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import {
  standInSession,
  standInSignIn,
  standInStudent,
} from "../platform/stand-ins/session.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { stubAudio } from "../test/fake-audio.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { App } from "./App.tsx";

const games = {
  "shell-check": hosted(() => import("../dev/shell-check.tsx")),
  "fraction-hop": hosted(() => import("@games/fraction-hop")),
};

// Send almost at once, and never retry on a timer, so only the shell's own
// triggers (the connection coming back, finishing) can send after a failure.
const outboxTiming = { batchDelayMs: 10, retryDelaysMs: [60_000] };

const student: Student = {
  id: "student-1",
  locale: "en-CA",
  look: {
    body: "skin-07",
    hair: "hair-12",
    hat: "hat-07",
    top: "top-08",
    bottom: "bottom-11",
    shoes: "shoes-05",
  },
  classes: [
    {
      classId: "class-1",
      className: "Room 12",
      classColour: "teal",
      grades: [4],
      grade: 4,
      games: standInGames(["shell-check"]),
    },
  ],
};

/** The student, in one class at `grade`. */
function inGrade(grade: number): Student {
  return {
    ...student,
    classes: student.classes.map((m) => ({ ...m, grades: [grade], grade })),
  };
}

function setUp({
  path = "/play/shell-check?class=class-1",
  signedIn = student as Student | null,
  offline = false,
  failSession = false,
  teacher = false,
  // The stand-in classes join codes name; every one has shell-check on.
  classes = standInClasses(standInGames(["shell-check"])) as StandInClasses,
  // This browser's storage, kept between visits.
  storage = memoryStorage() as KeyValueStore,
  // In place of the stand-in's answer to whether they've played the game before.
  played = undefined as ((game: string) => Promise<boolean>) | undefined,
} = {}) {
  if (signedIn) standInSignIn(storage, signedIn);
  let isOffline = offline;
  const standIn = standInRecords({
    storage,
    student: () => standInStudent(storage)?.id ?? null,
    offline: () => isOffline,
    onStored: (fresh) => standInEarn(storage, fresh),
  });
  const records = {
    get stored() {
      return standIn.stored;
    },
    send: standIn.send,
    played: played ?? standIn.played,
  };
  const session = failSession
    ? { current: () => Promise.reject(new Error("offline")) }
    : teacher
      ? { current: () => Promise.reject(new NotAStudent()) }
      : standInSession(storage);
  const navigate = vi.fn();
  const spoken: string[] = [];
  const cutOff: string[] = [];
  let n = 0;
  render(
    <UIProvider>
      <App
        url={new URL(path, "https://app.test")}
        base="/play/"
        platform={{
          name: "test",
          session,
          home: standInHome(storage),
          memberships: standInMemberships(storage, classes),
          records,
          links: standInLinks({ base: "/play/" }),
        }}
        games={games}
        storage={storage}
        navigate={navigate}
        newId={() => `id-${++n}`}
        speak={(text) => {
          spoken.push(text);
          return () => cutOff.push(text);
        }}
        finishTimeoutMs={200}
        outboxTiming={outboxTiming}
      />
    </UIProvider>,
  );
  return {
    records,
    navigate,
    spoken,
    cutOff,
    storage,
    user: userEvent.setup(),
    goOnline: () => {
      isOffline = false;
      window.dispatchEvent(new Event("online"));
    },
  };
}

/** The game, tapping start first if it hasn't been. */
async function game() {
  if (!screen.queryByTestId("tier"))
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
  return screen.findByTestId("tier");
}

const attemptsIn = (records: readonly PlayRecord[]) =>
  records.filter((r) => r.kind === "attempt");
const endsIn = (records: readonly PlayRecord[]) =>
  records.filter((r) => r.kind === "end");

describe("opening a game", () => {
  it("sends a signed-out student to sign-in, returning to the same game link", async () => {
    const { navigate } = setUp({ signedIn: null });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/play/__stand-in/sign-in?next=%2Fplay%2Fshell-check%3Fclass%3Dclass-1",
      ),
    );
  });

  it("waits for a tap on start before the game, so the browser lets it speak", async () => {
    const { user, spoken } = setUp();
    const start = await screen.findByRole("button", { name: "Start" });
    expect(screen.queryByTestId("tier")).not.toBeInTheDocument();
    expect(spoken).toEqual([]);
    await user.click(start);
    expect(await screen.findByTestId("tier")).toBeInTheDocument();
  });

  it("starts on a tap anywhere on the start screen, not just the button", async () => {
    const { user } = setUp();
    await user.click(await screen.findByRole("img", { name: "Your avatar" }));
    expect(await screen.findByTestId("tier")).toBeInTheDocument();
  });

  it("shows how many tasks of a progression-based game are done", async () => {
    const { user } = setUp();
    await game();
    const bar = screen.getByRole("progressbar", { name: "Tasks done" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0/2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Right" }));
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  it("gives the student the tier for their grade", async () => {
    setUp({ signedIn: inGrade(3) });
    expect(await game()).toHaveTextContent("g3");
  });

  it("gives a student outside the game's grades the closest tier", async () => {
    setUp({ signedIn: inGrade(7) });
    expect(await game()).toHaveTextContent("g4");
  });

  it("shows the student's avatar", async () => {
    setUp();
    await game();
    expect(
      screen.getByRole("img", { name: "Your avatar" }),
    ).toBeInTheDocument();
  });

  it("dresses the avatar in the student's look, with the game's expression", async () => {
    const { user } = setUp();
    await game();
    const avatar = screen.getByRole("img", { name: "Your avatar" });
    const items = Object.fromEntries(
      [...avatar.querySelectorAll("[data-slot]")].map((el) => [
        el.getAttribute("data-slot"),
        el.getAttribute("data-item"),
      ]),
    );
    expect(items).toEqual(student.look);
    expect(avatar).toHaveAttribute("data-expression", "neutral");
    await user.click(screen.getByRole("button", { name: "Wrong" }));
    expect(avatar).toHaveAttribute("data-expression", "encouraging");
  });

  it("has a first-time student design their avatar, then opens the game in it", async () => {
    const { navigate, storage, user } = setUp({
      signedIn: { ...student, look: null },
    });
    await user.click(await screen.findByRole("button", { name: "Skin 3" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "https://app.test/play/shell-check?class=class-1",
      ),
    );
    expect(standInStudent(storage)?.look).toMatchObject({ body: "skin-03" });
  });

  it("shows a look changed in the wardrobe in the game", async () => {
    const changed = {
      ...(student.look as AvatarLook),
      top: "top-01",
      hat: null,
    } satisfies AvatarLook;
    setUp({ signedIn: { ...student, look: changed } });
    await game();
    const avatar = screen.getByRole("img", { name: "Your avatar" });
    expect(avatar.querySelector('[data-slot="top"]')).toHaveAttribute(
      "data-item",
      "top-01",
    );
    expect(avatar.querySelector('[data-slot="hat"]')).toBeNull();
  });

  it("plays for the class home opened it for, at the student's grade in that class", async () => {
    const { user, records } = setUp({
      path: "/play/shell-check?class=class-2",
      signedIn: {
        ...student,
        classes: [
          ...student.classes,
          {
            classId: "class-2",
            className: "Math",
            classColour: "teal",
            grades: [3],
            grade: 3,
            games: standInGames(["shell-check"]),
          },
        ],
      },
    });
    expect(await game()).toHaveTextContent("g3");
    await user.click(screen.getByRole("button", { name: "Right" }));
    await waitFor(() => expect(records.stored).toHaveLength(1));
    expect(records.stored[0]).toMatchObject({ class: "class-2", tier: "g3" });
  });

  it("plays for the student's first class with the game when the link names none", async () => {
    const { user, records } = setUp({ path: "/play/shell-check" });
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await waitFor(() => expect(records.stored).toHaveLength(1));
    expect(records.stored[0]).toMatchObject({ class: "class-1" });
  });

  it("sends a student with no class to play the game in home", async () => {
    const { navigate } = setUp({ signedIn: { ...student, classes: [] } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
  });

  it("says when there's no such game", async () => {
    setUp({ path: "/play/no-such-game" });
    expect(
      await screen.findByText("We couldn't find that game."),
    ).toBeInTheDocument();
  });

  it("offers to try again when the session can't be checked", async () => {
    const { user, navigate } = setUp({ failSession: true });
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(navigate).toHaveBeenCalledWith(
      "https://app.test/play/shell-check?class=class-1",
    );
  });

  it("says it's for students when a teacher opens it", async () => {
    const { spoken } = setUp({ teacher: true });
    expect(
      await screen.findByText(
        "This is for students. Teachers, use the teacher app.",
      ),
    ).toBeInTheDocument();
    expect(spoken).toContain(
      "This is for students. Teachers, use the teacher app.",
    );
  });
});

describe("a game's first play", () => {
  /** Stores a record of a play of `game` by the student, as an earlier visit would have. */
  async function playedBefore(storage: KeyValueStore, game = "shell-check") {
    await standInRecords({ storage }).send([
      sampleAttempt({ student: student.id, game }),
    ]);
  }

  it("tells the game it's a first play when the student hasn't played it", async () => {
    setUp();
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("first play");
  });

  it("tells the game they've played it before, in any class", async () => {
    const storage = memoryStorage();
    await playedBefore(storage);
    setUp({ storage });
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("played before");
  });

  it("plays it as a first play with ?tutorial=true, in development", async () => {
    const storage = memoryStorage();
    await playedBefore(storage);
    setUp({ storage, path: "/play/shell-check?class=class-1&tutorial=true" });
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("first play");
  });

  it("only counts plays of the same game", async () => {
    const storage = memoryStorage();
    await playedBefore(storage, "fraction-hop");
    setUp({ storage });
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("first play");
  });

  it("counts it as a first play when it can't be checked", async () => {
    setUp({ played: () => Promise.reject(new Error("offline")) });
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("first play");
  });

  it("never holds the game back for the answer: none yet is a first play", async () => {
    setUp({ played: () => new Promise<boolean>(() => {}) });
    await game();
    expect(screen.getByTestId("first-play")).toHaveTextContent("first play");
  });

  it("opens a returning student's Fraction Hop on the journey, with no tutorial", async () => {
    const storage = memoryStorage();
    await playedBefore(storage, "fraction-hop");
    const withFractionHop: Student = {
      ...student,
      classes: student.classes.map((m) => ({
        ...m,
        games: standInGames(["shell-check", "fraction-hop"]),
      })),
    };
    setUp({
      path: "/play/fraction-hop?class=class-1",
      signedIn: withFractionHop,
      storage,
    });
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    const board = await screen.findByTestId("board");
    expect(
      within(board).queryByRole("button", { name: "Skip" }),
    ).not.toBeInTheDocument();
    // The tutorial never shows the map; a returning student opens on it.
    expect(screen.getByTestId("treasure-map")).toHaveAttribute(
      "data-view",
      "wide",
    );
  });

  it("plays a new student's Fraction Hop tutorial first", async () => {
    setUp({
      path: "/play/fraction-hop?class=class-1",
      signedIn: {
        ...student,
        classes: student.classes.map((m) => ({
          ...m,
          games: standInGames(["fraction-hop"]),
        })),
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Start" }));
    const board = await screen.findByTestId("board");
    expect(
      within(board).getByRole("button", { name: "Skip" }),
    ).toBeInTheDocument();
  });
});

describe("a teacher's game link", () => {
  it("sends a signed-out student to sign-in, returning to the game link", async () => {
    const { navigate } = setUp({
      path: "/play/shell-check?join=G4",
      signedIn: null,
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/play/__stand-in/sign-in?next=%2Fplay%2Fshell-check%3Fjoin%3DG4",
      ),
    );
  });

  it("comes straight back to the game link once the student is signed in", async () => {
    const { navigate } = setUp({
      path: "/play/sign-in?next=%2Fplay%2Fshell-check%3Fjoin%3DG4",
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/play/shell-check?join=G4"),
    );
  });

  it("puts the screens around the play in the colour of the class it's for", async () => {
    const { user } = setUp({ path: "/play/shell-check?join=G4-AMBER" });
    const start = await screen.findByRole("button", { name: "Start" });
    expect(start.closest("[data-class-colour]")).toHaveAttribute(
      "data-class-colour",
      "amber",
    );
    await user.click(start);
    await user.click(screen.getByRole("button", { name: "Leave the game" }));
    const question = await screen.findByRole("dialog");
    expect(question.closest("[data-class-colour]")).toHaveAttribute(
      "data-class-colour",
      "amber",
    );
  });

  it("joins a student to its class, and plays for that class at its grade", async () => {
    const { user, records, storage } = setUp({
      path: "/play/shell-check?join=G3",
    });
    expect(await game()).toHaveTextContent("g3");
    expect(standInStudent(storage)?.classes.map((m) => m.classId)).toEqual([
      "class-1",
      "stand-in-G3",
    ]);
    await user.click(screen.getByRole("button", { name: "Right" }));
    await waitFor(() => expect(records.stored).toHaveLength(1));
    expect(records.stored[0]).toMatchObject({
      class: "stand-in-G3",
      tier: "g3",
    });
  });

  it("plays for its class when the student is already in it", async () => {
    const { user, records, storage } = setUp({
      path: "/play/shell-check?join=G3",
      signedIn: {
        ...student,
        classes: [
          ...student.classes,
          {
            classId: "stand-in-G3",
            className: "Room 3",
            classColour: "teal",
            grades: [3],
            grade: 3,
            games: standInGames(["shell-check"]),
          },
        ],
      },
    });
    await game();
    expect(standInStudent(storage)?.classes).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Right" }));
    await waitFor(() => expect(records.stored).toHaveLength(1));
    expect(records.stored[0]).toMatchObject({ class: "stand-in-G3" });
  });

  it("has a student joining a split class pick their grade first, then opens the game", async () => {
    const { user, navigate, spoken, storage } = setUp({
      path: "/play/shell-check?join=G34",
    });
    await user.click(await screen.findByRole("button", { name: "Grade 3" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Yes" }),
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "https://app.test/play/shell-check?join=G34",
      ),
    );
    expect(spoken).toContain("Which grade are you in?");
    expect(
      standInStudent(storage)?.classes.find((m) => m.classId === "stand-in-G34")
        ?.grade,
    ).toBe(3);
  });

  it("says aloud when no class has its join code, with a way home", async () => {
    const { user, navigate, spoken } = setUp({
      path: "/play/shell-check?join=X1",
    });
    const text = "We couldn't find that class. Ask your teacher for the link.";
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(spoken).toContain(text);
    await user.click(screen.getByRole("button", { name: "Go home" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
  });

  it("says aloud when its class has the game turned off, with a way home", async () => {
    const { user, navigate, spoken, records, storage } = setUp({
      path: "/play/shell-check?join=G4",
      classes: standInClasses([]),
    });
    const text = "That game is turned off for your class.";
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(spoken).toContain(text);
    // Still in the class, for its other games.
    expect(standInStudent(storage)?.classes).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Go home" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
    expect(records.stored).toEqual([]);
  });
});

describe("playing", () => {
  it("sends each attempt with the play's details", async () => {
    const { user, records } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Wrong" }));
    await user.click(screen.getByRole("button", { name: "Right" }));

    await waitFor(() => expect(records.stored).toHaveLength(2));
    expect(records.stored).toEqual([
      expect.objectContaining({
        kind: "attempt",
        student: "student-1",
        class: "class-1",
        game: "shell-check",
        gameVersion: 1,
        tier: "g4",
        task: "only-task",
        expectation: "math-2020.g4.B1.4",
        succeeded: false,
        misconception: "bigger-denominator-bigger",
      }),
      expect.objectContaining({ task: "only-task", succeeded: true }),
    ]);
    const [first, second] = records.stored;
    expect(first?.play).toBe(second?.play);
    expect(first?.id).not.toBe(second?.id);
  });

  it("keeps attempts made offline and sends them when the connection is back", async () => {
    const { user, records, goOnline } = setUp({ offline: true });
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await new Promise((r) => setTimeout(r, 50));
    expect(records.stored).toHaveLength(0);

    goOnline();
    await waitFor(() => expect(records.stored).toHaveLength(1));
  });

  it("speaks a line and hears it again", async () => {
    const { user, spoken } = setUp();
    await game();
    const again = screen.getByRole("button", { name: "Hear it again" });
    expect(again).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Tap a button to send an attempt." }),
    );
    await user.click(again);
    expect(spoken).toEqual([
      "Tap a button to send an attempt.",
      "Tap a button to send an attempt.",
    ]);
  });

  it("offers to skip a line only while it's being said", async () => {
    const { user, cutOff } = setUp();
    await game();
    expect(screen.queryByRole("button", { name: "Skip ahead" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Tap a button to send an attempt." }),
    );
    await user.click(screen.getByRole("button", { name: "Skip ahead" }));

    expect(cutOff).toEqual(["Tap a button to send an attempt."]);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Skip ahead" })).toBeNull(),
    );
  });
});

/** Where the student was sent, as a URL. */
const sentTo = (navigate: ReturnType<typeof vi.fn>) =>
  new URL(navigate.mock.calls[0]?.[0], "https://app.test");

describe("finishing", () => {
  it("returns the student home, naming the play, after sending its records", async () => {
    const { user, records, navigate } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(attemptsIn(records.stored)).toHaveLength(1);
    expect(endsIn(records.stored)).toEqual([
      expect.objectContaining({ ending: "finished" }),
    ]);
    const home = sentTo(navigate);
    expect(home.pathname).toBe("/play/");
    expect(home.searchParams.get("play")).toBe(records.stored[0]?.play);
  });

  it("reveals what the play earned once the student is back home", async () => {
    const { user, navigate, storage } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(navigate).toHaveBeenCalled());

    cleanup();
    const { spoken } = setUp({ path: sentTo(navigate).href, storage });
    const reveal = await screen.findByRole("dialog", {
      name: "You got something new!",
    });
    expect(
      within(reveal).getByRole("img", { name: "A new sticker" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual(["You got something new!"]));
  });

  it("returns a student who came by a teacher's game link home too", async () => {
    const { user, navigate } = setUp({ path: "/play/shell-check?join=G4" });
    await game();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(sentTo(navigate).pathname).toBe("/play/");
  });

  it("still leaves when attempts can't be sent, keeping them for next time", async () => {
    const { user, navigate, storage } = setUp({ offline: true });
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(storage.keys().some((k) => k.startsWith("play.outbox."))).toBe(true);
  });
});

describe("leaving", () => {
  const leave = () => screen.getByRole("button", { name: "Leave the game" });

  it("asks first, aloud, and keeps playing if the student says so", async () => {
    const { user, spoken, navigate } = setUp();
    await game();
    await user.click(leave());

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Do you want to stop playing?",
    );
    expect(spoken).toContain("Do you want to stop playing?");
    const keepPlaying = screen.getByRole("button", { name: "Keep playing" });
    expect(keepPlaying).toHaveFocus();

    await user.click(keepPlaying);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await game()).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps playing on Escape", async () => {
    const { user } = setUp();
    await game();
    await user.click(leave());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(leave()).toHaveFocus();
  });

  it("returns the student home, keeping their attempts", async () => {
    const { user, records, navigate } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Wrong" }));
    await user.click(leave());
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Leave the game",
      }),
    );

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(attemptsIn(records.stored)).toHaveLength(1);
    expect(endsIn(records.stored)).toEqual([
      expect.objectContaining({ ending: "left" }),
    ]);
    const home = sentTo(navigate);
    expect(home.pathname).toBe("/play/");
    expect(home.searchParams.get("play")).toBe(records.stored[0]?.play);
  });
});

describe("a game's sounds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.assign(window, { innerWidth: 1024, innerHeight: 768 });
  });

  /** A game open, its files loaded. */
  async function playing(storage?: KeyValueStore) {
    const audio = stubAudio();
    setUp({ storage });
    await screen.findByRole("button", { name: "Start" });
    // Browsers keep audio silent until a tap, so nothing starts before it.
    expect(audio.contexts).toEqual([]);
    await game();
    await act(() => audio.loaded());
    const context = audio.contexts[0];
    if (!context) throw new Error("no audio started on the tap");
    return context;
  }

  it("plays an effect when the game asks", async () => {
    const context = await playing();
    fireEvent.click(screen.getByRole("button", { name: "Play a sound" }));
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0]?.started).toBe(true);
  });

  it("lets the student turn off music and sounds, and back on, leaving the voice", async () => {
    const context = await playing();
    const master = context.gains[2];
    fireEvent.click(
      screen.getByRole("button", { name: "Turn off music and sounds" }),
    );
    expect(master?.gain.target).toBe(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Turn on music and sounds" }),
    );
    expect(master?.gain.target).toBe(1);
  });

  it("offers no such button in a game with no sounds", async () => {
    setUp({
      path: "/play/fraction-hop?class=class-1",
      signedIn: {
        ...student,
        classes: student.classes.map((m) => ({
          ...m,
          games: standInGames(["fraction-hop"]),
        })),
      },
    });
    await screen.findByRole("button", { name: "Start" });
    expect(
      screen.queryByRole("button", { name: "Turn off music and sounds" }),
    ).not.toBeInTheDocument();
  });

  it("remembers the choice for the next game", async () => {
    const storage = memoryStorage();
    await playing(storage);
    fireEvent.click(
      screen.getByRole("button", { name: "Turn off music and sounds" }),
    );
    cleanup();
    const context = await playing(storage);
    expect(
      screen.getByRole("button", { name: "Turn on music and sounds" }),
    ).toBeInTheDocument();
    expect(context.gains[2]?.gain.value).toBe(0);
  });

  it("lowers the music while the leave question is up", async () => {
    const context = await playing();
    const music = context.gains[1];
    fireEvent.click(screen.getByRole("button", { name: "Play music" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave the game" }));
    const ducked = music?.gain.target as number;
    fireEvent.click(
      await screen.findByRole("button", { name: "Keep playing" }),
    );
    expect(music?.gain.target).toBeGreaterThan(ducked);
  });

  it("pauses sound behind the too-small block, and picks it up after", async () => {
    const context = await playing();
    act(() => {
      Object.assign(window, { innerWidth: 390, innerHeight: 844 });
      window.dispatchEvent(new Event("resize"));
    });
    expect(context.state).toBe("suspended");
    act(() => {
      Object.assign(window, { innerWidth: 1024, innerHeight: 768 });
      window.dispatchEvent(new Event("resize"));
    });
    expect(context.state).toBe("running");
  });

  it("closes the audio when the student leaves the play", async () => {
    const context = await playing();
    cleanup();
    expect(context.state).toBe("closed");
  });
});

describe("a screen too small to play on", () => {
  const tooSmallLine = `This screen is too small for ${brandName}. Please use a tablet or a computer.`;

  /** Resizes the window, as rotating or dragging its edge does. */
  function resize(width: number, height: number) {
    act(() => {
      Object.assign(window, { innerWidth: width, innerHeight: height });
      window.dispatchEvent(new Event("resize"));
    });
  }

  afterEach(() => {
    // jsdom's own size, which every other test plays at.
    Object.assign(window, { innerWidth: 1024, innerHeight: 768 });
    Reflect.deleteProperty(navigator, "userActivation");
  });

  const block = () => screen.queryByRole("alertdialog", { hidden: true });

  it.each([
    ["a phone upright", 390, 844],
    ["a phone sideways", 844, 390],
  ])("blocks %s, saying why", async (_, width, height) => {
    resize(width, height);
    const { spoken } = setUp();
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      tooSmallLine,
    );
    expect(spoken).toEqual([tooSmallLine]);
  });

  it.each([
    ["an iPad mini upright", 744, 1133],
    ["an iPad mini sideways", 1133, 744],
    ["a Chromebook, under the browser's toolbars", 1366, 650],
  ])("lets %s through", async (_, width, height) => {
    resize(width, height);
    setUp();
    await screen.findByRole("button", { name: "Start" });
    expect(block()).not.toBeInTheDocument();
  });

  it("comes and goes as the screen changes, leaving the game where it was", async () => {
    const { user } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    expect(screen.getByText("1/2")).toBeInTheDocument();

    resize(844, 390);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    resize(1024, 768);
    expect(block()).not.toBeInTheDocument();
    expect(screen.getByTestId("tier")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("keeps input from the page underneath", async () => {
    const { user } = setUp();
    const start = await screen.findByRole("button", { name: "Start" });
    const heardKeys = vi.fn();
    window.addEventListener("keydown", heardKeys);
    try {
      resize(390, 844);
      expect(start.closest("[inert]")).not.toBeNull();
      // Focus is on the block, and its keys stop there.
      expect(screen.getByRole("alertdialog")).toContainElement(
        document.activeElement as HTMLElement,
      );
      await user.keyboard("{Escape}");
      // Keys aimed past the block stop too.
      fireEvent.keyDown(document.body, { key: "Escape" });
      expect(heardKeys).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", heardKeys);
    }
  });

  it("cuts off what's being said, and nothing else is said while it's up", async () => {
    const { user, spoken, cutOff } = setUp();
    await game();
    await user.click(
      screen.getByRole("button", { name: "Tap a button to send an attempt." }),
    );
    expect(spoken).toEqual(["Tap a button to send an attempt."]);

    resize(390, 844);
    expect(cutOff).toEqual(["Tap a button to send an attempt."]);
    expect(spoken.at(-1)).toBe(tooSmallLine);

    // The game says a line while blocked: dropped, not saved for later.
    fireEvent.click(
      screen.getByRole("button", {
        name: "Tap a button to send an attempt.",
        hidden: true,
      }),
    );
    resize(1024, 768);
    expect(spoken).toEqual(["Tap a button to send an attempt.", tooSmallLine]);
  });

  it("says its line on the first tap when the browser wouldn't play it yet", async () => {
    Object.defineProperty(navigator, "userActivation", {
      value: { hasBeenActive: false },
      configurable: true,
    });
    resize(390, 844);
    const { user, spoken } = setUp();
    const dialog = await screen.findByRole("alertdialog");
    await user.click(dialog);
    await user.click(dialog);
    expect(spoken).toEqual([tooSmallLine, tooSmallLine]);
  });
});
