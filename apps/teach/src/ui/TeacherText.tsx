// Text a game wrote for teachers, with its fractions drawn as fractions: the
// one way every game's `asked` and `detail` read in the teacher app.

import classes from "./teacher-text.module.css";
import { teacherTextParts } from "./teacher-text.ts";

export function TeacherText({ text }: { text: string }) {
  return teacherTextParts(text).map((part, i) =>
    part.kind === "text" ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts never reorder
      <span key={i}>{part.text}</span>
    ) : (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts never reorder
        key={i}
        role="img"
        aria-label={part.label}
        className={classes.number}
      >
        {part.whole !== null && (
          <span className={classes.whole}>{part.whole}</span>
        )}
        <span className={classes.fraction}>
          <span className={classes.numerator}>{part.numerator}</span>
          <span>{part.denominator}</span>
        </span>
      </span>
    ),
  );
}
