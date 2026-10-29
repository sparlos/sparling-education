import { defaultLook } from "@repo/avatar";
import { catalogue } from "@repo/rewards";
import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../test/memory-storage.ts";
import {
  lockerPortContract,
  playRecordsPortContract,
  sampleAttempt,
  sampleEnd,
  sessionPortContract,
} from "../contract.ts";
import type { Student } from "../ports.ts";
import { standInLinks } from "./links.ts";
import { standInEarn, standInGrant, standInLocker } from "./locker.ts";
import {
  type StandInClass,
  standInClasses,
  standInGames,
  standInMemberships,
} from "./memberships.ts";
import { standInRecords } from "./records.ts";
import { standInSession, standInSignIn, standInSignOut } from "./session.ts";

playRecordsPortContract("Stand-in attempts", () => {
  const port = standInRecords();
  return { port, stored: async () => port.stored };
});

const games = standInGames(["fraction-hop"]);

// Classes made by the harness, by join code, as a teacher would make them.
const made = new Map<string, StandInClass>();
let classes = 0;

sessionPortContract("Stand-in session", {
  signedOut: () => standInSession(memoryStorage()),
  newStudent: () => {
    const storage = memoryStorage();
    standInSignIn(storage, newStudent());
    return {
      session: standInSession(storage),
      memberships: standInMemberships(
        storage,
        (code) => made.get(code) ?? null,
      ),
    };
  },
  newClass: async (className, grades) => {
    classes += 1;
    const joinCode = `CODE${classes}`;
    const classId = `class-${classes}`;
    made.set(joinCode, { classId, className, grades, games });
    return { classId, joinCode };
  },
});

lockerPortContract("Stand-in locker", {
  newStudent: () => {
    const storage = memoryStorage();
    standInSignIn(storage, newStudent());
    const records = standInRecords({
      onStored: (fresh) => standInEarn(storage, fresh),
    });
    return {
      session: standInSession(storage),
      locker: standInLocker(storage),
      earn: () => records.send([sampleAttempt(), sampleEnd()]),
    };
  },
});

function newStudent(): Student {
  return {
    id: `s-${crypto.randomUUID()}`,
    locale: "en-CA",
    look: null,
    classes: [],
  };
}

describe("stand-in session", () => {
  it("is signed out after signing out", async () => {
    const storage = memoryStorage();
    standInSignIn(storage, newStudent());
    standInSignOut(storage);
    expect(await standInSession(storage).current()).toBeNull();
  });

  it("is signed out when storage holds something that isn't a student", async () => {
    const storage = memoryStorage();
    storage.setItem("kindling.stand-in.student", '{"id":3}');
    expect(await standInSession(storage).current()).toBeNull();
  });

  it("is signed out when the stored student's look isn't a valid look", async () => {
    const storage = memoryStorage();
    storage.setItem(
      "kindling.stand-in.student",
      JSON.stringify({ ...newStudent(), look: { color: "red" } }),
    );
    expect(await standInSession(storage).current()).toBeNull();
  });

  it("is signed out when storage is unavailable", async () => {
    expect(await standInSession(null).current()).toBeNull();
  });
});

describe("stand-in locker", () => {
  it("owns what it's granted beyond the base set, and can wear it", async () => {
    const storage = memoryStorage();
    standInSignIn(storage, newStudent());
    standInGrant(storage, ["hat-30"]);
    const locker = standInLocker(storage);
    expect((await locker.current()).owned).toContain("hat-30");
    const look = { ...defaultLook, hat: "hat-30" } as const;
    expect(await locker.wear(look)).toEqual(look);
  });

  it("earns the next reward for each finished play, and nothing for others", async () => {
    const storage = memoryStorage();
    standInSignIn(storage, newStudent());
    const records = standInRecords({
      onStored: (fresh) => standInEarn(storage, fresh),
    });
    const ended = [
      sampleEnd({ play: "a" }),
      sampleEnd({ play: "b", ending: "left" }),
      sampleEnd({ play: "c", ending: "crashed" }),
      sampleEnd({ play: "d" }),
    ];
    await records.send(ended);
    await records.send(ended);
    expect((await standInLocker(storage).current()).unseen).toEqual(
      catalogue.slice(0, 2),
    );
  });
});

describe("stand-in classes", () => {
  const find = standInClasses(games);

  it.each([
    ["G4", [4]],
    ["G45", [4, 5]],
    ["ROOM", [3, 4, 5]],
  ])(
    "reads the grades of %s from its digits, or else Grades 3–5",
    (code, grades) => {
      expect(find(code)).toMatchObject({ grades, games });
    },
  );

  it("has no class for a code starting with X", () => {
    expect(find("X1")).toBeNull();
  });

  it("names games by their slug", () => {
    expect(standInGames(["fraction-hop"])).toEqual([
      { slug: "fraction-hop", name: "Fraction Hop" },
    ]);
  });
});

describe("stand-in attempts", () => {
  it("fails every send while offline", async () => {
    let offline = true;
    const port = standInRecords({ offline: () => offline });
    await expect(port.send([sampleAttempt()])).rejects.toThrow();
    offline = false;
    await port.send([sampleAttempt()]);
    expect(port.stored).toHaveLength(1);
  });
});

describe("stand-in links", () => {
  const links = standInLinks({ base: "/play/" });

  it("sends sign-in to the stand-in screen, carrying the game link", () => {
    const url = new URL(
      links.signIn("/play/sample?join=G4"),
      "http://localhost",
    );
    expect(url.pathname).toBe("/play/__stand-in/sign-in");
    expect(url.searchParams.get("next")).toBe("/play/sample?join=G4");
  });

  it("sends the student back to the locker, naming the play", () => {
    const url = new URL(links.locker("p1"), "http://localhost");
    expect(url.pathname).toBe("/play/");
    expect(url.searchParams.get("play")).toBe("p1");
  });
});
