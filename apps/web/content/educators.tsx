import type { FaqItem } from "@repo/ui/marketing/faq";
import type { Feature } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";
import type { PricingTier } from "@repo/ui/marketing/pricing-tiers";

export const educators = {
  meta: {
    title: "For educators",
    description:
      "Curriculum games mapped to Ontario expectations, built for short periods and old Chromebooks. Free for teachers, always.",
  },
  hero: {
    title: (
      <>
        Games that teach the <TitleHighlight>expectation</TitleHighlight>, not
        just test it
      </>
    ),
    lead: "Every Kindling game is mapped to Ontario curriculum expectations, and the concept is the core mechanic. Turn on the games that fit what you're teaching, share them in Google Classroom and see what each student has actually learned.",
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "Talk to us", href: "/contact" },
    note: "Free for teachers, always.",
    image: {
      alt: "A teacher's view of the class world from above, showing every student's house",
      placeholderLabel: "Teacher view render coming soon",
    },
  },
  features: {
    eyebrow: "Made for real classrooms",
    title: "Built around how your day actually works",
    lead: "Designed with a Grades 1–8 teacher for short periods, shared Chromebooks and 25 students logging in at once.",
    items: [
      {
        icon: "curriculum",
        title: "Mapped to Ontario expectations",
        body: "Every game is tagged to specific expectation codes, so you always know what it teaches.",
      },
      {
        icon: "chromebook",
        title: "Runs on older Chromebooks",
        body: "Lightweight and browser-based, with a simpler mode for slower devices.",
      },
      {
        icon: "clock",
        title: "Quick starts",
        body: "A class link and one-click school sign-in get everyone in fast. Game links drop students straight into a game.",
      },
      {
        icon: "chart",
        title: "Progress you can act on",
        body: "See who's stuck and which misconceptions are showing up, then print a quick assess summary for report cards.",
      },
      {
        icon: "trophy",
        title: "Recognition that's fair",
        body: "Award exclusive items for kindness, perseverance and leadership, and see who hasn't been recognised yet this term.",
      },
      {
        icon: "path",
        title: "Room for every pace",
        body: "Each game adjusts to the student's grade, so split classes just work. No due dates, so absent students never fall behind.",
      },
    ] satisfies Feature[],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Four steps from sign-up to report cards",
  },
  comparison: {
    eyebrow: "What makes it different",
    title: "Fewer, better games, where the mechanic is the lesson",
    lead: "Kindling skips the quiz-with-a-game-skin approach. Each game targets a common misconception, so the wrong idea visibly fails.",
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Free for teachers. Always.",
    lead: "Paid licences add deeper tools for teachers, schools and boards. Students and parents never pay.",
    tiers: [
      {
        name: "Teacher",
        price: "Free, always",
        description: "Everything you need to run Kindling with your class.",
        features: [
          "Class links and student nicknames",
          "Turn on any game for your class",
          "Game links for Google Classroom",
          "Basic progress for every student",
        ],
        cta: { label: "Join the pilot", href: "#pilot" },
        tone: "educator",
      },
      {
        name: "Teacher and board licences",
        price: "Pricing to come",
        badge: "Free for pilot teachers",
        description:
          "Deeper insight and recognition tools for teachers, schools and boards.",
        features: [
          "Results mapped to curriculum expectations",
          "Detailed class and student analytics",
          "Evidence for report cards",
          "Multiple classes",
          "Teacher-awarded items",
        ],
        cta: { label: "Talk to us", href: "/contact" },
        highlighted: true,
        tone: "educator",
      },
    ] satisfies PricingTier[],
    footnote:
      "Students and parents never pay: not for items, not for upgrades, not for anything.",
  },
  boards: {
    eyebrow: "For schools and boards",
    title: "Built to make privacy review straightforward",
    lead: "New classroom tools go through privacy and IT review. We're designing Kindling so that review is easy to say yes to.",
    items: [
      {
        icon: "privacy",
        title: "Privacy by design",
        body: "We keep a first name and last initial, never student emails. Classmates only see nicknames, and preset phrases replace free chat.",
      },
      {
        icon: "secure",
        title: "Data hosted in Canada",
        body: "Student data will be stored in Canada, with clear deletion when a class or board asks.",
      },
      {
        icon: "clipboard",
        title: "Evidence for reporting",
        body: "Results show which expectations and learning skills they speak to. Kindling never assigns a level: that judgement stays with the teacher.",
      },
    ] satisfies Feature[],
    cta: { label: "Talk to us about your board", href: "/contact" },
  },
  faq: {
    title: "Questions teachers ask",
    items: [
      {
        question: "Is Kindling really free for teachers?",
        answer:
          "Yes. Class links, turning on games and basic progress are free, always. Paid licences add deeper analytics, curriculum-mapped results and more.",
      },
      {
        question: "What grades and subjects will it cover?",
        answer:
          "Kindling is for Grades 1–8. We're starting with a single math strand and expanding from there, and pilot teachers help decide what comes next.",
      },
      {
        question: "Will it run on our Chromebooks?",
        answer:
          "That's a requirement from day one. Kindling runs in the browser, is built for older Chromebooks and has a lighter mode for slower devices.",
      },
      {
        question: "Is Kindling approved by my board?",
        answer:
          "Not yet, because Kindling is still in development. Before any classroom use, we'll go through your board's privacy and IT review, and we'll help with the paperwork.",
      },
      {
        question: "How is student data protected?",
        answer:
          "Students sign in with their school account, and we keep only a first name and last initial, never their email. Classmates only see nicknames, there's no free chat, data will be hosted in Canada, and we'll delete it when you ask.",
      },
      {
        question: "Does Kindling replace my unit?",
        answer:
          "No. Kindling supplements your teaching: you teach the concept, turn on the games that reinforce it, and use the results as extra evidence when you assess.",
      },
      {
        question: "What does the pilot involve?",
        answer:
          "Trying early games, sharing what works and what doesn't, and helping us choose what to build next. Pilot teachers get every paid feature free.",
      },
    ] satisfies FaqItem[],
  },
};
