// Around every signed-in screen: the header (Help, who's signed in, sign
// out), and the walkthrough when one is showing.
import { Button } from "@repo/ui/button";
import { Container } from "@repo/ui/container";
import { Wordmark } from "@repo/ui/marketing/wordmark";
import { Menu } from "@repo/ui/menu";
import { Text } from "@repo/ui/text";
import type { ReactNode } from "react";
import type { Account, TeacherPort } from "../platform/ports.ts";
import classes from "./app.module.css";
import { useWalkthroughs } from "./use-walkthroughs.tsx";

export function Chrome({
  teacher,
  account,
  onSignOut,
  children,
}: {
  teacher: TeacherPort;
  account: Account;
  onSignOut(): void;
  children: ReactNode;
}) {
  const { walkthrough, help } = useWalkthroughs(teacher);
  const name = [
    account.firstName,
    account.lastInitial && `${account.lastInitial}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <header className={classes.header}>
        <Wordmark />
        <div className={classes.account}>
          {help.length > 0 && (
            <span data-walkthrough="help">
              <Menu variant="subtle" tone="educator" label="Help" items={help}>
                Help
              </Menu>
            </span>
          )}
          {name && (
            <span className={classes.name}>
              <Text size="sm">{name}</Text>
            </span>
          )}
          <Button variant="subtle" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className={classes.main}>
        <Container>{children}</Container>
      </main>
      {walkthrough}
    </>
  );
}
