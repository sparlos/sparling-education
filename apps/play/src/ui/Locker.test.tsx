// The locker, joining a class and sign-in, rendered over the stand-ins: what
// a student sees, hears and can do.
import { UIProvider } from "@repo/ui/provider";
import {
  cleanup,
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
  type Membership,
  NotAStudent,
  type SessionPort,
  type SignInButtonProps,
  type Student,
} from "../platform/ports.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import { standInGrant, standInLocker } from "../platform/stand-ins/locker.ts";
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
  shellLines = undefined as Record<string, string> | undefined,
  titleLines = undefined as Record<string, string> | undefined,
} = {}) {
  const storage = memoryStorage();
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
          locker: standInLocker(storage),
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
