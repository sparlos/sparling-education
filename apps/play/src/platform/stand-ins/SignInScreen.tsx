// STAND-IN for Google sign-in. Picks the pretend student the stand-in session
// returns, then goes back to the game link, the way the real sign-in will.
// Only reachable while the shell runs on the stand-in platform.

import { lookFromSeed } from "@repo/avatar";
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useState } from "react";
import type { KeyValueStore } from "../../play/storage.ts";
import { standInSignIn } from "./session.ts";

const grades = [1, 2, 3, 4, 5, 6, 7, 8];

export function StandInSignInScreen({
  url,
  storage,
  navigate,
  newId,
}: {
  url: URL;
  storage: KeyValueStore | null;
  navigate(url: string): void;
  newId(): string;
}) {
  const [inClass, setInClass] = useState(true);
  const next = url.searchParams.get("next");
  // Only ever return to a path on this site.
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const signIn = (grade: number) => {
    const id = `stand-in-${newId()}`;
    standInSignIn(storage, {
      id,
      grade,
      locale: "en-CA",
      look: lookFromSeed(id),
      classId: inClass ? "stand-in-class" : null,
    });
    navigate(returnTo);
  };

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <Stack gap="lg">
        <Title order={1} size="h3">
          Stand-in sign-in
        </Title>
        <Text c="muted">
          Kindling has no sign-in yet. Pick the pretend student to play as. Real
          sign-in replaces this screen; see apps/play/src/platform/README.md.
        </Text>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={inClass}
            onChange={(event) => setInClass(event.target.checked)}
          />
          In a class (finishing returns to the hub when opened from a portal)
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
