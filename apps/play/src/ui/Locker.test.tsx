// The locker, joining a class and sign-in, rendered over the stand-ins: what
// a student sees, hears and can do.

import { catalogue, stickers } from "@repo/rewards";
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
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { hosted } from "../games.ts";
import {
  type LockerPort,
  type Membership,
  NotAStudent,
  type SessionPort,
  type SignInButtonProps,
  type Student,
} from "../platform/ports.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import {
  standInGrant,
  standInLocker,
  standInRecognise,
} from "../platform/stand-ins/locker.ts";
import {
  standInClasses,
  standInGames,
  standInMemberships,
} from "../platform/stand-ins/memberships.ts";
import { standInRecords } from "../platform/stand-ins/records.ts";
import {
  standInSession,
  standInSignIn,
  standInSignOut,
  standInStudent,
} from "../platform/stand-ins/session.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import { App } from "./App.tsx";

const games = {
  "shell-check": hosted(() => import("../dev/shell-check.tsx")),
  "fraction-hop": hosted(() => import("../dev/shell-check.tsx")),
};
const classGames = standInGames(["fraction-hop", "shell-check"]);

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    classId: "class-1",
    className: "Room 12",
    classColour: "teal",
    grades: [4],
    grade: 4,
    games: classGames,
    ...overrides,
  };
}

function studentIn(...classes: Membership[]): Student {
  return {
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
    classes,
  };
}

