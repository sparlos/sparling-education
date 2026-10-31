import { describe, expect, it } from "vitest";
import {
  lockerPath,
  parseGameLink,
  parseRoute,
  returnPath,
  shellPath,
} from "./routes.ts";

const at = (path: string) => new URL(path, "https://app.example");

describe("parseGameLink", () => {
  it("reads a game link opened directly", () => {
    expect(parseGameLink(at("/play/plank-bridge"), "/play/")).toEqual({
      slug: "plank-bridge",
      classId: null,
      joinCode: null,
    });
  });

  it("reads the join code of a teacher's game link", () => {
    expect(
      parseGameLink(at("/play/plank-bridge/?join=K7QM4XRT"), "/play/"),
    ).toEqual({ slug: "plank-bridge", classId: null, joinCode: "K7QM4XRT" });
  });

  it("has no portal any more", () => {
    expect(
      parseGameLink(at("/play/plank-bridge?portal=north"), "/play/"),
    ).toEqual({ slug: "plank-bridge", classId: null, joinCode: null });
  });

  it("reads the class the locker opened a game for", () => {
    expect(
      parseGameLink(at("/play/plank-bridge?class=c1"), "/play/"),
    ).toMatchObject({ slug: "plank-bridge", classId: "c1" });
  });

  it.each([
    "/play/",
    "/play/Plank_Bridge",
    "/play/plank-bridge/extra",
    "/play/__stand-in/sign-in",
    "/elsewhere/plank-bridge",
  ])("names no game at %s", (path) => {
    expect(parseGameLink(at(path), "/play/")).toBeNull();
  });
});

describe("returnPath", () => {
  it("keeps the path and query, so a game link's join code survives sign-in", () => {
    expect(returnPath(at("/play/plank-bridge?join=K7QM4XRT"))).toBe(
      "/play/plank-bridge?join=K7QM4XRT",
    );
  });
});

describe("parseRoute", () => {
  it.each([
    ["/play/", { kind: "locker" }],
    ["/play", { kind: "locker" }],
    ["/play/sign-in", { kind: "sign-in" }],
    ["/play/wardrobe", { kind: "wardrobe" }],
    ["/play/join/K7QM4XRT", { kind: "join", joinCode: "K7QM4XRT" }],
    ["/play/join/K7QM4XRT/", { kind: "join", joinCode: "K7QM4XRT" }],
    [
      "/play/fraction-hop?class=c1",
      {
        kind: "game",
        link: { slug: "fraction-hop", classId: "c1", joinCode: null },
      },
    ],
    [
      "/play/fraction-hop?join=K7QM4XRT",
      {
        kind: "game",
        link: { slug: "fraction-hop", classId: null, joinCode: "K7QM4XRT" },
      },
    ],
    ["/play/?play=p1", { kind: "locker" }],
  ])("reads %s", (path, route) => {
    expect(parseRoute(at(path), "/play/")).toEqual(route);
  });

  it.each(["/play/join", "/play/join/", "/play/join/a-b", "/play/join/A/B"])(
    "names no page at %s",
    (path) => {
      expect(parseRoute(at(path), "/play/")).toBeNull();
    },
  );
});

describe("lockerPath", () => {
  it("names the play the student is back from", () => {
    expect(lockerPath("/play/", "p 1")).toBe("/play/?play=p+1");
  });
});

describe("shellPath", () => {
  it("keeps a page of the shell, with its query", () => {
    expect(shellPath("/play/join/K7?x=1", "/play/")).toBe("/play/join/K7?x=1");
  });

  it.each([
    "https://evil.example/play/",
    "//evil.example/play/",
    "/play/../teach/",
    "/teach/",
    null,
    3,
  ])("refuses %j", (path) => {
    expect(shellPath(path, "/play/")).toBeNull();
  });
});
