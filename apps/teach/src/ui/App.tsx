import { brandName } from "@repo/tokens";
import { Button } from "@repo/ui/button";
import { Loader } from "@repo/ui/loader";
import { SignInStage } from "@repo/ui/marketing/sign-in-stage";
import { type RouterHistory, RouterProvider } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  type Account,
  CredentialRejected,
  type Platform,
  type TeacherPort,
} from "../platform/ports.ts";
import { teacherRouter } from "./routes.tsx";

export interface AppProps {
  platform: Platform;
  /** The browser's history by default; tests pass a memory history. */
  history?: RouterHistory;
}

type Screen =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "signed-out"; rejected?: boolean; busy?: boolean }
  | { kind: "signed-in"; account: Account };

/**
 * Signing in, then the screens at their URLs. Signed out, every URL shows
 * sign-in, and stays put, so signing in opens the screen it asked for.
 */
export function App({ platform, history }: AppProps) {
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
        <SignInStage heading={`Welcome to ${brandName}`}>
          <Loader label="Loading" />
        </SignInStage>
      );
    case "error":
      return (
        <SignInStage
          heading={`${brandName} can't be reached`}
          lead="Check your connection, then try again."
        >
          <Button tone="educator" onClick={load}>
            Try again
          </Button>
        </SignInStage>
      );
    case "signed-out":
      return (
        <SignInStage
          heading="Sign in"
          lead="Use your school Google account."
          note={
            screen.rejected ? "That sign-in didn't work. Try again." : undefined
          }
        >
          {screen.busy ? (
            <Loader label="Signing in" size="md" />
          ) : (
            <SignInButton onCredential={signIn} />
          )}
        </SignInStage>
      );
    case "signed-in":
      return screen.account.role === "teacher" ? (
        <Screens
          teacher={teacher}
          account={screen.account}
          onSignOut={signOut}
          history={history}
        />
      ) : (
        <SignInStage
          heading="This is for teachers"
          lead={`You're signed in with a student account. To use ${brandName} for teachers, sign out and sign in with your teacher account.`}
        >
          <Button variant="secondary" onClick={signOut}>
            Sign out
          </Button>
        </SignInStage>
      );
  }
}

/** The signed-in teacher's screens, by URL, with a fresh router each sign-in. */
function Screens({
  teacher,
  account,
  onSignOut,
  history,
}: {
  teacher: TeacherPort;
  account: Account;
  onSignOut(): void;
  history?: RouterHistory;
}) {
  const [router] = useState(() =>
    teacherRouter({ teacher, account, onSignOut, history }),
  );
  return <RouterProvider router={router} />;
}
