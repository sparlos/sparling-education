// Teacher teaser: ~35 seconds for teachers (social, email, the educators
// page). Sells "the mechanic is the lesson" through Fraction Hop, then what
// the teacher gets, then the free pilot. Copy follows apps/web/content.
import { brandName } from "@repo/tokens";
import { defineBrief, landscape } from "../../src/brief.ts";

const hopLabels = {
  goalAt: "Goal at",
  plan: "Your plan",
  play: "Play",
};

export default defineBrief({
  id: "teacher-teaser",
  audience: "Ontario Grades 1–8 teachers",
  tone: "educator",
  format: landscape,
  // The games' narrator, at natural speed (the games slow it for students).
  voice: { name: "narrator", speed: 1 },
  music: {
    bpm: 120,
    pattern: (bars) => `
const chords = "<C^7 Am7 Dm7 G7>";
const drums = stack(
  s("bd*4").gain(0.9),
  s("~ cp ~ cp").gain(0.45).room(0.15),
  s("[~ hh]*4").gain(0.35),
  s("hh*16").gain(0.1),
);
const stabs = chord(chords).voicing().struct("[~ x]*4").s("square")
  .lpf(2400).decay(0.12).sustain(0).gain(0.2).room(0.3);
const bass = note("<c2 a1 d2 g1>").struct("x ~ x x ~ x x ~").s("triangle")
  .decay(0.18).sustain(0.2).gain(0.75);
const lead = n("<[0 2 4 ~ 7 ~ 4 2] [5 ~ 4 2 ~ 4 ~ ~] [1 3 5 ~ 8 ~ 5 3] [4 ~ 6 ~ 4 2 1 ~]>")
  .scale("C4:major:pentatonic").s("triangle").decay(0.15).sustain(0.3)
  .gain(0.28).delay(0.25).delaytime(0.375).room(0.3);
const intro = stack(stabs.lpf(900), s("[~ hh]*4").gain(0.3));
const main = stack(drums, stabs, bass, lead);
const ending = stack(
  chord("C^7").voicing().struct("x ~ ~ ~").s("sawtooth").lpf(2000)
    .decay(1.6).sustain(0).gain(0.35).room(0.5),
  note("c2").struct("x ~ ~ ~").s("triangle").decay(1.2).sustain(0).gain(0.8),
  s("bd ~ ~ ~").gain(0.9),
);
arrange([1, intro], [${bars - 2}, main], [1, ending])
`,
  },
  beats: [
    {
      id: "hook",
      vo: "Teachers! What if practice was the part your class begged for?",
      scene: {
        kind: "kinetic",
        eyebrow: "Hey, teachers",
        lines: [
          "What if *practice*",
          "was the part your class",
          "*begged* for?",
        ],
      },
    },
    {
      id: "class",
      vo: "Your whole class, practising together, and loving every minute.",
      transition: "slide",
      scene: {
        kind: "class",
        cheerOn: "loving",
        nicknames: [
          "Cosmic Otter",
          "Brave Maple",
          "Jolly Comet",
          "Swift Panda",
          "Lucky Pebble",
          "Sunny Moose",
          "Clever Fox",
          "Mighty Acorn",
          "Happy Narwhal",
          "Bright Beaver",
          "Zippy Loon",
          "Cozy Cactus",
        ],
      },
    },
    {
      id: "meet",
      vo: `Meet ${brandName}!`,
      transition: "zoom",
      lightLeak: true,
      minSeconds: 3,
      scene: {
        kind: "logo",
        tagline: "Learning games where the skill is how you win",
      },
    },
    {
      id: "hop",
      vo: "In Fraction Hop, kids plan their hops, press play, and watch where they land.",
      transition: "wipe",
      minSeconds: 5,
      scene: {
        kind: "fraction-hop",
        mode: "solve",
        goal: [3, 8],
        plan: [8, 8, 8],
        ticks: 8,
        label: "Fraction Hop · Grades 3–5",
        labels: { ...hopLabels, result: "You found the goal!" },
      },
    },
    {
      id: "splash",
      vo: "When the wrong idea fails, they see exactly why. Splash!",
      transition: "slide",
      tail: 0.9,
      scene: {
        kind: "fraction-hop",
        mode: "splash",
        goal: [3, 4],
        plan: [4, 8],
        ticks: 8,
        stones: [2, 4, 6, 8, 10, 12, 14, 16],
        label: "The mechanic is the lesson",
        labels: { ...hopLabels, result: "Splash!" },
      },
    },
    {
      id: "teacher",
      vo: "And you see who's stuck, and which misconceptions are showing up.",
      transition: "slide",
      tail: 0.8,
      scene: {
        kind: "teacher-view",
        eyebrow: "Grade 4 · Ontario B1.6",
        title: "Fraction Hop progress",
        students: [
          { name: "Maya R.", status: "got-it", progress: 1 },
          { name: "Liam T.", status: "practising", progress: 0.6 },
          { name: "Ava K.", status: "stuck", progress: 0.3 },
          { name: "Noah P.", status: "got-it", progress: 0.9 },
          { name: "Zoe M.", status: "stuck", progress: 0.25 },
        ],
        statusLabels: {
          "got-it": "Got it",
          practising: "Practising",
          stuck: "Needs help",
        },
        insight: {
          title: "2 students think 1/8 is bigger than 1/4",
          body: "Their hops splash short of the stone. A quick reteach on unit fractions will help.",
        },
      },
    },
    {
      id: "features",
      vo: "Mapped to Ontario expectations. Built for old Chromebooks. One link in Google Classroom.",
      transition: "clock-wipe",
      scene: {
        kind: "features",
        title: "Made for real classrooms",
        items: [
          { icon: "curriculum", label: "Mapped to Ontario expectations" },
          { icon: "chromebook", label: "Built for old Chromebooks" },
          { icon: "classroom", label: "One link in Google Classroom" },
        ],
      },
    },
    {
      id: "cta",
      vo: `${brandName} is free for teachers, always. Join the pilot today!`,
      transition: "iris",
      scene: {
        kind: "end-card",
        headline: `Bring ${brandName} to your class`,
        note: "Free for teachers. Always.",
        cta: "Join the teacher pilot",
      },
    },
  ],
});
