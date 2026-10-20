"use client";

// TEMPORARY floating debug menu for trying colour schemes. Dev-only.
import { Leva, useControls } from "leva";
import { useEffect, useRef } from "react";
import { paletteVariants } from "./palette-variants";

export function PaletteDebug() {
  const applied = useRef<string[]>([]);
  const { scheme } = useControls("Colour scheme", {
    scheme: { options: Object.keys(paletteVariants), value: "current" },
  });

  useEffect(() => {
    const style = document.documentElement.style;
    for (const name of applied.current) style.removeProperty(name);
    const vars = paletteVariants[scheme] ?? {};
    for (const [name, value] of Object.entries(vars)) {
      style.setProperty(name, value);
    }
    applied.current = Object.keys(vars);
  }, [scheme]);

  return <Leva titleBar={{ title: "Debug" }} />;
}

export function DevTools() {
  if (process.env.NODE_ENV === "production") return null;
  return <PaletteDebug />;
}
