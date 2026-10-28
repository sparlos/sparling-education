// The real platform: Kindling's API on this domain, and Google sign-in.
import { setBaseUrl } from "@repo/api-client";
import type { Platform, PlayRecordsPort } from "../ports.ts";
import { googleSignInButton } from "./google-button.tsx";
import { apiLinks } from "./links.ts";
import { apiMemberships } from "./memberships.ts";
import { apiSession } from "./session.ts";

export function createApiPlatform(options: {
  /** Where the API is served on this domain, e.g. "/api". */
  apiBase: string;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  /** The site the shell is on, which Google sends the student back to. */
  origin: string;
  googleClientId: string | undefined;
  /** The API has no play-records endpoint yet (ticket 10), so the caller supplies one. */
  records: PlayRecordsPort;
}): Platform {
  setBaseUrl(options.apiBase);
  return {
    name: "api",
    session: apiSession(),
    memberships: apiMemberships(),
    records: options.records,
    links: apiLinks(options),
    SignInButton: googleSignInButton({
      clientId: options.googleClientId,
      loginUri: new URL(`${options.apiBase}/sign-in/student`, options.origin)
        .href,
    }),
  };
}
