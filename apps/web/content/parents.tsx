import { brandName } from "@repo/tokens";
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
    title: (
      <>
        A learning game with <TitleHighlight>nothing to buy</TitleHighlight>
      </>
    ),
    lead: `${brandName} is a game your child plays with their class at school. Everything in it is earned by learning, so you will never be asked for money.`,
    primaryAction: { label: "Get updates", href: "#updates" },
    secondaryAction: { label: "How rewards work", href: "#rewards" },
    image: {
      alt: "A child's locker decorated with stickers and outfits earned by practising",
      placeholderLabel: "Student locker render coming soon",
    },
  },
  features: {
    eyebrow: "What your child gets",
    title: "Learning they can be proud of",
    lead: `${brandName} is built so that kids feel like they belong, without anyone spending a cent.`,
    items: [
      {
        icon: "puzzle",
        title: "Games that really teach",
        body: "Getting better at the game means getting better at the concept. No quiz questions in disguise.",
      },
      {
        icon: "sparkles",
        title: "A locker that shows their effort",
        body: "Outfits and stickers are earned by practising and improving in games, so their locker becomes a record of their effort.",
      },
      {
        icon: "chart",
        title: "A teacher who sees how they think",
        body: "Their teacher sees which ideas they've got and which they're still working on, not just a score.",
      },
      {
        icon: "star",
        title: "Rewards for effort",
        body: "Trying again, improving and finishing all count, not just getting the right answer.",
      },
      {
        icon: "heart",
        title: "Recognition from their teacher",
        body: "Teachers can award special stickers for kindness, perseverance and leadership.",
      },
      {
        icon: "privacy",
        title: "Safe by design",
        body: "There's no chat, classmates never see your child's name, and nobody else can see or change their locker.",
      },
    ] satisfies Feature[],
  },
  promise: {
    title: "You will never be asked to pay",
    body: `Some learning games sell memberships to kids and their families. ${brandName} never will. Teachers and school boards pay for extra tools, and your child gets everything.`,
  },
  comparison: {
    eyebrow: "How it's different",
    title: `What you won't find in ${brandName}`,
    lead: `Many games for kids are designed to keep them spending or coming back. ${brandName} is designed to help them learn.`,
  },
  home: {
    eyebrow: "At home",
    title: "Calm play, with no nagging",
    items: [
      {
        icon: "smile",
        title: "Play at home, if you like",
        body: "Kids can replay games and dress up their character. New rewards have a weekly limit kids reach in class, so kids without a device at home aren't left behind.",
      },
      {
        icon: "clock",
        title: "No streaks or daily rewards",
        body: `${brandName} won't pull your child back with streaks, timers or limited-time items.`,
      },
      {
        icon: "clipboard",
        title: "Home play counts too",
        body: "Games played at home are evidence for their teacher, just like games played in class.",
      },
    ] satisfies Feature[],
  },
  faq: {
    title: "Questions parents ask",
    items: [
      {
        question: `Does ${brandName} cost anything for families?`,
        answer:
          "No, never. There's no store, no membership and no ads. Every item in the game is earned by playing and learning.",
      },
      {
        question: "Is it safe for my child?",
        answer:
          "Children sign in with their school account, and we keep only their first name and last initial, never their email. Classmates never see their name, there's no chat, and student data will be hosted in Canada.",
      },
      {
        question: "Can my child play at home?",
        answer:
          "Yes, on any computer with a web browser. At home they can replay games and dress up their character. New rewards have a weekly limit kids reach in class, so kids without a device at home aren't left behind.",
      },
      {
        question: `How can my child's class start using ${brandName}?`,
        answer: `Share this website with their teacher. Teachers choose ${brandName} for their class, and it's free for them.`,
      },
      {
        question: "When can we try it?",
        answer: `${brandName} is still in development. Sign up for updates and we'll let you know when it's ready.`,
      },
    ] satisfies FaqItem[],
  },
  updates: {
    title: `Get updates about ${brandName}`,
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
