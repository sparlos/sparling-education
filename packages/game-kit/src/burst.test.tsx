import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Burst } from "./burst.tsx";

describe("Burst", () => {
  it("centres its particles on (x, y) without taking layout space", () => {
    render(
      <Burst x={40} y={30} count={6}>
        <i>*</i>
      </Burst>,
    );
    const burst = screen.getByTestId("burst");
    expect(burst.style.left).toBe("40px");
    expect(burst.style.top).toBe("30px");
    expect(burst.style.position).toBe("absolute");
    expect(burst.style.pointerEvents).toBe("none");
    expect(burst.children).toHaveLength(6);
  });

  it("animates only transform and opacity", () => {
    const animate = vi.fn(() => ({ cancel() {} }));
    HTMLElement.prototype.animate = animate as never;
    render(
      <Burst x={0} y={0} count={3}>
        <i>*</i>
      </Burst>,
    );
    expect(animate).toHaveBeenCalledTimes(3);
    for (const [frames] of animate.mock.calls as unknown as [Keyframe[]][])
      for (const frame of frames)
        for (const key of Object.keys(frame))
          expect(["transform", "opacity", "offset", "easing"]).toContain(key);
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });

  it("shows one particle fading in place with reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
    );
    render(
      <Burst x={0} y={0} count={8}>
        <i>*</i>
      </Burst>,
    );
    expect(screen.getByTestId("burst").children).toHaveLength(1);
  });
});
