// The rewards a student hasn't seen yet, revealed over their locker when they
// come back from a game (or whenever they open it next, for a play sent
// later), and any recognition from their teacher. Spoken when it appears,
// recognition by name; the tick puts them away. Nothing is ever said about
// how many rewards there could have been.
import { ItemPicture, Portrait } from "@repo/avatar/portrait";
import { isSticker, traitOf } from "@repo/rewards";
import { StickerPicture } from "@repo/rewards/sticker";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { useEffect, useId, useRef } from "react";
import type { AvatarLook } from "../platform/ports.ts";
import type { VoiceOptions } from "../play/voice.ts";
import classes from "./app.module.css";
import styles from "./locker.module.css";
import { recognitionLines } from "./Stickers.tsx";
import { shellT, useShellVoice } from "./shared.tsx";

export function Reveal({
  rewards,
  look,
  speak,
  onDone,
}: {
  /** Reward IDs, in the order they were granted. */
  rewards: readonly string[];
  look: AvatarLook;
  speak?: VoiceOptions["speak"];
  onDone(): void;
}) {
  const voice = useShellVoice("en-CA", speak);
  // Each trait the student was recognised for, said after the news.
  const recognised = rewards.flatMap((id) => {
    const trait = traitOf(id);
    return trait ? [recognitionLines[trait]] : [];
  });
  const lines = ["new-reward", ...recognised].join(" ");
  useEffect(() => {
    void voice.say(...lines.split(" "));
  }, [voice, lines]);
  const id = useId();
  const done = useRef<HTMLDivElement>(null);
  useEffect(() => {
    done.current?.querySelector("button")?.focus();
  }, []);
  return (
    <div
      className={`${classes.message} ${classes.overlay}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      data-tone="recognition"
    >
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression="cheering"
          size={120}
          label={shellT("avatar")}
        />
        <div className={classes.question}>
          <Text size="xl">
            <span id={id}>{shellT("new-reward")}</span>
          </Text>
          <IconButton
            tone="neutral"
            size="lg"
            label={shellT("hear-again")}
            onClick={() => voice.again()}
          >
            <Icon name="speaker" size={24} />
          </IconButton>
        </div>
        <ul className={styles.rewards}>
          {rewards.map((reward) => (
            <li
              key={reward}
              className={styles.reward}
              data-recognition={traitOf(reward) ? true : undefined}
            >
              <NewReward reward={reward} />
            </li>
          ))}
        </ul>
        <div ref={done}>
          <IconButton
            tone="brand"
            label={shellT("avatar-done")}
            onClick={() => {
              voice.stop();
              onDone();
            }}
          >
            <Icon name="check" size={40} />
          </IconButton>
        </div>
      </Stack>
    </div>
  );
}

/** One new reward's picture: a recognition sticker bigger, and named. */
function NewReward({ reward }: { reward: string }) {
  const trait = traitOf(reward);
  if (trait)
    return (
      <StickerPicture
        sticker={reward}
        size={112}
        label={shellT(recognitionLines[trait])}
      />
    );
  if (isSticker(reward))
    return (
      <StickerPicture
        sticker={reward}
        size={96}
        label={shellT("new-sticker")}
      />
    );
  return (
    <span role="img" aria-label={shellT("new-outfit")}>
      <ItemPicture item={reward} size={96} />
    </span>
  );
}
