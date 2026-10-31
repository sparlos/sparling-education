import { brandName } from "@repo/tokens";
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
        Games that validate <TitleHighlight>expectation</TitleHighlight>
      </>
    ),
    lead: `Every ${brandName} game is mapped to Ontario curriculum expectations, and the concept is the core mechanic. Turn on the games that fit what you're teaching, share them in Google Classroom and see what each student has actually learned.`,
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "Talk to us", href: "/contact" },
    note: "Free for teachers, always.",
    image: {
      alt: "The teacher dashboard: each student against curriculum expectations, with the misconceptions showing up in the class listed above",
      placeholderLabel: "Dashboard render coming soon",
    },
    // Local for now; point src at the hosted video (Mux, YouTube) later.
    video: {
      src: "/videos/teacher-grading.mp4",
      poster: "/videos/teacher-grading-poster.jpg",
      label: "Watch the 1-minute tour",
      alt: "A tour of the teacher app, starting from the class dashboard",
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
        body: "Lightweight and browser-based, built for the oldest Chromebook in the room.",
      },
      {
        icon: "clock",
        title: "Quick starts",
        body: "A class link and one-click school sign-in get everyone in fast. Game links drop students straight into a game, and every game starts turned on.",
      },
      {
        icon: "chart",
        title: "Misconceptions you can act on",
        body: "See which wrong ideas are showing up in your class and who has each, then open any student's evidence to see exactly what happened.",
      },
      {
        icon: "clipboard",
        title: "Quick assess for report cards",
        body: "View or print a summary of which expectations and learning skills each student's evidence speaks to. The level stays your call.",
      },
      {
        icon: "trophy",
        title: "Recognition that's fair",
        body: "Award exclusive stickers for kindness, perseverance and leadership, and see who hasn't been recognised yet this term. Each game plays at the student's grade, so split classes just work.",
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
    lead: `${brandName} skips the quiz-with-a-game-skin approach. Each game targets a common misconception, so the wrong idea visibly fails.`,
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Free for teachers. Always.",
    lead: "Paid licences add deeper tools for teachers, schools and boards. Students and parents never pay.",
    tiers: [
      {
        name: "Teacher",
        price: "Free, always",
        description: `Everything you need to run ${brandName} with your class.`,
        features: [
          "Class links for Google Classroom",
          "Turn on any game for your class",
          "Game links for any lesson",
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
          "Quick assess for report cards",
          "Multiple classes",
          "Recognition stickers",
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
    lead: `New classroom tools go through privacy and IT review. We're designing ${brandName} so that review is easy to say yes to.`,
    items: [
      {
        icon: "privacy",
        title: "Privacy by design",
        body: "We keep a first name and last initial, never student emails. There's no chat, and students never see each other's names.",
      },
      {
        icon: "secure",
        title: "Data hosted in Canada",
        body: "Student data will be stored in Canada, with clear deletion when a class or board asks.",
      },
      {
        icon: "clipboard",
        title: "Evidence for reporting",
        body: `Results show which expectations and learning skills they speak to. ${brandName} never assigns a level: that judgement stays with the teacher.`,
      },
    ] satisfies Feature[],
    cta: { label: "Talk to us about your board", href: "/contact" },
  },
  faq: {
    title: "Questions teachers ask",
    items: [
      {
        question: `Is ${brandName} really free for teachers?`,
        answer:
          "Yes. Class links, turning on games and basic progress are free, always. Paid licences add deeper analytics, curriculum-mapped results and more.",
      },
      {
        question: "What grades and subjects will it cover?",
        answer: `${brandName} is for Grades 1–8. The first five games cover the Number strand for Grades 3–5: fractions, multiplication, place value, addition and subtraction, and division. Pilot teachers help decide what comes next.`,
      },
      {
        question: "Will it run on our Chromebooks?",
        answer: `That's a requirement from day one. ${brandName} runs in the browser and is built for older Chromebooks, and a game link opens just that game.`,
      },
      {
        question: `Is ${brandName} approved by my board?`,
        answer: `Not yet, because ${brandName} is still in development. Before any classroom use, we'll go through your board's privacy and IT review, and we'll help with the paperwork.`,
      },
      {
        question: "How is student data protected?",
        answer:
          "Students sign in with their school account, and we keep only a first name and last initial, never their email. Students never see each other's names, there's no chat, data will be hosted in Canada, and we'll delete it when you ask.",
      },
      {
        question: `Does ${brandName} replace my unit?`,
        answer: `No. ${brandName} supplements your teaching: you teach the concept, turn on the games that reinforce it, and use the results as extra evidence when you assess.`,
      },
      {
        question: "What does the pilot involve?",
        answer:
          "Trying the first five games with your class, sharing what works and what doesn't, and helping us choose what to build next. Pilot teachers get every paid feature free.",
      },
      {
        question: "What's coming next?",
        answer:
          "A shared class world for your students and a view for parents, shaped by what pilot teachers tell us.",
      },
    ] satisfies FaqItem[],
  },
};
