import { Button } from "@repo/ui/button";
import { Container } from "@repo/ui/container";
import { Loader } from "@repo/ui/loader";
import { Wordmark } from "@repo/ui/marketing/wordmark";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  type Account,
  CredentialRejected,
  type Platform,
} from "../platform/ports.ts";
import classes from "./app.module.css";
import { ClassesScreen } from "./Classes.tsx";

export interface AppProps {
  platform: Platform;
}

type Screen =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "signed-out"; rejected?: boolean; busy?: boolean }
  | { kind: "signed-in"; account: Account };

export function App({ platform }: AppProps) {
  const { teacher, SignInButton } = platform;
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });

  const load = useCallback(() => {
    setScreen({ kind: "loading" });
    teacher.account().then(
      (account) =>
        setScreen(
          account ? { kind: "signed-in", account } : { kind: "signed-out" },
        ),
      (error: unknown) => {
        console.error("[teach] Couldn't check who's signed in", error);
        setScreen({ kind: "error" });
      },
    );
  }, [teacher]);
  useEffect(load, [load]);

  const signIn = useCallback(
    (credential: string) => {
      setScreen({ kind: "signed-out", busy: true });
      teacher.signIn(credential).then(
        (account) => setScreen({ kind: "signed-in", account }),
        (error: unknown) => {
          if (error instanceof CredentialRejected)
            return setScreen({ kind: "signed-out", rejected: true });
          console.error("[teach] Couldn't sign in", error);
          setScreen({ kind: "error" });
        },
      );
    },
    [teacher],
  );

  const signOut = useCallback(() => {
    setScreen({ kind: "loading" });
    teacher.signOut().then(
      () => setScreen({ kind: "signed-out" }),
      (error: unknown) => {
        console.error("[teach] Couldn't sign out", error);
        setScreen({ kind: "error" });
      },
    );
  }, [teacher]);

  switch (screen.kind) {
    case "loading":
      return (
        <Centered>
          <Loader label="Loading" />
        </Centered>
      );
    case "error":
      return (
        <Centered>
          <Title order={1} size="h2">
            Kindling can't be reached
          </Title>
          <Text>Check your connection, then try again.</Text>
          <Button tone="educator" onClick={load}>
            Try again
          </Button>
        </Centered>
      );
    case "signed-out":
      return (
        <Centered>
          <Wordmark size="lg" />
          <Title order={1} size="h2">
            Sign in to Kindling for teachers
          </Title>
          <Text>Use your school Google account.</Text>
          {screen.busy ? (
            <Loader label="Signing in" size="md" />
          ) : (
            <SignInButton onCredential={signIn} />
          )}
          {screen.rejected && (
            <Text c="muted">That sign-in didn't work. Try again.</Text>
          )}
        </Centered>
      );
    case "signed-in":
      return screen.account.role === "teacher" ? (
        <SignedIn account={screen.account} onSignOut={signOut}>
          <ClassesScreen teacher={teacher} />
        </SignedIn>
      ) : (
        <Centered>
          <Title order={1} size="h2">
            This is for teachers
          </Title>
          <Text>
            You're signed in with a student account. To use Kindling for
            teachers, sign out and sign in with your teacher account.
          </Text>
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </Centered>
      );
  }
}

function SignedIn({
  account,
  onSignOut,
  children,
}: {
  account: Account;
  onSignOut(): void;
  children: ReactNode;
}) {
  const name = [
    account.firstName,
    account.lastInitial && `${account.lastInitial}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <header className={classes.header}>
        <Wordmark />
        <div className={classes.account}>
          {name && <Text size="sm">{name}</Text>}
          <Button variant="subtle" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className={classes.main}>
        <Container>{children}</Container>
      </main>
    </>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className={classes.centered}>
      <Stack align="center">{children}</Stack>
    </main>
  );
}
