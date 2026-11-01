import { expectation } from "@repo/curriculum";
import { brandName } from "@repo/tokens";
import { UIProvider } from "@repo/ui/provider";
import { createMemoryHistory } from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Try } from "../platform/contract.ts";
import {
  createFakePlatform,
  type FakePlatformOptions,
} from "../platform/fake/index.tsx";
import type { FakeStudentSeed } from "../platform/fake/teacher.ts";
import type { NewClass } from "../platform/ports.ts";
import { App } from "./App.tsx";
import { Strip } from "./Dashboard.tsx";
import { walkthroughIds } from "./walkthroughs.ts";

// The class last opened is remembered in the browser; each test starts fresh.
beforeEach(() => localStorage.clear());

function renderApp(options?: FakePlatformOptions) {
  return openAt("/teach/", options).user;
}

/** The app opened at a URL, as from a link or a reload, with a history of its own. */
function openAt(url: string, options?: FakePlatformOptions) {
  const history = createMemoryHistory({ initialEntries: [url] });
  render(
    <UIProvider>
      <App
        platform={createFakePlatform({
          // Most tests are about something else: the walkthroughs are seen.
          walkthroughsSeen: walkthroughIds,
          ...options,
        })}
        history={history}
      />
    </UIProvider>,
  );
  return { user: userEvent.setup(), history };
}

async function signInAsNewTeacher() {
  const user = renderApp();
  await user.click(await signInButton());
  await screen.findByRole("heading", { name: "Make your first class" });
  return user;
}

/** Fills in the new-class form, and makes the class: it opens on its dashboard. */
async function createClass(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  grades: string[],
) {
  const form = screen.getByRole("form", { name: "New class" });
  await user.type(within(form).getByLabelText("Class name"), name);
  for (const grade of grades)
    await user.click(within(form).getByRole("checkbox", { name: grade }));
  await user.click(within(form).getByRole("button", { name: "Create class" }));
  return screen.findByRole("heading", { level: 1, name });
}

const signInButton = () =>
  screen.findByRole("button", { name: "Sign in with Google" });

