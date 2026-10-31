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
        In {brandName}'s games, kids practise the skill by <i>playing</i>, not
        by answering a quiz between turns. You see which wrong ideas are showing
        up in your class, and you get a summary to help with report cards.
      </>
    ),
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "See how it works", href: "#how-it-works" },
    note: "Free for teachers. Students and parents are never asked to pay anything.",
    image: {
      alt: "The teacher's view of a class: how each student is doing on each curriculum expectation, with the wrong ideas showing up in the class listed above",
      src: "/screens/teacher-class.jpg",
    },
  },
  roles: {
    title: "Who's visiting today?",
    roles: [
      {
        tone: "educator",
        icon: "teacher",
        title: "I'm a teacher",
        body: "Give your class games that fit the curriculum, and see what each student has learned.",
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
        title: "Playing the game is the practice",
        body: "In Fraction Hop, kids plan a path of fraction-sized hops along a number line, then watch their character follow it. If a hop is the wrong size, their character falls in the water, and they can see which hop it was.",
        image: {
          alt: "A student's character hopping along a number line marked with fractions, over water",
          src: "/screens/fraction-hop.jpg",
        },
        tone: "brand",
      },
      {
        title: "Know what to reteach tomorrow",
        body: "See how each student is doing on each curriculum expectation. The wrong ideas showing up in your class are listed at the top. When report cards come around, print a summary of what each student has shown.",
        image: {
          alt: "A list of the wrong ideas showing up in a class, with how many students have each one",
          src: "/screens/teacher-misconceptions.jpg",
        },
        tone: "educator",
      },
      {
        title: "Rewards are earned, never bought",
        body: "Kids earn outfits and stickers by trying, trying again and getting better. There's no store, no prize boxes and no ads.",
        image: {
          alt: "A student's locker in the game, open, with stickers they earned by practising on its door and something from each game they played on its shelves",
          src: "/screens/student-locker.jpg",
        },
        tone: "parent",
      },
    ] satisfies PillarProps[],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "From the first link to report cards",
  },
  comparison: {
    eyebrow: "What makes it different",
    title: "Games that really teach",
    lead: `${brandName} is built around one rule: getting better at the game has to mean getting better at the skill.`,
  },
  promise: {
    title: "Students and parents never pay. Not once.",
    body: `Teachers who want more tools and school boards pay for ${brandName}. Kids get the whole game, and they earn every item in it by playing and learning.`,
  },
};
