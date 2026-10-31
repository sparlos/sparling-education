// The real platform: the platform's API on this domain, and Google sign-in.
import { setBaseUrl } from "@repo/api-client";
import type { Platform } from "../ports.ts";
import { googleSignInButton } from "./google-button.tsx";
import { apiHome } from "./home.ts";
import { apiLinks } from "./links.ts";
import { apiMemberships } from "./memberships.ts";
import { apiRecords } from "./records.ts";
import { apiSession } from "./session.ts";

export function createApiPlatform(options: {
  /** Where the API is served on this domain, e.g. "/api". */
  apiBase: string;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  /** The site the shell is on, which Google sends the student back to. */
  origin: string;
  googleClientId: string | undefined;
}): Platform {
  setBaseUrl(options.apiBase);
  return {
    name: "api",
    session: apiSession(),
    memberships: apiMemberships(),
    home: apiHome(),
    records: apiRecords(),
    links: apiLinks(options),
    SignInButton: googleSignInButton({
      clientId: options.googleClientId,
      loginUri: new URL(`${options.apiBase}/sign-in/student`, options.origin)
        .href,
    }),
  };
}
