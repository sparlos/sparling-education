// Pieces every screen of the shell uses: its own words, spoken, a centred
// message, and a question asked over the screen.
import { Portrait } from "@repo/avatar/portrait";
import type { AvatarExpression } from "@repo/game-contract";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import type { AvatarLook } from "../platform/ports.ts";
import { translator } from "../play/strings.ts";
import { createVoice, type Voice, type VoiceOptions } from "../play/voice.ts";
import type { LineMap } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { type ShellStringId, shellStrings } from "./shell-strings.ts";

export const shellT = translator(shellStrings, "en-CA") as (
  id: ShellStringId,
) => string;

/**
 * The recordings of the shell's own lines (`virtual:voice-lines/shell`, made
 * by `pnpm voice`). Lines without one use browser speech.
 */
export const ShellLines = createContext<LineMap>({});

// Names (of games and classes) are spoken as they are; everything else is a
// shell line by ID.
const namePrefix = "name:";

/** The line that says a name, which has no recording. */
export const nameLine = (name: string) => `${namePrefix}${name}`;

/** A voice for the shell's lines and for names, stopped when the screen goes. */
export function useShellVoice(
  locale: VoiceOptions["locale"],
  speak?: VoiceOptions["speak"],
): Voice {
  const lines = useContext(ShellLines);
  const voice = useMemo(
    () =>
      createVoice({
        text: (line) =>
          line.startsWith(namePrefix)
            ? line.slice(namePrefix.length)
            : shellT(line as ShellStringId),
        locale,
        lineUrl: (line) => lines[line],
        speak,
      }),
    [locale, lines, speak],
  );
  useEffect(() => () => voice.stop(), [voice]);
  return voice;
}

/** Says one of the shell's own lines when it appears. */
export function useShellLine(id: ShellStringId, speak?: VoiceOptions["speak"]) {
  const voice = useShellVoice("en-CA", speak);
  useEffect(() => {
    void voice.say(id);
  }, [voice, id]);
}

export function Message({
  text,
  busy = false,
  overlay = false,
  children,
}: {
  text: string;
  busy?: boolean;
  overlay?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        overlay ? `${classes.message} ${classes.overlay}` : classes.message
      }
      role="status"
    >
      <Stack align="center" gap="lg">
        {busy && <Loader label={text} />}
        <Text size="xl">{text}</Text>
        {children}
      </Stack>
    </div>
  );
}

/**
 * A question over the screen, usable without reading: it's spoken when it
 * appears and can be heard again, and the answers are icons. It covers the
 * screen, which the caller makes `inert` meanwhile. The first answer has
 * focus, Escape cancels, and focus goes back to what opened it.
 */
export function Question({
  line,
  look,
  expression = "encouraging",
  speak,
  onCancel,
  children,
}: {
  line: ShellStringId;
  look: AvatarLook;
  expression?: AvatarExpression;
  speak?: VoiceOptions["speak"];
  onCancel(): void;
  /** The answers. */
  children: ReactNode;
}) {
  const voice = useShellVoice("en-CA", speak);
  useEffect(() => {
    void voice.say(line);
  }, [voice, line]);
  const id = useId();
  const answers = useRef<HTMLDivElement>(null);
  // Read while rendering, before the screen behind goes inert and drops focus.
  const opener = useRef(document.activeElement);
  useEffect(() => {
    answers.current?.querySelector("button")?.focus();
    const back = opener.current;
    return () => {
      if (back instanceof HTMLElement) back.focus();
    };
  }, []);
  return (
    <div
      className={`${classes.message} ${classes.overlay}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression={expression}
          size={120}
          label={shellT("avatar")}
        />
        <div className={classes.question}>
          <Text size="xl">
            <span id={id}>{shellT(line)}</span>
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
        <div ref={answers} className={classes.choices}>
          {children}
        </div>
      </Stack>
    </div>
  );
}
