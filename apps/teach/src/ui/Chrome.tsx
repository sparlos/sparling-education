// Around every signed-in screen: the sky behind it, in the open class's
// colour, the header (Help, who's signed in, sign out), and the walkthrough
// when one is showing.
import { defaultClassColour } from "@repo/tokens";
import { Button } from "@repo/ui/button";
import { ClassColourScope } from "@repo/ui/class-colour-scope";
import { Container } from "@repo/ui/container";
import { Sky } from "@repo/ui/marketing/sky";
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
  colour,
  children,
}: {
  teacher: TeacherPort;
  account: Account;
  onSignOut(): void;
  /** The open class's colour, which the sky behind every screen fades to. */
  colour?: string;
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
      <ClassColourScope colour={colour ?? defaultClassColour}>
        <Sky variant="day" fixed parallax={0.04} />
      </ClassColourScope>
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
