import { Sky } from "@repo/ui/marketing/sky";
import { useMemo } from "react";
import type { GameRegistry } from "../games.ts";
import type { Platform } from "../platform/ports.ts";
import type { OutboxOptions } from "../play/outbox.ts";
import { parseRoute } from "../play/routes.ts";
import type { KeyValueStore } from "../play/storage.ts";
import type { VoiceOptions } from "../play/voice.ts";
import type { LineMap } from "../play/voice-lines.ts";
import { ClassTimer } from "./ClassTimer.tsx";
import { GamePage, type GameSetup } from "./GamePage.tsx";
import {
  GradePick,
  HomePage,
  JoinPage,
  LockerPage,
  SignInPage,
  WardrobePage,
} from "./Home.tsx";
import type { LockerTiming } from "./Locker.tsx";
import { ShellFrame } from "./ShellFrame.tsx";
import { Message, shellT } from "./shared.tsx";
import { AvatarDesign } from "./Wardrobe.tsx";

export interface AppProps {
  url: URL;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  platform: Platform;
  games: GameRegistry;
  storage: KeyValueStore | null;
  /** Leaves the shell for another page. */
  navigate(url: string): void;
  newId(): string;
  /** The recordings of the shell's own lines; lines without one use browser speech. */
  shellLines?: LineMap;
  /** Each game's recorded title, by slug; a game without one is said by browser speech. */
  titleLines?: LineMap;
  /** Browser speech, replaceable in tests. */
  speak?: VoiceOptions["speak"];
  /** How long ending a play waits for attempts to send before leaving anyway. */
  finishTimeoutMs?: number;
  /** How long the locker's door swings and a new keepsake's moment lasts, for tests. */
  lockerTiming?: LockerTiming;
  /** Batching and retry timings, for tests. */
  outboxTiming?: Pick<OutboxOptions, "batchDelayMs" | "retryDelaysMs">;
}

/**
 * The shell: home, joining a class, sign-in, or a game, by the URL.
 * On a screen too small to play on, a block covers it all; the page stays
 * underneath as it was, inert and silent, until the screen is big enough.
 * Once a class timer runs out, "Time's up" covers it all the same way.
 */
export function App(props: AppProps) {
  return (
    <ShellFrame
      shellLines={props.shellLines}
      titleLines={props.titleLines}
      speak={props.speak}
    >
      <RoutedScreen {...props} />
    </ShellFrame>
  );
}

function RoutedScreen(props: AppProps) {
  const route = useMemo(
    () => parseRoute(props.url, props.base),
    [props.url, props.base],
  );
  const screen = (() => {
    switch (route?.kind) {
      case "home":
        return <HomePage {...props} />;
      case "join":
        return <JoinPage {...props} joinCode={route.joinCode} />;
      case "sign-in":
        return <SignInPage {...props} />;
      case "wardrobe":
        return <WardrobePage {...props} />;
      case "locker":
        return <LockerPage {...props} />;
      case "game":
        return <GamePage {...props} setup={studentSetup(props)} />;
      case undefined:
        return <Message text={shellT("not-found")} />;
    }
  })();
  // Everywhere but a game and sign-in, which has its own night sky, the
  // shell's pages sit on the light, glinting sky.
  const sky = route?.kind !== "game" && route?.kind !== "sign-in";
  // Signed out, there's no student for a timer to be for.
  const timer = route?.kind === "sign-in" ? undefined : props.platform.timer;
  return (
    <ClassTimer
      port={timer}
      storage={props.storage}
      corner={route?.kind !== "game"}
      speak={props.speak}
    >
      {sky && <Sky variant="day" playful fixed />}
      {screen}
    </ClassTimer>
  );
}

/** What a student on the real platform may have to do before a game opens. */
function studentSetup(props: AppProps): GameSetup {
  const { platform, speak } = props;
  return {
    design: (student, onDone, onError) => (
      <AvatarDesign
        mode="first"
        student={student}
        platform={platform}
        speak={speak}
        onDone={onDone}
        onError={onError}
      />
    ),
    pickGrade: (student, membership, onPicked, onError) => (
      <GradePick
        student={student}
        membership={membership}
        platform={platform}
        speak={speak}
        onPicked={onPicked}
        onError={onError}
      />
    ),
  };
}
