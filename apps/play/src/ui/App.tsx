import { Portrait } from "@repo/avatar/portrait";
import type {
  AvatarExpression,
  GameManifest,
  GameProps,
} from "@repo/game-contract";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameRegistry } from "../games.ts";
import type { AvatarLook, Platform } from "../platform/ports.ts";
import { boot, type ReadyPlay } from "../play/boot.ts";
import type { OutboxOptions } from "../play/outbox.ts";
import type { Ending } from "../play/play.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { translator } from "../play/strings.ts";
import { createVoice, type Voice, type VoiceOptions } from "../play/voice.ts";
import { resolveLineUrl } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { type ShellStringId, shellStrings } from "./shell-strings.ts";

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
  /** Browser speech, replaceable in tests. */
  speak?: VoiceOptions["speak"];
  /** How long ending a play waits for attempts to send before leaving anyway. */
  finishTimeoutMs?: number;
  /** Batching and retry timings, for tests. */
  outboxTiming?: Pick<OutboxOptions, "batchDelayMs" | "retryDelaysMs">;
}

type Screen =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "playing"; ready: ReadyPlay }
  | { kind: "ending"; ready: ReadyPlay }
  | { kind: "end-screen"; ready: ReadyPlay; ending: Ending };

const shellT = translator(shellStrings, "en-CA") as (
  id: ShellStringId,
) => string;

export function App(props: AppProps) {
  const { url, base, platform, games, storage, navigate, newId, outboxTiming } =
    props;
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let ready: ReadyPlay | undefined;
    boot({ url, base, platform, games, storage, newId, outboxTiming }).then(
      (result) => {
        if (cancelled) {
          if (result.kind === "ready")
            for (const outbox of result.ready.outboxes) outbox.dispose();
          return;
        }
        if (result.kind === "sign-in") return navigate(result.url);
        if (result.kind === "not-found")
          return setScreen({ kind: "not-found" });
        ready = result.ready;
        setScreen({ kind: "playing", ready });
      },
      (error: unknown) => {
        console.error("[play] Couldn't start the game", error);
        if (!cancelled) setScreen({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
      for (const outbox of ready?.outboxes ?? []) outbox.dispose();
    };
  }, [url, base, platform, games, storage, navigate, newId, outboxTiming]);

  // Send attempts as soon as the connection is back, and before the tab is hidden.
  const ready = "ready" in screen ? screen.ready : undefined;
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      for (const outbox of ready.outboxes) void outbox.flush();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ready]);

  const end = useCallback(
    (ready: ReadyPlay, ending: Ending) => {
      setScreen({ kind: "ending", ready });
      void ready.play.end(ending, props.finishTimeoutMs).then((exit) => {
        if (exit.kind === "hub") navigate(exit.url);
        else setScreen({ kind: "end-screen", ready, ending: exit.ending });
      });
    },
    [navigate, props.finishTimeoutMs],
  );

  switch (screen.kind) {
    case "loading":
      return <Message text={shellT("loading")} busy />;
    case "not-found":
      return <Message text={shellT("not-found")} />;
    case "error":
      return (
        <Message text={shellT("error")}>
          <IconButton
            label={shellT("try-again")}
            onClick={() => navigate(url.href)}
          >
            <Icon name="replay" size={32} />
          </IconButton>
        </Message>
      );
    case "playing":
    case "ending":
      return (
        <PlayScreen
          ready={screen.ready}
          ending={screen.kind === "ending"}
          onEnd={end}
          speak={props.speak}
        />
      );
    case "end-screen":
      return (
        <EndScreen
          ending={screen.ending}
          look={screen.ready.student.look}
          onPlayAgain={() => navigate(`${base}${screen.ready.link.slug}`)}
          speak={props.speak}
        />
      );
  }
}

