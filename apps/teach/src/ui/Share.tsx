// A class's share panel, opened from the dashboard's "Share": the class join
// link and each game's link, each with its copy button, and each game's
// on/off switch beside its link.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Switch } from "@repo/ui/switch";
import { Text } from "@repo/ui/text";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { type ReactNode, useEffect, useState } from "react";
import type { Class, ClassGame } from "../platform/ports.ts";
import classes from "./share.module.css";

export interface ShareActions {
  /** Turns a game on or off for the class; resolves once the screen shows it. */
  switchGame(slug: string, on: boolean): Promise<void>;
}

export function SharePanel({
  cls,
  actions,
}: {
  cls: Class;
  actions: ShareActions;
}) {
  return (
    <Card variant="soft" tone="accent">
      <section aria-label="Share this class" className={classes.panel}>
        <div className={classes.row}>
          <div className={classes.text}>
            <Text>Class join link</Text>
            <Text size="sm" c="muted" className={classes.url}>
              {cls.joinLink}
            </Text>
          </div>
          <CopyButton text={cls.joinLink}>Copy join link</CopyButton>
        </div>
        <ul className={classes.games}>
          {cls.games.map((game) => (
            <GameRow key={game.slug} game={game} actions={actions} />
          ))}
        </ul>
      </section>
    </Card>
  );
}

function GameRow({
  game,
  actions,
}: {
  game: ClassGame;
  actions: ShareActions;
}) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const change = (on: boolean) => {
    setState("busy");
    actions.switchGame(game.slug, on).then(
      () => setState("idle"),
      (error: unknown) => {
        console.error("[teach] Couldn't switch the game", error);
        setState("failed");
      },
    );
  };
  return (
    <li className={classes.row}>
      <Switch
        tone="accent"
        label={game.name}
        checked={game.on}
        disabled={state === "busy"}
        onChange={change}
      />
      {game.on && (
        <CopyButton text={game.link}>
          Copy game link <VisuallyHidden>for {game.name}</VisuallyHidden>
        </CopyButton>
      )}
      {state === "failed" && (
        <Text size="sm">
          That didn't save. Check your connection and try again.
        </Text>
      )}
    </li>
  );
}

function CopyButton({ text, children }: { text: string; children: ReactNode }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      (error: unknown) => {
        console.error("[teach] Couldn't copy a link", error);
        setState("failed");
      },
    );
  };

  return (
    <Button variant="secondary" onClick={copy}>
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Couldn't copy"
            : children}
      </span>
    </Button>
  );
}
