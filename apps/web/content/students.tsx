import type { Feature } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";
import type { Step } from "@repo/ui/marketing/steps";
import { promiseItems } from "./shared";

// Written for students aged about 9–13: short sentences, talking to "you".
// This page never collects any information from students.
export const students = {
  meta: {
    title: "For students",
    description:
      "Design your character, build your house and explore your class world. Ask your teacher about Kindling!",
  },
  hero: {
    title: (
      <>
        Your world. Your class. <TitleHighlight>Your adventure.</TitleHighlight>
      </>
    ),
    lead: "Kindling is a game you play with your whole class. Design your character, build your house and unlock cool stuff by getting better at what you learn in school.",
    primaryAction: { label: "See what you can do", href: "#things-to-do" },
    image: {
      alt: "Kids' characters waving in front of a glowing portal in their class world",
      placeholderLabel: "Avatars render coming soon",
    },
  },
  features: {
    eyebrow: "In Kindling",
    title: "Things you can do",
    items: [
      {
        icon: "avatar",
        title: "Design your character",
        body: "Pick your look and your outfits. Your character comes with you into every game.",
      },
      {
        icon: "house",
        title: "Build your own house",
        body: "Decorate it with furniture you earn. Got a sundial? That's because you learned to tell time!",
      },
      {
        icon: "users",
        title: "Visit your friends",
        body: "Drop by your classmates' houses and see what they've built.",
      },
      {
        icon: "world",
        title: "Explore your class world",
        body: "Jump through portals to play games. Your world grows as your class learns together.",
      },
      {
        icon: "bridge",
        title: "Build big things together",
        body: "Finish a unit and your class might build a bridge, a tower or something even bigger.",
      },
      {
        icon: "star",
        title: "Get rewarded for trying",
        body: "Practising, trying again and getting better all earn rewards. It's not just about being right.",
      },
    ] satisfies Feature[],
  },
  steps: {
    eyebrow: "Getting started",
    title: "How to start playing",
    steps: [
      {
        title: "Ask your teacher",
        body: "Your teacher sets up Kindling for your class.",
      },
      {
        title: "Type your class code",
        body: "Your teacher gives you a code. Then pick a nickname.",
      },
      {
        title: "Start playing!",
        body: "Make your character and jump through your first portal.",
      },
    ] satisfies Step[],
  },
  promise: {
    title: "Everything is earned. Nothing is for sale.",
    body: "Nobody can buy stuff in Kindling, so everything you have, you earned by playing and learning.",
    items: promiseItems.slice(0, 3),
  },
  cta: {
    title: "Want to play Kindling?",
    lead: "Ask your teacher about Kindling! It's free for teachers, so show them this website.",
    action: { label: "Show your teacher", href: "/educators" },
  },
};