function PlayScreen({
  ready,
  ending,
  onEnd,
  speak,
}: {
  ready: ReadyPlay;
  ending: boolean;
  onEnd(ready: ReadyPlay, ending: Ending): void;
  speak?: VoiceOptions["speak"];
}) {
  const { game, student, tier, play } = ready;
  const [hasLine, setHasLine] = useState(false);
  const [asking, setAsking] = useState(false);
  const voice = useMemo<Voice>(
    () =>
      createVoice({
        text: translator(game.manifest.strings, student.locale),
        locale: student.locale,
        lineUrl: (id) => resolveLineUrl(game, student.locale, id),
        speak,
      }),
    [game, student, speak],
  );
  useEffect(() => () => voice.stop(), [voice]);

  // Games re-render often; give them props that only change when they must.
  const ended = useRef(false);
  const endOnce = useCallback(
    (how: Ending) => {
      if (ended.current) return;
      ended.current = true;
      onEnd(ready, how);
    },
    [onEnd, ready],
  );
  const props = useMemo<GameProps<GameManifest>>(
    () => ({
      tier,
      locale: student.locale,
      Avatar: avatarFor(student.look),
      t: translator(game.manifest.strings, student.locale),
      say(...ids) {
        voice.say(...ids);
        setHasLine(true);
      },
      onAttempt: (attempt) => play.record(attempt),
      onFinish: () => endOnce("finished"),
    }),
    [game, student, tier, play, voice, endOnce],
  );

  return (
    <main className={classes.play} aria-busy={ending}>
      <div className={classes.controls}>
        <IconButton
          tone="neutral"
          label={shellT("leave")}
          onClick={() => {
            voice.stop();
            setAsking(true);
          }}
          disabled={ending}
        >
          <Icon name="leave" size={32} />
        </IconButton>
        <IconButton
          tone="neutral"
          label={shellT("hear-again")}
          onClick={() => voice.again()}
          disabled={!hasLine}
        >
          <Icon name="speaker" size={32} />
        </IconButton>
      </div>
      <div className={classes.game}>
        <ErrorBoundary
          onError={(error) => {
            console.error(`[play] ${game.manifest.slug} crashed`, error);
            void play.end("crashed");
          }}
          fallback={<Message text={shellT("error")} />}
        >
          <game.Component {...props} />
        </ErrorBoundary>
      </div>
      {asking && !ending && (
        <LeaveQuestion
          look={student.look}
          speak={speak}
          onStay={() => setAsking(false)}
          onLeave={() => endOnce("left")}
        />
      )}
      {ending && <Message text={shellT("saving")} busy overlay />}
    </main>
  );
}

/** The game contract's Avatar prop: the student's portrait, already dressed in their look. */
function avatarFor(look: AvatarLook) {
  return function StudentAvatar({
    expression,
    size,
  }: {
    expression: AvatarExpression;
    size: number;
  }) {
    return (
      <Portrait
        look={look}
        expression={expression}
        size={size}
        label={shellT("avatar")}
      />
    );
  };
}

/** Says one of the shell's own lines when it appears. */
function useShellLine(id: ShellStringId, speak?: VoiceOptions["speak"]) {
  useEffect(() => {
    const voice = createVoice({
      text: shellT as (id: string) => string,
      locale: "en-CA",
      speak,
    });
    voice.say(id);
    return () => voice.stop();
  }, [id, speak]);
}

/**
 * Asks before leaving, so a stray tap doesn't end a play. Usable without
 * reading: the question is spoken, and the answers are a play icon and the
 * same door icon the student just tapped.
 */
function LeaveQuestion({
  look,
  speak,
  onStay,
  onLeave,
}: {
  look: AvatarLook;
  speak?: VoiceOptions["speak"];
  onStay(): void;
  onLeave(): void;
}) {
  useShellLine("leave-question", speak);
  const stay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    stay.current?.querySelector("button")?.focus();
  }, []);
  return (
    <div
      className={`${classes.message} ${classes.overlay}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-question"
      onKeyDown={(event) => {
        if (event.key === "Escape") onStay();
      }}
    >
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression="encouraging"
          size={120}
          label={shellT("avatar")}
        />
        <Text size="xl">
          <span id="leave-question">{shellT("leave-question")}</span>
        </Text>
        <div className={classes.choices}>
          <div ref={stay}>
            <IconButton
              tone="student"
              label={shellT("keep-playing")}
              onClick={onStay}
            >
              <Icon name="play" size={32} />
            </IconButton>
          </div>
          <IconButton tone="neutral" label={shellT("leave")} onClick={onLeave}>
            <Icon name="leave" size={32} />
          </IconButton>
        </div>
      </Stack>
    </div>
  );
}

function EndScreen({
  ending,
  look,
  onPlayAgain,
  speak,
}: {
  ending: Ending;
  look: AvatarLook;
  onPlayAgain(): void;
  speak?: VoiceOptions["speak"];
}) {
  const line = ending === "finished" ? "complete" : "left";
  useShellLine(line, speak);
  return (
    <main className={classes.message}>
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression={ending === "finished" ? "cheering" : "happy"}
          size={160}
          label={shellT("avatar")}
        />
        <Title order={1} size="h2">
          {shellT(line)}
        </Title>
        <IconButton label={shellT("play-again")} onClick={onPlayAgain}>
          <Icon name="replay" size={32} />
        </IconButton>
      </Stack>
    </main>
  );
}

function Message({
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
