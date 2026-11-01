// A throwaway game that exercises every prop of the game contract, for
// checking the shell by hand (/play/shell-check in dev) and in the shell's
// tests. It teaches nothing; it isn't a model for real games.
import { defineGame, type GameProps } from "@repo/game-contract";
import { useEffect, useState } from "react";

export const manifest = {
  slug: "shell-check",
  version: 1,
  renderer: "dom",
  avatar: "portrait",
  progress: true,
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.4"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": {
      description: "Thinks a bigger bottom number is a bigger piece.",
      expectations: ["math-2020.g3.B2.8", "math-2020.g4.B1.4"],
    },
  },
  strings: {
    "en-CA": {
      title: "Shell Check",
      intro: "Tap a button to send an attempt.",
      right: "Right",
      wrong: "Wrong",
      finish: "Finish",
      "play-sound": "Play a sound",
      "play-music": "Play music",
      "stop-music": "Stop music",
    },
  },
  sounds: ["beep"],
} as const;

/** A short beep, inline so this dev game has no files. */
const beep =
  "data:audio/wav;base64,UklGRhQBAABXQVZFZm10IBAAAAABAAEAoA8AAKAPAAABAAgAZGF0YfAAAACAzc6CNTF6yM6IOjF1w86NPzFwvs6RRDFruc2WSTJns8yaTjRjrsudUzVgqcmhWTddpMekXjlan8SmYjxYmsKoZz9Wlb+qbEJUkbyrcEVTjbmsdEhSibWteExShbKtfE9Sga6tgFNSfqutg1ZTe6eshlpUeKOriF1VdqCqimFWdJyojGRYcpmmjmhacJakj2tcb5KikG5eb4+gkXFgbo2ekXRiboqbkXZlboiZkXhoboWWkHtqb4SUkHxtcIKRj35vcYGPjX9ycn+MjIB0dH+KioF2dn6IiYF5d36Fh4F7eX6DhYF8e36CgoB+fn+AgIA=";

const expectationFor = {
  g3: "math-2020.g3.B2.8",
  g4: "math-2020.g4.B1.4",
} as const;

function ShellCheck(props: GameProps<typeof manifest>) {
  const {
    Avatar,
    t,
    say,
    playSound,
    playMusic,
    onAttempt,
    onProgress,
    onFinish,
    tier,
    firstPlay,
  } = props;
  // Two tasks: each right answer finishes one.
  const [done, setDone] = useState(0);
  useEffect(() => onProgress({ done, total: 2 }), [done, onProgress]);
  const [mood, setMood] = useState<"neutral" | "happy" | "encouraging">(
    "neutral",
  );
  const attempt = (succeeded: boolean) => {
    onAttempt({
      task: "only-task",
      expectation: expectationFor[tier],
      succeeded,
      ...(!succeeded && { misconception: "bigger-denominator-bigger" }),
    });
    setMood(succeeded ? "happy" : "encouraging");
    if (succeeded) setDone((n) => n + 1);
  };
  return (
    <section style={{ display: "grid", gap: 16, padding: 24 }}>
      <Avatar expression={mood} size={96} />
      <p data-testid="tier">{tier}</p>
      <p data-testid="first-play">
        {firstPlay ? "first play" : "played before"}
      </p>
      <button type="button" onClick={() => say("intro")}>
        {t("intro")}
      </button>
      <button type="button" onClick={() => attempt(true)}>
        {t("right")}
      </button>
      <button type="button" onClick={() => attempt(false)}>
        {t("wrong")}
      </button>
      <button type="button" onClick={onFinish}>
        {t("finish")}
      </button>
      <button type="button" onClick={() => playSound("beep")}>
        {t("play-sound")}
      </button>
      <button type="button" onClick={() => playMusic("beep")}>
        {t("play-music")}
      </button>
      <button type="button" onClick={() => playMusic(null)}>
        {t("stop-music")}
      </button>
    </section>
  );
}

export default defineGame(manifest, ShellCheck, { beep });
