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
    "Learning games for Grades 1–8 where kids practise the skill by playing. Teachers see which wrong ideas are showing up in their class, and kids earn every reward. Free for teachers. Students and parents never pay.",
  nav: [
    { label: "For educators", href: "/educators", tone: "educator" },
    { label: "For parents", href: "/parents", tone: "parent" },
  ] satisfies NavLink[],
  navCta: { label: "Join the pilot", href: "/educators#pilot" },
  footer: {
    tagline:
      "Learning games for Grades 1–8 where the skill is how you win. Free for teachers. Kids and parents never pay.",
    columns: [
      {
        title: `${brandName} for`,
        links: [
          { label: "Educators", href: "/educators" },
          { label: "Parents", href: "/parents" },
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
