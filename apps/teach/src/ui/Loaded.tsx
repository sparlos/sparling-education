// Something a screen loads from the teacher port: a loader while it comes,
// "try again" when it can't, and the screen's content once it's here.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { type ReactNode, useCallback, useEffect, useState } from "react";

export function Loaded<T>({
  load,
  what,
  children,
}: {
  /** Memoised, so it loads again only when what it loads changes. */
  load: () => Promise<T>;
  /** What's loading, e.g. "Sam R.'s evidence". */
  what: string;
  children(loaded: T): ReactNode;
}) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "error" } | { kind: "loaded"; value: T }
  >({ kind: "loading" });

  const run = useCallback(() => {
    setState({ kind: "loading" });
    load().then(
      (value) => setState({ kind: "loaded", value }),
      (error: unknown) => {
        console.error(`[teach] Couldn't load ${what}`, error);
        setState({ kind: "error" });
      },
    );
  }, [load, what]);
  useEffect(run, [run]);

  switch (state.kind) {
    case "loading":
      return <Loader label={`Loading ${what}`} size="md" />;
    case "error":
      return (
        <Card variant="soft" tone="educator">
          <Stack gap="xs" align="flex-start">
            <Text>{`${capitalised(what)} couldn't be loaded.`}</Text>
            <Button variant="secondary" onClick={run}>
              Try again
            </Button>
          </Stack>
        </Card>
      );
    case "loaded":
      return children(state.value);
  }
}

function capitalised(text: string) {
  return text.charAt(0).toLocaleUpperCase("en-CA") + text.slice(1);
}
