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
import type { PlayRecord, Student } from "../platform/ports.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import {
  standInSession,
  standInSignIn,
} from "../platform/stand-ins/session.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { App } from "./App.tsx";

const games = { "shell-check": hosted(() => import("../dev/shell-check.tsx")) };

// Send almost at once, and never retry on a timer, so only the shell's own
// triggers (the connection coming back, finishing) can send after a failure.
const outboxTiming = { batchDelayMs: 10, retryDelaysMs: [60_000] };

const student: Student = {
  id: "student-1",
  grade: 4,
  locale: "en-CA",
  look: { body: "sky", eyes: "sparkle", headwear: "crown" },
  classId: "class-1",
};

function setUp({
  path = "/play/shell-check?portal=north",
  signedIn = student as Student | null,
  offline = false,
  failSession = false,
} = {}) {
  const storage = memoryStorage();
  if (signedIn) standInSignIn(storage, signedIn);
  let isOffline = offline;
  const records = standInRecords({ offline: () => isOffline });
  const session = failSession
    ? { current: () => Promise.reject(new Error("offline")) }
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
        "/play/__stand-in/sign-in?next=%2Fplay%2Fshell-check%3Fportal%3Dnorth",
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
    setUp({ signedIn: { ...student, grade: 3 } });
    expect(await game()).toHaveTextContent("g3");
  });

  it("gives a student outside the game's grades the closest tier", async () => {
    setUp({ signedIn: { ...student, grade: 7 } });
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
    expect(items).toEqual({ body: "sky", eyes: "sparkle", headwear: "crown" });
    expect(avatar).toHaveAttribute("data-expression", "neutral");
    await user.click(screen.getByRole("button", { name: "Wrong" }));
    expect(avatar).toHaveAttribute("data-expression", "encouraging");
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
      "https://kindling.test/play/shell-check?portal=north",
    );
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

describe("finishing", () => {
  it("returns a student who came through a portal to it, after sending the play's records", async () => {
    const { user, records, navigate } = setUp();
    await game();
    await user.click(screen.getByRole("button", { name: "Right" }));
    await user.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(attemptsIn(records.stored)).toHaveLength(1);
    expect(endsIn(records.stored)).toEqual([
      expect.objectContaining({ ending: "finished" }),
    ]);
    const hub = new URL(navigate.mock.calls[0]?.[0], "https://kindling.test");
    expect(hub.pathname).toBe("/play/__stand-in/hub");
    expect(hub.searchParams.get("portal")).toBe("north");
    expect(hub.searchParams.get("play")).toBe(records.stored[0]?.play);
  });

  it("shows game complete for a game link opened directly, and can play again", async () => {
    const { user, navigate, spoken } = setUp({ path: "/play/shell-check" });
    await game();
    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(await screen.findByText("Well done!")).toBeInTheDocument();
    expect(spoken).toContain("Well done!");
    await user.click(screen.getByRole("button", { name: "Play again" }));
    expect(navigate).toHaveBeenCalledWith("/play/shell-check");
  });

  it("shows game complete for a student who isn't in a class", async () => {
    const { user, navigate } = setUp({
      signedIn: { ...student, classId: null },
    });
    await game();
    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByText("Well done!")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
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
  });

  it("returns a student who came through a portal to it, keeping their attempts", async () => {
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
    expect(
      new URL(
        navigate.mock.calls[0]?.[0],
        "https://kindling.test",
      ).searchParams.get("portal"),
    ).toBe("north");
  });

  it("says goodbye, not well done, for a game link opened directly", async () => {
    const { user, spoken } = setUp({ path: "/play/shell-check" });
    await game();
    await user.click(leave());
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Leave the game",
      }),
    );

    expect(await screen.findByText("See you next time!")).toBeInTheDocument();
    expect(screen.queryByText("Well done!")).not.toBeInTheDocument();
    expect(spoken).toContain("See you next time!");
    expect(
      screen.getByRole("button", { name: "Play again" }),
    ).toBeInTheDocument();
  });
});
