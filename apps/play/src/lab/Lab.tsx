// The prototype lab, dev only: /play/lab lists the prototypes and
// /play/lab/<slug> plays one, for the grade picked on the list. See README.md.
import { type AvatarExpression, defaultLook } from "@repo/avatar";
import { Portrait } from "@repo/avatar/portrait";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Stack } from "@repo/ui/stack";
import { Tabs } from "@repo/ui/tabs";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useCallback, useEffect, useMemo, useState } from "react";
import { labPath } from "../play/routes.ts";
import { type KeyValueStore, readJson, writeJson } from "../play/storage.ts";
import { createVoice, type VoiceOptions } from "../play/voice.ts";
import classes from "./lab.module.css";
import type { PrototypeMeta, PrototypeProps } from "./prototype.ts";
import type { PrototypeRegistry } from "./registry.ts";

export interface LabProps {
  url: URL;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  prototypes: PrototypeRegistry;
  storage: KeyValueStore | null;
  navigate(url: string): void;
  /** Browser speech, replaceable in tests. */
  speak?: VoiceOptions["speak"];
}

export const grades = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const gradeKey = "kindling.lab.grade";
const defaultGrade = 3;

/** The grades a prototype's expectations belong to, lowest first. */
export function gradesOf(meta: PrototypeMeta): number[] {
  const found = new Set<number>();
  for (const id of meta.expectations) {
    const grade = /\.g(\d+)\./.exec(id)?.[1];
    if (grade) found.add(Number(grade));
  }
  return [...found].sort((a, b) => a - b);
}

function gradeRange(meta: PrototypeMeta): string {
  const list = gradesOf(meta);
  if (list.length === 0) return "no grade";
  if (list.length === 1) return `Grade ${list[0]}`;
  return `Grades ${list[0]}–${list[list.length - 1]}`;
}

function storedGrade(storage: KeyValueStore | null): number {
  const value = readJson(storage, gradeKey);
  return grades.includes(value as (typeof grades)[number])
    ? (value as number)
    : defaultGrade;
}

export default function Lab(props: LabProps) {
  const lab = labPath(props.base);
  const slug = props.url.pathname.slice(lab.length).replace(/^\/|\/$/g, "");
  return slug ? (
    <PlayPrototype {...props} slug={slug} />
  ) : (
    <LabList {...props} />
  );
}

function LabList({ base, prototypes, storage }: LabProps) {
  const [grade, setGrade] = useState(() => storedGrade(storage));
  const pick = (next: number) => {
    setGrade(next);
    writeJson(storage, gradeKey, next);
  };
  const slugs = Object.keys(prototypes).sort();
  const current = slugs.filter((slug) => !prototypes[slug]?.meta.isArchived);
  const archived = slugs.filter((slug) => prototypes[slug]?.meta.isArchived);
  return (
    <div className={classes.scroll}>
      <main className={classes.list}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1} size="h2">
              Prototype lab
            </Title>
            <Text c="muted">
              Dev only. Rough prototypes for finding the fun before a game spec
              is written.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Title order={2} size="h4" id="grade">
              Play as Grade {grade}
            </Title>
            <fieldset className={classes.grades} aria-labelledby="grade">
              {grades.map((g) => (
                <Button
                  key={g}
                  variant={g === grade ? "primary" : "secondary"}
                  tone="student"
                  onClick={() => pick(g)}
                >
                  {`Grade ${g}`}
                </Button>
              ))}
            </fieldset>
          </Stack>

          <Tabs
            items={[
              {
                value: "current",
                label: `Prototypes (${current.length})`,
                content: (
                  <PrototypeCards
                    base={base}
                    prototypes={prototypes}
                    slugs={current}
                    empty="No prototypes yet. The design-game skill adds them in apps/play/src/lab/<slug>/."
                  />
                ),
              },
              {
                value: "archive",
                label: `Archive (${archived.length})`,
                content: (
                  <PrototypeCards
                    base={base}
                    prototypes={prototypes}
                    slugs={archived}
                    empty="Nothing archived yet. Prototypes the founder didn't pick land here."
                  />
                ),
              },
            ]}
          />
        </Stack>
      </main>
    </div>
  );
}

function PrototypeCards({
  base,
  prototypes,
  slugs,
  empty,
}: Pick<LabProps, "base" | "prototypes"> & {
  slugs: string[];
  empty: string;
}) {
  if (slugs.length === 0) return <Text>{empty}</Text>;
  return (
    <Stack gap="lg">
      {slugs.map((slug) => {
        const { meta } = prototypes[slug] as (typeof prototypes)[string];
        return (
          <Card key={slug} padding="lg">
            <Stack gap="sm">
              <Title order={2} size="h3">
                {meta.title}
              </Title>
              <Text>{meta.pitch}</Text>
              <Text size="sm" c="muted">
                Targets {gradeRange(meta)}: {meta.expectations.join(", ")}
              </Text>
              <dl className={classes.details}>
                <dt>Should make these fail</dt>
                {meta.misconceptions.map((m) => (
                  <dd key={m.id}>
                    <code>{m.id}</code>: {m.fails}
                  </dd>
                ))}
                {meta.sampleTask && (
                  <>
                    <dt>Draws on</dt>
                    <dd>{meta.sampleTask}</dd>
                  </>
                )}
                <dt>Why it might be fun</dt>
                <dd>{meta.fun}</dd>
              </dl>
              <div>
                <Button
                  href={`${base}lab/${slug}`}
                  tone="student"
                  leftSection={<Icon name="play" size={20} />}
                >
                  {`Play ${meta.title}`}
                </Button>
              </div>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function PlayPrototype({
  base,
  prototypes,
  storage,
  navigate,
  speak,
  slug,
}: LabProps & { slug: string }) {
  const grade = storedGrade(storage);
  const prototype = prototypes[slug];
  const voice = useMemo(
    () => createVoice({ text: (text) => text, locale: "en-CA", speak }),
    [speak],
  );
  useEffect(() => () => voice.stop(), [voice]);
  // Stable, so a prototype can speak from an effect without repeating itself.
  const say = useCallback((text: string) => voice.say(text), [voice]);

  const lab = labPath(base);
  if (!prototype) {
    return (
      <main className={classes.list}>
        <Stack gap="md">
          <Title order={1} size="h2">
            No prototype called “{slug}”
          </Title>
          <div>
            <Button href={lab}>Back to the lab</Button>
          </div>
        </Stack>
      </main>
    );
  }

  const { meta, default: Prototype } = prototype;
  return (
    <main className={classes.play}>
      <header className={classes.bar}>
        <IconButton
          label="Back to the lab"
          tone="neutral"
          size="lg"
          onClick={() => navigate(lab)}
        >
          <Icon name="leave" />
        </IconButton>
        <div className={classes.barTitle}>
          <Title order={1} size="h4">
            {meta.title}
          </Title>
          <Text size="sm" c="muted">
            Playing as Grade {grade} · targets {gradeRange(meta)}
          </Text>
        </div>
        <IconButton
          label="Hear it again"
          tone="neutral"
          size="lg"
          onClick={() => voice.again()}
        >
          <Icon name="speaker" />
        </IconButton>
      </header>
      <div className={classes.stage}>
        <Prototype
          key={`${slug}-${grade}`}
          grade={grade}
          Avatar={LabAvatar}
          speak={say}
        />
      </div>
    </main>
  );
}

const LabAvatar: PrototypeProps["Avatar"] = ({
  expression,
  size,
}: {
  expression: AvatarExpression;
  size: number;
}) => (
  <Portrait
    look={defaultLook}
    expression={expression}
    size={size}
    label="Your avatar"
  />
);
