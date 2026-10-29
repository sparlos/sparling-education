import { expectation } from "@repo/curriculum";
import { UIProvider } from "@repo/ui/provider";
import { createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Try } from "../platform/contract.ts";
import {
  createFakePlatform,
  type FakePlatformOptions,
} from "../platform/fake/index.tsx";
import type { FakeStudentSeed } from "../platform/fake/teacher.ts";
import { App } from "./App.tsx";

function renderApp(options?: FakePlatformOptions) {
  return openAt("/teach/", options).user;
}

/** The app opened at a URL, as from a link or a reload, with a history of its own. */
function openAt(url: string, options?: FakePlatformOptions) {
  const history = createMemoryHistory({ initialEntries: [url] });
  render(
    <UIProvider>
      <App platform={createFakePlatform(options)} history={history} />
    </UIProvider>,
  );
  return { user: userEvent.setup(), history };
}

async function signInAsNewTeacher() {
  const user = renderApp();
  await user.click(await signInButton());
  await screen.findByText("No classes yet");
  return user;
}

async function createClass(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  grades: string[],
) {
  await user.click(screen.getByRole("button", { name: "New class" }));
  const form = screen.getByRole("form", { name: "New class" });
  await user.type(within(form).getByLabelText("Class name"), name);
  for (const grade of grades)
    await user.click(within(form).getByRole("checkbox", { name: grade }));
  await user.click(within(form).getByRole("button", { name: "Create class" }));
  return screen.findByRole("region", { name });
}

const signInButton = () =>
  screen.findByRole("button", { name: "Sign in with Google" });

