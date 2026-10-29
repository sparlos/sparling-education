// Links between the teacher app's screens. A link down to a screen marks its
// history entry as come to from the screen above (`fromAbove`), so the way
// back up can go back through history, to the screen as it was left.
import { Button } from "@repo/ui/button";
import { createLink, useLocation, useRouter } from "@tanstack/react-router";
import type { MouseEvent } from "react";

declare module "@tanstack/react-router" {
  interface HistoryState {
    /** The entry before this one is the screen above this one. */
    fromAbove?: boolean;
  }
}

/** A router link that looks like a `@repo/ui` button. */
export const ButtonLink = createLink(Button);

/**
 * The click handler for a link up to the screen above. When that's where
 * the teacher came from, it goes back, so the screen above is as they left
 * it, scroll and all. Opened straight from a link, it's a plain link.
 */
export function useUp() {
  const router = useRouter();
  const fromAbove = useLocation({ select: (l) => l.state.fromAbove });
  return (event: MouseEvent<HTMLElement>) => {
    const plain =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;
    if (!fromAbove || !plain) return;
    event.preventDefault();
    router.history.back();
  };
}
