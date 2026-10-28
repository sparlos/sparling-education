// The shell end to end, through the real stand-in platform and the
// shell-check game: what a student can do, and what records come out.
import { UIProvider } from "@repo/ui/provider";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hosted } from "../games.ts";
import {
  type AvatarLook,
  NotAStudent,
  type PlayRecord,
  type Student,
} from "../platform/ports.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import { standInLocker } from "../platform/stand-ins/locker.ts";
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
import { memoryStorage } from "../test/memory-storage.ts";
import { App } from "./App.tsx";

const games = { "shell-check": hosted(() => import("../dev/shell-check.tsx")) };

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
} = {}) {
  const storage = memoryStorage();
  if (signedIn) standInSignIn(storage, signedIn);
  let isOffline = offline;
  const records = standInRecords({ offline: () => isOffline });
  const session = failSession
    ? { current: () => Promise.reject(new Error("offline")) }
    : teacher
      ? { current: () => Promise.reject(new NotAStudent()) }
      : standInSession(storage);
  const navigate = vi.fn();
  const spoken: string[] = [];
  let n = 0;
  render(
    <UIProvider>
      <App
        url={new URL(path, "https://kindling.test")}
        base="/play/"
        platform={{
          name: "test",
          session,
          locker: standInLocker(storage),
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
          return () => {};
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
        "https://kindling.test/play/shell-check?class=class-1",
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

  it("plays for the class the locker opened it for, at the student's grade in that class", async () => {
    const { user, records } = setUp({
      path: "/play/shell-check?class=class-2",
      signedIn: {
        ...student,
        classes: [
          ...student.classes,
          {
            classId: "class-2",
            className: "Math",
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

  it("sends a student with no class to play the game in to their locker", async () => {
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
      "https://kindling.test/play/shell-check?class=class-1",
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
        "https://kindling.test/play/shell-check?join=G34",
      ),
    );
    expect(spoken).toContain("Which grade are you in?");
    expect(
      standInStudent(storage)?.classes.find((m) => m.classId === "stand-in-G34")
        ?.grade,
    ).toBe(3);
  });

  it("says aloud when no class has its join code, with a way to the locker", async () => {
    const { user, navigate, spoken } = setUp({
      path: "/play/shell-check?join=X1",
    });
    const text = "We couldn't find that class. Ask your teacher for the link.";
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(spoken).toContain(text);
    await user.click(screen.getByRole("button", { name: "Go to your locker" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
  });

  it("says aloud when its class has the game turned off, with a way to the locker", async () => {
    const { user, navigate, spoken, records, storage } = setUp({
      path: "/play/shell-check?join=G4",
      classes: standInClasses([]),
    });
    const text = "That game is turned off for your class.";
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(spoken).toContain(text);
    // Still in the class, for its other games.
    expect(standInStudent(storage)?.classes).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Go to your locker" }));
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
});

/** Where the student was sent, as a URL. */
const sentTo = (navigate: ReturnType<typeof vi.fn>) =>
  new URL(navigate.mock.calls[0]?.[0], "https://kindling.test");

describe("finishing", () => {
  it("returns the student to their locker, naming the play, after sending its records", async () => {
    const { user, records, navigate } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(attemptsIn(records.stored)).toHaveLength(1);
    expect(endsIn(records.stored)).toEqual([
      expect.objectContaining({ ending: "finished" }),
    ]);
    const locker = sentTo(navigate);
    expect(locker.pathname).toBe("/play/");
    expect(locker.searchParams.get("play")).toBe(records.stored[0]?.play);
  });

  it("returns a student who came by a teacher's game link to their locker too", async () => {
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
    expect(
      storage.keys().some((k) => k.startsWith("kindling.play.outbox.")),
    ).toBe(true);
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

  it("returns the student to their locker, keeping their attempts", async () => {
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
    const locker = sentTo(navigate);
    expect(locker.pathname).toBe("/play/");
    expect(locker.searchParams.get("play")).toBe(records.stored[0]?.play);
  });
});