function setUp({
  path = "/play/",
  signedIn = studentIn(membership()) as Student | null,
  session = undefined as SessionPort | undefined,
  SignInButton = undefined as
    | ((props: SignInButtonProps) => ReactNode)
    | undefined,
  beforeRender = (_storage: KeyValueStore) => {},
  // This browser's storage, kept between visits.
  storage = memoryStorage(),
  lockerPort = undefined as LockerPort | undefined,
  shellLines = undefined as Record<string, string> | undefined,
  titleLines = undefined as Record<string, string> | undefined,
} = {}) {
  beforeRender(storage);
  if (signedIn) standInSignIn(storage, signedIn);
  const navigate = vi.fn();
  const spoken: string[] = [];
  render(
    <UIProvider>
      <App
        url={new URL(path, "https://kindling.test")}
        base="/play/"
        platform={{
          name: "test",
          session: session ?? standInSession(storage),
          memberships: standInMemberships(storage, standInClasses(classGames)),
          locker: lockerPort ?? standInLocker(storage),
          records: standInRecords(),
          links: standInLinks({ base: "/play/" }),
          SignInButton,
        }}
        games={games}
        storage={storage}
        navigate={navigate}
        newId={() => "id"}
        shellLines={shellLines}
        titleLines={titleLines}
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

describe("the locker", () => {
  it("lists the games of the student's class, and opens one for that class", async () => {
    setUp();
    const hop = await screen.findByRole("link", { name: "Fraction Hop" });
    expect(hop).toHaveAttribute("href", "/play/fraction-hop?class=class-1");
    expect(screen.getByRole("link", { name: "Shell Check" })).toHaveAttribute(
      "href",
      "/play/shell-check?class=class-1",
    );
  });

  it("says what to do, and says it again", async () => {
    const { spoken, user } = setUp();
    expect(await screen.findByText("Pick a game to play.")).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual(["Pick a game to play."]));
    await user.click(screen.getByRole("button", { name: "Hear it again" }));
    expect(spoken).toEqual(["Pick a game to play.", "Pick a game to play."]);
  });

  it("says the instruction again even after a game's name", async () => {
    const { spoken, user } = setUp();
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Fraction Hop" }),
    );
    await user.click(screen.getByRole("button", { name: "Hear it again" }));
    expect(spoken.at(-1)).toBe("Pick a game to play.");
  });

  it("speaks every game's name", async () => {
    const { spoken, user } = setUp();
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Fraction Hop" }),
    );
    expect(spoken).toContain("Fraction Hop");
  });

  it("lists the games of every class the student is in, under each class's spoken name", async () => {
    const { spoken, user } = setUp({
      signedIn: studentIn(
        membership(),
        membership({
          classId: "class-2",
          className: "Math",
          classColour: "teal",
          games: standInGames(["shell-check"]),
        }),
      ),
    });
    const math = await screen.findByRole("region", { name: "Math" });
    expect(
      within(math).getByRole("link", { name: "Shell Check" }),
    ).toHaveAttribute("href", "/play/shell-check?class=class-2");
    const room = screen.getByRole("region", { name: "Room 12" });
    expect(within(room).getAllByRole("link")).toHaveLength(2);
    await user.click(
      within(math).getByRole("button", { name: "Hear it: Math" }),
    );
    expect(spoken).toContain("Math");
  });

  it("shows each class in its own colour, with the same spoken labels", async () => {
    setUp({
      signedIn: studentIn(
        membership({ classColour: "teal" }),
        membership({
          classId: "class-2",
          className: "Math",
          classColour: "indigo",
          games: standInGames(["shell-check"]),
        }),
      ),
    });
    const math = await screen.findByRole("region", { name: "Math" });
    const room = screen.getByRole("region", { name: "Room 12" });
    expect(math).toHaveAttribute("data-class-colour", "indigo");
    expect(room).toHaveAttribute("data-class-colour", "teal");
    expect(
      within(math).getByRole("button", { name: "Hear it: Shell Check" }),
    ).toBeInTheDocument();
  });

  it("leaves out games the class has turned off, and games this shell can't host", async () => {
    setUp({
      signedIn: studentIn(
        membership({ games: standInGames(["shell-check", "not-built-yet"]) }),
      ),
    });
    expect(
      await screen.findByRole("link", { name: "Shell Check" }),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("list")).getAllByRole("link")).toHaveLength(
      1,
    );
  });

  it("tells a student in no class to ask their teacher, aloud", async () => {
    const { spoken } = setUp({ signedIn: studentIn() });
    expect(
      await screen.findByText("Ask your teacher for your class link."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(spoken).toEqual(["Ask your teacher for your class link."]),
    );
  });

  it("shows the student's avatar", async () => {
    setUp();
    expect(
      await screen.findByRole("img", { name: "Your avatar" }),
    ).toBeInTheDocument();
  });

  it("sends a signed-out student to sign-in, coming back to the locker", async () => {
    const { navigate } = setUp({ signedIn: null });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/play/__stand-in/sign-in?next=%2Fplay%2F",
      ),
    );
  });

  it("offers to try again when the session can't be checked", async () => {
    const { navigate, user } = setUp({
      session: { current: () => Promise.reject(new Error("offline")) },
    });
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    expect(navigate).toHaveBeenCalledWith("https://kindling.test/play/");
  });

  it("tells a teacher, aloud, that it's for students", async () => {
    const { spoken, navigate } = setUp({
      session: { current: () => Promise.reject(new NotAStudent()) },
    });
    const line = "This is for students. Teachers, use the teacher app.";
    expect(await screen.findByText(line)).toBeInTheDocument();
    expect(spoken).toContain(line);
    expect(navigate).not.toHaveBeenCalled();
  });
});

/** The item worn in each slot of an avatar drawing. */
function worn(avatar: HTMLElement) {
  return Object.fromEntries(
    [...avatar.querySelectorAll("[data-slot]")].map((el) => [
      el.getAttribute("data-slot"),
      el.getAttribute("data-item"),
    ]),
  );
}

