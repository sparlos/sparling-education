// A throwaway game that exercises every prop of the game contract, for
// checking the shell by hand (/play/shell-check in dev) and in the shell's
// tests. It teaches nothing; it isn't a model for real games.
import { defineGame } from "@repo/game-contract";
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
    },
  },
} as const;

const expectationFor = {
  g3: "math-2020.g3.B2.8",
  g4: "math-2020.g4.B1.4",
} as const;

export default defineGame(manifest, function ShellCheck(props) {
  const { Avatar, t, say, onAttempt, onProgress, onFinish, tier } = props;
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
    </section>
  );
});
