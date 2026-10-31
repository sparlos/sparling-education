// Designing the avatar: first, before anything else, and then from the
// locker's wardrobe. The student picks a skin tone, hair and an outfit from
// the pieces they own, seeing their avatar change as they go. Usable without
// reading: the instruction and each slot's name are spoken, and every choice
// is a picture. Outfit pieces the student hasn't seen in the wardrobe yet wear
// a star until they put one on, and so does each slot holding one until the
// student opens it.
import { type AvatarLook, lookFromSeed } from "@repo/avatar";
import { itemsIn, type PartSlot } from "@repo/avatar/parts";
import { ItemPicture, Portrait } from "@repo/avatar/portrait";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { PictureButton } from "@repo/ui/picture-button";
import { Title } from "@repo/ui/title";
import { useEffect, useRef, useState } from "react";
import type { Locker, Platform, Student } from "../platform/ports.ts";
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
  const [locker, setLocker] = useState<Pick<
    Locker,
    "owned" | "newInWardrobe"
  > | null>(null);
  useEffect(() => {
    let cancelled = false;
    platform.locker.current().then(
      (locker) => {
        if (!cancelled) setLocker(locker);
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
  if (!locker) return <Message text={shellT("opening-locker")} busy />;
  return (
    <Designer
      {...props}
      owned={locker.owned}
      newInWardrobe={locker.newInWardrobe}
    />
  );
}

function Designer({
  student,
  platform,
  mode,
  speak,
  owned,
  newInWardrobe,
  onDone,
  onBack,
  onError,
}: DesignProps & {
  owned: readonly string[];
  newInWardrobe: readonly string[];
}) {
  const voice = useShellVoice(student.locale, speak);
  // A new avatar starts from a look of the student's own, to change.
  const [look, setLook] = useState<AvatarLook>(
    () => student.look ?? lookFromSeed(student.id),
  );
  const [slot, setSlot] = useState<Slot>(mode === "first" ? "body" : "top");
  // What was new when the wardrobe opened keeps its star for this visit,
  // after it's marked seen, until the student puts it on; a slot's star goes
  // once the student opens it.
  const [fresh, setFresh] = useState<ReadonlySet<string>>(
    () => new Set(newInWardrobe),
  );
  const [opened, setOpened] = useState<ReadonlySet<Slot>>(
    () => new Set([slot]),
  );
  const [saving, setSaving] = useState(false);
  const instruction = mode === "first" ? "design-avatar" : "wardrobe";
  useEffect(() => {
    void voice.say(instruction);
  }, [voice, instruction]);

  // Opening a slot is seeing what's new in it, even if the student leaves
  // with the back button. Each slot is marked once per visit.
  const marked = useRef(new Set<Slot>());
  useEffect(() => {
    if (marked.current.has(slot)) return;
    marked.current.add(slot);
    const seen = newIn(slot, fresh);
    if (seen.length === 0) return;
    // Not worth interrupting the student for: the stars show again next time.
    platform.locker.markSeenInWardrobe(seen).catch((error: unknown) => {
      console.error("[play] Couldn't mark new pieces seen", error);
    });
  }, [platform, slot, fresh]);

  const choices = choicesFor(slot, owned);
  const pick = (item: string | null) => {
    setLook((current) => ({ ...current, [slot]: item }));
    if (item !== null && fresh.has(item))
      setFresh((was) => new Set([...was].filter((id) => id !== item)));
  };

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
          {slots.map((s) => {
            const isNew = !opened.has(s) && newIn(s, fresh).length > 0;
            return (
              <PictureButton
                key={s}
                label={withNew(shellT(slotLine(s)), isNew)}
                selected={s === slot}
                tone="brand"
                size={4.5}
                className={styles.marked}
                onClick={() => {
                  setSlot(s);
                  setOpened((was) => new Set(was).add(s));
                  void voice.say(slotLine(s));
                }}
              >
                <SlotPicture slot={s} look={look} />
                {isNew && <NewStar />}
              </PictureButton>
            );
          })}
        </div>
        <ul className={styles.choices} aria-label={shellT(slotLine(slot))}>
          {choices.map((item) => (
            <li key={item ?? "none"}>
              <PictureButton
                label={withNew(
                  itemLabel(slot, item),
                  item !== null && fresh.has(item),
                )}
                selected={look[slot] === item}
                size={5.5}
                className={styles.marked}
                onClick={() => pick(item)}
              >
                {item ? (
                  <ItemPicture item={item} size={72} />
                ) : (
                  <Icon name="ban" size={40} />
                )}
                {item !== null && fresh.has(item) && <NewStar />}
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

/** The new outfit pieces in a slot. Skin tones and hair are never new. */
function newIn(slot: Slot, fresh: ReadonlySet<string>): string[] {
  return (itemsIn(slot) as string[]).filter((id) => fresh.has(id));
}

/** "Hats, new": the star is a picture, so its button's name says it. */
function withNew(label: string, isNew: boolean) {
  return isNew ? `${label}, ${shellT("is-new")}` : label;
}

/** A small star at a button's top right, for something new in it. */
function NewStar() {
  return (
    <span className={styles.newStar} aria-hidden>
      <Icon name="star" size={16} />
    </span>
  );
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
