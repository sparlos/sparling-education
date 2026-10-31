// Pieces every screen of the shell uses: its own words, spoken, a centred
// message, a question asked over the screen, and the way home.
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
import {
  createVoice,
  type Voice,
  type VoiceGate,
  type VoiceOptions,
} from "../play/voice.ts";
import type { LineMap } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { type ShellStringId, shellStrings } from "./shell-strings.ts";

export const shellT = translator(shellStrings, "en-CA") as (
  id: ShellStringId,
) => string;

/** Recordings made by `pnpm voice`. Lines without one use browser speech. */
export interface ShellRecordings {
  /** The shell's own lines (`virtual:voice-lines/shell`). */
  shell: LineMap;
  /** Each game's title, by slug (`virtual:voice-titles`). */
  titles: LineMap;
}

export const noRecordings: ShellRecordings = { shell: {}, titles: {} };

export const ShellLines = createContext<ShellRecordings>(noRecordings);

/**
 * The gate every voice under it shares, so the too-small screen's line can
 * silence them all. Without one, nothing silences a voice.
 */
export const ShellVoiceGate = createContext<VoiceGate | undefined>(undefined);

// Names are spoken as they are; everything else is a shell line by ID. A
// game's name is its manifest's title, recorded with the game's lines; a
// class's name is the teacher's, so it never has a recording.
const namePrefix = "name:";
const gamePrefix = "game:";

/** The line that says a name, which has no recording. */
export const nameLine = (name: string) => `${namePrefix}${name}`;

/** The line that says a game's name: its recorded title, if it has one. */
export const gameLine = (slug: string, name: string) =>
  `${gamePrefix}${slug}:${name}`;

/** A game line's slug and name. Slugs never hold a colon. */
function parseGameLine(line: string) {
  const rest = line.slice(gamePrefix.length);
  const colon = rest.indexOf(":");
  return { slug: rest.slice(0, colon), name: rest.slice(colon + 1) };
}

function lineText(line: string): string {
  if (line.startsWith(namePrefix)) return line.slice(namePrefix.length);
  if (line.startsWith(gamePrefix)) return parseGameLine(line).name;
  return shellT(line as ShellStringId);
}

/** A voice for the shell's lines and for names, stopped when the screen goes. */
export function useShellVoice(
  locale: VoiceOptions["locale"],
  speak?: VoiceOptions["speak"],
): Voice {
  const recordings = useContext(ShellLines);
  const gate = useContext(ShellVoiceGate);
  const voice = useMemo(
    () =>
      createVoice({
        text: lineText,
        locale,
        lineUrl: (line) =>
          line.startsWith(gamePrefix)
            ? recordings.titles[parseGameLine(line).slug]
            : recordings.shell[line],
        speak,
        gate,
      }),
    [locale, recordings, speak, gate],
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

/** A message that's also said aloud when it appears. */
export function SpokenMessage({
  line,
  speak,
  children,
}: {
  line: ShellStringId;
  speak?: VoiceOptions["speak"];
  children?: ReactNode;
}) {
  useShellLine(line, speak);
  return <Message text={shellT(line)}>{children}</Message>;
}

/** The way out of a page that can't go on: to the student's home. */
export function ToHome({ onClick }: { onClick(): void }) {
  return (
    <IconButton label={shellT("to-home")} onClick={onClick}>
      <Icon name="student" size={32} />
    </IconButton>
  );
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
