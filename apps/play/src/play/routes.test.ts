import { describe, expect, it } from "vitest";
import { parseGameLink, returnPath } from "./routes.ts";

const at = (path: string) => new URL(path, "https://kindling.example");

describe("parseGameLink", () => {
  it("reads a game link opened directly", () => {
    expect(parseGameLink(at("/play/plank-bridge"), "/play/")).toEqual({
      slug: "plank-bridge",
      portal: null,
    });
  });

  it("reads the portal a game was opened from", () => {
    expect(
      parseGameLink(at("/play/plank-bridge/?portal=north"), "/play/"),
    ).toEqual({ slug: "plank-bridge", portal: "north" });
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
  it("keeps the path and query, so the portal survives sign-in", () => {
    expect(returnPath(at("/play/plank-bridge?portal=north"))).toBe(
      "/play/plank-bridge?portal=north",
    );
  });
});
