// Google's own sign-in button (Google Identity Services), in redirect mode:
// tapping it leaves for Google, which posts the ID token to the API's student
// sign-in, which sends the browser back to the shell's sign-in page. Unlike
// the pop-up the teacher app uses, it works where school Chromebooks block
// pop-ups. Not covered by tests: the shell's tests use a stand-in button.
import { type ComponentType, useEffect, useRef, useState } from "react";
import type { SignInButtonProps } from "../ports.ts";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        ux_mode: "redirect";
        login_uri: string;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: Record<string, string | number>,
      ): void;
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

export function googleSignInButton(options: {
  clientId: string | undefined;
  /** The API's student sign-in, as a full URL. Must be one of the OAuth client's authorised redirect URIs. */
  loginUri: string;
}): ComponentType<SignInButtonProps> {
  return function GoogleSignInButton({ onUnavailable }) {
    const parent = useRef<HTMLDivElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      if (failed) onUnavailable();
    }, [failed, onUnavailable]);

    useEffect(() => {
      if (!options.clientId) {
        console.error(
          "[play] VITE_GOOGLE_CLIENT_ID isn't set, so there's no sign-in button. See apps/play/README.md.",
        );
        setFailed(true);
        return;
      }
      const clientId = options.clientId;
      let cancelled = false;
      loadGoogle().then(
        (google) => {
          if (cancelled || !parent.current) return;
          google.accounts.id.initialize({
            client_id: clientId,
            ux_mode: "redirect",
            login_uri: options.loginUri,
          });
          google.accounts.id.renderButton(parent.current, {
            type: "standard",
            theme: "filled_blue",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 260,
          });
        },
        (error: unknown) => {
          console.error("[play]", error);
          if (!cancelled) setFailed(true);
        },
      );
      return () => {
        cancelled = true;
      };
    }, []);

    // Google's largest button is 44px tall; zoomed so it's a big, easy
    // target for young children (64px, like the shell's other buttons).
    return <div ref={parent} style={{ zoom: 1.45 }} />;
  };
}
