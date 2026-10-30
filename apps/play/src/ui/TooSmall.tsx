// The block over a screen too small to play on, like a phone upright or
// sideways. Kindling is for iPads, Chromebooks, laptops and desktops.
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { VoiceGate, VoiceOptions } from "../play/voice.ts";
import classes from "./app.module.css";
import { shellT, useShellVoice } from "./shared.tsx";

/**
 * Blocked when the viewport's shorter side is under this many CSS px. The
 * shorter side, so a phone turned sideways (about 850 × 390) is still
 * blocked. 600 lets through an iPad mini either way up (744 × 1133) and a
 * 1366 × 768 Chromebook once the browser's toolbars take their share.
 */
export const tooSmallPx = 600;

export const isTooSmall = (width: number, height: number) =>
  Math.min(width, height) < tooSmallPx;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

/** Whether the screen is too small to play on, re-checked as it changes. */
export function useTooSmall(): boolean {
  return useSyncExternalStore(subscribe, () =>
    isTooSmall(window.innerWidth, window.innerHeight),
  );
}

const keyEvents = ["keydown", "keyup", "keypress"] as const;

/**
 * Covers the whole screen, can't be dismissed, and takes all input; the
 * caller makes the page underneath `inert`. Its line silences every voice
 * behind `gate` while it's up.
 */
export function TooSmall({
  gate,
  speak,
}: {
  gate: VoiceGate;
  speak?: VoiceOptions["speak"];
}) {
  const voice = useShellVoice("en-CA", speak);
  const block = useRef<HTMLDivElement>(null);
  // Browsers won't play sound before the page's first tap. Said before it,
  // the line is said again on the first tap on the block.
  const unheard = useRef(false);
  const hear = () => {
    unheard.current = false;
    voice.again();
  };

  useEffect(() => {
    gate.close();
    unheard.current = !(navigator.userActivation?.hasBeenActive ?? true);
    void voice.say("too-small");
    block.current?.querySelector("button")?.focus();
    return () => gate.open();
  }, [gate, voice]);

  // Keys go to the focused element, which the inert page can't hold, but
  // also to listeners on the window (the stickers' Escape). Keys aimed
  // outside the block stop before anything hears them; the block's own
  // stop at it.
  useEffect(() => {
    const guard = (event: Event) => {
      if (
        !(event.target instanceof Node && block.current?.contains(event.target))
      )
        event.stopImmediatePropagation();
    };
    for (const type of keyEvents) window.addEventListener(type, guard, true);
    return () => {
      for (const type of keyEvents)
        window.removeEventListener(type, guard, true);
    };
  }, []);

  return (
    <div
      ref={block}
      className={`${classes.message} ${classes.tooSmall}`}
      role="alertdialog"
      aria-modal="true"
      aria-label={shellT("too-small")}
      onClick={() => {
        if (unheard.current) hear();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <Stack align="center" gap="lg">
        <Icon name="chromebook" size={96} />
        <div className={classes.question}>
          <Text size="xl">{shellT("too-small")}</Text>
          <IconButton
            tone="neutral"
            size="lg"
            label={shellT("hear-again")}
            onClick={hear}
          >
            <Icon name="speaker" size={24} />
          </IconButton>
        </div>
      </Stack>
    </div>
  );
}
