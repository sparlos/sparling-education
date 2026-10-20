import { brandName } from "@repo/tokens";
import type { NavLink } from "@repo/ui/marketing/site-header";

// TODO: replace with a real inbox once the domain is chosen.
export const contactEmail = "hello@example.com";

export const site = {
  name: brandName,
  header: {
    skipLinkLabel: "Skip to content",
    openMenuLabel: "Open menu",
    menuTitle: "Main",
  },
  title: `${brandName}: learning games where the skill is how you win`,
  description:
    "A learning game for Grades 1–8 where each class shares a 3D world, the curriculum is the game mechanic, and every reward is earned. Free for teachers. Students and parents never pay.",
  nav: [
    { label: "For educators", href: "/educators", tone: "educator" },
    { label: "For parents", href: "/parents", tone: "parent" },
    { label: "For students", href: "/students", tone: "student" },
  ] satisfies NavLink[],
  navCta: { label: "Join the pilot", href: "/educators#pilot" },
  footer: {
    tagline:
      "A learning game for Grades 1–8 where the skill is how you win. Free for teachers, never paid for by kids.",
    columns: [
      {
        title: "Kindling for",
        links: [
          { label: "Educators", href: "/educators" },
          { label: "Parents", href: "/parents" },
          { label: "Students", href: "/students" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Contact", href: "/contact" },
          { label: "Privacy", href: "/privacy" },
        ],
      },
    ],
    notes: ["Made in Ontario 🍁", "Student data will be hosted in Canada"],
  },
};

export const grades = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "A split grade",
  "I'm not a classroom teacher",
];
