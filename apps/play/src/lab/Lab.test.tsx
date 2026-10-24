import { UIProvider } from "@repo/ui/provider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { isLabUrl } from "../play/routes.ts";
import { memoryStorage } from "../test/memory-storage.ts";
import Lab from "./Lab.tsx";
import type { PrototypeModule, PrototypeProps } from "./prototype.ts";
import type { PrototypeRegistry } from "./registry.ts";

const base = "/play/";

const probe: PrototypeModule = {
  meta: {
    title: "Probe",
    pitch: "Shows what the lab gives it.",
    expectations: ["math-2020.g3.B2.8", "math-2020.g5.B1.5"],
    misconceptions: [{ id: "a-wrong-idea", fails: "Something falls over." }],
    fun: "It's a test.",
  },
  default: function Probe({ grade, Avatar, speak }: PrototypeProps) {
    return (
      <div>
        <p>Grade given: {grade}</p>
        <Avatar expression="happy" size={64} />
        <button type="button" onClick={() => speak("Hello there")}>
          Speak
        </button>
      </div>
    );
  },
};

const shelved: PrototypeModule = {
  ...probe,
  meta: { ...probe.meta, title: "Shelved", isArchived: true },
};

const registry: PrototypeRegistry = { probe, shelved };

function renderLab(path: string, storage = memoryStorage()) {
  const navigate = vi.fn();
  const speak = vi.fn(() => () => {});
  render(
    <UIProvider>
      <Lab
        url={new URL(`http://localhost${path}`)}
        base={base}
        prototypes={registry}
        storage={storage}
        navigate={navigate}
        speak={speak}
      />
    </UIProvider>,
  );
  return { navigate, speak, storage };
}

describe("the lab list", () => {
  test("lists each prototype with what it targets and a link to play it", () => {
    renderLab("/play/lab");
    expect(screen.getByRole("heading", { name: "Probe" })).toBeInTheDocument();
    expect(
      screen.getByText(/Targets Grades 3–5: math-2020.g3.B2.8/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Something falls over/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Play Probe" })).toHaveAttribute(
      "href",
      "/play/lab/probe",
    );
  });

  test("archived prototypes are under their own tab, still playable", async () => {
    renderLab("/play/lab");
    expect(screen.queryByRole("heading", { name: "Shelved" })).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: "Archive (1)" }));
    expect(
      screen.getByRole("heading", { name: "Shelved" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Probe" })).toBeNull();
    expect(screen.getByRole("link", { name: "Play Shelved" })).toHaveAttribute(
      "href",
      "/play/lab/shelved",
    );
  });

  test("the grade picked is the one a prototype is given", async () => {
    const { storage } = renderLab("/play/lab");
    await userEvent.click(screen.getByRole("button", { name: "Grade 5" }));
    expect(
      screen.getByRole("heading", { name: "Play as Grade 5" }),
    ).toBeInTheDocument();

    renderLab("/play/lab/probe", storage);
    expect(screen.getByText("Grade given: 5")).toBeInTheDocument();
  });
});

describe("playing a prototype", () => {
  test("gives it a default grade, the avatar, and speech with hear it again", async () => {
    const { speak } = renderLab("/play/lab/probe");
    expect(screen.getByText("Grade given: 3")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Your avatar" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Speak" }));
    expect(speak).toHaveBeenLastCalledWith("Hello there", "en-CA");
    await userEvent.click(
      screen.getByRole("button", { name: "Hear it again" }),
    );
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenLastCalledWith("Hello there", "en-CA");
  });

  test("goes back to the list", async () => {
    const { navigate } = renderLab("/play/lab/probe");
    await userEvent.click(
      screen.getByRole("button", { name: "Back to the lab" }),
    );
    expect(navigate).toHaveBeenCalledWith("/play/lab");
  });

  test("an unknown prototype says so", () => {
    renderLab("/play/lab/nope");
    expect(
      screen.getByRole("heading", { name: "No prototype called “nope”" }),
    ).toBeInTheDocument();
  });
});

test("lab URLs are the list and its prototypes, nothing else", () => {
  const is = (path: string) => isLabUrl(new URL(`http://x${path}`), base);
  expect(is("/play/lab")).toBe(true);
  expect(is("/play/lab/probe")).toBe(true);
  expect(is("/play/labyrinth")).toBe(false);
  expect(is("/play/shell-check")).toBe(false);
});
