import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it, vi } from "vitest";
import { googleIdentityVerifier, identityFrom } from "./identity.ts";

const clientId = "test-client.apps.googleusercontent.com";

// Stands in for Google's published signing keys.
const google = await generateKeyPair("RS256");
const other = await generateKeyPair("RS256");
const keys = createLocalJWKSet({
  keys: [
    { ...(await exportJWK(google.publicKey)), kid: "google", alg: "RS256" },
  ],
});
const verifier = googleIdentityVerifier({ clientId, keys });

function token({
  key = google.privateKey,
  issuer = "https://accounts.google.com",
  audience = clientId,
  expiresIn = "1h",
} = {}) {
  return new SignJWT({
    given_name: "Ada",
    family_name: "Lovelace",
    email: "ada@school.example",
  })
    .setProtectedHeader({ alg: "RS256", kid: "google" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("1234")
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

describe("Google identity verifier", () => {
  it("accepts a token Google issued to this app", async () => {
    expect(await verifier.verify(await token())).toMatchObject({
      sub: "1234",
      given_name: "Ada",
    });
  });

  it.each([
    ["another app's token", { audience: "someone-else" }],
    ["another issuer's token", { issuer: "https://evil.example" }],
    ["an expired token", { expiresIn: "-1m" }],
    ["a token signed by anyone but Google", { key: other.privateKey }],
  ])("rejects %s", async (_, options) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifier.verify(await token(options))).toBeNull();
  });

  it("rejects something that isn't a token", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifier.verify("not-a-token")).toBeNull();
  });

  it("logs a rejection without the token's claims", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await verifier.verify(await token({ expiresIn: "-1m" }));
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("ada@school.example");
  });

  it("fails, rather than rejecting, when Google's keys can't be fetched", async () => {
    const offline = googleIdentityVerifier({
      clientId,
      keys: async () => {
        throw Object.assign(new Error("timed out"), {
          code: "ERR_JWKS_TIMEOUT",
        });
      },
    });
    await expect(offline.verify(await token())).rejects.toThrow();
  });
});

describe("identity from Google's claims", () => {
  it("keeps only the subject, first name and last initial", () => {
    expect(
      identityFrom({
        sub: "1234",
        given_name: " Ada ",
        family_name: "lovelace",
        email: "ada@school.example",
        picture: "https://photos.example/ada.jpg",
      }),
    ).toEqual({ subject: "1234", firstName: "Ada", lastInitial: "L" });
  });

  it("copes with an account that has no names", () => {
    expect(identityFrom({ sub: "1234" })).toEqual({
      subject: "1234",
      firstName: "",
      lastInitial: "",
    });
  });

  it("takes a whole letter as the initial", () => {
    expect(identityFrom({ sub: "1", family_name: "Émond" }).lastInitial).toBe(
      "É",
    );
  });
});
