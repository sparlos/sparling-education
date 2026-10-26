// STAND-IN for where a finished game returns the student. The class world is
// gone and the locker isn't built yet (ticket 09), so this only shows what
// arrived. Only reachable while the shell runs on the stand-in platform.

import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";

export function StandInHubScreen({ url }: { url: URL }) {
  return (
    <main style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <Stack gap="lg">
        <Title order={1} size="h3">
          Stand-in hub
        </Title>
        <Text c="muted">
          Finishing a game lands here until the locker replaces this screen; see
          apps/play/src/platform/README.md.
        </Text>
        <Text>{`Portal: ${url.searchParams.get("portal") ?? "none"}`}</Text>
        <Text>{`Play: ${url.searchParams.get("play") ?? "none"}`}</Text>
      </Stack>
    </main>
  );
}
