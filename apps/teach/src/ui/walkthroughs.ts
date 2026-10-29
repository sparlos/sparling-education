// The teacher app's walkthroughs: guides through the real controls on a
// screen, one spotlit step at a time. The welcome walkthrough starts by
// itself on a new teacher's first dashboard and shows what Kindling does in a
// nutshell, across screens. Each other screen's walkthrough starts by itself
// the first time the teacher opens that screen, once they're past the
// welcome. Each is remembered on the server once finished or skipped, and
// can be replayed from Help. (Never "tour": that's a game's playthrough.)
import type { WalkthroughStep } from "@repo/ui/walkthrough";

/** The screens walkthroughs run on, by what's on them. */
export type Screen =
  | "dashboard"
  | "student"
  | "quick-assess"
  | "manage"
  | "play";

export interface Step extends WalkthroughStep {
  /** The screen it's on. The walkthrough goes there for it. */
  screen: Screen;
  /** Left out when this is on the walkthrough's first screen: it says the same another way. */
  unless?: string;
}

export interface Walkthrough {
  /** Stable: the server remembers it. Lowercase letters, digits and hyphens. */
  id: string;
  /** Where it starts, by itself or from Help. */
  screen: Screen;
  /** What Help calls it. */
  name: string;
  steps: Step[];
  /** Other walkthroughs it takes the teacher through, which needn't start by themselves after it. */
  covers?: string[];
}

/** Points a step at what's marked `data-walkthrough="<name>"`. */
export const at = (name: string) => `[data-walkthrough="${name}"]`;

export const welcome: Walkthrough = {
  id: "welcome",
  screen: "dashboard",
  name: "Show me around",
  covers: ["quick-assess"],
  steps: [
    {
      screen: "dashboard",
      title: "Welcome to Kindling",
      body: "Your students play short math games. Each answer they give shows you what they understand. You can use that to plan lessons and write report cards. Here's a quick look around.",
    },
    {
      screen: "dashboard",
      target: at("classes"),
      position: "bottom-start",
      title: "Your classes",
      body: "Switch between your classes here. The demo class has pretend students who have already played, so you can try everything. To make your own class, click New class.",
    },
    {
      screen: "dashboard",
      target: at("share"),
      title: "Share a game link",
      body: "Share has a link to join your class, and a link for each game. Post a game link in your class stream. When a student opens it, they join your class and the game starts.",
    },
    {
      screen: "dashboard",
      target: at("new-class"),
      unless: at("share"),
      title: "Share a game link",
      body: "Make your own class, and it gets a Share button. Share has links you can post in your class stream. Students use them to join your class and play.",
    },
    {
      screen: "dashboard",
      target: at("misconceptions"),
      title: "Misconceptions showing up",
      body: "A wrong answer often comes from a wrong idea about the math. Here are the wrong ideas your students have, the most common first. Open one to see which students have it. Then you can reteach them as a group.",
    },
    {
      screen: "dashboard",
      target: at("result"),
      position: "right",
      title: "How each student is doing",
      body: "Each row is a student, and each column is a curriculum expectation. A cell tells you how well the student understands that expectation, based on the games they played. It's a description, not a mark. Open a cell to see every answer behind it.",
    },
    {
      screen: "dashboard",
      target: at("quick-assess"),
      title: "Quick assess",
      body: "When it's time for report cards, open Quick assess. It gathers what each student has shown you in one place.",
    },
    {
      screen: "quick-assess",
      target: at("print"),
      title: "Ready for report cards",
      body: "Each student gets their own page. It shows how they're doing on each expectation, what to work on next, and their Learning Skills. Print it, or save it as a PDF. You still decide the grade.",
    },
    {
      screen: "dashboard",
      target: at("demo"),
      title: "See it as a student",
      body: "Click View as a student to see what your students see. It opens a demo student's locker in a new tab. When you're done exploring, you can delete the demo class.",
    },
    {
      screen: "dashboard",
      target: at("help"),
      position: "bottom-start",
      title: "Help is here",
      body: "Open Help any time to replay this walkthrough. Help can also explain the screen you're on.",
    },
  ],
};

/** Each other screen's own walkthrough. */
export const screenWalkthroughs: Walkthrough[] = [
  {
    id: "student-page",
    screen: "student",
    name: "Explain this page",
    steps: [
      {
        screen: "student",
        target: at("evidence"),
        position: "bottom-start",
        title: "A student's page",
        body: "This page follows the order of a report card. First is math, one expectation at a time. Next is what the student should work on. Learning Skills come last.",
      },
      {
        screen: "student",
        target: at("plays"),
        title: "The plays behind it",
        body: "Open an expectation to see the games the student played for it, newest first. Open a game to see each answer they gave.",
      },
      {
        screen: "student",
        target: at("recognise"),
        position: "top",
        title: "Recognise them",
        body: "Recognise the student for a character trait. They'll get a sticker for it in their locker.",
      },
    ],
  },
  {
    id: "quick-assess",
    screen: "quick-assess",
    name: "Explain this page",
    steps: [
      {
        screen: "quick-assess",
        target: at("print"),
        title: "Ready for report cards",
        body: "Each student gets their own page. It shows how they're doing on each expectation, what to work on next, and their Learning Skills. Print it, or save it as a PDF. You still decide the grade.",
      },
    ],
  },
  {
    id: "manage",
    screen: "manage",
    name: "Explain this page",
    steps: [
      {
        screen: "manage",
        target: at("student"),
        title: "Your students",
        body: "Use a student's menu to change their grade or remove them from the class. You don't add students here. They join on their own, with the class join link or a game link.",
      },
    ],
  },
  {
    id: "play",
    screen: "play",
    name: "Explain this page",
    steps: [
      {
        screen: "play",
        target: at("tries"),
        position: "bottom-start",
        title: "Every answer, in order",
        body: "Each task shows what the game asked. Under it is each answer the student gave. You'll see what they did, any help the game gave them, and any wrong idea it showed. Answers marked Explored were the student trying things out, so they don't count.",
      },
    ],
  },
];

export const walkthroughs = [welcome, ...screenWalkthroughs];

/** Every walkthrough's ID: for a teacher who's seen them all. */
export const walkthroughIds = walkthroughs.map((w) => w.id);

/**
 * The steps to take now, from the screen the walkthrough starts on: a step
 * there that points at something that isn't on it (no students yet, the
 * demo class's banner on a real class) is left out, and so is one whose
 * `unless` is there.
 */
export function stepsFor(walkthrough: Walkthrough, root: ParentNode): Step[] {
  const there = (selector: string) => root.querySelector(selector) !== null;
  return walkthrough.steps.filter(
    (step) =>
      step.screen !== walkthrough.screen ||
      ((!step.target || there(step.target)) &&
        !(step.unless && there(step.unless))),
  );
}
