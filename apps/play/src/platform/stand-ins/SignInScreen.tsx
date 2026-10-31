// STAND-IN for Google sign-in. Picks the pretend student the stand-in session
// returns, then goes back to where they were headed, the way the real
// sign-in does. Only reachable while the shell runs on the stand-in platform.

import { lookFromSeed } from "@repo/avatar";
import { stickers } from "@repo/rewards";
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useState } from "react";
import type { KeyValueStore } from "../../play/storage.ts";
import { standInGrant, standInRecognise } from "./home.ts";
import type { StandInClasses } from "./memberships.ts";
import { standInSignIn } from "./session.ts";

const grades = [1, 2, 3, 4, 5, 6, 7, 8];

export function StandInSignInScreen({
  url,
  storage,
  navigate,
  newId,
  classes,
}: {
  url: URL;
  storage: KeyValueStore | null;
  /** The stand-in's classes; the pretend student starts in the one for their grade. */
  classes: StandInClasses;
  navigate(url: string): void;
  newId(): string;
}) {
  const [inClass, setInClass] = useState(true);
  const [designed, setDesigned] = useState(false);
  const [withStickers, setWithStickers] = useState(false);
  const next = url.searchParams.get("next");
  // Only ever return to a path on this site.
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const signIn = (grade: number) => {
    const id = `stand-in-${newId()}`;
    const found = classes(`G${grade}`);
    standInSignIn(storage, {
      id,
      locale: "en-CA",
      look: designed ? lookFromSeed(id) : null,
      classes: inClass && found ? [{ ...found, grade }] : [],
    });
    if (withStickers) {
      standInGrant(
        storage,
        stickers.slice(0, 4).map((s) => s.id),
      );
      standInRecognise(storage, "kindness");
    }
    navigate(returnTo);
  };

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <Stack gap="lg">
        <Title order={1} size="h3">
          Stand-in sign-in
        </Title>
        <Text c="muted">
          Pick the pretend student to play as. On the real platform this is
          Google sign-in; see apps/play/src/platform/README.md. Open
          /play/join/G45 to join a split class, or /play/join/X1 for a join code
          no class has.
        </Text>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={inClass}
            onChange={(event) => setInClass(event.target.checked)}
          />
          Already in a class for their grade
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={designed}
            onChange={(event) => setDesigned(event.target.checked)}
          />
          Already has an avatar (otherwise they design one first)
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={withStickers}
            onChange={(event) => setWithStickers(event.target.checked)}
          />
          Has four stickers, and new recognition for kindness from their teacher
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {grades.map((grade) => (
            <Button key={grade} size="lg" onClick={() => signIn(grade)}>
              {`Grade ${grade}`}
            </Button>
          ))}
        </div>
      </Stack>
    </main>
  );
}
