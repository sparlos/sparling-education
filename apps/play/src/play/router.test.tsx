import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isShellUrl, useBrowserRoute } from "./router.ts";

const here = new URL("https://app.test/play/");

// jsdom can't load pages: stop the clicks the shell leaves to the browser,
// after the shell has had its turn.
const stopLoads = (event: Event) => event.preventDefault();
window.addEventListener("click", stopLoads);

afterEach(() => window.history.replaceState(null, "", "/"));

describe("isShellUrl", () => {
  it.each([
    ["https://app.test/play/", true],
    ["https://app.test/play", true],
    ["https://app.test/play/locker", true],
    ["https://app.test/play/fraction-hop?class=c1", true],
    ["https://app.test/api/auth", false],
    ["https://app.test/", false],
    ["https://accounts.google.com/play/", false],
  ])("%s → %s", (to, expected) => {
    expect(isShellUrl(new URL(to), here, "/play/")).toBe(expected);
  });
});

function setUp() {
  window.history.replaceState(null, "", "/play/");
  const load = vi.fn();
  const hook = renderHook(() => useBrowserRoute("/play/", { load }));
  return { load, hook };
}

describe("moving between the shell's pages", () => {
  it("opens a shell page in this page, adding it to the history", () => {
    const { load, hook } = setUp();
    const length = window.history.length;
    act(() => hook.result.current.navigate("/play/locker"));
    expect(hook.result.current.url.pathname).toBe("/play/locker");
    expect(hook.result.current.visit).toBe(1);
    expect(window.location.pathname).toBe("/play/locker");
    expect(window.history.length).toBe(length + 1);
    expect(load).not.toHaveBeenCalled();
  });

  it("opens the page showing again afresh, without adding to the history", () => {
    const { hook } = setUp();
    const length = window.history.length;
    act(() => hook.result.current.navigate(window.location.href));
    expect(hook.result.current.visit).toBe(1);
    expect(window.history.length).toBe(length);
  });

  it("loads a page outside the shell", () => {
    const { load, hook } = setUp();
    act(() => hook.result.current.navigate("/api/auth/google"));
    expect(load).toHaveBeenCalledWith("http://localhost:3000/api/auth/google");
    expect(hook.result.current.visit).toBe(0);
  });

  it("follows Back", () => {
    const { hook } = setUp();
    act(() => hook.result.current.navigate("/play/wardrobe"));
    act(() => {
      window.history.replaceState(null, "", "/play/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(hook.result.current.url.pathname).toBe("/play/");
    expect(hook.result.current.visit).toBe(2);
  });

  it("opens a tapped link to a shell page in this page", () => {
    const { load, hook } = setUp();
    const { getByText } = render(
      <>
        <a href="/play/locker">locker</a>
        <a href="/api/out">out</a>
        <a href="/play/wardrobe" target="_blank" rel="noopener">
          new tab
        </a>
      </>,
    );
    /** Clicks, and says whether the browser was left to follow the link. */
    const leftToBrowser = (el: HTMLElement, init: MouseEventInit = {}) => {
      let left = false;
      const see = (event: Event) => {
        left = !event.defaultPrevented;
      };
      document.addEventListener("click", see);
      act(() => {
        fireEvent.click(el, init);
      });
      document.removeEventListener("click", see);
      return left;
    };
    expect(leftToBrowser(getByText("locker"))).toBe(false);
    expect(hook.result.current.url.pathname).toBe("/play/locker");
    expect(leftToBrowser(getByText("out"))).toBe(true);
    expect(leftToBrowser(getByText("new tab"))).toBe(true);
    expect(leftToBrowser(getByText("locker"), { ctrlKey: true })).toBe(true);
    expect(hook.result.current.visit).toBe(1);
    expect(load).not.toHaveBeenCalled();
  });
});
