import type { ReactNode } from "react";
import { Icon } from "../icon";
import { Table } from "../table";
import { VisuallyHidden } from "../visually-hidden";
import classes from "./comparison-table.module.css";
import { Reveal } from "./reveal";
import { Wordmark } from "./wordmark";

/**
 * One promise, phrased positively ("Kids never see a store"). Kindling keeps
 * it; `typical` says, factually and generally, how typical learning games
 * fall short. Competitors are never named on the site.
 */
export interface ComparisonRow {
  label: string;
  /** Optional detail under the row label. */
  note?: string;
  kindling: string;
  typical: string;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  /** Heading for the row-label column (screen readers only). */
  rowsLabel: string;
  /** Heading for the comparison column, e.g. "Typical learning games". */
  typicalLabel: string;
  caption?: ReactNode;
}

function Verdict({
  row,
  kind,
}: {
  row: ComparisonRow;
  kind: "kindling" | "typical";
}) {
  const yes = kind === "kindling";
  return (
    <span className={`${classes.verdict} ${yes ? classes.yes : classes.no}`}>
      <span className={classes.mark}>
        <Icon name={yes ? "check" : "x"} size={18} />
      </span>
      {row[kind]}
    </span>
  );
}

/**
 * Kindling vs typical learning games, row by row. Below `sm` the table is
 * swapped for one card per row (label, then both verdicts stacked), so
 * phones never scroll sideways.
 */
export function ComparisonTable({
  rows,
  rowsLabel,
  typicalLabel,
  caption,
}: ComparisonTableProps) {
  const rowLabel = (row: ComparisonRow) => (
    <>
      {row.label}
      {row.note && <span className={classes.rowNote}>{row.note}</span>}
    </>
  );

  return (
    <>
      <Reveal className={classes.scroller}>
        <Table
          caption={caption}
          classNames={{
            table: classes.table,
            th: classes.th,
            td: classes.td,
            tr: classes.tr,
            caption: classes.caption,
          }}
          head={[
            <VisuallyHidden key="label">{rowsLabel}</VisuallyHidden>,
            <span key="k" className={classes.columnHead}>
              <Wordmark />
            </span>,
            <span
              key="t"
              className={`${classes.columnHead} ${classes.columnHeadMuted}`}
            >
              {typicalLabel}
            </span>,
          ]}
          body={rows.map((row) => ({
            key: row.label,
            cells: [
              <span key="label">{rowLabel(row)}</span>,
              <Verdict key="k" row={row} kind="kindling" />,
              <Verdict key="t" row={row} kind="typical" />,
            ],
          }))}
        />
      </Reveal>
      <div className={classes.stacked}>
        {caption && <p className={classes.caption}>{caption}</p>}
        <ul className={classes.cards}>
          {rows.map((row) => (
            <Reveal as="li" key={row.label} className={classes.card}>
              <p className={classes.cardLabel}>{rowLabel(row)}</p>
              <dl className={classes.cardVerdicts}>
                <div className={classes.cardKindling}>
                  <dt className={classes.cardTerm}>
                    <Wordmark />
                  </dt>
                  <dd>
                    <Verdict row={row} kind="kindling" />
                  </dd>
                </div>
                <div className={classes.cardTypical}>
                  <dt
                    className={`${classes.cardTerm} ${classes.columnHeadMuted}`}
                  >
                    {typicalLabel}
                  </dt>
                  <dd>
                    <Verdict row={row} kind="typical" />
                  </dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </ul>
      </div>
    </>
  );
}
