// Designing the avatar: first, before anything else, and then from the
// locker's wardrobe. The student picks a skin tone, hair and an outfit from
// the pieces they own, seeing their avatar change as they go. Usable without
// reading: the instruction and each slot's name are spoken, and every choice
// is a picture.
import { type AvatarLook, lookFromSeed } from "@repo/avatar";
import { itemsIn, type PartSlot } from "@repo/avatar/parts";
import { ItemPicture, Portrait } from "@repo/avatar/portrait";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { PictureButton } from "@repo/ui/picture-button";
import { Title } from "@repo/ui/title";
import { useEffect, useState } from "react";
import type { Platform, Student } from "../platform/ports.ts";
import type { VoiceOptions } from "../play/voice.ts";
import { Message, shellT, useShellVoice } from "./shared.tsx";
import type { ShellStringId } from "./shell-strings.ts";
import styles from "./wardrobe.module.css";

/** The slots, in the order they're offered: who the avatar is, then what it wears. */
const slots = [
  "body",
  "hair",
  "top",
  "bottom",
  "shoes",
  "hat",
] as const satisfies PartSlot[];

type Slot = (typeof slots)[number];

const slotLine = (slot: Slot) => `slot-${slot}` as ShellStringId;

export interface DesignProps {
  student: Student;
  platform: Platform;
  /**
   * "first": the student has no avatar yet and must make one; there's no
   * way out but done. "wardrobe": they're changing it, and can go back.
   */
  mode: "first" | "wardrobe";
  speak?: VoiceOptions["speak"];
  /** Called once the look is saved. */
  onDone(look: AvatarLook): void;
  /** Back to the locker without changing anything; wardrobe only. */
  onBack?(): void;
  onError(): void;
}

/** Loads what the student owns, then lets them design their avatar. */
export function AvatarDesign(props: DesignProps) {
  const { platform, onError } = props;
  const [owned, setOwned] = useState<readonly string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    platform.locker.current().then(
      (locker) => {
        if (!cancelled) setOwned(locker.owned);
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error("[play] Couldn't open the locker", error);
        onError();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [platform, onError]);
  if (!owned) return <Message text={shellT("opening-locker")} busy />;
  return <Designer {...props} owned={owned} />;
}

function Designer({
  student,
  platform,
  mode,
  speak,
  owned,
  onDone,
  onBack,
  onError,
}: DesignProps & { owned: readonly string[] }) {
  const voice = useShellVoice(student.locale, speak);
  // A new avatar starts from a look of the student's own, to change.
  const [look, setLook] = useState<AvatarLook>(
    () => student.look ?? lookFromSeed(student.id),
  );
  const [slot, setSlot] = useState<Slot>(mode === "first" ? "body" : "top");
  const [saving, setSaving] = useState(false);
  const instruction = mode === "first" ? "design-avatar" : "wardrobe";
  useEffect(() => {
    void voice.say(instruction);
  }, [voice, instruction]);

  const choices = choicesFor(slot, owned);
  const pick = (item: string | null) =>
    setLook((current) => ({ ...current, [slot]: item }));

  const save = () => {
    voice.stop();
    setSaving(true);
    platform.locker.wear(look).then(onDone, (error: unknown) => {
      console.error("[play] Couldn't save the avatar", error);
      onError();
    });
  };

  return (
    <main className={styles.wardrobe} aria-busy={saving}>
      <div className={styles.header}>
        {onBack && mode === "wardrobe" && (
          <IconButton
            tone="neutral"
            label={shellT("to-locker")}
            onClick={onBack}
            disabled={saving}
          >
            <Icon name="leave" size={32} />
          </IconButton>
        )}
        <Title order={1} size="h3" className={styles.instruction}>
          {shellT(instruction)}
        </Title>
        <IconButton
          tone="neutral"
          label={shellT("hear-again")}
          onClick={() => void voice.say(instruction)}
        >
          <Icon name="speaker" size={32} />
        </IconButton>
      </div>
      <div className={styles.stage}>
        <Portrait
          look={look}
          expression="happy"
          size={440}
          label={shellT("avatar")}
        />
      </div>
      <div className={styles.picker} inert={saving}>
        <div className={styles.slots}>
          {slots.map((s) => (
            <PictureButton
              key={s}
              label={shellT(slotLine(s))}
              selected={s === slot}
              tone="brand"
              size={4.5}
              onClick={() => {
                setSlot(s);
                void voice.say(slotLine(s));
              }}
            >
              <SlotPicture slot={s} look={look} />
            </PictureButton>
          ))}
        </div>
        <ul className={styles.choices} aria-label={shellT(slotLine(slot))}>
          {choices.map((item) => (
            <li key={item ?? "none"}>
              <PictureButton
                label={itemLabel(slot, item)}
                selected={look[slot] === item}
                size={5.5}
                onClick={() => pick(item)}
              >
                {item ? (
                  <ItemPicture item={item} size={72} />
                ) : (
                  <Icon name="ban" size={40} />
                )}
              </PictureButton>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.done}>
        <IconButton
          tone="brand"
          label={shellT("avatar-done")}
          onClick={save}
          disabled={saving}
        >
          <Icon name="check" size={40} />
        </IconButton>
      </div>
      {saving && <Message text={shellT("saving-avatar")} busy overlay />}
    </main>
  );
}

/** What a slot offers: every skin tone and hairstyle, but only outfit pieces the student owns. */
function choicesFor(slot: Slot, owned: readonly string[]): (string | null)[] {
  if (slot === "body" || slot === "hair") return itemsIn(slot);
  const pieces = itemsIn(slot).filter((id) => owned.includes(id));
  return slot === "hat" ? [null, ...pieces] : pieces;
}

/** "Hair 12", for screen readers; the picture says what it is. */
function itemLabel(slot: Slot, item: string | null) {
  if (item === null) return shellT("no-hat");
  return `${shellT(slotLine(slot))} ${(itemsIn(slot) as string[]).indexOf(item) + 1}`;
}

/** A slot's button shows what's worn in it now. */
function SlotPicture({ slot, look }: { slot: Slot; look: AvatarLook }) {
  const item = look[slot];
  if (item === null) return <Icon name="ban" size={32} />;
  return <ItemPicture item={item} size={56} />;
}
