// The student's side of the shell outside games: home (after designing
// their avatar, the first time), with any new rewards revealed and a small
// picture of their locker, the wardrobe, the locker, joining a class by its join
// link (and picking a grade in a split class), and sign-in. Every
// label is also spoken, so a Grade 3 student can use it without reading.
import { Portrait } from "@repo/avatar/portrait";
import { Button } from "@repo/ui/button";
import { ClassColourScope } from "@repo/ui/class-colour-scope";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Loader } from "@repo/ui/loader";
import { SignInStage } from "@repo/ui/marketing/sign-in-stage";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { ThemeIcon } from "@repo/ui/theme-icon";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { type ReactNode, useEffect, useState } from "react";
import type { GameRegistry } from "../games.ts";
import {
  type DressedStudent,
  type Home as HomeContents,
  type Membership,
  NoSuchClass,
  NotAStudent,
  type Platform,
  type Student,
} from "../platform/ports.ts";
import {
  homeGamePath,
  returnPath,
  shellPath,
  wardrobePath,
} from "../play/routes.ts";
import { readJson, remove, writeJson } from "../play/storage.ts";
import type { VoiceOptions } from "../play/voice.ts";
import type { AppProps } from "./App.tsx";
import classes from "./app.module.css";
import styles from "./home.module.css";
import { HomeCardPicture } from "./home-art.tsx";
import { Locker, SmallLocker } from "./Locker.tsx";
import { Reveal } from "./Reveal.tsx";
import {
  gameLine,
  Message,
  nameLine,
  Question,
  SpokenMessage,
  shellT,
  ToHome,
  useShellLine,
  useShellVoice,
} from "./shared.tsx";
import type { ShellStringId } from "./shell-strings.ts";
import { AvatarDesign } from "./Wardrobe.tsx";

type Signed =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "not-a-student" }
  | { kind: "ready"; student: Student };

