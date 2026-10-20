import type { FaqItem } from "@repo/ui/marketing/faq";
import type { Feature } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";

export const parents = {
  meta: {
    title: "For parents",
    description:
      "A learning game your child plays at school, where every reward is earned. No store, no ads, no memberships. Families never pay.",
  },
  hero: {
    eyebrow: "For parents",
    title: (
      <>
        A learning game with <TitleHighlight>nothing to buy</TitleHighlight>
      </>
    ),
    lead: "Kindling is a game your child plays with their class at school. Everything in it is earned by learning, so you will never be asked for money.",
    primaryAction: { label: "Get updates", href: "#updates" },
    secondaryAction: { label: "How rewards work", href: "#rewards" },
    image: {
      alt: "A child's cosy low-poly house filled with furniture earned from school units",
      placeholderLabel: "Student house render coming soon",
    },
  },
  features: {
    eyebrow: "What your child gets",
    title: "Learning they can be proud of",
    lead: "Kindling is built so that kids feel like they belong, without anyone spending a cent.",
    items: [
      {
        icon: "puzzle",
        title: "Games that really teach",
        body: "Getting better at the game means getting better at the concept. No quiz questions in disguise.",
      },
      {
        icon: "house",
        title: "A house that shows what they learned",
        body: "Furniture is earned from units, like a sundial after learning to tell time, so their house becomes a record of their learning.",
      },
      {
        icon: "users",
        title: "A class they belong to",
        body: "Classmates visit each other's houses and build a shared world together over the year.",
      },
      {
        icon: "star",
        title: "Rewards for effort",
        body: "Trying again, improving and finishing all count, not just getting the right answer.",
      },
      {
        icon: "heart",
        title: "Recognition from their teacher",
        body: "Teachers can award special items for kindness, perseverance and leadership.",
      },
      {
        icon: "privacy",
        title: "Safe by design",
        body: "Nicknames instead of names, and preset phrases instead of open chat with strangers.",
      },
    ] satisfies Feature[],
  },
  promise: {
    title: "You will never be asked to pay",
    body: "Some learning games sell memberships to kids and their families. Kindling never will. Teachers and school boards pay for extra tools, and your child gets everything.",
  },
  comparison: {
    eyebrow: "How it's different",
    title: "What you won't find in Kindling",
    lead: "Many games for kids are designed to keep them spending or coming back. Kindling is designed to help them learn.",
  },
  home: {
    eyebrow: "At home",
    title: "Calm play, with no nagging",
    items: [
      {
        icon: "smile",
        title: "Play at home, if you like",
        body: "Kids can decorate, visit friends' houses and replay games. New rewards stay tied to class work, so kids without a device at home aren't left behind.",
      },
      {
        icon: "clock",
        title: "No streaks or daily rewards",
        body: "Kindling won't pull your child back with streaks, timers or limited-time items.",
      },
      {
        icon: "clipboard",
        title: "A parent view, with no upsell",
        body: "See what your child has learned, their house and their teacher's awards.",
      },
    ] satisfies Feature[],
  },
  faq: {
    title: "Questions parents ask",
    items: [
      {
        question: "Does Kindling cost anything for families?",
        answer:
          "No, never. There's no store, no membership and no ads. Every item in the game is earned by playing and learning.",
      },
      {
        question: "Is it safe for my child?",
        answer:
          "Children join with a class code and a nickname, with no email or full name needed. There's no free chat, only preset phrases and emotes, and student data will be hosted in Canada.",
      },
      {
        question: "Can my child play at home?",
        answer:
          "Yes, on any computer with a web browser. At home they can decorate, visit and replay. New rewards mostly come from class work, so kids without a device at home aren't left behind.",
      },
      {
        question: "How can my child's class start using Kindling?",
        answer:
          "Share this website with their teacher. Teachers choose Kindling for their class, and it's free for them.",
      },
      {
        question: "When can we try it?",
        answer:
          "Kindling is still in development. Sign up for updates and we'll let you know when it's ready.",
      },
    ] satisfies FaqItem[],
  },
  updates: {
    title: "Get updates about Kindling",
    lead: "A short note when there's news. No spam, and we never share your email.",
    form: {
      label: "Your email",
      placeholder: "you@example.com",
      submitLabel: "Get updates",
      pendingLabel: "Sending…",
      fineprint: "Unsubscribe any time.",
    },
  },
};
