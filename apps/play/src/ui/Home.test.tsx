// Home, joining a class and sign-in, rendered over the stand-ins: what
// a student sees, hears and can do.

import { catalogue, stickers } from "@repo/rewards";
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
  type HomePort,
  type Membership,
  NotAStudent,
  type SessionPort,
  type SignInButtonProps,
  type Student,
} from "../platform/ports.ts";
import {
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
  homePort = undefined as HomePort | undefined,
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
        url={new URL(path, "https://app.test")}
        base="/play/"
        platform={{
          name: "test",
          session: session ?? standInSession(storage),
          memberships: standInMemberships(storage, standInClasses(classGames)),
          home: homePort ?? standInHome(storage),
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

describe("home", () => {
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

  it("sends a signed-out student to sign-in, coming back home", async () => {
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
    expect(navigate).toHaveBeenCalledWith("https://app.test/play/");
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

  it("are revealed over home, said before home's own line", async () => {
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

  it("are put away with the tick, then home says what to do", async () => {
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
      expect((await standInHome(storage).current()).unseen).toEqual([]),
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

  it("aren't revealed again once put away", async () => {
    const { storage, user } = setUp({ beforeRender: earned });
    await user.click(await screen.findByRole("button", { name: "Done" }));
    cleanup();
    setUp({ storage, signedIn: null });
    expect(await screen.findByText("Pick a game to play.")).toBeInTheDocument();
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

  it("still opens home when what's there can't be read", async () => {
    const storage = memoryStorage();
    const home = standInHome(storage);
    vi.spyOn(home, "current").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    setUp({ storage, homePort: home });
    expect(await screen.findByText("Pick a game to play.")).toBeInTheDocument();
  });
});

describe("designing the avatar, the first time", () => {
  const newcomer = () => ({ ...studentIn(membership()), look: null });

  it("comes before home, says what to do, and has no way out but done", async () => {
    const { spoken } = setUp({ signedIn: newcomer() });
    const instruction = "Make your avatar! Pick each part, then tap the tick.";
    expect(await screen.findByText(instruction)).toBeInTheDocument();
    await waitFor(() => expect(spoken).toEqual([instruction]));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go home" }),
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

  it("shows each pick on the avatar at once, then keeps the look and opens home", async () => {
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
  it("opens from the student's avatar at home", async () => {
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
    await user.click(screen.getByRole("button", { name: "Go home" }));
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

  it("changes the outfit, keeps it, and goes back home", async () => {
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

describe("what's new in the wardrobe", () => {
  // Revealed at home already, but not seen in the wardrobe.
  const newPieces = (storage: KeyValueStore) =>
    standInGrant(storage, ["top-02", "hat-30", catalogue[0] ?? ""], {
      seen: true,
      wardrobeSeen: false,
    });

  // Names match exactly, so "Hats" is the slot and never "Hats 30".
  const slotButton = (name: string) => screen.getByRole("button", { name });

  const stillNew = async (storage: KeyValueStore) =>
    (await standInHome(storage).current()).newInWardrobe;

  it("stars each slot with a new piece in it until the student opens it", async () => {
    const { user } = setUp({ path: "/play/wardrobe", beforeRender: newPieces });
    // The wardrobe opens on Tops, so its new piece is already in view.
    expect(await screen.findByRole("button", { name: "Tops" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(slotButton("Hats, new")).toBeInTheDocument();
    for (const name of ["Skin", "Hair", "Pants and shorts", "Shoes"])
      expect(slotButton(name)).toBeInTheDocument();

    await user.click(slotButton("Hats, new"));
    expect(slotButton("Hats")).toHaveAttribute("aria-pressed", "true");
    await user.click(slotButton("Shoes"));
    expect(slotButton("Hats")).toBeInTheDocument();
  });

  it("stars a new piece while its slot is open, and not on the next visit", async () => {
    const { storage, user } = setUp({
      path: "/play/wardrobe",
      beforeRender: newPieces,
    });
    const tops = within(await screen.findByRole("list", { name: "Tops" }));
    expect(
      tops.getByRole("button", { name: "Tops 2, new" }),
    ).toBeInTheDocument();
    expect(tops.getByRole("button", { name: "Tops 1" })).toBeInTheDocument();

    await user.click(slotButton("Hats, new"));
    const hats = within(screen.getByRole("list", { name: "Hats" }));
    expect(
      hats.getByRole("button", { name: "Hats 30, new" }),
    ).toBeInTheDocument();
    // Still starred on going back to it, this visit.
    await user.click(slotButton("Tops"));
    await user.click(slotButton("Hats"));
    expect(
      within(screen.getByRole("list", { name: "Hats" })).getByRole("button", {
        name: "Hats 30, new",
      }),
    ).toBeInTheDocument();
    // Seen, though neither was worn.
    await waitFor(async () => expect(await stillNew(storage)).toEqual([]));
    await user.click(screen.getByRole("button", { name: "Go home" }));

    cleanup();
    setUp({ path: "/play/wardrobe", storage });
    expect(
      await within(
        await screen.findByRole("list", { name: "Tops" }),
      ).findByRole("button", { name: "Tops 2" }),
    ).toBeInTheDocument();
    expect(slotButton("Hats")).toBeInTheDocument();
  });

  it("takes a new piece's star away once the student puts it on", async () => {
    const { user } = setUp({ path: "/play/wardrobe", beforeRender: newPieces });
    await user.click(
      await screen.findByRole("button", { name: "Tops 2, new" }),
    );
    expect(screen.getByRole("button", { name: "Tops 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Taking it off again doesn't bring the star back.
    await user.click(screen.getByRole("button", { name: "Tops 1" }));
    expect(screen.getByRole("button", { name: "Tops 2" })).toBeInTheDocument();
    // Other new pieces keep theirs.
    await user.click(slotButton("Hats, new"));
    expect(
      screen.getByRole("button", { name: "Hats 30, new" }),
    ).toBeInTheDocument();
  });

  it("keeps a slot's star across a reload until the student opens it", async () => {
    const { storage } = setUp({
      path: "/play/wardrobe",
      beforeRender: newPieces,
    });
    await screen.findByRole("list", { name: "Tops" });
    await waitFor(async () =>
      expect(await stillNew(storage)).toEqual(["hat-30"]),
    );

    cleanup();
    setUp({ path: "/play/wardrobe", storage });
    await screen.findByRole("list", { name: "Tops" });
    expect(slotButton("Hats, new")).toBeInTheDocument();
  });

  it("marks nothing seen when nothing in the wardrobe is new", async () => {
    const storage = memoryStorage();
    standInGrant(storage, ["hat-30"]);
    const markSeenInWardrobe = vi.fn(async () => {});
    const { user } = setUp({
      path: "/play/wardrobe",
      storage,
      homePort: { ...standInHome(storage), markSeenInWardrobe },
    });
    await user.click(await screen.findByRole("button", { name: "Hats" }));
    expect(
      within(screen.getByRole("list", { name: "Hats" })).getByRole("button", {
        name: "Hats 30",
      }),
    ).toBeInTheDocument();
    expect(markSeenInWardrobe).not.toHaveBeenCalled();
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
      shellLines: { "pick-game": "https://app.test/pick-game.mp3" },
    });
    await waitFor(() =>
      expect(played).toEqual(["https://app.test/pick-game.mp3"]),
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
        "fraction-hop": "https://app.test/fraction-hop-title.mp3",
      },
    });
    await user.click(
      await screen.findByRole("button", { name: "Hear it: Fraction Hop" }),
    );
    expect(played).toEqual(["https://app.test/fraction-hop-title.mp3"]);
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
  it("joins the class, then opens home", async () => {
    const { navigate, storage } = setUp({
      path: "/play/join/G4",
      signedIn: studentIn(),
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/play/"));
    expect(standInStudent(storage)?.classes).toEqual([
      expect.objectContaining({ classId: "stand-in-G4", grade: 4 }),
    ]);
  });

  it("joins a split class with the grade left for home to ask", async () => {
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

  it("says aloud when no class has the code, with a way home", async () => {
    const { navigate, spoken, user } = setUp({ path: "/play/join/X1" });
    const line = "We couldn't find that class. Ask your teacher for the link.";
    expect(await screen.findByText(line)).toBeInTheDocument();
    expect(spoken).toContain(line);
    await user.click(screen.getByRole("button", { name: "Go home" }));
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
    expect(spoken).toContain("Sign in to play!");
  });

  it("remembers where the student was headed, since the trip through Google can't carry it", async () => {
    const { storage } = setUp({
      path: "/play/sign-in?next=%2Fplay%2Fjoin%2FK7QM4XRT",
      signedIn: null,
      SignInButton: button,
    });
    await screen.findByRole("button", { name: "Sign in with Google" });
    expect(storage.getItem("sign-in.next")).toBe('"/play/join/K7QM4XRT"');
  });

  it("goes on to the remembered page once Google brings the student back, then forgets it", async () => {
    const { navigate, storage } = setUp({
      path: "/play/sign-in",
      SignInButton: button,
      beforeRender: (s) => s.setItem("sign-in.next", '"/play/join/K7QM4XRT"'),
    });
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/play/join/K7QM4XRT"),
    );
    expect(storage.keys()).not.toContain("sign-in.next");
  });

  it("opens home when nothing was remembered", async () => {
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
});
