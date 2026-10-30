import { type AvatarLook, defaultLook, parseLook } from "@repo/avatar";
import { baseSet } from "@repo/avatar/parts";
import { describe, expect, it } from "vitest";
import {
  client,
  cookiesFrom,
  google,
  signInAsStudent,
} from "../test/client.ts";

type Headers = { cookie: string };

function lockerOf(headers?: Headers) {
  return client.locker.$get(undefined, { headers });
}

function wear(headers: Headers | undefined, look: AvatarLook) {
  return client.locker.look.$put({ json: look }, { headers });
}

async function lookOf(headers: Headers) {
  const res = await client.session.$get(undefined, { headers });
  const session = await res.json();
  return session && "look" in session ? session.look : undefined;
}

async function teacher() {
  const res = await client["sign-in"].$post({
    json: { credential: google.credentialFor(), as: "teacher" },
  });
  return cookiesFrom(res);
}

// Outfit pieces outside the base set, until rewards can grant them.
const notOwned = { top: "top-02", hat: "hat-30" } as const;

describe("the locker", () => {
  it("holds the base set for a new student", async () => {
    const res = await lockerOf(await signInAsStudent());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      owned: [...baseSet],
      stickers: [],
      unseen: [],
      newInWardrobe: [],
      placements: [],
    });
  });

  it("needs a signed-in student", async () => {
    expect((await lockerOf()).status).toBe(401);
    expect((await lockerOf(await teacher())).status).toBe(403);
  });
});

describe("dressing the avatar", () => {
  it("stores the look a student designs, and the session returns it", async () => {
    const headers = await signInAsStudent();
    const look = { ...defaultLook, body: "skin-11", hair: "hair-40" } as const;
    const res = await wear(headers, look);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(look);
    expect(await lookOf(headers)).toEqual(look);
    expect(parseLook(await lookOf(headers))).toEqual(look);
  });

  it("changes into another outfit the student owns", async () => {
    const headers = await signInAsStudent();
    await wear(headers, defaultLook);
    const changed = {
      ...defaultLook,
      top: "top-08",
      bottom: "bottom-11",
      hat: "hat-07",
    } as const;
    await wear(headers, changed);
    expect(await lookOf(headers)).toEqual(changed);
  });

  it("offers every skin tone and hairstyle, owned or not", async () => {
    const headers = await signInAsStudent();
    const look = { ...defaultLook, body: "skin-01", hair: "hair-62" } as const;
    expect((await wear(headers, look)).status).toBe(200);
  });

  it.each(Object.entries(notOwned))(
    "refuses a %s the student doesn't own, keeping what they wore",
    async (slot, item) => {
      const headers = await signInAsStudent();
      await wear(headers, defaultLook);
      const res = await wear(headers, {
        ...defaultLook,
        [slot]: item,
      } as AvatarLook);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "not-owned" });
      expect(await lookOf(headers)).toEqual(defaultLook);
    },
  );

  it("refuses a look that isn't one", async () => {
    const headers = await signInAsStudent();
    const res = await client.locker.look.$put(
      { json: { ...defaultLook, hair: "hair-99" } as unknown as AvatarLook },
      { headers },
    );
    expect(res.status).toBe(400);
    expect(await lookOf(headers)).toBeNull();
  });

  it("dresses only the student who's signed in", async () => {
    const one = await signInAsStudent();
    const other = await signInAsStudent();
    await wear(one, defaultLook);
    expect(await lookOf(other)).toBeNull();
  });

  it("needs a signed-in student", async () => {
    expect((await wear(undefined, defaultLook)).status).toBe(401);
    expect((await wear(await teacher(), defaultLook)).status).toBe(403);
  });
});
