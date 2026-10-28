// Type-level tests of the contract, checked by `tsc` (`pnpm check-types`),
// never run. Each `@ts-expect-error` line must fail to type-check: if the
// contract loosens so it compiles, the directive itself becomes the error.
// The lines without one must compile.
import { defineGame, type GameProps } from "./index.ts";

const manifest = {
  slug: "type-test",
  version: 1,
  renderer: "dom",
  avatar: "portrait",
  progress: true,
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.4"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": {
      expectations: ["math-2020.g3.B2.8", "math-2020.g4.B1.4"],
    },
  },
  strings: { "en-CA": { title: "Type Test", hello: "Hello", bye: "Bye" } },
} as const;

type Props = GameProps<typeof manifest>;

// A game that uses every prop as the contract allows.
defineGame(manifest, (props: Props) => {
  props.onAttempt({
    task: "task-1",
    expectation: "math-2020.g3.B2.8",
    succeeded: false,
    misconception: "bigger-denominator-bigger",
    assisted: "hint",
  });
  void props.say("hello", "bye");
  props.onProgress({ done: 0, total: 2 });
  const tier: "g3" | "g4" = props.tier;
  return (
    <p>
      {props.t("hello")} {tier}
      <props.Avatar expression="cheering" size={64} />
    </p>
  );
});

// Unknown expectations, in a tier or a misconception.
defineGame(
  {
    ...manifest,
    tiers: {
      // @ts-expect-error not an expectation in the curriculum's product layer
      g3: { grade: 3, expectations: ["math-2020.g3.Z9.9"] },
    },
  },
  () => null,
);
defineGame(
  {
    ...manifest,
    misconceptions: {
      // @ts-expect-error not an expectation in the curriculum's product layer
      made_up: { expectations: ["math-2020.g4.Z9.9"] },
    },
  },
  () => null,
);

// A manifest's other fields.
// @ts-expect-error only dom, pixi or playcanvas
defineGame({ ...manifest, renderer: "canvas" }, () => null);
// @ts-expect-error only portrait or character
defineGame({ ...manifest, avatar: "none" }, () => null);
defineGame(
  {
    ...manifest,
    // @ts-expect-error English strings are required
    strings: { "fr-CA": { hello: "Bonjour" } },
  },
  () => null,
);
defineGame(
  {
    ...manifest,
    // @ts-expect-error every game has a title, its name
    strings: { "en-CA": { hello: "Hello" } },
  },
  () => null,
);

declare const props: Props;

// Attempts: only the manifest's tiers' expectations and its misconceptions.
props.onAttempt({
  task: "task-1",
  // @ts-expect-error an expectation, but not one of this game's tiers'
  expectation: "math-2020.g5.B1.3",
  succeeded: true,
});
props.onAttempt({
  task: "task-1",
  expectation: "math-2020.g3.B2.8",
  succeeded: false,
  // @ts-expect-error not one of the manifest's misconceptions
  misconception: "no-equivalence",
});
props.onAttempt({
  task: "task-1",
  expectation: "math-2020.g3.B2.8",
  succeeded: true,
  // @ts-expect-error not a kind of help
  assisted: "answer",
});
// @ts-expect-error an attempt needs its task ID
props.onAttempt({ expectation: "math-2020.g3.B2.8", succeeded: true });

// Strings: only the manifest's IDs.
// @ts-expect-error not one of the manifest's strings
props.t("goodbye");
// @ts-expect-error not one of the manifest's strings
void props.say("hello", "goodbye");

// Tiers: only the manifest's.
// @ts-expect-error the manifest has no g5 tier
const g5: Props["tier"] = "g5";
void g5;

// Expressions: only the avatar's.
// @ts-expect-error not one of the avatar's expressions
void (<props.Avatar expression="angry" size={64} />);
