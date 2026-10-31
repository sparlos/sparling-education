import { brandName } from "@repo/tokens";
import type { PillarProps } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";
import type { RoleCardProps } from "@repo/ui/marketing/role-card";

export const home = {
  hero: {
    title: (
      <>
        Learning games where the skill{" "}
        <TitleHighlight>is how you win</TitleHighlight>
      </>
    ),
    lead: (
      <>
        In {brandName}'s games, kids practise the skill as <i>part</i> of the
        game, not as a quiz bolted on top. You see the misconceptions showing up
        in your class, and quick assess gathers the evidence for report cards.
      </>
    ),
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "See how it works", href: "#how-it-works" },
    note: "Free for teachers. Students and parents are never asked to pay anything.",
    image: {
      alt: "The teacher dashboard: each student against curriculum expectations, with the misconceptions showing up in the class listed above",
      placeholderLabel: "Dashboard render coming soon",
    },
  },
  roles: {
    title: "Who's visiting today?",
    roles: [
      {
        tone: "educator",
        icon: "teacher",
        title: "I'm a teacher",
        body: "Share curriculum games, spot misconceptions and see what each student has learned.",
        href: "/educators",
        cta: "For educators",
      },
      {
        tone: "parent",
        icon: "parent",
        title: "I'm a parent",
        body: `See what your child will learn, and why ${brandName} will never ask you for money.`,
        href: "/parents",
        cta: "For parents",
      },
    ] satisfies RoleCardProps[],
  },
  pillars: {
    eyebrow: `Why ${brandName}`,
    title: "Three ideas we won't compromise on",
    pillars: [
      {
        title: "Learning is the mechanic",
        body: "In Fraction Hop, kids plan a route of fraction hops along a number line, then watch their character run it. When the wrong idea fails, the splash shows exactly which hop was wrong.",
        image: {
          alt: "A student's character hopping along a fraction number line over water",
          placeholderLabel: "Fraction Hop render",
        },
        tone: "brand",
      },
      {
        title: "Know what to reteach tomorrow",
        body: "See every student against curriculum expectations, with the misconceptions showing up in your class listed above. Quick assess gathers the evidence for report cards.",
        image: {
          alt: "The misconceptions showing up in a class, with how many students show each one",
          placeholderLabel: "Dashboard render",
        },
        tone: "educator",
      },
      {
        title: "Rewards are earned, never bought",
        body: "Outfits and stickers come from effort, retrying and improving. No store, no loot boxes, no ads.",
        image: {
          alt: "A student's locker decorated with stickers earned by practising",
          placeholderLabel: "Student locker render",
        },
        tone: "parent",
      },
    ] satisfies PillarProps[],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "From class link to report card",
  },
  comparison: {
    eyebrow: "What makes it different",
    title: "Not another quiz with a game skin",
    lead: `${brandName} is built around one rule: getting better at the game has to mean getting better at the concept.`,
  },
  promise: {
    title: "Students and parents never pay. Not once.",
    body: `${brandName} is paid for by teachers who want deeper tools and by school boards. Kids get the whole game, and every item is earned by playing and learning.`,
  },
};
