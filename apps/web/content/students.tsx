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
      "Design your character, earn outfits and stickers, and play games where getting better is how you win. Ask your teacher about Kindling!",
  },
  hero: {
    title: (
      <>
        Your character. Your locker.{" "}
        <TitleHighlight>Your adventure.</TitleHighlight>
      </>
    ),
    lead: "Kindling is games you play at school. Design your character, earn outfits and stickers, and unlock cool stuff by getting better at what you learn in school.",
    primaryAction: { label: "See what you can do", href: "#things-to-do" },
    image: {
      alt: "A student's locker with their character, outfits and stickers",
      placeholderLabel: "Locker render coming soon",
    },
  },
  features: {
    eyebrow: "In Kindling",
    title: "Things you can do",
    items: [
      {
        icon: "avatar",
        title: "Design your character",
        body: "Pick your look. Your character comes with you into every game.",
      },
      {
        icon: "sparkles",
        title: "Earn new outfits",
        body: "Unlock outfit pieces by playing, and dress your character however you like.",
      },
      {
        icon: "star",
        title: "Decorate your locker",
        body: "Your locker is your own space. Stick the stickers you earn wherever you want. Only you can see it.",
      },
      {
        icon: "play",
        title: "Play games where you learn by doing",
        body: "Hop along number lines and more. Getting better at the game means getting better at math.",
      },
      {
        icon: "trophy",
        title: "Get noticed for being kind",
        body: "Your teacher can give you special stickers for being kind, never giving up and helping others.",
      },
      {
        icon: "heart",
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
        title: "Join your class",
        body: "Open the link your teacher shares and sign in with your school account.",
      },
      {
        title: "Start playing!",
        body: "Make your character, then pick your first game from your locker.",
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
