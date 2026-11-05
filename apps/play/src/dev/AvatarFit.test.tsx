import { cutBoxes } from "@repo/avatar/parts";
import { UIProvider } from "@repo/ui/provider";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AvatarFit from "./AvatarFit.tsx";

const pressed = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-pressed");

const key = (name: string, options: KeyboardEventInit = {}) =>
  fireEvent.keyDown(window, { key: name, ...options });

function setUp() {
  render(
    <UIProvider>
      <AvatarFit />
    </UIProvider>,
  );
}

describe("the avatar fit tool", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom doesn't lay anything out.
    Element.prototype.scrollIntoView = () => {};
  });

  test("moves between items and slots with the arrow keys", () => {
    setUp();
    expect(pressed("hair-07")).toBe("true");
    key("ArrowRight");
    expect(pressed("hair-08")).toBe("true");
    key("ArrowDown");
    expect(screen.getByRole("list", { name: "Hats" })).toBeInTheDocument();
    key("ArrowUp");
    key("ArrowLeft");
    expect(pressed("hair-07")).toBe("true");
  });

  test("moves a picture with shift and arrows, and undoes and redoes it", () => {
    setUp();
    const readout = () =>
      screen.getByText("hair-07").parentElement?.textContent;
    const start = readout();
    key("ArrowRight", { shiftKey: true });
    const moved = readout();
    expect(moved).not.toBe(start);
    key("z", { metaKey: true });
    expect(readout()).toBe(start);
    key("z", { metaKey: true, shiftKey: true });
    expect(readout()).toBe(moved);
  });

  test("hides the box and shows it again", () => {
    setUp();
    const stage = () =>
      screen.getByRole("img", { name: "The avatar being fitted" })
        .parentElement;
    const classes = stage()?.className;
    key("b");
    expect(stage()?.className).not.toBe(classes);
    key("b");
    expect(stage()?.className).toBe(classes);
  });

  test("saves only what's been fitted", async () => {
    const fetchMock = vi.fn(async () => new Response("Saved"));
    vi.stubGlobal("fetch", fetchMock);
    setUp();
    key("ArrowRight", { shiftKey: true });
    key("s", { metaKey: true });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/__avatar-fit");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body.fits)).toContain("hair-07");
    // Only what differs from how the art was cut.
    for (const [id, box] of Object.entries(body.fits))
      expect(box).not.toEqual(cutBoxes[id]);
    expect(await screen.findByText(/^Saved/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
