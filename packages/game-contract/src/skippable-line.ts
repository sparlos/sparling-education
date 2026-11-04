// The shell's way of letting the game frame skip what's being said, without
// the game passing anything along. Its own module, because the rest of the
// contract is loaded in plain Node by the voice tool and the API, where there
// may be no React.
import { createContext } from "react";

export interface SkippableLine {
  /**
   * Cuts off what's being said. The game's `say` settles, as it does for any
   * cut-off instruction, so whatever was waiting for it goes ahead.
   */
  skip(): void;
  /** The skip control's name, for screen readers. */
  label: string;
}

/** The instruction being said now, or null when nothing is. */
export const SkippableLineContext = createContext<SkippableLine | null>(null);
