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
    lead: `${brandName} is a game your child plays with their class at school. They earn everything in it by learning, so you will never be asked for money.`,
    primaryAction: { label: "Get updates", href: "#updates" },
    secondaryAction: { label: "How rewards work", href: "#rewards" },
    image: {
      alt: "A child's home screen in the game, decorated with stickers and outfits they earned by practising",
      src: "/screens/student-locker.jpg",
    },
  },
  features: {
    eyebrow: "What your child gets",
    title: "Learning they can be proud of",
    lead: `We built ${brandName} so every child feels they belong, without anyone spending a cent.`,
    items: [
      {
        icon: "puzzle",
        title: "Games that really teach",
        body: "To get better at the game, your child has to get better at the skill. There are no quiz questions in disguise.",
      },
      {
        icon: "sparkles",
        title: "A space that shows their effort",
        body: "Your child has their own locker in the game. They decorate it with stickers they earn by practising, and dress their character in outfits they earn the same way, so it shows how hard they've worked.",
      },
      {
        icon: "chart",
        title: "A teacher who sees how they think",
        body: "Their teacher sees which ideas they understand and which they're still working on, not just a score.",
      },
      {
        icon: "star",
        title: "Rewards for effort",
        body: "Trying again, getting better and finishing all count, not just getting the right answer.",
      },
      {
        icon: "heart",
        title: "Recognition from their teacher",
        body: "Teachers can give special stickers for kindness, perseverance and leadership.",
      },
      {
        icon: "privacy",
        title: "Safe by design",
        body: "There's no chat, and classmates never see your child's name. Nobody else can see or change their locker.",
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
    lead: `Many games for kids are designed to keep them spending, or to keep them coming back. ${brandName} is designed to help them learn.`,
  },
  home: {
    eyebrow: "At home",
    title: "Calm play, with no nagging",
    items: [
      {
        icon: "smile",
        title: "Play at home, if you like",
        body: "Kids can play games again and dress up their character. There's a weekly limit on new rewards, and kids can reach it in class time alone. That way, kids without a computer at home don't miss out.",
      },
      {
        icon: "clock",
        title: "No streaks or daily rewards",
        body: `${brandName} won't pull your child back with streaks, timers or items that are only around for a short time.`,
      },
      {
        icon: "clipboard",
        title: "Home play counts too",
        body: "Their teacher sees the games they play at home, just like the games they play in class.",
      },
    ] satisfies Feature[],
  },
  faq: {
    title: "Questions parents ask",
    items: [
      {
        question: `Does ${brandName} cost anything for families?`,
        answer:
          "No, never. There's no store, no membership and no ads. Your child earns every item in the game by playing and learning.",
      },
      {
        question: "Is it safe for my child?",
        answer:
          "Children sign in with their school account. We keep only their first name and last initial, never their email. Classmates never see their name, and there's no chat. Student data will be stored in Canada.",
      },
      {
        question: "Can my child play at home?",
        answer:
          "Yes, on any computer with a web browser. At home they can play games again and dress up their character. There's a weekly limit on new rewards, and kids can reach it in class time alone, so kids without a computer at home don't miss out.",
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