describe("the teacher app", () => {
  it("signs a new teacher in to a first-class form, and back out", async () => {
    const user = renderApp({
      google: { subject: "g-1", firstName: "Ada", lastName: "Lovelace" },
    });
    await user.click(await signInButton());

    expect(
      await screen.findByRole("heading", { name: "Make your first class" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ada L.")).toBeInTheDocument();
    // Nothing to go back to yet.
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await signInButton()).toBeInTheDocument();
    expect(screen.queryByText("Make your first class")).not.toBeInTheDocument();
  });

  it("tells a student this is for teachers", async () => {
    const user = renderApp({ student: true });
    await user.click(await signInButton());

    expect(
      await screen.findByRole("heading", { name: "This is for teachers" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Make your first class")).not.toBeInTheDocument();
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

  it("offers to try again, not sign-in, when the app can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let offline = true;
    const user = renderApp({ offline: () => offline });

    expect(
      await screen.findByRole("heading", {
        name: `${brandName} can't be reached`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign in with Google" }),
    ).toBeNull();

    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await signInButton()).toBeInTheDocument();
  });

  it("makes a class in one short form, and opens its dashboard", async () => {
    const user = await signInAsNewTeacher();
    await createClass(user, "Room 12", ["Grade 5", "Grade 4"]);

    expect(screen.getByText("Grades 4 and 5")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "New class" })).toBeNull();

    // The switcher is the way to another: "New class" is at its end.
    await user.click(screen.getByRole("link", { name: "New class" }));
    await createClass(user, "Room 14", ["Grade 3"]);
    expect(screen.getByText("Grade 3")).toBeInTheDocument();
    const switcher = screen.getByRole("navigation", { name: "Your classes" });
    expect(
      within(switcher)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Room 12", "Room 14", "New class"]);
  });

  it("asks for a name and a grade before making a class", async () => {
    const user = await signInAsNewTeacher();
    await user.click(screen.getByRole("button", { name: "Create class" }));

    expect(screen.getByText("Give the class a name.")).toBeInTheDocument();
    expect(screen.getByText("Pick at least one grade.")).toBeInTheDocument();
  });

  it("cancels a new class back to the class it came from", async () => {
    const user = await signInAsNewTeacher();
    await createClass(user, "Room 12", ["Grade 4"]);
    await user.click(screen.getByRole("link", { name: "New class" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 12" }),
    ).toBeInTheDocument();
  });
});

describe("opening the app", () => {
  const rooms: FakePlatformOptions = {
    classes: [
      { draft: { name: "Room 12", grades: [4] }, students: [] },
      { draft: { name: "Room 14", grades: [5] }, students: [] },
    ],
  };
  const heading = (name: string) =>
    screen.findByRole("heading", { level: 1, name });

  it("opens the only class straight away", async () => {
    const { user, history } = openAt("/teach/", {
      classes: [rooms.classes?.[0] as never],
    });
    await user.click(await signInButton());
    expect(await heading("Room 12")).toBeInTheDocument();
    expect(history.location.pathname).toMatch(/^\/teach\/classes\/[^/]+$/);
  });

  it("opens the class the teacher opened last", async () => {
    const first = openAt("/teach/", rooms);
    await first.user.click(await signInButton());
    expect(await heading("Room 12")).toBeInTheDocument();
    await first.user.click(screen.getByRole("link", { name: "Room 14" }));
    expect(await heading("Room 14")).toBeInTheDocument();
    cleanup();

    const again = openAt("/teach/", rooms);
    await again.user.click(await signInButton());
    expect(await heading("Room 14")).toBeInTheDocument();
  });

  it("opens the first class when the last one is gone", async () => {
    localStorage.setItem("teach.last-class", "no-such-class");
    const { user } = openAt("/teach/", rooms);
    await user.click(await signInButton());
    expect(await heading("Room 12")).toBeInTheDocument();
  });
});

describe("sharing a class", () => {
  async function openShare(options?: FakePlatformOptions) {
    const user = renderApp({
      classes: [{ draft: { name: "Room 12", grades: [4] }, students: [] }],
      ...options,
    });
    await user.click(await signInButton());
    await screen.findByRole("heading", { level: 1, name: "Room 12" });
    expect(
      screen.queryByRole("region", { name: "Share this class" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Share" }));
    return {
      user,
      panel: await screen.findByRole("region", { name: "Share this class" }),
    };
  }

  it("copies the class join link and a game link in one tap each", async () => {
    const { user, panel } = await openShare();

    await user.click(
      within(panel).getByRole("button", { name: "Copy join link" }),
    );
    const joinLink = new URL(await navigator.clipboard.readText());
    expect(joinLink.pathname).toMatch(/^\/play\/join\/[A-Z2-9]{8}$/);
    expect(within(panel).getByText(joinLink.href)).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", {
        name: "Copy game link for Fraction Hop",
      }),
    );
    const gameLink = new URL(await navigator.clipboard.readText());
    expect(gameLink.pathname).toBe("/play/fraction-hop");
    expect(gameLink.searchParams.get("join")).toBe(
      joinLink.pathname.split("/").at(-1),
    );
  });

  it("turns a game off, taking its link away, and back on", async () => {
    const { user, panel } = await openShare();
    const game = within(panel).getByRole("switch", { name: /Fraction Hop/ });
    expect(game).toBeChecked();

    await user.click(game);
    await vi.waitFor(() =>
      expect(
        within(
          screen.getByRole("region", { name: "Share this class" }),
        ).getByRole("switch", { name: /Fraction Hop/ }),
      ).not.toBeChecked(),
    );
    expect(screen.queryByRole("button", { name: /Copy game link/ })).toBeNull();

    await user.click(screen.getByRole("switch", { name: /Fraction Hop/ }));
    expect(
      await screen.findByRole("button", {
        name: /Copy game link for Fraction Hop/,
      }),
    ).toBeInTheDocument();
  });

  it("says when a game's switch didn't save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let offline = false;
    const { user } = await openShare({ offline: () => offline });
    offline = true;
    await user.click(screen.getByRole("switch", { name: /Fraction Hop/ }));
    expect(
      await screen.findByText(
        "That didn't save. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("is in the dashboard's header with quick assess and manage, and not on the demo class", async () => {
    const { user } = await openShare();
    const header = screen.getByRole("heading", { level: 1 }).parentElement
      ?.parentElement as HTMLElement;
    expect(
      [...header.querySelectorAll("a, button")].map((e) => e.textContent),
    ).toEqual(["Share", "Quick assess", "Manage class"]);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(
      screen.queryByRole("region", { name: "Share this class" }),
    ).toBeNull();

    cleanup();
    const demo = renderApp({ demoClass: true });
    await demo.click(await signInButton());
    await screen.findByRole("region", { name: "Demo class" });
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
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

    // Short: the full description is on the student's page.
    const { description } = expectation("math-2020.g4.B1.6");
    const header = await screen.findByRole("columnheader", {
      name: /Gr 4 · B1.6/,
    });
    expect(header).toHaveTextContent("Counts up to 10…");
    expect(header).not.toHaveTextContent(description);
    expect(within(header).getByRole("link")).toHaveAttribute(
      "href",
      expectation("math-2020.g4.B1.6").link,
    );

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
    expect(g5).toHaveTextContent("At the Grade 5 level");
  });

  it("says when no students have joined yet", async () => {
    await openDashboard({
      classes: [{ draft: { name: "Room 12", grades: [3] }, students: [] }],
    });
    expect(await screen.findByText("No students yet")).toBeInTheDocument();
  });

  it("gives a student a row of one name, and the grade in a split class", async () => {
    await openDashboard(
      {
        classes: [
          {
            draft: { name: "Room 14", grades: [4, 5] },
            students: [student("Sam", "Rivera", { grade: 4 })],
          },
        ],
      },
      "Room 14",
    );
    const sam = await row("Sam R.");
    const [name] = within(sam).getAllByRole("rowheader");
    expect(name).toHaveTextContent(/^Sam R\.Grade 4$/);
    expect(within(name as HTMLElement).getAllByRole("link")).toHaveLength(1);
    expect(within(sam).queryByRole("button")).toBeNull();
    expect(sam).not.toHaveTextContent("Recognised");
  });

  it("offers to try again when the results can't be loaded", async () => {
    let offline = false;
    const user = renderApp({
      offline: () => offline,
      classes: [
        { draft: { name: "Room 12", grades: [4] }, students: [] },
        {
          draft: { name: "Room 14", grades: [4] },
          students: [student("Ana", "Diaz")],
        },
      ],
    });
    await user.click(await signInButton());
    const other = await screen.findByRole("link", { name: "Room 14" });
    offline = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    await user.click(other);
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
    // One game: its name would only repeat.
    expect(first).not.toHaveTextContent("Fraction Hop");
    expect(second).toHaveTextContent("1 student");
    expect(first).toHaveAttribute("aria-expanded", "false");

    await user.click(first as HTMLElement);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const who = await within(strip).findByRole("list", {
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

  it("shows the 3 most common misconceptions, then all of them, with the game only when there is more than one", async () => {
    const misconception = (n: number) => ({
      game: "fraction-hop",
      gameName: "Fraction Hop",
      id: `idea-${n}`,
      description: `Wrong idea ${n}`,
      students: [
        { id: "ana", firstName: "Ana", lastInitial: "D", expectation: "e" },
      ],
    });
    const many = [1, 2, 3, 4, 5].map(misconception);
    const strip = (showGame: boolean, open: string | null = null) => (
      <UIProvider>
        <Strip
          classId="c"
          misconceptions={many}
          showGame={showGame}
          open={open}
          onToggle={() => {}}
        />
      </UIProvider>
    );
    const view = render(strip(false));
    const user = userEvent.setup();
    const section = screen.getByRole("region", {
      name: "Misconceptions showing up",
    });
    expect(within(section).getAllByText(/^Wrong idea/)).toHaveLength(3);
    expect(section).not.toHaveTextContent("Fraction Hop");

    await user.click(
      within(section).getByRole("button", { name: "All 5 misconceptions" }),
    );
    expect(within(section).getAllByText(/^Wrong idea/)).toHaveLength(5);
    await user.click(
      within(section).getByRole("button", { name: "Show the most common" }),
    );
    expect(within(section).getAllByText(/^Wrong idea/)).toHaveLength(3);

    view.rerender(strip(true));
    expect(section).toHaveTextContent("Fraction Hop");
  });

  it("goes from a misconception to the student's page at that expectation, down to a play, and back up", async () => {
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
    await user.click(
      await within(strip).findByRole("link", { name: "Ana D." }),
    );

    // The student's page at that expectation: its bands and each play.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Grade 4 · B1\.6.*Developing/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(expectation("math-2020.g4.B1.6").description),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", {
        name: /^Grade 4 · B1\.6, official wording/,
      }),
    ).toBeInTheDocument();
    const plays = within(
      screen.getByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).getAllByRole("link");
    expect(plays).toHaveLength(2);
    expect(plays[0]).toHaveTextContent("4 of 4 tasks on their own");
    expect(plays[1]).toHaveTextContent("Fraction Hop");
    expect(plays[1]).toHaveTextContent("Finished");
    expect(plays[1]).toHaveTextContent("Grade 4 level · ");
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
    // The play at a glance, in words beside its marks.
    expect(
      screen.getByText("1 of 3 tasks on their own, 1 with help, 1 not yet"),
    ).toBeInTheDocument();

    // And back up, one tap at a time, to the strip as it was left.
    await user.click(screen.getByRole("link", { name: "Ana D." }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Room 12" }));
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
      within(await row("Ben O.")).getByRole("link", { name: /Ben O\., Grade/ }),
    );
    const [play] = within(
      await screen.findByRole("region", {
        name: "Each time they played, newest first",
      }),
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
    expect(second).toHaveTextContent(/^Task 2On their ownFirst tryGot it$/);
    // Each task says how it went over all its tries.
    expect(first).toHaveTextContent(/^Task 1With help/);
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
    expect(
      within(await row("Dee L.")).queryByRole("link", { name: /evidence/ }),
    ).toBeNull();

    await user.click(
      within(await row("Ben O.")).getByRole("link", {
        name: /Developing.*Ben O\., Grade 4 · B1\.6/,
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ben O." }),
    ).toBeInTheDocument();
    const [play] = within(
      screen.getByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).getAllByRole("link");
    expect(play).toHaveTextContent("2 of 4 tasks on their own, 2 not yet");

    await user.click(play as HTMLElement);
    expect(
      await screen.findAllByRole("heading", { level: 2, name: /^Task/ }),
    ).toHaveLength(4);
    await user.click(screen.getByRole("link", { name: "Ben O." }));
    await user.click(await screen.findByRole("link", { name: "Room 12" }));
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
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await screen.findByText("The student's page couldn't be loaded."),
    ).toBeInTheDocument();
    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ana D." }),
    ).toBeInTheDocument();
  });
});

describe("a student's page", () => {
  let subject = 0;
  function student(
    firstName: string,
    lastName: string,
    seed: Omit<FakeStudentSeed, "google"> = {},
  ): FakeStudentSeed {
    subject += 1;
    return {
      google: { subject: `page-${subject}`, firstName, lastName },
      ...seed,
    };
  }
  const ben = () =>
    student("Ben", "Ode", {
      plays: [
        {
          grade: 4,
          tasks: [
            [{ succeeded: false }, { succeeded: true }],
            [{ succeeded: false }, { succeeded: false }, { succeeded: true }],
            [{ succeeded: true }],
            [{ succeeded: false }],
          ],
        },
        // Spamming wrong tries, then leaving partway.
        {
          grade: 4,
          tasks: [Array.from({ length: 8 }, () => ({ succeeded: false }))],
          ending: "left",
        },
      ],
    });

  async function openStudentPage(
    students: FakeStudentSeed[],
    name: string,
    options: Partial<FakePlatformOptions> = {},
  ) {
    const { user, history } = openAt("/teach/", {
      ...options,
      classes: [{ draft: { name: "Room 12", grades: [4] }, students }],
    });
    await user.click(await signInButton());
    const row = await screen.findByRole("row", {
      name: new RegExp(`^${name}`),
    });
    await user.click(within(row).getByRole("link", { name }));
    return { user, history };
  }

  const part = (name: string) => screen.getByRole("region", { name });

  it("is the student's quick assess: math by expectation, next steps, then Learning Skills", async () => {
    await openStudentPage([ben()], "Ben O.");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ben O." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Grade 4")).toBeInTheDocument();
    const { description } = expectation("math-2020.g4.B1.6");
    const math = part("Math");
    expect(math).toHaveTextContent(description);
    expect(math).toHaveTextContent(
      "3 of 5 tasks done on their own, over the last 2 times they played",
    );
    expect(part("What to work on next")).toHaveTextContent(
      "No common mistakes showed up in their recent games.",
    );
    // The left play isn't finished; the spammed task was never got right.
    const skills = part("Learning Skills");
    expect(skills).toHaveTextContent(
      "Responsibility: played 1 game to the end",
    );
    expect(skills).toHaveTextContent(
      "Self-Regulation: got 2 tasks right after a mistake",
    );
    expect(skills).toHaveTextContent(
      "Report cards grade these separately from math.",
    );
    // Never a raw count of tries, a mark or a rating.
    expect(skills).not.toHaveTextContent(/\d+ (tries|minutes|seconds)/);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    // The old screens' explanations are gone.
    expect(screen.queryByText(/Effort counts tasks/)).toBeNull();
    expect(
      screen.queryByRole("link", { name: /^Quick assess for/ }),
    ).toBeNull();
  });

  it("prints", async () => {
    const { user } = await openStudentPage([ben()], "Ben O.");
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    await user.click(await screen.findByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("opens an expectation on its bands and plays, and closes it, without piling up history", async () => {
    const { user, history } = await openStudentPage([ben()], "Ben O.");
    const toggle = await screen.findByRole("button", {
      name: /Grade 4 · B1\.6.*Developing/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).toBeNull();
    const entries = history.length;

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      new URLSearchParams(history.location.search).get("expectation"),
    ).toBe("math-2020.g4.B1.6");
    // One tier: its band is on the opener, not again inside.
    expect(screen.queryByRole("list", { name: "Understanding" })).toBeNull();
    const plays = within(
      await screen.findByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).getAllByRole("link");
    expect(plays).toHaveLength(2);

    await user.click(toggle);
    expect(history.location.search).toBe("");
    expect(history.length).toBe(entries);
    expect(
      screen.queryByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).toBeNull();
  });

  it("goes back up to the dashboard by the class's name", async () => {
    const { user } = await openStudentPage([ben()], "Ben O.");
    await user.click(await screen.findByRole("link", { name: "Room 12" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 12" }),
    ).toBeInTheDocument();
  });

  it("says when a student has no plays yet, and leaves out Learning Skills counting nothing", async () => {
    await openStudentPage([student("Dee", "Lam")], "Dee L.");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Dee L." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dee hasn't played any games yet."),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/\b0 (plays|games|tasks)/);
  });

  it("offers to try again when the student's page can't be loaded", async () => {
    let offline = false;
    const user = renderApp({
      offline: () => offline,
      classes: [{ draft: { name: "Room 12", grades: [4] }, students: [ben()] }],
    });
    await user.click(await signInButton());
    const row = await screen.findByRole("row", { name: /^Ben O\./ });
    offline = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    await user.click(within(row).getByRole("link", { name: "Ben O." }));
    expect(
      await screen.findByText("The student's page couldn't be loaded."),
    ).toBeInTheDocument();
    offline = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ben O." }),
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
    await heading("Room 12");
    const dashboard = history.location.pathname;
    const evidence = await hrefOf(/Ana D\., Grade 4 · B1\.6/);
    await user.click(await screen.findByRole("link", { name: /Ana D\.,/ }));
    const play = await hrefOf(/Fraction Hop/);
    await user.click(await screen.findByRole("link", { name: /Fraction Hop/ }));
    await screen.findByText(/^How it ended/);
    const student = evidence.replace(/\?.+$/, "");
    return { user, history, urls: { dashboard, evidence, play, student } };
  }

  it("gives every screen a readable URL under /teach/", async () => {
    const { urls } = await walkDown();
    expect(urls.dashboard).toMatch(/^\/teach\/classes\/[^/]+$/);
    expect(urls.evidence).toMatch(
      /^\/teach\/classes\/[^/]+\/students\/[^/]+\?expectation=math-2020\.g4\.B1\.6$/,
    );
    expect(urls.play).toMatch(
      /^\/teach\/classes\/[^/]+\/students\/[^/]+\/plays\/[^/]+$/,
    );
    cleanup();
    const { user } = openAt("/teach/", room12);
    await user.click(await signInButton());
    expect(await hrefOf("Ana D.")).toBe(urls.student);
    expect(urls.student).toMatch(/^\/teach\/classes\/[^/]+\/students\/[^/]+$/);
  });

  it("opens each screen straight from its URL, after signing in", async () => {
    const { urls } = await walkDown();
    const screens: [string, () => Promise<unknown>][] = [
      [urls.dashboard, () => heading("Room 12")],
      [urls.evidence, () => heading("Ana D.")],
      [urls.play, () => heading(/Fraction Hop/)],
      [urls.student, () => heading("Ana D.")],
    ];
    for (const [url, shows] of screens) {
      cleanup();
      const { user, history } = openAt(url, room12);
      await user.click(await signInButton());
      expect(await shows()).toBeInTheDocument();
      expect(history.location.pathname + history.location.search).toBe(url);
    }
  });

  it("opens the student's page at the expectation from the old evidence URL", async () => {
    const { urls } = await walkDown();
    cleanup();
    const { user, history } = openAt(
      `${urls.student}/expectations/math-2020.g4.B1.6`,
      room12,
    );
    await user.click(await signInButton());
    expect(await heading("Ana D.")).toBeInTheDocument();
    expect(history.location.pathname).toBe(urls.student);
    expect(
      new URLSearchParams(history.location.search).get("expectation"),
    ).toBe("math-2020.g4.B1.6");
    expect(
      await screen.findByRole("region", {
        name: "Each time they played, newest first",
      }),
    ).toBeInTheDocument();
  });

  it("moves back and forward through the dashboard, the student's page and a play", async () => {
    const { history } = await walkDown();
    act(() => history.back());
    expect(await heading("Ana D.")).toBeInTheDocument();
    act(() => history.back());
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
    // To the student's page, with the play's expectation open.
    await user.click(await screen.findByRole("link", { name: "Ana D." }));
    expect(await heading("Ana D.")).toBeInTheDocument();
    expect(history.location.pathname + history.location.search).toBe(
      urls.evidence,
    );
    await user.click(await screen.findByRole("link", { name: "Room 12" }));
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
    expect(await heading("Make your first class")).toBeInTheDocument();
  });

  it("shows a made-up student, expectation or play, or an unknown path, as not found", async () => {
    const { urls } = await walkDown();
    const madeUp = [
      `${urls.student.replace(/students\/[^/]+$/, "students/nobody")}/expectations/math-2020.g4.B1.6`,
      `${urls.student}/expectations/math-2020.g4.Z9.9`,
      `${urls.student}?expectation=math-2020.g4.Z9.9`,
      urls.play.replace(/plays\/.+$/, "plays/no-such-play"),
      urls.student.replace(/students\/[^/]+$/, "students/nobody"),
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
    await user.click(await screen.findByRole("link", { name: "Manage class" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Manage Room 12" }),
    ).toBeInTheDocument();
    return user;
  }

  const studentItem = (name: string) => screen.findByRole("listitem", { name });

  /** Opens a student's "⋯" menu, and picks an item. */
  async function pick(
    user: ReturnType<typeof userEvent.setup>,
    row: HTMLElement,
    name: string,
    item: string,
  ) {
    await user.click(
      within(row).getByRole("button", { name: `Options for ${name}` }),
    );
    await user.click(await screen.findByRole("menuitem", { name: item }));
  }

  it("is about students only: the games are in Share", async () => {
    await openManage({ classes: room12([sam]) });
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Games" })).toBeNull();
  });

  it("gives each student one menu instead of two buttons", async () => {
    const user = await openManage({ classes: room12([sam, ana]) });
    const row = await studentItem("Sam R.");
    expect(within(row).getAllByRole("button")).toHaveLength(1);
    await user.click(
      within(row).getByRole("button", { name: "Options for Sam R." }),
    );
    expect(
      (await screen.findAllByRole("menuitem")).map((i) => i.textContent),
    ).toEqual(["Change grade", "Remove from class"]);
  });

  it("changes a student's grade in a split class, once the teacher saves, keeping their results' tier", async () => {
    const user = await openManage({ classes: room12([sam, ana]) });
    const row = await studentItem("Sam R.");
    expect(within(row).getByText("Grade 4")).toBeInTheDocument();

    await pick(user, row, "Sam R.", "Change grade");
    await user.click(within(row).getByRole("radio", { name: "Grade 5" }));
    await user.click(within(row).getByRole("button", { name: "Cancel" }));
    expect(within(row).getByText("Grade 4")).toBeInTheDocument();
    expect(within(row).queryByRole("radio")).toBeNull();

    await pick(user, row, "Sam R.", "Change grade");
    expect(within(row).getByRole("radio", { name: "Grade 4" })).toBeChecked();
    await user.click(within(row).getByRole("radio", { name: "Grade 5" }));
    await user.click(within(row).getByRole("button", { name: "Save grade" }));
    const saved = await studentItem("Sam R.");
    expect(
      await within(saved).findByText("Sam R. now plays at the Grade 5 tier."),
    ).toBeInTheDocument();
    expect(within(saved).getByText("Grade 5")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Room 12" }));
    const samRow = await screen.findByRole("row", { name: /^Sam R\./ });
    expect(within(samRow).getByText("Grade 5")).toBeInTheDocument();
    expect(
      within(samRow).getByText("At the Grade 4 level"),
    ).toBeInTheDocument();
  });

  it("sets the grade of a split-class student who hasn't picked one", async () => {
    const user = await openManage({
      classes: room12([{ ...ana, grade: undefined }]),
    });
    const row = await studentItem("Ana D.");
    expect(within(row).getByText("No grade picked yet")).toBeInTheDocument();
    await pick(user, row, "Ana D.", "Set grade");
    await user.click(within(row).getByRole("radio", { name: "Grade 4" }));
    await user.click(within(row).getByRole("button", { name: "Save grade" }));
    expect(
      await within(await studentItem("Ana D.")).findByText("Grade 4"),
    ).toBeInTheDocument();
  });

  it("offers no grade change in a single-grade class", async () => {
    const user = await openManage({
      classes: room12([{ ...sam, grade: undefined }], [4]),
    });
    const row = await studentItem("Sam R.");
    expect(within(row).queryByText("Grade 4")).toBeNull();
    await user.click(
      within(row).getByRole("button", { name: "Options for Sam R." }),
    );
    expect(
      (await screen.findAllByRole("menuitem")).map((i) => i.textContent),
    ).toEqual(["Remove from class"]);
  });

  it("removes a student once the teacher confirms, taking them off the dashboard", async () => {
    const user = await openManage({ classes: room12([sam, ana]) });
    await pick(
      user,
      await studentItem("Sam R."),
      "Sam R.",
      "Remove from class",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/^Remove Sam R\. from Room 12\?/)).toBeNull();

    await pick(
      user,
      await studentItem("Sam R."),
      "Sam R.",
      "Remove from class",
    );
    expect(
      screen.getByText(/^Remove Sam R\. from Room 12\?/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove from class" }));
    await waitForGone(() => screen.queryByRole("listitem", { name: "Sam R." }));
    expect(await studentItem("Ana D.")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Room 12" }));
    expect(
      await screen.findByRole("row", { name: /^Ana D\./ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^Sam R\./ })).toBeNull();
  });

  it("says when a change didn't save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let offline = false;
    const user = await openManage({
      classes: room12([sam, ana]),
      offline: () => offline,
    });
    const row = await studentItem("Ana D.");
    await pick(user, row, "Ana D.", "Remove from class");
    offline = true;
    await user.click(screen.getByRole("button", { name: "Remove from class" }));
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
    const classes = await screen.findByRole("navigation", {
      name: "Your classes",
    });
    expect(
      within(classes).getByRole("link", { name: "Room 12" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await screen.findByRole("row", { name: /^Sam R\./ }),
    ).toBeInTheDocument();
    // "New class" ends the switcher.
    expect(within(classes).getAllByRole("link").at(-1)).toHaveTextContent(
      "New class",
    );

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
    // There is no classes screen to go back to.
    expect(screen.queryByRole("link", { name: "Your classes" })).toBeNull();
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

describe("recognition", () => {
  let subject = 0;
  function student(firstName: string, lastName: string): FakeStudentSeed {
    subject += 1;
    return {
      google: { subject: `recognised-${subject}`, firstName, lastName },
    };
  }
  const now = new Date("2026-10-29T15:00:00Z");

  async function openDashboard(options: Partial<FakePlatformOptions> = {}) {
    const { user } = openAt("/teach/", {
      now,
      ...options,
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [student("Ana", "Diaz"), student("Ben", "Ode")],
        },
      ],
    });
    await user.click(await signInButton());
    await screen.findByRole("heading", { name: "Room 12" });
    return user;
  }

  const notYet = () =>
    screen.getByRole("region", { name: "Not recognised yet this term" });

  /** Opens "Recognise" for the student, within `where`, and picks the trait: two taps. */
  async function recognise(
    user: ReturnType<typeof userEvent.setup>,
    where: HTMLElement,
    name: string,
    trait: string,
  ) {
    await user.click(
      within(where).getByRole("button", { name: `Recognise ${name}` }),
    );
    await user.click(await screen.findByRole("menuitem", { name: trait }));
  }

  it("lists the students not recognised yet this term, with the term's dates", async () => {
    await openDashboard();
    const list = notYet();
    expect(list).toHaveTextContent(
      "This term: September 1, 2026 to January 31, 2027.",
    );
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.firstChild?.textContent),
    ).toEqual(["Ana D.", "Ben O."]);
  });

  it("recognises a student from the not-yet list in two taps, offering every trait", async () => {
    const user = await openDashboard();
    await user.click(
      within(notYet()).getByRole("button", { name: "Recognise Ben O." }),
    );
    const kindness = await screen.findByRole("menuitem", { name: "Kindness" });
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Kindness",
      "Perseverance",
      "Leadership",
    ]);
    await user.click(kindness);
    expect(
      await screen.findByText(
        "Ben O. recognised for Kindness. They'll see a sticker in their locker.",
      ),
    ).toBeInTheDocument();
    expect(
      within(notYet())
        .getAllByRole("listitem")
        .map((li) => li.firstChild?.textContent),
    ).toEqual(["Ana D."]);
  });

  it("has no Recognise button in the grid, nor for a student already recognised this term", async () => {
    const user = await openDashboard();
    const grid = screen.getByRole("table");
    expect(within(grid).queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Recognise/ })).toHaveLength(
      2,
    );

    await recognise(user, notYet(), "Ben O.", "Kindness");
    await within(notYet()).findByText(/^Ben O\. recognised for Kindness/);
    expect(
      screen
        .getAllByRole("button", { name: /^Recognise/ })
        .map((b) => b.textContent),
    ).toEqual(["Recognise Ana D."]);
    // And no "Recognised: …" line in their row.
    expect(
      await screen.findByRole("row", { name: /^Ben O\./ }),
    ).not.toHaveTextContent("Recognised");
  });

  it("ticks them on the student's page too", async () => {
    const user = await openDashboard();
    const row = await screen.findByRole("row", { name: /^Ana D\./ });
    await user.click(within(row).getByRole("link", { name: "Ana D." }));
    const section = await screen.findByRole("region", { name: "Recognition" });
    await recognise(user, section, "Ana D.", "Leadership");
    const after = await screen.findByRole("region", { name: "Recognition" });
    await within(after).findByText("Leadership");
    await user.click(
      within(after).getByRole("button", { name: "Recognise Ana D." }),
    );
    expect(
      await screen.findByRole("menuitem", {
        name: "Leadership, recognised this term",
      }),
    ).toHaveAttribute("data-checked");
  });

  it("recognises from the not-yet list until everyone has been", async () => {
    const user = await openDashboard();
    await recognise(user, notYet(), "Ana D.", "Leadership");
    expect(
      await within(notYet()).findByText(
        "Ana D. recognised for Leadership. They'll see a sticker in their locker.",
      ),
    ).toBeInTheDocument();
    await recognise(user, notYet(), "Ben O.", "Perseverance");
    expect(
      await within(notYet()).findByText(
        "Every student has been recognised this term.",
      ),
    ).toBeInTheDocument();
  });

  it("starts a new term with everyone not recognised yet", async () => {
    await openDashboard({ now: new Date("2027-02-01T05:00:00Z") });
    expect(notYet()).toHaveTextContent(
      "This term: February 1, 2027 to June 30, 2027.",
    );
  });

  it("recognises a student from their page, listing what they were given", async () => {
    const user = await openDashboard();
    const row = await screen.findByRole("row", { name: /^Ana D\./ });
    await user.click(within(row).getByRole("link", { name: "Ana D." }));
    const section = await screen.findByRole("region", { name: "Recognition" });
    expect(section).toHaveTextContent("Not recognised yet this term.");
    await recognise(user, section, "Ana D.", "Perseverance");
    const after = await screen.findByRole("region", { name: "Recognition" });
    expect(
      await within(after).findByText("October 29, 2026"),
    ).toBeInTheDocument();
    expect(within(after).getByText("Perseverance")).toBeInTheDocument();
    expect(after).not.toHaveTextContent("Not recognised yet this term.");
  });

  it("says when recognition didn't save", async () => {
    let offline = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = await openDashboard({ offline: () => offline });
    offline = true;
    await recognise(user, notYet(), "Ben O.", "Kindness");
    expect(
      await within(notYet()).findByText(
        "That didn't save. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });
});

describe("quick assess", () => {
  let subject = 0;
  function student(
    firstName: string,
    lastName: string,
    seed: Omit<FakeStudentSeed, "google"> = {},
  ): FakeStudentSeed {
    subject += 1;
    return {
      google: { subject: `assess-${subject}`, firstName, lastName },
      ...seed,
    };
  }
  const ben = () =>
    student("Ben", "Ode", {
      grade: 4,
      plays: [
        {
          grade: 4,
          tasks: [
            [
              { succeeded: false, misconception: "bigger-denominator-bigger" },
              { succeeded: true },
            ],
            [{ succeeded: false }, { succeeded: false }, { succeeded: true }],
            [{ succeeded: true }],
          ],
        },
        { grade: 4, tasks: [[{ succeeded: false }]], ending: "left" },
        { grade: 5, tasks: [[{ succeeded: true }]] },
      ],
    });
  const room = (): { draft: NewClass; students: FakeStudentSeed[] } => ({
    draft: { name: "Room 12", grades: [4, 5] },
    students: [ben(), student("Dee", "Lam", { grade: 4 })],
  });

  async function openDashboard() {
    const { user, history } = openAt("/teach/", { classes: [room()] });
    await user.click(await signInButton());
    await screen.findByRole("heading", { level: 1, name: "Room 12" });
    return { user, history };
  }

  /** A part of a student's block, by its heading. */
  const part = (block: HTMLElement, name: string) =>
    within(block).getByRole("region", { name });

  it("opens for the class from the dashboard, laid out as a report card is written, without a level", async () => {
    const { user, history } = await openDashboard();
    await user.click(screen.getByRole("link", { name: "Quick assess" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Quick assess" }),
    ).toBeInTheDocument();
    expect(history.location.pathname).toMatch(
      /^\/teach\/classes\/[^/]+\/quick-assess$/,
    );
    const date = new Date().toLocaleDateString("en-CA", { dateStyle: "long" });
    // The header every printed page repeats.
    expect(
      screen.getByText(`Quick assess · Room 12 · ${date}`),
    ).toBeInTheDocument();

    const benBlock = screen.getByRole("region", { name: "Ben O." });
    const math = part(benBlock, "Math");
    const [atFour, atFive] = within(math).getAllByRole("listitem");
    if (!atFour || !atFive) throw new Error("No expectation lines");
    const { description } = expectation("math-2020.g4.B1.6");
    expect(atFour).toHaveTextContent(description);
    // The code opens its official wording, in a new tab.
    expect(
      within(atFour).getByRole("link", { name: /^Grade 4 · B1\.6/ }),
    ).toHaveAttribute(
      "href",
      "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b1#b1-6",
    );
    // The left play's task is one of theirs, not done yet.
    expect(atFour).toHaveTextContent(
      "3 of 4 tasks done on their own, over the last 2 times they played",
    );
    expect(atFour).toHaveTextContent("Fraction Hop · Oct 1");
    expect(atFive).toHaveTextContent(
      "1 of 1 task done on their own, the last time they played",
    );
    expect(atFive).toHaveTextContent(
      "Played at the Grade 5 level, not their own grade",
    );
    expect(part(benBlock, "What to work on next")).toHaveTextContent(
      /bigger.*\(Fraction Hop\)/i,
    );
    const skills = part(benBlock, "Learning Skills");
    expect(skills).toHaveTextContent(
      "Responsibility: played 2 games to the end",
    );
    expect(skills).toHaveTextContent(
      "Self-Regulation: got 2 tasks right after a mistake",
    );
    expect(skills).toHaveTextContent(
      "Report cards grade these separately from math.",
    );

    const deeBlock = screen.getByRole("region", { name: "Dee L." });
    expect(deeBlock).toHaveTextContent("Dee hasn't played any games yet.");
    // Evidence, never a judgement of it.
    expect(document.body).not.toHaveTextContent(
      /Developing|Showing consistently|Not yet showing|%/,
    );

    await user.click(screen.getByRole("link", { name: "Room 12" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 12" }),
    ).toBeInTheDocument();
  });

  it("goes through the class one student at a time, found by name, while every student still prints", async () => {
    const { user, history } = await openDashboard();
    await user.click(screen.getByRole("link", { name: "Quick assess" }));
    const names = await screen.findByRole("navigation", { name: "Students" });
    const current = () =>
      within(names).getByRole("button", { current: true }).textContent;
    // The first student, without one in the URL.
    expect(current()).toBe("Ben O.");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "‹ Previous" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next ›" }));
    expect(current()).toBe("Dee L.");
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next ›" })).toBeDisabled();
    expect(history.location.search).toMatch(/^\?student=/);

    // The arrow keys, except while typing.
    await user.keyboard("{ArrowLeft}");
    expect(current()).toBe("Ben O.");
    const find = within(names).getByRole("searchbox", {
      name: "Find a student",
    });
    await user.type(find, "d");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    // Found by the start of a name, whatever the case.
    expect(
      within(names)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Dee L."]);
    await user.click(within(names).getByRole("button", { name: "Dee L." }));
    expect(current()).toBe("Dee L.");
    await user.clear(find);
    await user.type(find, "ben o");
    expect(
      within(names)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Ben O."]);
    await user.clear(find);
    await user.type(find, "zed");
    expect(names).toHaveTextContent(`No student's name starts with "zed".`);

    // Every student is still there to print.
    expect(screen.getByRole("region", { name: "Ben O." })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Dee L." })).toBeInTheDocument();

    // Going through the class left no history: back is the dashboard.
    await user.click(screen.getByRole("link", { name: "Room 12" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 12" }),
    ).toBeInTheDocument();
  });

  it("opens at the student in its URL", async () => {
    const first = await openDashboard();
    await first.user.click(screen.getByRole("link", { name: "Quick assess" }));
    const names = await screen.findByRole("navigation", { name: "Students" });
    await first.user.click(
      within(names).getByRole("button", { name: "Dee L." }),
    );
    const { pathname, search } = first.history.location;
    cleanup();

    const { user } = openAt(`${pathname}${search}`, { classes: [room()] });
    await user.click(await signInButton());
    const again = await screen.findByRole("navigation", { name: "Students" });
    expect(
      within(again).getByRole("button", { current: true }),
    ).toHaveTextContent("Dee L.");
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("finds a student on the dashboard's grid", async () => {
    const { user } = await openDashboard();
    const find = screen.getByRole("searchbox", { name: "Find a student" });
    await user.type(find, "DE");
    expect(screen.getByRole("row", { name: /^Dee L\./ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /^Ben O\./ })).toBeNull();
    await user.clear(find);
    await user.type(find, "zed");
    expect(
      screen.getByText(`No student's name starts with "zed".`),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("is the student's page for one student, with a print button and recognition on screen only", async () => {
    const { user } = await openDashboard();
    const row = screen.getByRole("row", { name: /^Ben O\./ });
    await user.click(within(row).getByRole("link", { name: "Ben O." }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Ben O." }),
    ).toBeInTheDocument();
    const math = part(document.body, "Math");
    // On screen, each expectation opens on its plays.
    const [atFour, atFive] = within(math).getAllByRole("button");
    expect(atFour).toHaveTextContent(
      "3 of 4 tasks done on their own, over the last 2 times they played",
    );
    expect(atFive).toHaveTextContent(
      "Played at the Grade 5 level, not their own grade",
    );
    expect(part(document.body, "What to work on next")).toHaveTextContent(
      /bigger.*\(Fraction Hop\)/i,
    );
    expect(part(document.body, "Learning Skills")).toHaveTextContent(
      "Responsibility: played 2 games to the end",
    );
    // The print has the counts, never a level.
    // (The band beside each opener is on screen only.)
    for (const line of within(math).getAllByRole("button")) {
      expect(
        within(line).queryByText(
          /^(Developing|Showing consistently|Not yet showing)/,
          {
            selector: ":not([data-understanding]):not([data-understanding] *)",
          },
        ),
      ).toBeNull();
    }
    expect(
      screen.getByRole("region", { name: "Recognition" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Dee L." })).toBeNull();

    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("link", { name: "Room 12" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Room 12" }),
    ).toBeInTheDocument();
  });

  it("opens straight from its URL, and not for a made-up student", async () => {
    const { user } = openAt("/teach/classes/class-1/quick-assess", {
      classes: [room()],
    });
    await user.click(await signInButton());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Quick assess" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Room 12").length).toBeGreaterThan(0);
    cleanup();

    const other = openAt(
      "/teach/classes/class-1/students/nobody/quick-assess",
      { classes: [room()] },
    );
    await other.user.click(await signInButton());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Not found" }),
    ).toBeInTheDocument();
  });
});

describe("the demo class", () => {
  async function openDemo() {
    const user = renderApp({ demoClass: true });
    await user.click(await signInButton());
    const banner = await screen.findByRole("region", { name: "Demo class" });
    return { user, banner };
  }

  it("is a new teacher's first class, opened at sign-in, labelled, with no links to share", async () => {
    const { banner } = await openDemo();
    expect(
      screen.getByRole("heading", { level: 1, name: "Demo class" }),
    ).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "Demo class: simulated students, with results already in.",
    );
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Copy/ })).toBeNull();
  });

  it("has a one-line banner with two actions", async () => {
    const { banner } = await openDemo();
    expect(
      within(banner)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["View as a student", "Delete"]);
  });

  it("has results and misconceptions in on its dashboard", async () => {
    await openDemo();
    expect(screen.getAllByText("Showing consistently").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole("heading", { name: /misconceptions/i }),
    ).toBeInTheDocument();
  });

  it("opens the play shell as one of its students, in a new tab", async () => {
    const { user } = await openDemo();
    const tab = { location: { href: "" }, close: vi.fn() };
    const open = vi
      .spyOn(window, "open")
      .mockReturnValue(tab as unknown as Window);
    await user.click(screen.getByRole("button", { name: "View as a student" }));
    expect(open).toHaveBeenCalledWith("", "_blank");
    await vi.waitFor(() =>
      expect(tab.location.href).toBe("https://app.test/play/"),
    );
    open.mockRestore();
  });

  it("is deleted in one step after a confirm, and doesn't come back", async () => {
    const { user } = await openDemo();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByText(/Delete the demo class and all its simulated students/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete demo class" }));

    expect(
      await screen.findByRole("heading", { name: "Make your first class" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.click(await signInButton());
    expect(
      await screen.findByRole("heading", { name: "Make your first class" }),
    ).toBeInTheDocument();
  });

  it("can be kept: cancelling the delete changes nothing", async () => {
    const { user } = await openDemo();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "View as a student" }),
    ).toBeInTheDocument();
  });
});

describe("walkthroughs", () => {
  /** A new teacher, signed in to their demo class, with nothing seen. */
  async function newTeacher(options: FakePlatformOptions = {}) {
    const user = renderApp({
      demoClass: true,
      walkthroughsSeen: [],
      ...options,
    });
    await user.click(await signInButton());
    return user;
  }

  const step = (title: string) => screen.findByRole("dialog", { name: title });
  const gone = () =>
    vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  /** The step's title, after one or more Nexts. */
  async function next(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Next" }));
  }

  async function signOutAndIn(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.click(await signInButton());
    await screen.findByRole("heading", { level: 1, name: "Demo class" });
  }

  it("welcomes a new teacher on their first dashboard, and goes through it step by step", async () => {
    const user = await newTeacher();
    const welcome = await step(`Welcome to ${brandName}`);
    expect(welcome).toHaveTextContent("1 of 9");
    // Nothing to go back to yet; the way out is always there.
    expect(within(welcome).queryByRole("button", { name: "Back" })).toBeNull();
    expect(
      within(welcome).getByRole("button", { name: "Skip" }),
    ).toBeInTheDocument();

    await next(user);
    await step("Your classes");
    // The demo class has no Share: the step says where links will be.
    await next(user);
    expect(await step("Share a game link")).toHaveTextContent(
      "Make your own class",
    );
    await next(user);
    await step("Misconceptions showing up");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await step("Share a game link");
    await next(user);
    await next(user);
    await step("How each student is doing");
    await next(user);
    await step("The curriculum's own words");
    await next(user);
    await step("Quick assess");
    await next(user);
    await step("See it as a student");
    expect(
      screen.getByRole("heading", { level: 1, name: "Demo class" }),
    ).toBeInTheDocument();
    await next(user);
    const last = await step("Help is here");
    expect(last).toHaveTextContent("9 of 9");
    await user.click(within(last).getByRole("button", { name: "Done" }));
    await gone();
  });

  it("is shown once per teacher: finished, it doesn't come back, on any browser", async () => {
    const user = await newTeacher();
    await step(`Welcome to ${brandName}`);
    for (let i = 0; i < 8; i++) await next(user);
    await user.click(await screen.findByRole("button", { name: "Done" }));
    await gone();

    await signOutAndIn(user);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can be skipped from any step, and skipping is remembered too", async () => {
    const user = await newTeacher();
    await step(`Welcome to ${brandName}`);
    await next(user);
    await user.click(
      within(await step("Your classes")).getByRole("button", { name: "Skip" }),
    );
    await gone();

    await signOutAndIn(user);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape, as skipped", async () => {
    const user = await newTeacher();
    await step(`Welcome to ${brandName}`);
    await user.keyboard("{Escape}");
    await gone();
    await signOutAndIn(user);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can be replayed from Help, from any screen of a class", async () => {
    const user = await newTeacher({ walkthroughsSeen: ["welcome"] });
    await screen.findByRole("heading", { level: 1, name: "Demo class" });
    await user.click(screen.getByRole("link", { name: "Manage class" }));
    await screen.findByRole("heading", { name: "Manage Demo class" });
    // Manage's own walkthrough starts by itself the first time.
    await user.click(
      within(await step("Your students")).getByRole("button", { name: "Done" }),
    );
    await gone();

    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Show me around" }),
    );
    await step(`Welcome to ${brandName}`);
    expect(
      screen.getByRole("heading", { level: 1, name: "Demo class" }),
    ).toBeInTheDocument();
  });

  it("falls back to the teacher's own class once the demo class is gone", async () => {
    const user = await newTeacher({
      walkthroughsSeen: ["welcome"],
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            {
              google: { subject: "s-1", firstName: "Ana", lastName: "Diaz" },
              plays: [
                {
                  grade: 4,
                  tasks: [
                    [{ succeeded: false, misconception: "no-equivalence" }],
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    await screen.findByRole("heading", { level: 1, name: "Room 12" });
    await user.click(screen.getByRole("link", { name: "Demo class" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete demo class" }));
    await screen.findByRole("heading", { level: 1, name: "Room 12" });

    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Show me around" }),
    );
    await step(`Welcome to ${brandName}`);
    await next(user);
    await next(user);
    // A real class has Share, so the step points at it.
    expect(await step("Share a game link")).toHaveTextContent(
      "Share has a link to join your class",
    );
    await next(user);
    await step("Misconceptions showing up");
    // No demo banner to point at: that step is left out.
    expect(screen.getByRole("dialog")).toHaveTextContent("4 of 8");
  });

  it("starts each screen's own walkthrough the first time, once past the welcome", async () => {
    const user = await newTeacher();
    await user.click(
      within(await step(`Welcome to ${brandName}`)).getByRole("button", {
        name: "Skip",
      }),
    );
    await gone();

    const studentLink = /^[A-Z][a-zé]+ [A-Z]\.$/;
    const [name] = screen.getAllByRole("link", { name: studentLink });
    if (!name?.textContent) throw new Error("No student");
    const who = name.textContent;
    await user.click(name);
    const page = await step("A student's page");
    expect(page).toHaveTextContent("1 of 4");
    await user.click(within(page).getByRole("button", { name: "Skip" }));
    await gone();

    // Back to it: seen.
    await user.click(screen.getByRole("link", { name: "Demo class" }));
    await screen.findByRole("heading", { level: 1, name: "Demo class" });
    await user.click(
      (await screen.findAllByRole("link", { name: who }))[0] as HTMLElement,
    );
    await screen.findByRole("heading", { level: 1, name: who });
    expect(screen.queryByRole("dialog")).toBeNull();

    // Help has it, as well as the welcome.
    await user.click(screen.getByRole("button", { name: "Help" }));
    expect(
      (await screen.findAllByRole("menuitem")).map((i) => i.textContent),
    ).toEqual(["Show me around", "Explain this page"]);
    await user.click(
      screen.getByRole("menuitem", { name: "Explain this page" }),
    );
    await step("A student's page");
  });

  it("explains quick assess on its own the first time it's opened", async () => {
    const user = await newTeacher({ walkthroughsSeen: ["welcome"] });
    await screen.findByRole("heading", { level: 1, name: "Demo class" });
    await user.click(screen.getByRole("link", { name: "Quick assess" }));
    expect(await step("Ready for report cards")).toHaveTextContent("1 of 6");
    await next(user);
    await step("Pick a student");
    await next(user);
    await step("Go through your class");
    await next(user);
    await step("What each student has shown");
    await next(user);
    await step("The curriculum's own words");
    await next(user);
    const last = await step("Print it all");
    await user.click(within(last).getByRole("button", { name: "Done" }));
    await gone();
  });

  it("waits for the welcome before a screen's own starts by itself", async () => {
    await openAt("/teach/", {
      demoClass: true,
      walkthroughsSeen: [],
    }).user.click(await signInButton());
    await step(`Welcome to ${brandName}`);
    expect(
      screen.queryByRole("dialog", { name: "A student's page" }),
    ).toBeNull();
  });
});

describe("class colours", () => {
  /** The class colour the screen is in, by the screen's main heading. */
  const colourShown = () =>
    screen
      .getByRole("heading", { level: 1 })
      .closest("[data-class-colour]")
      ?.getAttribute("data-class-colour");

  const colourPicker = () =>
    screen.getByRole("group", { name: "Class colour" });

  it("starts a new class on a colour the teacher's other classes haven't got", async () => {
    const user = await signInAsNewTeacher();
    expect(
      within(colourPicker()).getByRole("radio", { name: "Indigo" }),
    ).toBeChecked();
    await createClass(user, "Room 12", ["Grade 4"]);
    expect(colourShown()).toBe("indigo");

    await user.click(screen.getByRole("link", { name: "New class" }));
    await screen.findByRole("heading", { name: "New class" });
    expect(
      within(colourPicker()).getByRole("radio", { name: "Blue" }),
    ).toBeChecked();
    expect(
      within(colourPicker()).getByRole("radio", { name: "Indigo" }),
    ).not.toBeChecked();
  });

  it("offers every colour by name, and makes the class in the one picked", async () => {
    const user = await signInAsNewTeacher();
    const radios = within(colourPicker()).getAllByRole("radio");
    expect(radios).toHaveLength(12);
    await user.click(
      within(colourPicker()).getByRole("radio", { name: "Violet" }),
    );
    await createClass(user, "Room 12", ["Grade 4"]);
    expect(colourShown()).toBe("violet");
  });

  it("changes from Manage class, and the dashboard and switcher show it at once", async () => {
    const user = await signInAsNewTeacher();
    await createClass(user, "Room 12", ["Grade 4"]);
    await user.click(screen.getByRole("link", { name: "Manage class" }));
    await screen.findByRole("heading", { level: 1, name: "Manage Room 12" });
    await user.click(
      within(colourPicker()).getByRole("radio", { name: "Amber" }),
    );
    await vi.waitFor(() => expect(colourShown()).toBe("amber"));
    expect(
      within(colourPicker()).getByRole("radio", { name: "Amber" }),
    ).toBeChecked();

    await user.click(screen.getByRole("link", { name: "Room 12" }));
    await screen.findByRole("heading", { level: 1, name: "Room 12" });
    expect(colourShown()).toBe("amber");
    const switcher = screen.getByRole("navigation", { name: "Your classes" });
    expect(
      within(switcher).getByRole("link", { name: "Room 12" }),
    ).toHaveAccessibleDescription("Class colour: Amber");
  });

  it("marks each class in the switcher with its colour's name", async () => {
    const user = renderApp({
      demoClass: true,
      classes: [
        {
          draft: { name: "Room 12", grades: [4], colour: "amber" },
          students: [],
        },
      ],
    });
    await user.click(await signInButton());
    const switcher = await screen.findByRole("navigation", {
      name: "Your classes",
    });
    expect(
      within(switcher).getByRole("link", { name: "Room 12" }),
    ).toHaveAccessibleDescription("Class colour: Amber");
    expect(
      within(switcher).getByRole("link", { name: "Demo class" }),
    ).toHaveAccessibleDescription("Class colour: Indigo");
  });

  it("shows the demo class in indigo", async () => {
    const user = renderApp({ demoClass: true });
    await user.click(await signInButton());
    await screen.findByRole("heading", { level: 1, name: "Demo class" });
    expect(colourShown()).toBe("indigo");
  });

  it("keys the grid's shades, and leaves no evidence yet uncoloured", async () => {
    const user = renderApp({
      classes: [
        {
          draft: { name: "Room 12", grades: [4] },
          students: [
            {
              google: { subject: "s-1", firstName: "Ana", lastName: "Diaz" },
              plays: [{ grade: 4, tasks: [[{ succeeded: true }]] }],
            },
            {
              google: { subject: "s-2", firstName: "Ben", lastName: "Ortiz" },
            },
          ],
        },
      ],
    });
    await user.click(await signInButton());
    const key = await screen.findByRole("list", { name: "Key" });
    expect(
      within(key)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Not yet showing", "Developing", "Showing consistently"]);

    const ben = screen.getByRole("row", { name: /Ben O\./ });
    const gap = within(ben).getByText("No evidence yet");
    expect(gap.closest("a")).toBeNull();
    expect(gap).not.toHaveAttribute("data-understanding");
  });
});