describe("new rewards", () => {
  const [sticker = "", top = ""] = catalogue;
  const earned = (storage: KeyValueStore) =>
    standInGrant(storage, [sticker, top], { seen: false });

  it("are revealed over the locker, said before the locker's own line", async () => {
    const { spoken } = setUp({ path: "/play/?play=p1", beforeRender: earned });
    const reveal = await screen.findByRole("dialog", {
      name: "You got something new!",
    });
    expect(
      within(reveal).getByRole("img", { name: "A new sticker" }),
    ).toBeInTheDocument();
    expect(
      within(reveal).getByRole("img", { name: "Something new to wear" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual(["You got something new!"]));
    expect(screen.getByRole("main")).toHaveAttribute("inert");
  });

  it("are put away with the tick, then the locker says what to do", async () => {
    const { spoken, storage, user } = setUp({ beforeRender: earned });
    await user.click(
      await within(
        await screen.findByRole("dialog", { name: "You got something new!" }),
      ).findByRole("button", { name: "Done" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(spoken).toEqual([
        "You got something new!",
        "Pick a game to play.",
      ]),
    );
    await waitFor(async () =>
      expect((await standInLocker(storage).current()).unseen).toEqual([]),
    );
  });

  it("stay new across a reload until they're put away", async () => {
    const { storage } = setUp({ beforeRender: earned });
    await screen.findByRole("dialog", { name: "You got something new!" });
    cleanup();
    setUp({ storage, signedIn: null });
    expect(
      await screen.findByRole("dialog", { name: "You got something new!" }),
    ).toBeInTheDocument();
  });

  it("aren't revealed again once put away, and stickers stay in the locker", async () => {
    const { storage, user } = setUp({ beforeRender: earned });
    await user.click(await screen.findByRole("button", { name: "Done" }));
    cleanup();
    setUp({ storage, signedIn: null });
    const stickers = await screen.findByRole("region", {
      name: "Your stickers",
    });
    expect(
      stickers.querySelector(`[data-sticker="${sticker}"]`),
    ).not.toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("show nothing when a play earned nothing, saying nothing about limits", async () => {
    const { spoken } = setUp({
      path: "/play/?play=p1",
      beforeRender: (storage) => standInGrant(storage, [sticker]),
    });
    expect(await screen.findByText("Pick a game to play.")).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual(["Pick a game to play."]));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("say how to stick stickers on, from the stickers' heading", async () => {
    const { spoken, user } = setUp({
      beforeRender: (storage) => standInGrant(storage, [sticker]),
    });
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Your stickers" }),
    );
    expect(spoken).toContain(
      "Tap a sticker, then tap your locker to stick it on.",
    );
  });

  it("still opens the locker when its contents can't be read", async () => {
    const storage = memoryStorage();
    const locker = standInLocker(storage);
    vi.spyOn(locker, "current").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setUp({ storage, lockerPort: locker });
    expect(await screen.findByText("Pick a game to play.")).toBeInTheDocument();
  });
});

describe("designing the avatar, the first time", () => {
  const newcomer = () => ({ ...studentIn(membership()), look: null });

  it("comes before the locker, says what to do, and has no way out but done", async () => {
    const { spoken } = setUp({ signedIn: newcomer() });
    const instruction = "Make your avatar! Pick each part, then tap the tick.";
    expect(await screen.findByText(instruction)).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual([instruction]));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go to your locker" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("comes before picking a grade in a split class", async () => {
    setUp({
      signedIn: {
        ...newcomer(),
        classes: [membership({ grades: [3, 4], grade: null })],
      },
    });
    expect(await screen.findByRole("button", { name: "Done" })).toBeVisible();
    expect(
      screen.queryByText("Which grade are you in?"),
    ).not.toBeInTheDocument();
  });

  it("says each part's name as the student picks it", async () => {
    const { spoken, user } = setUp({ signedIn: newcomer() });
    await user.click(await screen.findByRole("button", { name: "Hair" }));
    expect(spoken.at(-1)).toBe("Hair");
    await user.click(screen.getByRole("button", { name: "Shoes" }));
    expect(spoken.at(-1)).toBe("Shoes");
  });

  it("shows each pick on the avatar at once, then keeps the look and opens the locker", async () => {
    const { storage, user } = setUp({ signedIn: newcomer() });
    await user.click(await screen.findByRole("button", { name: "Skin 12" }));
    await user.click(screen.getByRole("button", { name: "Hair" }));
    await user.click(screen.getByRole("button", { name: "Hair 40" }));
    const avatar = screen.getByRole("img", { name: "Your avatar" });
    expect(worn(avatar)).toMatchObject({ body: "skin-12", hair: "hair-40" });
    expect(screen.getByRole("button", { name: "Hair 40" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(
      await screen.findByRole("link", { name: "Fraction Hop" }),
    ).toBeInTheDocument();
    expect(
      worn(screen.getByRole("img", { name: "Your avatar" })),
    ).toMatchObject({ body: "skin-12", hair: "hair-40" });
    expect(standInStudent(storage)?.look).toMatchObject({
      body: "skin-12",
      hair: "hair-40",
    });
  });

  it("offers every skin tone and hairstyle", async () => {
    const { user } = setUp({ signedIn: newcomer() });
    const skins = within(await screen.findByRole("list", { name: "Skin" }));
    expect(skins.getAllByRole("button")).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Hair" }));
    const hair = within(screen.getByRole("list", { name: "Hair" }));
    expect(hair.getAllByRole("button")).toHaveLength(62);
  });

  it("starts each student from a look of their own", async () => {
    setUp({ signedIn: newcomer() });
    const one = worn(await screen.findByRole("img", { name: "Your avatar" }));
    cleanup();
    setUp({ signedIn: { ...newcomer(), id: "student-2" } });
    const two = worn(await screen.findByRole("img", { name: "Your avatar" }));
    expect(one).not.toEqual(two);
  });
});

describe("the wardrobe", () => {
  it("opens from the student's avatar in the locker", async () => {
    setUp();
    expect(
      await screen.findByRole("link", { name: "Change your clothes" }),
    ).toHaveAttribute("href", "/play/wardrobe");
  });

  it("says what to do, and offers a way back without changing anything", async () => {
    const { navigate, spoken, storage, user } = setUp({
      path: "/play/wardrobe",
    });
    const instruction = "Pick what to wear, then tap the tick.";
    expect(await screen.findByText(instruction)).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual([instruction]));
    await user.click(screen.getByRole("button", { name: "Tops 1" }));
    await user.click(screen.getByRole("button", { name: "Go to your locker" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
    expect(standInStudent(storage)?.look).toEqual(studentIn().look);
  });

  it("shows only the outfit pieces the student owns, and no hat", async () => {
    const { user } = setUp({ path: "/play/wardrobe" });
    await user.click(await screen.findByRole("button", { name: "Hats" }));
    const hats = within(screen.getByRole("list", { name: "Hats" }));
    expect(hats.getAllByRole("button").map((b) => b.ariaLabel)).toEqual([
      "No hat",
      "Hats 1",
      "Hats 7",
    ]);
  });

  it("offers a reward the student owns beside the base set", async () => {
    const { user } = setUp({
      path: "/play/wardrobe",
      beforeRender: (storage) => standInGrant(storage, ["hat-30"]),
    });
    await user.click(await screen.findByRole("button", { name: "Hats" }));
    expect(
      within(screen.getByRole("list", { name: "Hats" })).getByRole("button", {
        name: "Hats 30",
      }),
    ).toBeInTheDocument();
  });

  it("changes the outfit, keeps it, and goes back to the locker", async () => {
    const { navigate, storage, user } = setUp({ path: "/play/wardrobe" });
    await user.click(await screen.findByRole("button", { name: "Tops 1" }));
    await user.click(screen.getByRole("button", { name: "Hats" }));
    await user.click(screen.getByRole("button", { name: "No hat" }));
    expect(
      worn(screen.getByRole("img", { name: "Your avatar" })),
    ).not.toHaveProperty("hat");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
    expect(standInStudent(storage)?.look).toEqual({
      ...studentIn().look,
      top: "top-01",
      hat: null,
    });
  });

  it("offers to try again when the look can't be saved", async () => {
    const { storage, user } = setUp({ path: "/play/wardrobe" });
    await screen.findByRole("button", { name: "Done" });
    // Signed out meanwhile, so saving fails.
    standInSignOut(storage);
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});

describe("the shell's recorded lines", () => {
  it("plays a line's recording when it has one, and speaks names with the browser", async () => {
    const played: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      played.push(this.src);
      this.dispatchEvent(new Event("ended"));
      return Promise.resolve();
    });
    const { spoken, user } = setUp({
      shellLines: { "pick-game": "https://kindling.test/pick-game.mp3" },
    });
    await waitFor(() =>
      expect(played).toEqual(["https://kindling.test/pick-game.mp3"]),
    );
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Fraction Hop" }),
    );
    expect(spoken).toEqual(["Fraction Hop"]);
  });
});

describe("game titles", () => {
  it("plays a game's recorded title, and says one without a recording with the browser", async () => {
    const played: string[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      played.push(this.src);
      this.dispatchEvent(new Event("ended"));
      return Promise.resolve();
    });
    const { spoken, user } = setUp({
      titleLines: {
        "fraction-hop": "https://kindling.test/fraction-hop-title.mp3",
      },
    });
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Fraction Hop" }),
    );
    expect(played).toEqual(["https://kindling.test/fraction-hop-title.mp3"]);
    await user.click(
      screen.getByRole("button", { name: "Hear it: Shell Check" }),
    );
    expect(spoken.at(-1)).toBe("Shell Check");
  });
});

describe("picking a grade in a split class", () => {
  const split = () => studentIn(membership({ grades: [3, 4, 5], grade: null }));

  it("asks aloud, with a big button for each of the class's grades", async () => {
    const { spoken } = setUp({ signedIn: split() });
    expect(
      await screen.findByRole("heading", { name: "Which grade are you in?" }),
    ).toBeInTheDocument();
    for (const grade of [3, 4, 5])
      expect(
        screen.getByRole("button", { name: `Grade ${grade}` }),
      ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual(["Which grade are you in?"]));
  });

  it("asks back the grade tapped, and sets it when the student taps the smiley", async () => {
    const { spoken, storage, user } = setUp({ signedIn: split() });
    await user.click(await screen.findByRole("button", { name: "Grade 5" }));
    const question = screen.getByRole("dialog", {
      name: "Are you in Grade 5?",
    });
    await waitFor(() => expect(spoken).toContain("Are you in Grade 5?"));
    expect(standInStudent(storage)?.classes[0]?.grade).toBeNull();
    const yes = within(question).getByRole("button", { name: "Yes" });
    expect(yes).toHaveFocus();
    await user.click(yes);
    expect(
      await screen.findByRole("link", { name: "Fraction Hop" }),
    ).toBeInTheDocument();
    expect(standInStudent(storage)?.classes).toEqual([
      expect.objectContaining({ classId: "class-1", grade: 5 }),
    ]);
  });

  it("sets nothing on the sad face, and asks the grade again", async () => {
    const { spoken, storage, user } = setUp({ signedIn: split() });
    await user.click(await screen.findByRole("button", { name: "Grade 3" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "No" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(spoken.at(-1)).toBe("Which grade are you in?"));
    expect(standInStudent(storage)?.classes[0]?.grade).toBeNull();
  });

  it("sets nothing on Escape", async () => {
    const { storage, user } = setUp({ signedIn: split() });
    await user.click(await screen.findByRole("button", { name: "Grade 3" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade 3" })).toHaveFocus();
    expect(standInStudent(storage)?.classes[0]?.grade).toBeNull();
  });

  it("isn't asked in a single-grade class", async () => {
    setUp();
    await screen.findByRole("link", { name: "Fraction Hop" });
    expect(
      screen.queryByText("Which grade are you in?"),
    ).not.toBeInTheDocument();
  });
});

describe("the class join link", () => {
  it("joins the class, then opens the locker", async () => {
    const { navigate, storage } = setUp({
      path: "/play/join/G4",
      signedIn: studentIn(),
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
    expect(standInStudent(storage)?.classes).toEqual([
      expect.objectContaining({ classId: "stand-in-G4", grade: 4 }),
    ]);
  });

  it("joins a split class with the grade left for the locker to ask", async () => {
    const { navigate, storage } = setUp({
      path: "/play/join/G45",
      signedIn: studentIn(),
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
    expect(standInStudent(storage)?.classes).toEqual([
      expect.objectContaining({ grades: [4, 5], grade: null }),
    ]);
  });

  it("sends a signed-out student to sign-in, coming back to the join link", async () => {
    const { navigate } = setUp({ path: "/play/join/G4", signedIn: null });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/play/__stand-in/sign-in?next=%2Fplay%2Fjoin%2FG4",
      ),
    );
  });

  it("says aloud when no class has the code, with a way to the locker", async () => {
    const { navigate, spoken, user } = setUp({ path: "/play/join/X1" });
    const line = "We couldn't find that class. Ask your teacher for the link.";
    expect(await screen.findByText(line)).toBeInTheDocument();
    expect(spoken).toContain(line);
    await user.click(screen.getByRole("button", { name: "Go to your locker" }));
    expect(navigate).toHaveBeenCalledWith("/play/");
  });

  it("doesn't join a teacher", async () => {
    setUp({
      path: "/play/join/G4",
      session: { current: () => Promise.reject(new NotAStudent()) },
    });
    expect(
      await screen.findByText(
        "This is for students. Teachers, use the teacher app.",
      ),
    ).toBeInTheDocument();
  });
});

describe("sign-in", () => {
  const button = ({ onUnavailable }: SignInButtonProps) => (
    <button type="button" onClick={onUnavailable}>
      Sign in with Google
    </button>
  );

  it("asks a signed-out student to sign in, aloud, with Google's button", async () => {
    const { spoken } = setUp({
      path: "/play/sign-in?next=%2Fplay%2Fjoin%2FK7QM4XRT",
      signedIn: null,
      SignInButton: button,
    });
    expect(
      await screen.findByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
    expect(spoken).toContain("Sign in to play.");
  });

  it("remembers where the student was headed, since the trip through Google can't carry it", async () => {
    const { storage } = setUp({
      path: "/play/sign-in?next=%2Fplay%2Fjoin%2FK7QM4XRT",
      signedIn: null,
      SignInButton: button,
    });
    await screen.findByRole("button", { name: "Sign in with Google" });
    expect(storage.getItem("kindling.sign-in.next")).toBe(
      '"/play/join/K7QM4XRT"',
    );
  });

  it("goes on to the remembered page once Google brings the student back, then forgets it", async () => {
    const { navigate, storage } = setUp({
      path: "/play/sign-in",
      SignInButton: button,
      beforeRender: (s) =>
        s.setItem("kindling.sign-in.next", '"/play/join/K7QM4XRT"'),
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/play/join/K7QM4XRT"),
    );
    expect(storage.keys()).not.toContain("kindling.sign-in.next");
  });

  it("opens the locker when nothing was remembered", async () => {
    const { navigate } = setUp({ path: "/play/sign-in", SignInButton: button });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
  });

  it("returns to the join link the student came from, after Google", async () => {
    const { navigate } = setUp({
      path: "/play/sign-in?next=%2Fplay%2Fjoin%2FK7QM4XRT",
      SignInButton: button,
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/play/join/K7QM4XRT"),
    );
  });

  it.each(["https://evil.example/play/", "//evil.example/play/", "/teach/"])(
    "never sends the student off the shell, for %j",
    async (next) => {
      const { navigate } = setUp({
        path: `/play/sign-in?${new URLSearchParams({ next })}`,
        SignInButton: button,
      });
      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
    },
  );

  it("says aloud when sign-in didn't work, and offers it again", async () => {
    const { spoken } = setUp({
      path: "/play/sign-in?failed",
      signedIn: null,
      SignInButton: button,
    });
    expect(
      await screen.findByRole("button", { name: "Sign in with Google" }),
    ).toBeInTheDocument();
    expect(spoken).toContain("That didn't work. Let's try again.");
  });

  it("says when Google's sign-in can't be offered", async () => {
    const { user } = setUp({
      path: "/play/sign-in",
      signedIn: null,
      SignInButton: button,
    });
    await user.click(
      await screen.findByRole("button", { name: "Sign in with Google" }),
    );
    expect(
      await screen.findByText(
        "Signing in isn't working right now. Ask your teacher for help.",
      ),
    ).toBeInTheDocument();
  });
});

/** The locker the student sticks stickers on, measured as 400 × 200 px. */
async function lockerBoard() {
  const board = await screen.findByRole("group", { name: "Your locker" });
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 400,
    bottom: 200,
    width: 400,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return board;
}

const tray = () => screen.getByRole("list", { name: "Your stickers" });

describe("stickers on the locker", () => {
  const [first = "", second = ""] = stickers.map((s) => s.id);
  const owning = (storage: KeyValueStore) =>
    standInGrant(storage, [first, second]);

  async function placed(storage: KeyValueStore) {
    return (await standInLocker(storage).current()).placements;
  }

  it("sticks a sticker where the student taps, saying what to do", async () => {
    const { spoken, storage, user } = setUp({ beforeRender: owning });
    const board = await lockerBoard();
    await user.click(
      within(tray()).getAllByRole("button", {
        name: "A sticker",
      })[0] as HTMLElement,
    );
    expect(spoken).toContain("Tap your locker to stick it there.");
    await user.pointer({
      keys: "[MouseLeft]",
      target: within(board).getByRole("button", { name: "Stick it here" }),
      coords: { clientX: 100, clientY: 150 },
    });
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, x: 0.25, y: 0.75 },
      ]),
    );
    const stuck = within(board).getByRole("button", { name: "A sticker" });
    expect(stuck.querySelector(`[data-sticker="${first}"]`)).not.toBeNull();
    expect(stuck).toHaveStyle({ left: "25%", top: "75%" });
    expect(tray().querySelector(`[data-sticker="${first}"]`)).toBeNull();
  });

  it("keeps stickers on the locker after a reload", async () => {
    const { storage } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        void standInLocker(storage).place([
          { sticker: second, x: 0.5, y: 0.4 },
        ]);
      },
    });
    const board = await lockerBoard();
    cleanup();
    setUp({ storage, signedIn: null });
    const again = await screen.findByRole("group", { name: "Your locker" });
    expect(board).not.toBe(again);
    const stuck = within(again).getByRole("button", { name: "A sticker" });
    expect(stuck.querySelector(`[data-sticker="${second}"]`)).not.toBeNull();
    expect(stuck).toHaveStyle({ left: "50%", top: "40%" });
  });

  it("moves a sticker on the locker, putting it on top", async () => {
    const { spoken, storage, user } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        void standInLocker(storage).place([
          { sticker: first, x: 0.5, y: 0.5 },
          { sticker: second, x: 0.6, y: 0.5 },
        ]);
      },
    });
    const board = await lockerBoard();
    const [one] = within(board).getAllByRole("button", { name: "A sticker" });
    await user.click(one as HTMLElement);
    expect(spoken).toContain("Tap where to move it, or put it back.");
    await user.pointer({
      keys: "[MouseLeft]",
      target: within(board).getByRole("button", { name: "Stick it here" }),
      coords: { clientX: 300, clientY: 100 },
    });
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: second, x: 0.6, y: 0.5 },
        { sticker: first, x: 0.75, y: 0.5 },
      ]),
    );
  });

  it("keeps a sticker wholly on the locker, near its edge", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    const board = await lockerBoard();
    await user.click(
      within(tray()).getAllByRole("button", {
        name: "A sticker",
      })[0] as HTMLElement,
    );
    await user.pointer({
      keys: "[MouseLeft]",
      target: within(board).getByRole("button", { name: "Stick it here" }),
      coords: { clientX: 2, clientY: 199 },
    });
    // A 64 px sticker's centre is at least 32 px in.
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, x: 32 / 400, y: 1 - 32 / 200 },
      ]),
    );
  });

  it("takes a sticker off the locker, back to the others", async () => {
    const { storage, user } = setUp({
      beforeRender: (storage) => {
        owning(storage);
        void standInLocker(storage).place([{ sticker: first, x: 0.5, y: 0.5 }]);
      },
    });
    const board = await lockerBoard();
    await user.click(within(board).getByRole("button", { name: "A sticker" }));
    await user.click(screen.getByRole("button", { name: "Put it back" }));
    await waitFor(async () => expect(await placed(storage)).toEqual([]));
    expect(tray().querySelector(`[data-sticker="${first}"]`)).not.toBeNull();
    expect(
      within(board).queryByRole("button", { name: "A sticker" }),
    ).not.toBeInTheDocument();
  });

  it("puts a sticker down again when it's tapped twice, or with Escape", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    const board = await lockerBoard();
    const [loose] = within(tray()).getAllByRole("button", {
      name: "A sticker",
    });
    await user.click(loose as HTMLElement);
    expect(loose).toHaveAttribute("aria-pressed", "true");
    await user.click(loose as HTMLElement);
    expect(loose).toHaveAttribute("aria-pressed", "false");
    await user.click(loose as HTMLElement);
    await user.keyboard("{Escape}");
    expect(
      within(board).queryByRole("button", { name: "Stick it here" }),
    ).not.toBeInTheDocument();
    expect(await placed(storage)).toEqual([]);
  });

  it("sticks one on from the keyboard, in the middle", async () => {
    const { storage, user } = setUp({ beforeRender: owning });
    await lockerBoard();
    (
      within(tray()).getAllByRole("button", {
        name: "A sticker",
      })[0] as HTMLElement
    ).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Stick it here" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, x: 0.5, y: 0.5 },
      ]),
    );
  });

  it("drags a sticker onto the locker, and off it again", async () => {
    const { storage } = setUp({ beforeRender: owning });
    const board = await lockerBoard();
    const [loose] = within(tray()).getAllByRole("button", {
      name: "A sticker",
    });
    const at = (clientX: number, clientY: number) => ({
      button: 0,
      pointerId: 1,
      clientX,
      clientY,
    });
    fireEvent.pointerDown(loose as HTMLElement, at(10, 300));
    fireEvent.pointerMove(loose as HTMLElement, at(100, 250));
    fireEvent.pointerUp(loose as HTMLElement, at(200, 100));
    await waitFor(async () =>
      expect(await placed(storage)).toEqual([
        { sticker: first, x: 0.5, y: 0.5 },
      ]),
    );
    const stuck = within(board).getByRole("button", { name: "A sticker" });
    fireEvent.pointerDown(stuck, at(200, 100));
    fireEvent.pointerMove(stuck, at(200, 180));
    fireEvent.pointerUp(stuck, at(200, 400));
    await waitFor(async () => expect(await placed(storage)).toEqual([]));
  });

  it("goes back to what's saved when a change can't be saved", async () => {
    const storage = memoryStorage();
    owning(storage);
    const locker = standInLocker(storage);
    vi.spyOn(locker, "place").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = setUp({ storage, lockerPort: locker });
    const board = await lockerBoard();
    await user.click(
      within(tray()).getAllByRole("button", {
        name: "A sticker",
      })[0] as HTMLElement,
    );
    await user.click(
      within(board).getByRole("button", { name: "Stick it here" }),
    );
    await waitFor(() =>
      expect(
        within(board).queryByRole("button", { name: "A sticker" }),
      ).not.toBeInTheDocument(),
    );
    expect(tray().querySelector(`[data-sticker="${first}"]`)).not.toBeNull();
  });
});

