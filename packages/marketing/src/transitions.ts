// Brief transition names → @remotion/transitions presentations. Directions
// alternate so a run of slides doesn't feel mechanical.
import type { TransitionPresentation } from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { iris } from "@remotion/transitions/iris";
import { none } from "@remotion/transitions/none";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { palette } from "@repo/tokens";
import type { TransitionKind } from "./brief.ts";

// biome-ignore lint/suspicious/noExplicitAny: presentations differ only in props.
type Presentation = TransitionPresentation<any>;

export function presentation(
  kind: TransitionKind,
  index: number,
  size: { width: number; height: number },
): Presentation {
  const odd = index % 2 === 1;
  switch (kind) {
    case "slide":
      return slide({ direction: odd ? "from-right" : "from-bottom" });
    case "wipe":
      return wipe({ direction: odd ? "from-top-left" : "from-bottom-right" });
    case "flip":
      return flip({ direction: odd ? "from-right" : "from-left" });
    case "iris":
      return iris(size);
    case "clock-wipe":
      return clockWipe(size);
    case "zoom":
    case "push":
      return pushCut({
        flashColor: palette.sand[0],
        flashOpacity: 0.7,
        outgoingScale: kind === "zoom" ? 1.4 : 1.1,
      });
    case "fade":
      return fade();
    case "cut":
      return none();
  }
}
