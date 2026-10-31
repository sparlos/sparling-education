// Teacher app tour: about 50 seconds for teachers (social, email, the
// educators page). Shows the real teacher app, from the class at a glance to
// report cards, with screenshots and a recording from screens/. It shares the brand frame
// with the teacher teaser, and its opening text, but not its music. Copy follows
// apps/web/content/educators.tsx and the app's own walkthroughs.
import { defineBrief, landscape } from "../../src/brief.ts";

export default defineBrief({
  id: "teacher-grading",
  audience: "Ontario Grades 1–8 teachers",
  tone: "educator",
  format: landscape,
  // The games' narrator, at natural speed (the games slow it for students).
  voice: { name: "narrator", speed: 1 },
  music: {
    // Calmer and more grown-up than the teaser: soft keys, a warm pad and a
    // light groove.
    bpm: 96,
    pattern: (bars) => `
const chords = "<F^7 Em7 Dm7 C^7>";
const keys = chord(chords).voicing().struct("x ~ ~ x ~ ~ x ~").s("triangle")
  .lpf(1800).attack(0.01).decay(0.5).sustain(0.25).gain(0.24).room(0.4);
const pad = chord(chords).voicing().s("sawtooth").lpf(650)
  .attack(0.5).release(1.2).gain(0.07).room(0.6);
const bass = note("<f1 e1 d1 c2>").struct("x ~ ~ ~ ~ ~ x ~").s("sine")
  .decay(0.6).sustain(0.4).gain(0.75);
const drums = stack(
  s("bd ~ ~ ~ ~ ~ bd ~").gain(0.7),
  s("~ ~ cp ~").gain(0.25).room(0.3),
  s("hh*8").gain(0.12),
);
const bell = n("<[4 ~ ~ 2 ~ ~ ~ ~] [~ ~ 1 ~ ~ ~ ~ ~] [0 ~ ~ ~ 2 ~ ~ ~] [~ ~ ~ ~ 4 ~ 5 ~]>")
  .scale("C5:major:pentatonic").s("sine").decay(0.4).sustain(0)
  .gain(0.16).delay(0.3).delaytime(0.47).room(0.5);
const intro = stack(pad, keys.lpf(900));
const main = stack(pad, keys, bass, drums, bell);
const ending = stack(
  chord("F^7").voicing().struct("x ~ ~ ~").s("triangle").lpf(1600)
    .decay(2).sustain(0).gain(0.3).room(0.6),
  note("f1").struct("x ~ ~ ~").s("sine").decay(1.6).sustain(0).gain(0.8),
);
arrange([1, intro], [${bars - 2}, main], [1, ending])
`,
  },
  beats: [
    {
      id: "hook",
      vo: "What if math games could provide real opportunities to assess your students?",
      scene: {
        kind: "kinetic",
        eyebrow: "Hey, teachers",
        lines: [
          "What if *math* *games* could",
          "provide real opportunities",
          "to *assess* your students?",
        ],
      },
    },
    {
      id: "play",
      vo: "Your students just play. Every try they make shows you what they know.",
      transition: "slide",
      scene: {
        kind: "screen",
        screen: "play-fraction-hop",
        label: "What students see",
        cue: "play",
      },
    },
    {
      id: "class",
      vo: "Then you open Kindling, and see your whole class at a glance.",
      transition: "zoom",
      lightLeak: true,
      tail: 0.8,
      scene: {
        kind: "screen",
        screen: "teach-dashboard",
        label: "Your class",
        focus: { x: 0.094, y: 0.421, w: 0.811, h: 0.347 },
        cue: "glance",
      },
    },
    {
      id: "student",
      vo: "Each student gets a page laid out like a report card, one curriculum expectation at a time.",
      transition: "slide",
      scene: {
        kind: "screen",
        screen: "teach-student",
        label: "A student's page",
        focus: { x: 0.09, y: 0.3, w: 0.565, h: 0.275 },
        cue: "report",
      },
    },
    {
      id: "answers",
      vo: "Open any student to see every answer they gave, and where they went wrong.",
      transition: "slide",
      tail: 1.1,
      scene: {
        kind: "screen",
        screen: "teach-answers",
        label: "Every answer",
        focus: { x: 0.098, y: 0.34, w: 0.8, h: 0.082 },
        cue: "every",
      },
    },
    {
      id: "report-cards",
      vo: "When report cards come, Quick assess sums up each student. You still decide the grade.",
      transition: "slide",
      tail: 0.9,
      scene: {
        kind: "screen",
        screen: "teach-quick-assess-print",
        label: "Ready to print",
        focus: { x: 0.09, y: 0.068, w: 0.56, h: 0.04 },
        cue: "decide",
      },
    },
    {
      id: "curriculum",
      vo: "Every game is mapped to Ontario expectations, runs on Chromebooks, and plays at each student's grade.",
      transition: "zoom",
      tail: 0.8,
      scene: {
        kind: "screen",
        screen: "teach-dashboard",
        label: "One class, two grades",
        focus: { x: 0.37, y: 0.428, w: 0.43, h: 0.058 },
        cue: "Ontario",
      },
    },
    {
      id: "cta",
      vo: "Kindling, where play becomes proof. Join the teacher pilot today!",
      transition: "iris",
      scene: {
        kind: "end-card",
        // The platform tagline (docs/DESIGN.md).
        headline: "Where play becomes proof",
        note: "Every game shows real evidence of learning",
        cta: "Join the teacher pilot",
      },
    },
  ],
});