describe("recognition from a teacher", () => {
  const recognised = (storage: KeyValueStore) =>
    standInRecognise(storage, "kindness");

  it("is revealed as new, said by name, and stands out from earned stickers", async () => {
    const { spoken } = setUp({
      beforeRender: (storage) => {
        standInGrant(storage, [stickers[0]?.id ?? ""], { seen: false });
        recognised(storage);
      },
    });
    const reveal = await screen.findByRole("dialog", {
      name: "You got something new!",
    });
    const recognition = within(reveal).getByRole("img", {
      name: "Your teacher gave you a sticker for kindness!",
    });
    expect(recognition).toHaveAttribute("data-recognition", "kindness");
    expect(recognition.closest("li")).toHaveAttribute("data-recognition");
    const earned = within(reveal).getByRole("img", { name: "A new sticker" });
    expect(earned).not.toHaveAttribute("data-recognition");
    expect(earned.closest("li")).not.toHaveAttribute("data-recognition");
    await waitFor(() =>
      expect(spoken).toEqual([
        "You got something new! Your teacher gave you a sticker for kindness!",
      ]),
    );
  });

  it("goes in with the student's stickers, to stick on the locker", async () => {
    const { storage, user } = setUp({ beforeRender: recognised });
    await user.click(await screen.findByRole("button", { name: "Done" }));
    await waitFor(async () =>
      expect((await standInLocker(storage).current()).unseen).toEqual([]),
    );
    const board = await lockerBoard();
    await user.click(
      within(tray()).getByRole("button", {
        name: "Your teacher gave you a sticker for kindness!",
      }),
    );
    await user.pointer({
      keys: "[MouseLeft]",
      target: within(board).getByRole("button", { name: "Stick it here" }),
      coords: { clientX: 200, clientY: 100 },
    });
    await waitFor(async () =>
      expect((await standInLocker(storage).current()).placements).toEqual([
        { sticker: "recognition-kindness", x: 0.5, y: 0.5 },
      ]),
    );
  });
});
