// The real platform: the platform's API on this domain, and Google sign-in.
import { setBaseUrl } from "@repo/api-client";
import type { Platform } from "../ports.ts";
import { googleSignInButton } from "./google-button.tsx";
import { apiTeacherPort } from "./teacher.ts";

export function createApiPlatform(options: {
  /** Where the API is served on this domain, e.g. "/api". */
  apiBase: string;
  /** The site the teacher app is on, which links to share point at. */
  origin: string;
  googleClientId: string | undefined;
}): Platform {
  setBaseUrl(options.apiBase);
  return {
    name: "api",
    teacher: apiTeacherPort({ origin: options.origin }),
    SignInButton: googleSignInButton(options.googleClientId),
  };
}
