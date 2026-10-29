// Recognising a student for a character trait, in two taps: "Recognise",
// then the trait. It gives them the trait's sticker, revealed in their
// locker. Offered from the dashboard (each student's row, and the students
// not recognised yet this term) and from the student's page.
import { Menu } from "@repo/ui/menu";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { useState } from "react";
import type {
  DashboardStudent,
  Recognition,
  RecognitionSettings,
} from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import classes from "./recognition.module.css";

/** Recognises a student; resolves once the screen shows it. */
export type OnRecognise = (studentId: string, trait: string) => Promise<void>;

/** A trait's name, as the settings give it. */
export function traitName(settings: RecognitionSettings, trait: string) {
  return settings.traits.find((t) => t.trait === trait)?.name ?? trait;
}

const schoolDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "September 1, 2026", from an ISO date or date-time. */
export function dateLabel(iso: string) {
  // A bare date is a school day already; read it as noon there.
  return longDate.format(
    new Date(iso.length === 10 ? `${iso}T17:00:00Z` : iso),
  );
}

/** Whether a recognition was given this term. */
export function inTerm(given: Recognition, settings: RecognitionSettings) {
  const day = schoolDay.format(new Date(given.awardedAt));
  return day >= settings.term.start && day <= settings.term.end;
}

/** "Recognise": its menu of traits, and what happened. */
export function Recognise({
  student,
  settings,
  onRecognise,
  variant = "secondary",
  quiet = false,
  recognised,
}: {
  student: { id: string; firstName: string; lastInitial: string };
  settings: RecognitionSettings;
  /** The traits they were recognised for this term, ticked in the menu. */
  recognised: readonly string[];
  onRecognise: OnRecognise;
  variant?: "secondary" | "subtle";
  /** Says what happened only to a screen reader, where space is short. */
  quiet?: boolean;
}) {
  const [state, setState] = useState<
    { kind: "idle" | "busy" | "failed" } | { kind: "done"; trait: string }
  >({ kind: "idle" });
  const name = nameOf(student);
  const recognise = (trait: string) => {
    setState({ kind: "busy" });
    onRecognise(student.id, trait).then(
      () => setState({ kind: "done", trait }),
      (error: unknown) => {
        console.error("[teach] Couldn't recognise the student", error);
        setState({ kind: "failed" });
      },
    );
  };
  return (
    <span className={classes.recognise}>
      <Menu
        variant={variant}
        tone="educator"
        label={`Recognise ${name} for`}
        disabled={state.kind === "busy"}
        items={settings.traits.map(({ trait, name }) => ({
          key: trait,
          label: name,
          onClick: () => recognise(trait),
          checked: recognised.includes(trait),
        }))}
        checkedLabel=", recognised this term"
      >
        Recognise <VisuallyHidden>{name}</VisuallyHidden>
      </Menu>
      <span
        aria-live="polite"
        className={
          quiet && state.kind === "done" ? classes.hidden : classes.status
        }
      >
        {state.kind === "done" &&
          `${name} recognised for ${traitName(settings, state.trait)}. They'll see a sticker in their locker.`}
        {state.kind === "failed" &&
          "That didn't save. Check your connection and try again."}
      </span>
    </span>
  );
}

/** The dashboard's students who haven't been recognised yet this term. */
export function NotYetRecognised({
  students,
  settings,
  onRecognise,
}: {
  students: DashboardStudent[];
  settings: RecognitionSettings;
  onRecognise: OnRecognise;
}) {
  const notYet = students.filter((s) => s.recognised.length === 0);
  // Said here: a student recognised leaves the list, and their button with it.
  const [last, setLast] = useState<string | null>(null);
  const recognise: OnRecognise = async (studentId, trait) => {
    await onRecognise(studentId, trait);
    const student = students.find((s) => s.id === studentId);
    if (student)
      setLast(
        `${nameOf(student)} recognised for ${traitName(settings, trait)}. They'll see a sticker in their locker.`,
      );
  };
  return (
    <section aria-labelledby="not-recognised" className={classes.section}>
      <div>
        <Title order={2} size="h4" id="not-recognised">
          Not recognised yet this term
        </Title>
        <Text size="sm" c="muted">
          {`This term: ${dateLabel(settings.term.start)} to ${dateLabel(settings.term.end)}.`}
        </Text>
      </div>
      {notYet.length === 0 ? (
        <Text>Every student has been recognised this term.</Text>
      ) : (
        <ul className={classes.list}>
          {notYet.map((student) => (
            <li key={student.id} className={classes.student}>
              {/* Not a link: the grid's row has the one to their page. */}
              <span className={classes.name}>{nameOf(student)}</span>
              <Recognise
                student={student}
                settings={settings}
                recognised={student.recognised}
                onRecognise={recognise}
                quiet
              />
            </li>
          ))}
        </ul>
      )}
      <Text size="sm" aria-live="polite">
        {last}
      </Text>
    </section>
  );
}

/** The student page's recognition: what they were given, and recognising them. */
export function StudentRecognition({
  student,
  recognised,
  settings,
  onRecognise,
}: {
  student: { id: string; firstName: string; lastInitial: string };
  recognised: Recognition[];
  settings: RecognitionSettings;
  onRecognise: OnRecognise;
}) {
  const thisTerm = recognised
    .filter((r) => inTerm(r, settings))
    .map((r) => r.trait);
  return (
    <section aria-labelledby="recognition" className={classes.section}>
      <Title order={2} size="h5" id="recognition">
        Recognition
      </Title>
      {thisTerm.length === 0 && <Text>Not recognised yet this term.</Text>}
      {recognised.length > 0 && (
        <ul className={classes.given}>
          {recognised.map((given) => (
            <li key={`${given.trait}-${given.awardedAt}`}>
              <span className={classes.trait}>
                {traitName(settings, given.trait)}
              </span>{" "}
              <span className={classes.muted}>
                {dateLabel(given.awardedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Recognise
          student={student}
          settings={settings}
          recognised={thisTerm}
          onRecognise={onRecognise}
        />
      </div>
    </section>
  );
}