describe("the teacher app", () => {
  it("signs a new teacher in to an empty classes screen, and back out", async () => {
    const user = renderApp({
      google: { subject: "g-1", firstName: "Ada", lastName: "Lovelace" },
    });
    await user.click(await signInButton());

    expect(
      await screen.findByRole("heading", { name: "Your classes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No classes yet")).toBeInTheDocument();
    expect(screen.getByText("Ada L.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await signInButton()).toBeInTheDocument();
    expect(screen.queryByText("Your classes")).not.toBeInTheDocument();
  });

  it("tells a student this is for teachers", async () => {
    const user = renderApp({ student: true });
    await user.click(await signInButton());

    expect(
      await screen.findByRole("heading", { name: "This is for teachers" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your classes")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await signInButton()).toBeInTheDocument();
  });

  it("asks to try again when Google's sign-in is rejected", async () => {
    const user = renderApp({ rejectSignIn: true });
    await user.click(await signInButton());

    expect(
      await screen.findByText("That sign-in didn't work. Try again."),
    ).toBeInTheDocument();
    expect(await signInButton()).toBeInTheDocument();
  });

  it("offers to try again, not sign-in, when Kindling can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let offline = true;
    const user = renderApp({ offline: () => offline });

    expect(
      await screen.findByRole("heading", { name: "Kindling can't be reached" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in with Google" }),
    ).toBeNull();

    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await signInButton()).toBeInTheDocument();
  });

  it("creates a class in one short form", async () => {
    const user = await signInAsNewTeacher();
    const room = await createClass(user, "Room 12", ["Grade 5", "Grade 4"]);

    expect(within(room).getByText("Grades 4 and 5")).toBeInTheDocument();
    expect(within(room).getByText("Fraction Hop")).toBeInTheDocument();
    expect(screen.queryByText("No classes yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "New class" })).toBeNull();

    const second = await createClass(user, "Room 14", ["Grade 3"]);
    expect(within(second).getByText("Grade 3")).toBeInTheDocument();
    expect(screen.getAllByRole("region").map((r) => r.ariaLabel)).toEqual([
      "Room 12",
      "Room 14",
    ]);
  });

  it("asks for a name and a grade before making a class", async () => {
    const user = await signInAsNewTeacher();
    await user.click(screen.getByRole("button", { name: "New class" }));
    await user.click(screen.getByRole("button", { name: "Create class" }));

    expect(screen.getByText("Give the class a name.")).toBeInTheDocument();
    expect(screen.getByText("Pick at least one grade.")).toBeInTheDocument();
    expect(screen.queryByRole("region")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("No classes yet")).toBeInTheDocument();
  });

  it("copies the class join link and a game link in one tap each", async () => {
    const user = await signInAsNewTeacher();
    const room = await createClass(user, "Room 12", ["Grade 4"]);

    await user.click(
      within(room).getByRole("button", { name: "Copy join link" }),
    );
    const joinLink = new URL(await navigator.clipboard.readText());
    expect(joinLink.pathname).toMatch(/^\/play\/join\/[A-Z2-9]{8}$/);
    expect(within(room).getByText(joinLink.href)).toBeInTheDocument();
    expect(
      within(room).getByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();

    await user.click(
      within(room).getByRole("button", {
        name: "Copy game link for Fraction Hop",
      }),
    );
    const gameLink = new URL(await navigator.clipboard.readText());
    expect(gameLink.pathname).toBe("/play/fraction-hop");
    expect(gameLink.searchParams.get("join")).toBe(
      joinLink.pathname.split("/").at(-1),
    );
  });
});

describe("the dashboard", () => {
  const right = (n: number): Try[][] =>
    Array.from({ length: n }, () => [{ succeeded: true }]);
  const wrong = (n: number): Try[][] =>
    Array.from({ length: n }, () => [{ succeeded: false }]);

  let subject = 0;
  function student(
    firstName: string,
    lastName: string,
    seed: Omit<FakeStudentSeed, "google"> = {},
  ): FakeStudentSeed {
    subject += 1;
    return {
      google: { subject: `student-${subject}`, firstName, lastName },
      ...seed,
    };
  }

  async function openDashboard(
    options: FakePlatformOptions,
    className = "Room 12",
  ) {
    const user = renderApp(options);
    await user.click(await signInButton());
    await user.click(
      await screen.findByRole("link", {
        name: `See results for ${className}`,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: className }),
    ).toBeInTheDocument();
    return user;
  }

  const row = (name: string) =>
    screen.findByRole("row", { name: new RegExp(`^${name}`) });

  it("shows the class's students against what its games evidence, in plain words", async () => {
    await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ana", "Diaz", { plays: [{ grade: 4, tasks: right(4) }] }),
            student("Ben", "Ode", {
              plays: [{ grade: 4, tasks: [...right(2), ...wrong(2)] }],
            }),
            student("Cy", "Park", {
              plays: [{ grade: 4, tasks: [...right(1), ...wrong(3)] }],
            }),
            student("Dee", "Lam"),
          ],
        },
      ],
    });

    const { description } = expectation("math-2020.g4.B1.6");
    const header = await screen.findByRole("columnheader", {
      name: /Grade 4 · B1.6/,
    });
    expect(header).toHaveTextContent(description);

    expect(await row("Ana D.")).toHaveTextContent("Showing consistently");
    expect(await row("Ben O.")).toHaveTextContent("Developing");
    expect(await row("Cy P.")).toHaveTextContent("Not yet showing");
    expect(await row("Dee L.")).toHaveTextContent("No evidence yet");
    // Never a mark.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows every expectation for every student, and marks evidence from another tier", async () => {
    await openDashboard(
      {
        classes: [
          {
            draft: { name: "Room 14", grades: [4, 5] },
            students: [
              student("Sam", "Rivera", {
                grade: 4,
                plays: [{ grade: 5, tasks: right(4) }],
              }),
            ],
          },
        ],
      },
      "Room 14",
    );

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    const sam = await row("Sam R.");
    expect(sam).toHaveTextContent("Grade 4");
    const [g4, g5] = within(sam).getAllByRole("cell");
    expect(g4).toHaveTextContent("No evidence yet");
    expect(g5).toHaveTextContent("Showing consistently");
    expect(g5).toHaveTextContent("From the Grade 5 tier");
  });

  it("says when no students have joined yet, and goes back to the classes", async () => {
    const user = await openDashboard({
      classes: [{ draft: { name: "Room 12", grades: [3] }, students: [] }],
    });
    expect(await screen.findByText("No students yet")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Your classes" }));
    expect(
      await screen.findByRole("heading", { name: "Your classes" }),
    ).toBeInTheDocument();
  });

  it("offers to try again when the results can't be loaded", async () => {
    let offline = false;
    const user = renderApp({
      offline: () => offline,
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [student("Ana", "Diaz")],
        },
      ],
    });
    await user.click(await signInButton());
    const open = await screen.findByRole("link", {
      name: "See results for Room 12",
    });
    offline = true;
    await user.click(open);
    expect(
      await screen.findByText("The class's results couldn't be loaded."),
    ).toBeInTheDocument();
    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await row("Ana D.")).toHaveTextContent("No evidence yet");
  });

  const bigger = "bigger-denominator-bigger";
  const count = "numerator-not-a-count";
  const showed = (misconception: string): Try[] => [
    { succeeded: true, misconception },
  ];
  const biggerWords = /bigger bottom number is a bigger piece/;

  it("lists the misconceptions showing up, the one most students showed first, and who showed each", async () => {
    const user = await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ana", "Diaz", {
              plays: [{ grade: 4, tasks: [showed(bigger), showed(count)] }],
            }),
            student("Ben", "Ode", {
              plays: [{ grade: 4, tasks: [showed(bigger)] }],
            }),
            student("Cy", "Park", { plays: [{ grade: 4, tasks: right(2) }] }),
          ],
        },
      ],
    });
    const strip = await screen.findByRole("region", {
      name: "Misconceptions showing up",
    });
    const [first, second] = within(strip).getAllByRole("button");
    expect(first).toHaveTextContent("2 students");
    expect(first).toHaveTextContent(biggerWords);
    expect(first).toHaveTextContent("Fraction Hop");
    expect(second).toHaveTextContent("1 student");
    expect(first).toHaveAttribute("aria-expanded", "false");

    await user.click(first as HTMLElement);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const who = within(strip).getByRole("list", {
      name: /Students who showed/,
    });
    expect(
      within(who)
        .getAllByRole("link")
        .map((b) => b.textContent),
    ).toEqual(["Ana D.", "Ben O."]);
    await user.click(first as HTMLElement);
    expect(
      within(strip).queryByRole("list", { name: /Students who showed/ }),
    ).not.toBeInTheDocument();
  });

  it("says when no misconceptions are showing up yet", async () => {
    await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [student("Ana", "Diaz")],
        },
      ],
    });
    const strip = await screen.findByRole("region", {
      name: "Misconceptions showing up",
    });
    expect(strip).toHaveTextContent(/None yet/);
  });

  it("goes from a misconception to a student's evidence, down to a play, and back up", async () => {
    const user = await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ana", "Diaz", {
              plays: [
                {
                  grade: 4,
                  tasks: [
                    [
                      { succeeded: false, misconception: bigger },
                      { succeeded: true },
                    ],
                    [{ succeeded: true, assisted: "hint" }],
                    [{ succeeded: false }],
                  ],
                },
                { grade: 4, tasks: right(4) },
              ],
            }),
          ],
        },
      ],
    });
    const strip = await screen.findByRole("region", {
      name: "Misconceptions showing up",
    });
    await user.click(within(strip).getByRole("button", { name: biggerWords }));
    await user.click(within(strip).getByRole("link", { name: "Ana D." }));

    // The evidence: who, which expectation, their band and each play.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Grade 4 · B1.6")).toBeInTheDocument();
    expect(
      screen.getByText(expectation("math-2020.g4.B1.6").description),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Understanding" }),
    ).toHaveTextContent("Developing");
    const plays = within(
      screen.getByRole("region", { name: "Plays, newest first" }),
    ).getAllByRole("link");
    expect(plays).toHaveLength(2);
    expect(plays[0]).toHaveTextContent("4 of 4 tasks on their own");
    expect(plays[1]).toHaveTextContent("Fraction Hop");
    expect(plays[1]).toHaveTextContent("Grade 4 tier · Finished");
    expect(plays[1]).toHaveTextContent(
      "1 of 3 tasks on their own, 1 with help, 1 not yet",
    );
    expect(plays[1]).toHaveTextContent(biggerWords);

    // The play: each task's tries in order.
    await user.click(plays[1] as HTMLElement);
    expect(
      await screen.findByRole("heading", { level: 1, name: /Fraction Hop/ }),
    ).toBeInTheDocument();
    const tasks = screen.getAllByRole("heading", { level: 2, name: /^Task/ });
    expect(tasks.map((t) => t.textContent)).toEqual([
      "Task 1",
      "Task 2",
      "Task 3",
    ]);
    const task1 = tasks[0]?.closest("li") as HTMLElement;
    expect(
      within(task1)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringMatching(/^First tryNot yetShowed: .*bigger bottom number/),
      "Retry 1Got it",
    ]);
    expect(tasks[1]?.closest("li")).toHaveTextContent(
      "First tryGot it, with a hint",
    );
    expect(screen.getByText(/^How it ended: Finished/)).toBeInTheDocument();

    // And back up, one tap at a time, to the strip as it was left.
    await user.click(screen.getByRole("link", { name: "Ana D.'s evidence" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Room 12 results" }));
    const again = await screen.findByRole("region", {
      name: "Misconceptions showing up",
    });
    expect(
      within(again).getByRole("link", { name: "Ana D." }),
    ).toBeInTheDocument();
  });

  it("shows what each task asked and every try at it, explored ones included, with fractions drawn", async () => {
    const asked = "Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.";
    const user = await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ben", "Ode", {
              plays: [
                {
                  grade: 4,
                  tasks: [
                    [
                      {
                        succeeded: false,
                        exploring: true,
                        asked,
                        detail: "Tried 1/8 + 1/8: 2/8.",
                      },
                      {
                        succeeded: false,
                        misconception: bigger,
                        detail: "Hopped 1/8 + 1/4: splashed at 3/8.",
                      },
                      {
                        succeeded: true,
                        assisted: "hint",
                        detail: "Landed on 1 1/4.",
                      },
                    ],
                    [{ succeeded: true }],
                  ],
                },
              ],
            }),
          ],
        },
      ],
    });
    await user.click(
      within(await row("Ben O.")).getByRole("link", { name: /Ben O\./ }),
    );
    const [play] = within(
      await screen.findByRole("region", { name: "Plays, newest first" }),
    ).getAllByRole("link");
    expect(play).toHaveTextContent("3 tries, and 1 explored");

    await user.click(play as HTMLElement);
    const [first, second] = (
      await screen.findAllByRole("heading", { level: 2, name: /^Task/ })
    ).map((h) => h.closest("li") as HTMLElement);
    const task1 = within(first as HTMLElement);

    // What it asked, its fractions drawn and named for screen readers.
    expect(task1.getByText(/^Reach/).closest("p")).toHaveTextContent(
      /^Reach 54 on a course in eighths\. Blocks: 18, 14, 12\.$/,
    );
    expect(
      task1
        .getByText(/^Reach/)
        .closest("p")
        ?.querySelectorAll("[role=img]").length,
    ).toBe(4);
    expect(task1.getByRole("img", { name: "five fourths" })).toBeVisible();

    // Every try in order: explored, missed, then got with help.
    const tries = task1.getAllByRole("listitem");
    expect(tries.map((li) => li.textContent)).toEqual([
      "First tryExploredTried 18 + 18: 28.",
      expect.stringMatching(
        /^Retry 1Not yetHopped 18 \+ 14: splashed at 38\.Showed: .*bigger bottom number/,
      ),
      "Retry 2Got it, with a hintLanded on 114.",
    ]);
    expect(tries[0]).toHaveAttribute("data-exploring", "true");
    expect(
      within(tries[2] as HTMLElement).getByRole("img", {
        name: "one and one fourth",
      }),
    ).toBeVisible();

    // A task the game didn't describe reads as it always has.
    expect(second).toHaveTextContent(/^Task 2First tryGot it$/);
  });

  it("goes from a cell to the student's evidence, down to a play, and back", async () => {
    const user = await openDashboard({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ben", "Ode", {
              plays: [{ grade: 4, tasks: [...right(2), ...wrong(2)] }],
            }),
            student("Dee", "Lam"),
          ],
        },
      ],
    });
    // A cell with no evidence has nothing to open.
    expect(within(await row("Dee L.")).queryByRole("link")).toBeNull();

    await user.click(
      within(await row("Ben O.")).getByRole("link", {
        name: /Developing.*Ben O\., Grade 4 · B1\.6/,
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ben O." }),
    ).toBeInTheDocument();
    const [play] = within(
      screen.getByRole("region", { name: "Plays, newest first" }),
    ).getAllByRole("link");
    expect(play).toHaveTextContent("2 of 4 tasks on their own, 2 not yet");

    await user.click(play as HTMLElement);
    expect(
      await screen.findAllByRole("heading", { level: 2, name: /^Task/ }),
    ).toHaveLength(4);
    await user.click(screen.getByRole("link", { name: "Ben O.'s evidence" }));
    await user.click(
      await screen.findByRole("link", { name: "Room 12 results" }),
    );
    expect(await row("Ben O.")).toHaveTextContent("Developing");
  });

  it("offers to try again when a student's evidence can't be loaded", async () => {
    let offline = false;
    const user = await openDashboard({
      offline: () => offline,
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            student("Ana", "Diaz", { plays: [{ grade: 4, tasks: right(4) }] }),
          ],
        },
      ],
    });
    offline = true;
    await user.click(
      within(await row("Ana D.")).getByRole("link", {
        name: /Showing consistently/,
      }),
    );
    expect(
      await screen.findByText("The student's evidence couldn't be loaded."),
    ).toBeInTheDocument();
    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
  });
});

