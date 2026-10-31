import { brandName } from "@repo/tokens";
import type { FaqItem } from "@repo/ui/marketing/faq";
import type { Feature } from "@repo/ui/marketing/feature-grid";
import { TitleHighlight } from "@repo/ui/marketing/hero";
import type { PricingTier } from "@repo/ui/marketing/pricing-tiers";

export const educators = {
  meta: {
    title: "For educators",
    description:
      "Learning games built from Ontario curriculum expectations, made for short periods and old Chromebooks. Free while we build it together.",
  },
  hero: {
    title: (
      <>
        Games built from the <TitleHighlight>Ontario curriculum</TitleHighlight>
      </>
    ),
    lead: `Each ${brandName} game starts from specific Ontario curriculum expectations, and students practise the skill by playing. Choose the games that fit what you're teaching, share them in Google Classroom, and see what each student has learned.`,
    primaryAction: { label: "Join the teacher pilot", href: "#pilot" },
    secondaryAction: { label: "Talk to us", href: "/contact" },
    note: "Free while we build it together.",
    image: {
      alt: "The teacher's view of a class: how each student is doing on each curriculum expectation, with the wrong ideas showing up in the class listed above",
      placeholderLabel: "Picture of the teacher's view coming soon",
    },
    // Local for now; point src at the hosted video (Mux, YouTube) later.
    video: {
      src: "/videos/teacher-grading.mp4",
      poster: "/videos/teacher-grading-poster.jpg",
      label: "Watch the 1-minute tour",
      alt: "A tour of what teachers see, starting from their class",
    },
  },
  features: {
    eyebrow: "Made for real classrooms",
    title: "Built around how your day actually works",
    lead: "Designed with a Grades 1–8 teacher, for short periods, shared Chromebooks and 25 students signing in at once.",
    items: [
      {
        icon: "curriculum",
        title: "Built from Ontario expectations",
        body: "Each game lists the curriculum expectations it covers, so you always know what it teaches.",
      },
      {
        icon: "chromebook",
        title: "Runs on older Chromebooks",
        body: "It runs in the browser, and it's built to work on the oldest Chromebook in the room.",
      },
      {
        icon: "clock",
        title: "Quick to start",
        body: "Students join your class from one link and sign in with their school account. You can also share a link that opens one game. All the games are on from the start.",
      },
      {
        icon: "chart",
        title: "See the wrong ideas, and who has them",
        body: "See which misconceptions are showing up in your class and which students have each one. Then look at any student's play to see exactly what they did.",
      },
      {
        icon: "clipboard",
        title: "A summary for report cards",
        body: "View or print a summary of each student's work. It shows which curriculum expectations and learning skills it speaks to. You still decide the level.",
      },
      {
        icon: "trophy",
        title: "Recognition that's fair",
        body: "Give students special stickers for kindness, perseverance and leadership, and see who you haven't recognised yet this term. In a split class, each student plays at their own grade.",
      },
    ] satisfies Feature[],
  },
  howItWorks: {
    eyebrow: "How it works",
    title: "Four steps from signing up to report cards",
  },
  comparison: {
    eyebrow: "What makes it different",
    title: "Fewer, better games, where playing is the lesson",
    lead: `${brandName} doesn't put quiz questions inside a game. Each game is built around a common misconception, so students see the wrong idea fail.`,
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Free while we build it together.",
    lead: "Paid licences add more tools for teachers, schools and boards. Students and parents never pay.",
    tiers: [
      {
        name: "Teacher",
        price: "Free",
        description: `Everything you need to use ${brandName} with your class.`,
        features: [
          "A link to share in Google Classroom",
          "Turn on any game for your class",
          "Links that open one game, for any lesson",
          "See how each student is doing",
        ],
        cta: { label: "Join the pilot", href: "#pilot" },
        tone: "educator",
      },
      {
        name: "Teacher and board licences",
        price: "Pricing to come",
        badge: "Free for pilot teachers",
        description:
          "More ways to see how students are doing, and to recognise them, for teachers, schools and boards.",
        features: [
          "Results for each curriculum expectation",
          "A closer look at each student and the whole class",
          "A summary for report cards",
          "More than one class",
          "Stickers you give for kindness, perseverance and leadership",
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
        body: "We keep each student's first name and last initial, never their email. There's no chat, and students never see each other's names.",
      },
      {
        icon: "secure",
        title: "Data hosted in Canada",
        body: "Student data will be stored in Canada. When a teacher or board asks, we'll delete it.",
      },
      {
        icon: "clipboard",
        title: "Help with reporting",
        body: `Teachers see which curriculum expectations and learning skills each student's work speaks to. ${brandName} never gives a level: that's the teacher's call.`,
      },
    ] satisfies Feature[],
    cta: { label: "Talk to us about your board", href: "/contact" },
  },
  faq: {
    title: "Questions teachers ask",
    items: [
      {
        question: `Is ${brandName} really free?`,
        answer:
          "Yes, while we build it with pilot teachers. Sharing games with your class, choosing which games are on, and seeing how each student is doing are all free. Pilot teachers also get the paid tools free: a closer look at each student, results for each curriculum expectation, and more.",
      },
      {
        question: "What grades and subjects will it cover?",
        answer: `${brandName} is for Grades 1–8. The first five games are for Grades 3–5 math, in the Number strand: fractions, multiplication, place value, addition and subtraction, and division. Pilot teachers will help decide what comes next.`,
      },
      {
        question: "Will it run on our Chromebooks?",
        answer: `It has to, and we've built it that way from the start. ${brandName} runs in the browser and works on older Chromebooks. A link to one game opens only that game.`,
      },
      {
        question: `Is ${brandName} approved by my board?`,
        answer: `Not yet, because ${brandName} is still in development. Before any class uses it, we'll go through your board's privacy and IT review, and we'll help with the paperwork.`,
      },
      {
        question: "How is student data protected?",
        answer:
          "Students sign in with their school account. We keep only their first name and last initial, never their email. Students never see each other's names, and there's no chat. Data will be stored in Canada, and we'll delete it when you ask.",
      },
      {
        question: `Does ${brandName} replace my unit?`,
        answer: `No. ${brandName} adds to your teaching. You teach the idea, then turn on the games that practise it. What students do in the games gives you more to go on when you assess.`,
      },
      {
        question: "What does the pilot involve?",
        answer:
          "You try the first five games with your class, tell us what works and what doesn't, and help us choose what to build next. Pilot teachers get every paid feature free.",
      },
      {
        question: "What's coming next?",
        answer:
          "A shared space your class can explore together, and a way for parents to see how their child is doing. What pilot teachers tell us will shape both.",
      },
    ] satisfies FaqItem[],
  },
};
