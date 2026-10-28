// Google's own sign-in button (Google Identity Services). It hands over an
// ID token, which the API verifies. Not covered by tests: the app's tests
// use the fake platform's button.
import { Text } from "@repo/ui/text";
import { type ComponentType, useEffect, useRef, useState } from "react";
import type { SignInButtonProps } from "../ports.ts";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback(response: { credential: string }): void;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, string>): void;
    };
  };
}

const scriptUrl = "https://accounts.google.com/gsi/client";
let loading: Promise<GoogleIdentity> | undefined;

function loadGoogle() {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      const google = (window as { google?: GoogleIdentity }).google;
      if (google) resolve(google);
      else reject(new Error("Google sign-in didn't load"));
    };
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Google sign-in didn't load"));
    };
    document.head.append(script);
  });
  return loading;
}

export function googleSignInButton(
  clientId: string | undefined,
): ComponentType<SignInButtonProps> {
  return function GoogleSignInButton({ onCredential }) {
    const parent = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      if (!clientId) {
        console.error(
          "[teach] VITE_GOOGLE_CLIENT_ID isn't set, so there's no sign-in button. See apps/teach/README.md.",
        );
        setFailed(true);
        return;
      }
      let cancelled = false;
      loadGoogle().then(
        (google) => {
          if (cancelled || !parent.current) return;
          google.accounts.id.initialize({
            client_id: clientId,
            callback: ({ credential }) => onCredential(credential),
          });
          google.accounts.id.renderButton(parent.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "pill",
          });
        },
        (error: unknown) => {
          console.error("[teach]", error);
          if (!cancelled) setFailed(true);
        },
      );
      return () => {
        cancelled = true;
      };
    }, [onCredential]);

    if (failed)
      return <Text c="muted">Google sign-in isn't available right now.</Text>;
    return <div ref={parent} />;
  };
}
