// One wave in the game frame: the field, the dart counter and the number pad,
// Fire or Try again, and Hint. The tutorial and real waves both render it; only
// who taps differs.
import { GameFrame, NumberPad } from "@repo/game-kit/frame";
import type { ReactNode } from "react";
import { numeral } from "../rules/teacher.ts";
import type { StringId } from "../strings.ts";
import styles from "./game.module.css";

export interface BoardProps {
  t(id: StringId): string;
  field: ReactNode;
  caption: string;
  /** What the counter shows: blank before a number is typed. */
  darts: number | null;
  padOff: boolean;
  main: { label: string; onTap(): void; disabled: boolean };
  hint: { onTap(): void; disabled: boolean; glow: boolean };
  onDigit(d: number): void;
  onDelete(): void;
  onSkip?: () => void;
  hand: string | null;
  tapping: boolean;
  /** Only the field shows, at the end. */
  stageOnly: boolean;
}

export function Board(props: BoardProps) {
  const { t } = props;
  return (
    <GameFrame
      t={t}
      stage={props.field}
      caption={props.caption}
      hint={props.hint}
      onSkip={props.onSkip}
      side={
        <>
          <div
            className={styles.counter}
            data-testid="counter"
            data-hand="counter"
            data-darts={props.darts ?? undefined}
          >
            {props.darts === null ? "" : numeral(props.darts)}
            <small>{t("ui.darts")}</small>
          </div>
          <NumberPad
            disabled={props.padOff}
            onKey={(k) =>
              k === "del" ? props.onDelete() : props.onDigit(Number(k))
            }
          />
        </>
      }
      main={props.main}
      hand={props.hand}
      tapping={props.tapping}
      stageOnly={props.stageOnly}
    />
  );
}
