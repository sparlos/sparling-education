// Effort evidence, in a teacher's words.
import type { EffortKind, EffortSkill } from "../platform/ports.ts";

/** Each kind of effort evidence, counted, in a teacher's words. */
export const effortLabels: Record<EffortKind, (n: number) => string> = {
  improvedAfterMistake: (n) =>
    `${n} ${n === 1 ? "task" : "tasks"} got right after a mistake`,
  finishedPlays: (n) => `${n} ${n === 1 ? "play" : "plays"} finished`,
};

/** The Learning Skills with something to say: a count of zero is left out. */
export function withEvidence(skills: EffortSkill[]): EffortSkill[] {
  return skills
    .map((skill) => ({
      ...skill,
      evidence: skill.evidence.filter(({ count }) => count > 0),
    }))
    .filter((skill) => skill.evidence.length > 0);
}
