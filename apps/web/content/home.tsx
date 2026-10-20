import type { PillarProps } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";
import type { RoleCardProps } from "@repo/ui/marketing/role-card";

export const home = {
  hero: {
    eyebrow: "For Grades 1–8 · Built for Ontario classrooms",
    title: (
      <>
        Learning games where the skill{" "}
        <TitleHighlight>is how you win</TitleHighlight>
      </>
    ),
    lead: "Kindling gives your class a shared 3D world full of curriculum games. Students get better at the game by getting better at the concept, with no quiz questions bolted on.",
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "See how it works", href: "#how-it-works" },
    note: "Free for teachers, always. Students and parents never pay.",
    image: {
      alt: "A colourful low-poly class world with houses, trees and glowing portals",
      placeholderLabel: "Class hub render coming soon",
    },
  },
  roles: {
    title: "Who's visiting today?",
    roles: [
      {
        tone: "educator",
        icon: "teacher",
        title: "I'm a teacher",
        body: "Assign curriculum games, watch your class world grow and see what each student has learned.",
        href: "/educators",
        cta: "For educators",
      },
      {
        tone: "parent",
        icon: "parent",
        title: "I'm a parent",
        body: "See what your child will learn, and why Kindling will never ask you for money.",
        href: "/parents",
        cta: "For parents",
      },
      {
        tone: "student",
        icon: "student",
        title: "I'm a student",
        body: "Design your character, build your house and help your class build something amazing.",
        href: "/students",
        cta: "For students",
      },
    ] satisfies RoleCardProps[],
  },
  pillars: {
    eyebrow: "Why Kindling",
    title: "Three ideas we won't compromise on",
    pillars: [
      {
        label: "01",
        title: "Learning is the mechanic",
        body: "In a fractions game, you cut planks to exact lengths to finish a bridge. When the wrong idea fails, kids can see why.",
        image: {
          alt: "A student cutting a plank to a fractional length to finish a bridge",
          placeholderLabel: "Fractions game render",
        },
        tone: "brand",
      },
      {
        label: "02",
        title: "One world for the whole class",
        body: "Every class shares a 3D hub. Games open through portals, and the world grows as the class completes units together.",
        image: {
          alt: "Students' avatars gathered around a portal in their class hub",
          placeholderLabel: "Class hub render",
        },
        tone: "educator",
      },
      {
        label: "03",
        title: "Rewards are earned, never bought",
        body: "Outfits and furniture come from effort, retrying and improving. No store, no loot boxes, no ads.",
        image: {
          alt: "A student's house decorated with furniture earned from learning units",
          placeholderLabel: "Student house render",
        },
        tone: "parent",
      },
    ] satisfies PillarProps[],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "From class code to class world",
  },
  comparison: {
    eyebrow: "What makes it different",
    title: "Not another quiz with a game skin",
    lead: "Kindling is built around one rule: getting better at the game has to mean getting better at the concept.",
  },
  promise: {
    title: "Students and parents never pay. Not once.",
    body: "Kindling is paid for by teachers who want deeper tools and by school boards. Kids get the whole game, and every item is earned by playing and learning.",
  },
};
