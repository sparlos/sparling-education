// Runs the walkthroughs (./walkthroughs.ts): starts each by itself on its
// screen until the teacher has seen it, goes between screens for the steps
// on another, and remembers on the server when one is finished or skipped.
import { Walkthrough as WalkthroughCard } from "@repo/ui/walkthrough";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { TeacherPort } from "../platform/ports.ts";
import {
  type Screen,
  type Step,
  stepsFor,
  type Walkthrough,
  walkthroughs,
  welcome,
} from "./walkthroughs.ts";

/** Each screen's route, by the router's route ID. */
const screenRoutes: Record<string, Screen> = {
  "/classes/$classId/": "dashboard",
  "/classes/$classId/students/$studentId": "student",
  "/classes/$classId/quick-assess": "quick-assess",
  "/classes/$classId/manage": "manage",
  "/classes/$classId/students/$studentId/plays/$playId": "play",
};

/** Where the teacher is: a screen of one class, once it's loaded. */
interface Where {
  screen: Screen;
  classId: string;
}

function useWhere(): Where | null {
  // A string, so the router only re-renders when it changes.
  const where = useRouterState({
    select: (state) => {
      const last = state.matches.at(-1);
      const screen = last && screenRoutes[last.routeId];
      const { classId } = (last?.params ?? {}) as { classId?: string };
      if (state.status !== "idle" || last?.status !== "success") return "";
      return screen && classId ? `${screen} ${classId}` : "";
    },
  });
  if (!where) return null;
  const [screen, classId] = where.split(" ") as [Screen, string];
  return { screen, classId };
}

interface Running {
  walkthrough: Walkthrough;
  /** Worked out once its first screen is showing. */
  steps: Step[] | null;
  step: number;
  /** Shut while going to another screen for a step. */
  open: boolean;
  classId: string;
}

export interface HelpItem {
  key: string;
  label: string;
  onClick(): void;
}

/**
 * The walkthrough showing, if any, and Help's ways to replay them on the
 * screen the teacher is on.
 */
export function useWalkthroughs(teacher: TeacherPort): {
  walkthrough: ReactNode;
  help: HelpItem[];
} {
  const router = useRouter();
  const where = useWhere();
  const [seen, setSeen] = useState<ReadonlySet<string> | null>(null);
  const [running, setRunning] = useState<Running | null>(null);

  useEffect(() => {
    let current = true;
    teacher.walkthroughsSeen().then(
      (ids) => current && setSeen(new Set(ids)),
      (error: unknown) => {
        // Better none start by themselves than the same ones every visit.
        console.error("[teach] Couldn't load the walkthroughs seen", error);
        if (current) setSeen(new Set(walkthroughs.map((w) => w.id)));
      },
    );
    return () => {
      current = false;
    };
  }, [teacher]);

  const go = useCallback(
    (screen: Screen, classId: string) => {
      if (screen === "dashboard")
        return router.navigate({
          to: "/classes/$classId",
          params: { classId },
        });
      if (screen === "quick-assess")
        return router.navigate({
          to: "/classes/$classId/quick-assess",
          params: { classId },
        });
      throw new Error(`[teach] A walkthrough can't go to the ${screen} screen`);
    },
    [router],
  );

  const finish = useCallback(
    (walkthrough: Walkthrough) => {
      setRunning(null);
      const ids = [walkthrough.id, ...(walkthrough.covers ?? [])];
      setSeen((before) => new Set([...(before ?? []), ...ids]));
      for (const id of ids)
        teacher.markWalkthroughSeen(id).catch((error: unknown) => {
          console.error("[teach] Couldn't remember a walkthrough", error);
        });
    },
    [teacher],
  );

  const start = useCallback(
    (walkthrough: Walkthrough, at: Where) => {
      setRunning({
        walkthrough,
        steps: null,
        step: 0,
        open: false,
        classId: at.classId,
      });
      if (at.screen !== walkthrough.screen) go(walkthrough.screen, at.classId);
    },
    [go],
  );

  // Starts the screen's walkthrough by itself the first time; the welcome first.
  useEffect(() => {
    if (!seen || running || !where) return;
    const due = walkthroughs.find(
      (w) =>
        w.screen === where.screen &&
        !seen.has(w.id) &&
        (w === welcome || seen.has(welcome.id)),
    );
    if (due) start(due, where);
  }, [seen, running, where, start]);

  // Keeps the walkthrough in step with the screen showing.
  const screen = where?.screen;
  const classId = where?.classId;
  useEffect(() => {
    if (!running || !screen) return;
    const { walkthrough, steps, step, open } = running;
    if (!steps) {
      // Its first screen is showing: take the steps that fit what's on it.
      if (screen !== walkthrough.screen) return;
      const fitting = stepsFor(walkthrough, document);
      if (fitting.length === 0) return finish(walkthrough);
      setRunning({ ...running, steps: fitting, open: true });
      return;
    }
    const here = steps[step]?.screen === screen && classId === running.classId;
    // Arrived at the screen it went to for a step.
    if (!open && here) setRunning({ ...running, open: true });
    // The teacher went somewhere else (the browser's back button).
    if (open && !here) finish(walkthrough);
  }, [running, screen, classId, finish]);

  const onStepChange = (next: number) => {
    if (!running?.steps) return;
    const { steps, step, classId } = running;
    const to = steps[next];
    if (!to) return;
    if (to.screen === steps[step]?.screen)
      return setRunning({ ...running, step: next });
    setRunning({ ...running, step: next, open: false });
    go(to.screen, classId);
  };

  const help: HelpItem[] = [];
  if (where) {
    help.push({
      key: welcome.id,
      label: welcome.name,
      onClick: () => start(welcome, where),
    });
    const own = walkthroughs.find(
      (w) => w !== welcome && w.screen === where.screen,
    );
    if (own)
      help.push({
        key: own.id,
        label: own.name,
        onClick: () => start(own, where),
      });
  }

  return {
    help,
    walkthrough: (
      <WalkthroughCard
        open={!!running?.steps && running.open}
        steps={running?.steps ?? []}
        step={running?.step ?? 0}
        onStepChange={onStepChange}
        onClose={() => running && finish(running.walkthrough)}
        tone="educator"
        labels={{
          skip: "Skip",
          back: "Back",
          next: "Next",
          done: "Done",
          progress: (current, total) => `${current} of ${total}`,
        }}
      />
    ),
  };
}
