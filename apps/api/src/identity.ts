// Who a Google sign-in says someone is. The API is given an IdentityVerifier,
// so tests use a fake one (test/fake-google.ts) instead of Google.

import {
  createRemoteJWKSet,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
  jwtVerify,
} from "jose";

/**
 * The claims of a verified Google ID token that the platform reads, plus the ones
 * it must never keep. Only `identityFrom` looks at them.
 */
export interface GoogleClaims {
  sub: string;
  given_name?: string;
  family_name?: string;
  // Never stored or logged; listed so tests can prove that.
  email?: string;
  name?: string;
  picture?: string;
}

export interface IdentityVerifier {
  /** The claims of a Google ID token, or null when it isn't a valid one for the platform. */
  verify(credential: string): Promise<GoogleClaims | null>;
}

/** Everything the platform keeps about a Google account. */
export interface Identity {
  /** Google's opaque, stable ID for the account. */
  subject: string;
  firstName: string;
  lastInitial: string;
}

export function identityFrom(claims: GoogleClaims): Identity {
  const [initial = ""] = claims.family_name ?? "";
  return {
    subject: claims.sub,
    firstName: claims.given_name?.trim() ?? "",
    lastInitial: initial.toLocaleUpperCase("en-CA"),
  };
}

const googleIssuers = ["https://accounts.google.com", "accounts.google.com"];
const googleKeys = new URL("https://www.googleapis.com/oauth2/v3/certs");

/**
 * Verifies ID tokens from Google sign-in for the platform's OAuth client: signed
 * by Google, issued to `clientId`, and unexpired. `keys` replaces Google's
 * published keys, for tests.
 */
export function googleIdentityVerifier(options: {
  clientId: string;
  keys?: JWTVerifyGetKey;
}): IdentityVerifier {
  const keys = options.keys ?? createRemoteJWKSet(googleKeys);
  const checks: JWTVerifyOptions = {
    issuer: googleIssuers,
    audience: options.clientId,
    algorithms: ["RS256"],
  };
  return {
    async verify(credential) {
      try {
        const { payload } = await jwtVerify(credential, keys, checks);
        if (typeof payload.sub !== "string") return null;
        return payload as GoogleClaims;
      } catch (error) {
        // Log only the code: jose's errors can carry the token's claims, email included.
        const code = String((error as { code?: unknown }).code);
        if (!isInvalidToken(code)) throw new Error(`Couldn't verify (${code})`);
        console.warn(`[api] Rejected a Google sign-in (${code})`);
        return null;
      }
    },
  };
}

// A bad token, as opposed to Google's keys being unreachable, which can be retried.
function isInvalidToken(code: string) {
  return (
    code.startsWith("ERR_JWT") ||
    code.startsWith("ERR_JWS") ||
    code === "ERR_JOSE_ALG_NOT_ALLOWED" ||
    code === "ERR_JWKS_NO_MATCHING_KEY" ||
    code === "ERR_JWKS_MULTIPLE_MATCHING_KEYS"
  );
}

/** For when no Google client is configured: every sign-in is rejected. */
export const noIdentityVerifier: IdentityVerifier = {
  async verify() {
    return null;
  },
};
