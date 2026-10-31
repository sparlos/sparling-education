import type { ReactNode } from "react";
import { Icon } from "../icon";
import { Table } from "../table";
import classes from "./comparison-table.module.css";
import { Reveal } from "./reveal";
import { Wordmark } from "./wordmark";

/**
 * One promise, phrased positively ("Kids never see a store"). The platform keeps
 * it; `typical` says, factually and generally, how typical learning games
 * fall short. Competitors are never named on the site.
 */
export interface ComparisonRow {
  label: string;
  /** Optional detail under the promise. */
  note?: string;
  typical: string;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  /** Heading for the comparison column, e.g. "Typical learning games". */
  typicalLabel: string;
  caption?: ReactNode;
}

function Verdict({ yes, children }: { yes: boolean; children: ReactNode }) {
  return (
    <span className={`${classes.verdict} ${yes ? classes.yes : classes.no}`}>
      <span className={classes.mark}>
        <Icon name={yes ? "check" : "x"} size={18} />
      </span>
      <span>{children}</span>
    </span>
  );
}

/**
 * The platform vs typical learning games, row by row. Two columns: the the platform
 * column states the promise, the other says how typical games fall short.
 * The same table narrows to fit phones, so it never scrolls sideways.
 */
export function ComparisonTable({
  rows,
  typicalLabel,
  caption,
}: ComparisonTableProps) {
  return (
    <Reveal className={classes.frame}>
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
            <Verdict key="k" yes>
              {row.label}
              {row.note && <span className={classes.rowNote}>{row.note}</span>}
            </Verdict>,
            <Verdict key="t" yes={false}>
              {row.typical}
            </Verdict>,
          ],
        }))}
      />
    </Reveal>
  );
}
