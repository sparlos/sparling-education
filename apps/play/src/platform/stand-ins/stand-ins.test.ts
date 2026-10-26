import { describe, expect, it } from "vitest";
import { memoryStorage } from "../../test/memory-storage.ts";
import {
  playRecordsPortContract,
  sampleAttempt,
  sessionPortContract,
} from "../contract.ts";
import { standInLinks } from "./links.ts";
import { standInRecords } from "./records.ts";
import { standInSession, standInSignIn, standInSignOut } from "./session.ts";

playRecordsPortContract("Stand-in attempts", () => {
  const port = standInRecords();
  return { port, stored: async () => port.stored };
});

sessionPortContract("Stand-in session", {
  signedOut: () => standInSession(memoryStorage()),
  signedIn: (student) => {
    const storage = memoryStorage();
    standInSignIn(storage, student);
    return standInSession(storage);
  },
});

describe("stand-in session", () => {
  it("is signed out after signing out", async () => {
    const storage = memoryStorage();
    standInSignIn(storage, {
      id: "s",
      grade: 3,
      locale: "en-CA",
      look: { body: "sky", eyes: "sparkle", headwear: "crown" },
      classId: null,
    });
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
      JSON.stringify({
        id: "s",
        grade: 3,
        locale: "en-CA",
        look: { color: "red" },
        classId: null,
      }),
    );
    expect(await standInSession(storage).current()).toBeNull();
  });

  it("is signed out when storage is unavailable", async () => {
    expect(await standInSession(null).current()).toBeNull();
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
      links.signIn("/play/sample?portal=north"),
      "http://localhost",
    );
    expect(url.pathname).toBe("/play/__stand-in/sign-in");
    expect(url.searchParams.get("next")).toBe("/play/sample?portal=north");
  });

  it("sends the student to the stand-in hub, with their portal and play", () => {
    const url = new URL(
      links.hub({ portal: "north", play: "p1" }),
      "http://localhost",
    );
    expect(url.pathname).toBe("/play/__stand-in/hub");
    expect(url.searchParams.get("portal")).toBe("north");
    expect(url.searchParams.get("play")).toBe("p1");
  });
});