describe("the teacher app's URLs", () => {
  const bigger = "bigger-denominator-bigger";
  const room12: FakePlatformOptions = {
    classes: [
      {
        draft: { name: "Room 12", grades: [4] },
        students: [
          {
            google: { subject: "ana", firstName: "Ana", lastName: "Diaz" },
            plays: [
              {
                grade: 4,
                tasks: [
                  [{ succeeded: false, misconception: bigger }],
                  [{ succeeded: true }],
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const heading = (name: string | RegExp) =>
    screen.findByRole("heading", { level: 1, name });
  const hrefOf = async (name: string | RegExp) =>
    (await screen.findByRole("link", { name })).getAttribute("href") ?? "";

  /** Signs in from the start, and walks down to a play, keeping each screen's URL. */
  async function walkDown() {
    const { user, history } = openAt("/teach/", room12);
    await user.click(await signInButton());
    const dashboard = await hrefOf("See results for Room 12");
    await user.click(await screen.findByRole("link", { name: /See results/ }));
    const evidence = await hrefOf(/Ana D\., Grade 4 · B1\.6/);
    await user.click(await screen.findByRole("link", { name: /Ana D\.,/ }));
    const play = await hrefOf(/Fraction Hop/);
    await user.click(await screen.findByRole("link", { name: /Fraction Hop/ }));
    await screen.findByText(/^How it ended/);
    return { user, history, urls: { dashboard, evidence, play } };
  }

  it("gives every screen a readable URL under /teach/", async () => {
    const { urls } = await walkDown();
    expect(urls.dashboard).toMatch(/^\/teach\/classes\/[^/]+$/);
    expect(urls.evidence).toMatch(
      /^\/teach\/classes\/[^/]+\/students\/[^/]+\/expectations\/math-2020\.g4\.B1\.6$/,
    );
    expect(urls.play).toMatch(
      /^\/teach\/classes\/[^/]+\/students\/[^/]+\/plays\/[^/]+$/,
    );
  });

  it("opens each screen straight from its URL, after signing in", async () => {
    const { urls } = await walkDown();
    const screens: [string, () => Promise<unknown>][] = [
      ["/teach/", () => heading("Your classes")],
      [urls.dashboard, () => heading("Room 12")],
      [urls.evidence, () => heading("Ana D.")],
      [urls.play, () => heading(/Fraction Hop/)],
    ];
    for (const [url, shows] of screens) {
      cleanup();
      const { user, history } = openAt(url, room12);
      await user.click(await signInButton());
      expect(await shows()).toBeInTheDocument();
      expect(history.location.pathname).toBe(url);
    }
  });

  it("moves back and forward through the dashboard, the evidence and a play", async () => {
    const { history } = await walkDown();
    act(() => history.back());
    expect(await heading("Ana D.")).toBeInTheDocument();
    act(() => history.back());
    expect(await heading("Room 12")).toBeInTheDocument();
    act(() => history.back());
    expect(await heading("Your classes")).toBeInTheDocument();
    act(() => history.forward());
    expect(await heading("Room 12")).toBeInTheDocument();
    act(() => history.forward());
    expect(await heading("Ana D.")).toBeInTheDocument();
    act(() => history.forward());
    expect(await heading(/Fraction Hop/)).toBeInTheDocument();
  });

  it("goes up from a play opened straight from a link, with no history behind it", async () => {
    const { urls } = await walkDown();
    cleanup();
    const { user, history } = openAt(urls.play, room12);
    await user.click(await signInButton());
    await user.click(
      await screen.findByRole("link", { name: "Ana D.'s evidence" }),
    );
    expect(await heading("Ana D.")).toBeInTheDocument();
    expect(history.location.pathname).toBe(urls.evidence);
    await user.click(
      await screen.findByRole("link", { name: "Room 12 results" }),
    );
    expect(await heading("Room 12")).toBeInTheDocument();
    expect(history.location.pathname).toBe(urls.dashboard);
  });

  it("opens the misconception in the URL in the strip, and toggles it without piling up history", async () => {
    const { urls } = await walkDown();
    cleanup();
    const key = `fraction-hop|${bigger}`;
    const { user, history } = openAt(
      `${urls.dashboard}?misconception=${encodeURIComponent(key)}`,
      room12,
    );
    await user.click(await signInButton());
    const strip = await screen.findByRole("region", {
      name: "Misconceptions showing up",
    });
    const toggle = within(strip).getByRole("button", {
      name: /bigger bottom number/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(strip).getByRole("link", { name: "Ana D." })).toBeVisible();

    const entries = history.length;
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(history.location.search).toBe("");
    await user.click(toggle);
    expect(
      new URLSearchParams(history.location.search).get("misconception"),
    ).toBe(key);
    expect(history.length).toBe(entries);
  });

  it("shows another teacher's class as not found, with a way back to their classes", async () => {
    const { user } = openAt("/teach/classes/class-1", {
      otherTeachersClasses: [{ name: "Their room", grades: [4] }],
    });
    await user.click(await signInButton());
    expect(await heading("Not found")).toBeInTheDocument();
    expect(screen.queryByText("Their room")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Your classes" }));
    expect(await heading("Your classes")).toBeInTheDocument();
  });

  it("shows a made-up student, expectation or play, or an unknown path, as not found", async () => {
    const { urls } = await walkDown();
    const madeUp = [
      urls.evidence.replace(/students\/[^/]+/, "students/nobody"),
      urls.evidence.replace(
        /expectations\/.+$/,
        "expectations/math-2020.g4.Z9.9",
      ),
      urls.play.replace(/plays\/.+$/, "plays/no-such-play"),
      "/teach/classes/no-such-class",
      "/teach/no/such/page",
    ];
    for (const url of madeUp) {
      cleanup();
      const { user } = openAt(url, room12);
      await user.click(await signInButton());
      expect(await heading("Not found")).toBeInTheDocument();
    }
  });

  it("tells a student this is for teachers, at any URL", async () => {
    const { user } = openAt("/teach/classes/class-1", { student: true });
    await user.click(await signInButton());
    expect(await heading("This is for teachers")).toBeInTheDocument();
  });
});

describe("managing a class", () => {
  const grade4: Try[][] = [[{ succeeded: true }], [{ succeeded: true }]];
  const room12 = (
    students: FakeStudentSeed[] = [],
    grades: (3 | 4 | 5)[] = [4, 5],
  ): FakePlatformOptions["classes"] => [
    { draft: { name: "Room 12", grades }, students },
  ];
  const sam: FakeStudentSeed = {
    google: { subject: "sam", firstName: "Sam", lastName: "Rivera" },
    grade: 4,
    plays: [{ grade: 4, tasks: grade4 }],
  };
  const ana: FakeStudentSeed = {
    google: { subject: "ana", firstName: "Ana", lastName: "Diaz" },
    grade: 5,
  };

  /** Signs in, and opens the class's dashboard, then its manage screen. */
  async function openManage(options: FakePlatformOptions) {
    const user = renderApp(options);
    await user.click(await signInButton());
    await user.click(
      await screen.findByRole("link", { name: "See results for Room 12" }),
    );
    await user.click(await screen.findByRole("link", { name: "Manage class" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Manage Room 12" }),
    ).toBeInTheDocument();
    return user;
  }

  const studentItem = (name: string) => screen.findByRole("listitem", { name });

  it("turns a game off, taking its link off the class, and back on", async () => {
    const user = await openManage({ classes: room12() });
    const game = screen.getByRole("switch", { name: /Fraction Hop/ });
    expect(game).toBeChecked();

    await user.click(game);
    expect(
      await screen.findByText(/^Off: not in their lockers/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /Fraction Hop/ }),
    ).not.toBeChecked();

    await user.click(screen.getByRole("link", { name: "The class's results" }));
    await user.click(await screen.findByRole("link", { name: "Your classes" }));
    const card = await screen.findByRole("region", { name: "Room 12" });
    expect(
      within(card).queryByRole("button", { name: /Copy game link/ }),
    ).toBeNull();

    await user.click(
      within(card).getByRole("link", { name: "Manage Room 12" }),
    );
    await user.click(
      await screen.findByRole("switch", { name: /Fraction Hop/ }),
    );
    expect(
      await screen.findByText(/^On: in your students' lockers/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "The class's results" }));
    await user.click(await screen.findByRole("link", { name: "Your classes" }));
    expect(
      await within(
        await screen.findByRole("region", { name: "Room 12" }),
      ).findByRole("button", { name: /Copy game link for Fraction Hop/ }),
    ).toBeInTheDocument();
  });

  it("changes a student's grade in a split class, once the teacher saves, keeping their results' tier", async () => {
    const user = await openManage({ classes: room12([sam, ana]) });
    const row = await studentItem("Sam R.");
    expect(within(row).getByText("Grade 4")).toBeInTheDocument();

    await user.click(
      within(row).getByRole("button", { name: "Change grade for Sam R." }),
    );
    await user.click(within(row).getByRole("radio", { name: "Grade 5" }));
    await user.click(within(row).getByRole("button", { name: "Cancel" }));
    expect(within(row).getByText("Grade 4")).toBeInTheDocument();
    expect(within(row).queryByRole("radio")).toBeNull();

    await user.click(
      within(row).getByRole("button", { name: "Change grade for Sam R." }),
    );
    expect(within(row).getByRole("radio", { name: "Grade 4" })).toBeChecked();
    await user.click(within(row).getByRole("radio", { name: "Grade 5" }));
    await user.click(within(row).getByRole("button", { name: "Save grade" }));
    const saved = await studentItem("Sam R.");
    expect(
      await within(saved).findByText(
        "Sam R. now plays at the Grade 5 tier. Results they already have keep their tier.",
      ),
    ).toBeInTheDocument();
    expect(within(saved).getByText("Grade 5")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "The class's results" }));
    const samRow = await screen.findByRole("row", { name: /^Sam R\./ });
    expect(within(samRow).getByText("Grade 5")).toBeInTheDocument();
    expect(
      within(samRow).getByText("From the Grade 4 tier"),
    ).toBeInTheDocument();
  });

  it("sets the grade of a split-class student who hasn't picked one", async () => {
    const user = await openManage({
      classes: room12([{ ...ana, grade: undefined }]),
    });
    const row = await studentItem("Ana D.");
    expect(within(row).getByText("No grade picked yet")).toBeInTheDocument();
    await user.click(
      within(row).getByRole("button", { name: "Set grade for Ana D." }),
    );
    await user.click(within(row).getByRole("radio", { name: "Grade 4" }));
    await user.click(within(row).getByRole("button", { name: "Save grade" }));
    expect(
      await within(await studentItem("Ana D.")).findByText("Grade 4"),
    ).toBeInTheDocument();
  });

  it("offers no grade change in a single-grade class", async () => {
    await openManage({ classes: room12([{ ...sam, grade: undefined }], [4]) });
    const row = await studentItem("Sam R.");
    expect(within(row).queryByRole("button", { name: /grade/ })).toBeNull();
    expect(within(row).queryByText("Grade 4")).toBeNull();
  });

  it("removes a student once the teacher confirms, taking them off the dashboard", async () => {
    const user = await openManage({ classes: room12([sam, ana]) });
    await user.click(
      within(await studentItem("Sam R.")).getByRole("button", {
        name: "Remove Sam R.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/^Remove Sam R\. from Room 12\?/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Remove Sam R." }));
    expect(
      screen.getByText(/^Remove Sam R\. from Room 12\?/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove from class" }));
    await waitForGone(() => screen.queryByRole("listitem", { name: "Sam R." }));
    expect(await studentItem("Ana D.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "The class's results" }));
    expect(
      await screen.findByRole("row", { name: /^Ana D\./ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^Sam R\./ })).toBeNull();
  });

  it("says when a change didn't save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let offline = false;
    const user = await openManage({
      classes: room12(),
      offline: () => offline,
    });
    offline = true;
    await user.click(screen.getByRole("switch", { name: /Fraction Hop/ }));
    expect(
      await screen.findByText(
        "That didn't save. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("switches between the teacher's classes, showing one at a time", async () => {
    const user = renderApp({
      classes: [
        { draft: { name: "Room 12", grades: [4] }, students: [sam] },
        { draft: { name: "Room 14", grades: [5] }, students: [ana] },
      ],
    });
    await user.click(await signInButton());
    await user.click(
      await screen.findByRole("link", { name: "See results for Room 12" }),
    );
    const classes = await screen.findByRole("navigation", {
      name: "Your classes",
    });
    expect(
      within(classes).getByRole("link", { name: "Room 12" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("row", { name: /^Sam R\./ })).toBeInTheDocument();

    await user.click(within(classes).getByRole("link", { name: "Room 14" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 14" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("row", { name: /^Ana D\./ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^Sam R\./ })).toBeNull();
    expect(
      within(
        screen.getByRole("navigation", { name: "Your classes" }),
      ).getByRole("link", { name: "Room 14" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows no class switcher to a teacher with one class", async () => {
    const user = renderApp({ classes: room12() });
    await user.click(await signInButton());
    await user.click(
      await screen.findByRole("link", { name: "See results for Room 12" }),
    );
    await screen.findByRole("heading", { level: 1, name: "Room 12" });
    expect(
      screen.queryByRole("navigation", { name: "Your classes" }),
    ).toBeNull();
  });

  it("opens the manage screen from its URL, and not for another teacher's class", async () => {
    const { user } = openAt("/teach/classes/class-1/manage", {
      classes: room12([sam]),
    });
    await user.click(await signInButton());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Manage Room 12" }),
    ).toBeInTheDocument();
    cleanup();

    const other = openAt("/teach/classes/class-1/manage", {
      otherTeachersClasses: [{ name: "Theirs", grades: [4] }],
    });
    await other.user.click(await signInButton());
    expect(
      await screen.findByRole("heading", { name: "Not found" }),
    ).toBeInTheDocument();
  });
});

async function waitForGone(query: () => HTMLElement | null) {
  await vi.waitFor(() => expect(query()).toBeNull());
}
