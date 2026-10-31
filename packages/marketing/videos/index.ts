// Every brief. Add a new video's folder here to give it a composition.
import type { Brief } from "../src/brief.ts";
import teacherGrading from "./teacher-grading/brief.ts";
import teacherTeaser from "./teacher-teaser/brief.ts";

export const briefs: Brief[] = [teacherTeaser, teacherGrading];

export function briefById(id: string): Brief {
  const brief = briefs.find((b) => b.id === id);
  if (!brief)
    throw new Error(
      `no brief "${id}" (have: ${briefs.map((b) => b.id).join(", ")})`,
    );
  return brief;
}
