// Google sign-in for tests: hands out credentials for made-up Google accounts
// and verifies only those.

import { randomUUID } from "node:crypto";
import type { GoogleClaims, IdentityVerifier } from "../src/identity.ts";

export interface FakeGoogle {
  verifier: IdentityVerifier;
  /**
   * A credential for a Google account, as Google's sign-in button would hand
   * over. Unset claims get a made-up account, email and photo included.
   */
  credentialFor(claims?: Partial<GoogleClaims>): string;
}

export function fakeGoogle(): FakeGoogle {
  const issued = new Map<string, GoogleClaims>();
  return {
    verifier: {
      async verify(credential) {
        return issued.get(credential) ?? null;
      },
    },
    credentialFor(claims = {}) {
      const sub = claims.sub ?? randomUUID().replaceAll("-", "");
      const credential = `fake-google-${randomUUID()}`;
      issued.set(credential, {
        sub,
        given_name: "Ada",
        family_name: "Lovelace",
        name: "Ada Lovelace",
        email: `ada.lovelace.${sub}@school.example`,
        picture: `https://photos.example/${sub}.jpg`,
        ...claims,
      });
      return credential;
    },
  };
}
