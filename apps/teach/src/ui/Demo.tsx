// The demo class's card, on its dashboard: what the class is, viewing the
// play shell as one of its students, and deleting it.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useState } from "react";
import type { DemoView } from "../platform/ports.ts";
import classes from "./dashboard.module.css";

export interface DemoActions {
  /** Views the play shell as a demo student, resolving with where to open it. */
  viewAsStudent(): Promise<DemoView>;
  /** Deletes the demo class, resolving once it's gone. */
  delete(): Promise<void>;
}

export function DemoCard({ actions }: { actions: DemoActions }) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  const viewAsStudent = () => {
    // Opened now, while the click still counts, so it isn't blocked as a popup.
    const tab = window.open("", "_blank");
    setState("busy");
    actions.viewAsStudent().then(
      ({ link }) => {
        setState("idle");
        if (tab) tab.location.href = link;
        else window.location.assign(link);
      },
      (error: unknown) => {
        tab?.close();
        console.error("[teach] Couldn't view as a student", error);
        setState("failed");
      },
    );
  };

  const remove = () => {
    setState("busy");
    actions.delete().catch((error: unknown) => {
      console.error("[teach] Couldn't delete the demo class", error);
      setState("failed");
    });
  };

  return (
    <Card variant="soft" tone="educator">
      <section aria-label="Demo class">
        <Stack gap="sm" align="flex-start">
          <Title order={2} size="h4">
            This is a demo class
          </Title>
          <Text>
            Its students are simulated, with results already in, so you can see
            what Kindling shows before your own students play.
          </Text>
          {confirming ? (
            <>
              <Text>
                Delete the demo class and all its simulated students? It won't
                come back.
              </Text>
              <div className={classes.actions}>
                <Button
                  tone="educator"
                  disabled={state === "busy"}
                  onClick={remove}
                >
                  Delete demo class
                </Button>
                <Button variant="subtle" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className={classes.actions}>
              <Button
                tone="educator"
                disabled={state === "busy"}
                onClick={viewAsStudent}
              >
                View as a student
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(true)}>
                Delete demo class
              </Button>
            </div>
          )}
          {state === "failed" && (
            <Text size="sm">
              That didn't work. Check your connection and try again.
            </Text>
          )}
        </Stack>
      </section>
    </Card>
  );
}
