import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameFrame, NumberPad, type PadKey } from "./frame.tsx";
import { frameStrings } from "./frame-strings.ts";

const t = (id: keyof typeof frameStrings) => frameStrings[id];

describe("GameFrame", () => {
  const base = { t, stage: <div />, caption: "Hello" };

  it("offers Hint, and Skip takes its place during a tutorial", () => {
    const onHint = vi.fn();
    const onSkip = vi.fn();
    const { rerender } = render(
      <GameFrame {...base} hint={{ onTap: onHint, glow: true, level: 1 }} />,
    );
    const hint = screen.getByRole("button", { name: "Hint" });
    expect(hint).toHaveAttribute("data-glow", "true");
    expect(hint).toHaveAttribute("data-hint-level", "1");
    fireEvent.click(hint);
    expect(onHint).toHaveBeenCalledOnce();

    rerender(<GameFrame {...base} hint={{ onTap: onHint }} onSkip={onSkip} />);
    expect(screen.queryByRole("button", { name: "Hint" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("draws the main button with the game's own word, in either layout", () => {
    const onTap = vi.fn();
    const main = { label: "Go", onTap };
    const { rerender } = render(<GameFrame {...base} side="pad" main={main} />);
    expect(screen.getByTestId("board")).toHaveAttribute("data-layout", "side");
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    rerender(<GameFrame {...base} deck="tray" main={main} />);
    expect(screen.getByTestId("board")).toHaveAttribute("data-layout", "deck");
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onTap).toHaveBeenCalledTimes(2);
  });

  it("shows the caption, and hides the hand until it has a target", () => {
    render(<GameFrame stage={<div />} caption="Press Go." />);
    expect(screen.getByTestId("caption")).toHaveTextContent("Press Go.");
    expect(screen.getByTestId("ghost-hand")).not.toHaveAttribute("data-target");
  });
});

describe("NumberPad", () => {
  const order = () =>
    screen.getAllByTestId("key").map((k) => k.dataset.key as PadKey);

  it("has 1 2 3 on top, and delete right of 0", () => {
    render(<NumberPad onKey={() => {}} />);
    expect(order()).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "0",
      "del",
    ]);
  });

  it("offers a decimal point only when asked, left of 0", () => {
    const onKey = vi.fn();
    render(<NumberPad decimal onKey={onKey} />);
    expect(order().slice(-3)).toEqual([".", "0", "del"]);
    fireEvent.click(screen.getByRole("button", { name: "." }));
    expect(onKey).toHaveBeenCalledWith(".");
  });
});

// Every game's screen goes through the frame, so the controls it draws can't
// drift apart. A game that needs something the frame lacks changes the frame.
describe("every game uses the frame", () => {
  // Vitest runs from the kit's folder.
  const root = resolve(process.cwd(), "../..");
  const games = readdirSync(join(root, "games")).map((slug) =>
    join(root, "games", slug),
  );
  const gameDirs = [...games, join(root, "packages/game-kit/template")];

  /** All of a game's screen code, its CSS included. */
  const screenCode = (dir: string) => {
    const folder = join(dir, "src", "game");
    return readdirSync(folder)
      .filter((f) => !f.includes(".test."))
      .map((f) => join(folder, f))
      .filter((f) => statSync(f).isFile())
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
  };

  const banned: [string, RegExp][] = [
    ["its own hint button", /data-(hand|testid)="(hint|help)"|ui\.help/],
    ["its own skip button", /data-testid="skip"|t\("ui\.skip"\)/],
    ["its own main button", /data-testid="(main|go|run|play)"/],
    ["its own pointing hand", /function GhostHand|"ghost-hand"/],
    ["its own number pad", /data-testid="key|"pad-key"/],
    ["its own caption", /data-testid="caption"/],
    ["its own hint glow", /@keyframes ripple/],
    ["its own hint offer", /nudgeMs|nudgeHoldMs/],
  ];

  it.each(gameDirs)("%s", (dir) => {
    const code = screenCode(dir);
    expect(code).toContain("@repo/game-kit/frame");
    for (const [what, pattern] of banned)
      expect(pattern.test(code), `${dir} draws ${what}`).toBe(false);
  });
});