/** The signed-in student. Sends a signed-out one to sign-in, coming back here. */
function useStudent({ platform, url, navigate }: AppProps) {
  const [state, setState] = useState<Signed>({ kind: "loading" });
  useEffect(() => {
    let cancelled = false;
    platform.session.current().then(
      (student) => {
        if (cancelled) return;
        if (!student) return navigate(platform.links.signIn(returnPath(url)));
        setState({ kind: "ready", student });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof NotAStudent)
          return setState({ kind: "not-a-student" });
        console.error("[play] Couldn't check who's signed in", error);
        setState({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [platform, url, navigate]);
  return [state, setState] as const;
}

/** What to show until there's a student. */
function NotReady({
  state,
  url,
  navigate,
  speak,
}: {
  state: Exclude<Signed, { kind: "ready" }>;
  url: URL;
  navigate(url: string): void;
  speak?: VoiceOptions["speak"];
}) {
  switch (state.kind) {
    case "loading":
      return <Message text={shellT("opening-home")} busy />;
    case "error":
      return <TryAgain url={url} navigate={navigate} />;
    case "not-a-student":
      return <SpokenMessage line="for-students" speak={speak} />;
  }
}

function TryAgain({
  url,
  navigate,
}: {
  url: URL;
  navigate(url: string): void;
}) {
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
}

/**
 * Home, after the student designs their avatar, the first time, and
 * picks their grade in any split class that needs one.
 */
export function HomePage(props: AppProps) {
  const [state, setState] = useStudent(props);
  if (state.kind !== "ready") return <NotReady state={state} {...props} />;

  const { student } = state;
  if (!student.look)
    return (
      <AvatarDesign
        mode="first"
        student={student}
        platform={props.platform}
        speak={props.speak}
        onDone={(look) =>
          setState({ kind: "ready", student: { ...student, look } })
        }
        onError={() => setState({ kind: "error" })}
      />
    );
  const dressed: DressedStudent = { ...student, look: student.look };
  const unpicked = student.classes.find((m) => m.grade === null);
  if (unpicked)
    return (
      <GradePick
        key={unpicked.classId}
        student={dressed}
        membership={unpicked}
        platform={props.platform}
        speak={props.speak}
        onPicked={(picked) =>
          setState({
            kind: "ready",
            student: {
              ...student,
              classes: student.classes.map((m) =>
                m.classId === picked.classId ? picked : m,
              ),
            },
          })
        }
        onError={() => setState({ kind: "error" })}
      />
    );
  return (
    <Home
      student={dressed}
      base={props.base}
      games={props.games}
      platform={props.platform}
      speak={props.speak}
    />
  );
}

/**
 * What the student has at home, or null when it couldn't be read: home
 * still opens, just without stickers or a reveal.
 */
function useHomeContents(platform: Platform) {
  const [contents, setContents] = useState<HomeContents | null | "loading">(
    "loading",
  );
  useEffect(() => {
    let cancelled = false;
    platform.home.current().then(
      (found) => {
        if (!cancelled) setContents(found);
      },
      (error: unknown) => {
        if (cancelled) return;
        console.error("[play] Couldn't open what's at home", error);
        setContents(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [platform]);
  return contents;
}

function Home({
  student,
  base,
  games,
  platform,
  speak,
}: {
  student: DressedStudent;
  base: string;
  games: GameRegistry;
  platform: Platform;
  speak?: VoiceOptions["speak"];
}) {
  const voice = useShellVoice(student.locale, speak);
  const contents = useHomeContents(platform);
  const [revealed, setRevealed] = useState(false);
  const unseen =
    contents === "loading" || contents === null ? [] : contents.unseen;
  const revealing = unseen.length > 0 && !revealed;
  // New rewards are said first; home's own line once they're put away.
  const settled = contents !== "loading" && !revealing;
  // Each class the student plays in, with the games of it this shell hosts.
  const sections = student.classes
    .filter((m) => m.grade !== null)
    .map((membership) => ({
      membership,
      games: membership.games.filter((g) => Object.hasOwn(games, g.slug)),
    }))
    .filter((section) => section.games.length > 0);
  const line = sections.length > 0 ? "pick-game" : "no-games";
  useEffect(() => {
    if (settled) void voice.say(line);
  }, [voice, line, settled]);

  const putAway = () => {
    setRevealed(true);
    platform.home.markSeen(unseen).catch((error: unknown) => {
      // They stay new, and are revealed again next time.
      console.error("[play] Couldn't mark rewards as seen", error);
    });
  };

  // "Hear it again" repeats the instruction, never the last name heard.
  const hear = (name: string, line: string) => (
    <IconButton
      tone="neutral"
      label={`${shellT("hear")} ${name}`}
      onClick={() => void voice.say(line)}
    >
      <Icon name="speaker" size={24} />
    </IconButton>
  );

  return (
    <>
      <main className={styles.home} inert={revealing}>
        <VisuallyHidden>
          <h1>{shellT("home")}</h1>
        </VisuallyHidden>
        <div className={`${styles.header} ${styles.card}`}>
          <a
            href={wardrobePath(base)}
            className={styles.wardrobeLink}
            aria-label={shellT("change-clothes")}
            title={shellT("change-clothes")}
            data-tone="brand"
          >
            <Portrait
              look={student.look}
              expression="happy"
              size={112}
              label={shellT("avatar")}
            />
            <span className={styles.wardrobeBadge}>
              <Icon name="avatar" size={24} />
            </span>
          </a>
          <SmallLocker
            base={base}
            home={contents === "loading" ? null : contents}
          />
          <Text size="xl" className={styles.instruction}>
            {shellT(line)}
          </Text>
          <IconButton
            tone="neutral"
            label={shellT("hear-again")}
            onClick={() => void voice.say(line)}
          >
            <Icon name="speaker" size={32} />
          </IconButton>
        </div>
        {sections.map(({ membership, games }) => {
          const headingId = `class-${membership.classId}`;
          return (
            <ClassColourScope
              key={membership.classId}
              colour={membership.classColour}
              as="section"
              className={styles.section}
              aria-labelledby={sections.length > 1 ? headingId : undefined}
            >
              {sections.length > 1 && (
                <div className={styles.classHeading}>
                  <ThemeIcon tone="accent" size="md">
                    <Icon name="grid" size={24} />
                  </ThemeIcon>
                  <Title order={2} size="h3" id={headingId}>
                    {membership.className}
                  </Title>
                  {hear(membership.className, nameLine(membership.className))}
                </div>
              )}
              <ul className={styles.games}>
                {games.map((game) => (
                  <li key={game.slug} className={styles.game}>
                    <a
                      href={homeGamePath(base, game.slug, membership.classId)}
                      className={styles.gameCard}
                    >
                      <span className={styles.picture}>
                        <HomeCardPicture slug={game.slug} />
                      </span>
                      <span className={styles.gameName}>
                        <span className={styles.play} aria-hidden="true">
                          <Icon name="play" size={20} />
                        </span>
                        {game.name}
                      </span>
                    </a>
                    {hear(game.name, gameLine(game.slug, game.name))}
                  </li>
                ))}
              </ul>
            </ClassColourScope>
          );
        })}
      </main>
      {revealing && (
        <Reveal
          rewards={unseen}
          look={student.look}
          speak={speak}
          onDone={putAway}
        />
      )}
    </>
  );
}

/**
 * A student in a split class taps their grade, once: from home, or
 * first thing after a game link joins them to the class. A tapped grade is
 * asked back ("Are you in Grade 4?") with a smiley for yes and a sad face
 * for no, since it can't be undone without the teacher.
 */
export function GradePick({
  student,
  membership,
  platform,
  speak,
  onPicked,
  onError,
}: {
  student: DressedStudent;
  membership: Membership;
  platform: Platform;
  speak?: VoiceOptions["speak"];
  onPicked(membership: Membership): void;
  onError(): void;
}) {
  const voice = useShellVoice(student.locale, speak);
  const [asking, setAsking] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    void voice.say("pick-grade");
  }, [voice]);

  // "No" asks again.
  const notThat = () => {
    setAsking(null);
    void voice.say("pick-grade");
  };

  const pick = (grade: number) => {
    setPicking(true);
    platform.memberships
      .pickGrade(membership.classId, grade)
      .then(onPicked, (error: unknown) => {
        console.error("[play] Couldn't set the grade", error);
        onError();
      });
  };

  return (
    <ClassColourScope
      as="main"
      colour={membership.classColour}
      className={classes.message}
    >
      {/* Out of reach while the question covers it. */}
      <div inert={asking !== null}>
        <Stack align="center" gap="lg">
          <Portrait
            look={student.look}
            expression="happy"
            size={120}
            label={shellT("avatar")}
          />
          <div className={styles.header}>
            <Title order={1} size="h2">
              {shellT("pick-grade")}
            </Title>
            <IconButton
              tone="neutral"
              label={shellT("hear-again")}
              onClick={() => voice.again()}
            >
              <Icon name="speaker" size={32} />
            </IconButton>
          </div>
          <div className={styles.grades}>
            {membership.grades.map((grade) => (
              <Button
                key={grade}
                size="lg"
                tone="accent"
                className={styles.gradeButton}
                disabled={picking}
                onClick={() => {
                  voice.stop();
                  setAsking(grade);
                }}
              >
                {shellT(gradeLine(grade))}
              </Button>
            ))}
          </div>
        </Stack>
      </div>
      {asking !== null && (
        <Question
          line={`${gradeLine(asking)}-sure` as ShellStringId}
          look={student.look}
          speak={speak}
          onCancel={notThat}
        >
          <IconButton
            tone="accent"
            label={shellT("yes")}
            disabled={picking}
            onClick={() => pick(asking)}
          >
            <Icon name="smile" size={48} />
          </IconButton>
          <IconButton
            tone="neutral"
            label={shellT("no")}
            disabled={picking}
            onClick={notThat}
          >
            <Icon name="sad" size={48} />
          </IconButton>
        </Question>
      )}
    </ClassColourScope>
  );
}

const gradeLine = (grade: number) => `grade-${grade}` as ShellStringId;

/** The wardrobe: the student changes their avatar's look, then goes back home. */
export function WardrobePage(props: AppProps) {
  const { base, navigate } = props;
  const [state, setState] = useStudent(props);
  if (state.kind !== "ready") return <NotReady state={state} {...props} />;
  return (
    <AvatarDesign
      mode={state.student.look ? "wardrobe" : "first"}
      student={state.student}
      platform={props.platform}
      speak={props.speak}
      onDone={() => navigate(base)}
      onBack={() => navigate(base)}
      onError={() => setState({ kind: "error" })}
    />
  );
}

/** The locker: the student decorates it, then goes back home. */
export function LockerPage(props: AppProps) {
  const [state] = useStudent(props);
  if (state.kind !== "ready") return <NotReady state={state} {...props} />;
  return <LockerOpening {...props} student={state.student} />;
}

function LockerOpening(props: AppProps & { student: Student }) {
  const { platform, base, navigate } = props;
  const contents = useHomeContents(platform);
  if (contents === "loading")
    return <Message text={shellT("opening-locker")} busy />;
  if (contents === null) return <TryAgain {...props} />;
  return (
    <Locker
      student={props.student}
      home={contents}
      platform={platform}
      speak={props.speak}
      timing={props.lockerTiming}
      onHome={() => navigate(base)}
    />
  );
}

/** The class join link: joins the class, then opens home. */
export function JoinPage(props: AppProps & { joinCode: string }) {
  const { platform, joinCode, base, navigate } = props;
  const [state] = useStudent(props);
  const [failed, setFailed] = useState<"no-such-class" | "error" | null>(null);

  useEffect(() => {
    if (state.kind !== "ready") return;
    let cancelled = false;
    platform.memberships.join(joinCode).then(
      () => {
        if (!cancelled) navigate(base);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof NoSuchClass) return setFailed("no-such-class");
        console.error("[play] Couldn't join the class", error);
        setFailed("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state, platform, joinCode, base, navigate]);

  if (state.kind !== "ready") return <NotReady state={state} {...props} />;
  if (failed === "error") return <TryAgain {...props} />;
  if (failed === "no-such-class")
    return (
      <SpokenMessage line="no-such-class" speak={props.speak}>
        <ToHome onClick={() => navigate(base)} />
      </SpokenMessage>
    );
  return <Message text={shellT("joining")} busy />;
}

// Where the student was headed when they were sent to sign in. Kept on the
// device, since the trip through Google can't carry it.
const nextKey = "sign-in.next";

/**
 * Google sign-in, on the real platform. Google brings the student back here
 * signed in, and this page sends them on to where they were headed.
 */
export function SignInPage({
  url,
  base,
  platform,
  storage,
  navigate,
  speak,
}: AppProps) {
  const [state, setState] = useState<
    "loading" | "signed-out" | "unavailable" | "not-a-student" | "error"
  >("loading");

  useEffect(() => {
    const next = shellPath(url.searchParams.get("next"), base);
    if (next) writeJson(storage, nextKey, next);
    let cancelled = false;
    platform.session.current().then(
      (student) => {
        if (cancelled) return;
        if (!student) return setState("signed-out");
        const headed = shellPath(readJson(storage, nextKey), base);
        remove(storage, nextKey);
        navigate(headed ?? base);
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof NotAStudent) return setState("not-a-student");
        console.error("[play] Couldn't check who's signed in", error);
        setState("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url, base, platform, storage, navigate]);

  const { SignInButton } = platform;
  const signedOut = state === "signed-out" && SignInButton;
  const line: ShellStringId =
    state === "loading"
      ? "loading"
      : state === "error"
        ? "error"
        : state === "not-a-student"
          ? "for-students"
          : state === "unavailable" || !SignInButton
            ? "sign-in-unavailable"
            : url.searchParams.has("failed")
              ? "sign-in-failed"
              : "sign-in";
  return (
    <SignInLine
      line={line}
      spoken={state !== "loading" && state !== "error"}
      speak={speak}
    >
      {state === "loading" ? (
        <Loader label={shellT("loading")} />
      ) : state === "error" ? (
        <IconButton
          label={shellT("try-again")}
          onClick={() => navigate(url.href)}
        >
          <Icon name="replay" size={32} />
        </IconButton>
      ) : signedOut ? (
        <SignInButton onUnavailable={() => setState("unavailable")} />
      ) : null}
    </SignInLine>
  );
}

/** The sign-in page's line, shown big on the welcome stage, and said aloud if `spoken`. */
function SignInLine({
  line,
  spoken,
  speak,
  children,
}: {
  line: ShellStringId;
  spoken: boolean;
  speak?: AppProps["speak"];
  children?: ReactNode;
}) {
  return (
    <>
      {spoken && <Say line={line} speak={speak} />}
      <SignInStage heading={shellT(line)} playful status>
        {children}
      </SignInStage>
    </>
  );
}

function Say({
  line,
  speak,
}: {
  line: ShellStringId;
  speak?: AppProps["speak"];
}) {
  useShellLine(line, speak);
  return null;
}
