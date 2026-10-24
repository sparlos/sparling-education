// The six Learning Skills and Work Habits from Growing Success (2010), which
// effort is evidence of. Names only.
export const learningSkills = {
  responsibility: "Responsibility",
  organization: "Organization",
  "independent-work": "Independent Work",
  collaboration: "Collaboration",
  initiative: "Initiative",
  "self-regulation": "Self-Regulation",
} as const;

export type LearningSkill = keyof typeof learningSkills;
