// The rewards a student hasn't seen yet, revealed over their locker when they
// come back from a game (or whenever they open it next, for a play sent
// later). Spoken when it appears; the tick puts the rewards away. Nothing is
// ever said about how many there could have been.
import { ItemPicture, Portrait } from "@repo/avatar/portrait";
import { rewardKind } from "@repo/rewards";
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
  useEffect(() => {
    void voice.say("new-reward");
  }, [voice]);
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
      data-tone="student"
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
            <li key={reward} className={styles.reward}>
              {rewardKind(reward) === "sticker" ? (
                <StickerPicture
                  sticker={reward}
                  size={96}
                  label={shellT("new-sticker")}
                />
              ) : (
                <span role="img" aria-label={shellT("new-outfit")}>
                  <ItemPicture item={reward} size={96} />
                </span>
              )}
            </li>
          ))}
        </ul>
        <div ref={done}>
          <IconButton
            tone="student"
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
