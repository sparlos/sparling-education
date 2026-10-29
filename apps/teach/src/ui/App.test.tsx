import { expectation } from "@repo/curriculum";
import { UIProvider } from "@repo/ui/provider";
import { render, screen, within } from "@testing-library/react";
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
  render(
    <UIProvider>
      <App platform={createFakePlatform(options)} />
    </UIProvider>,
  );
  return userEvent.setup();
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
      await screen.findByRole("button", {
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
    await user.click(screen.getByRole("button", { name: "Your classes" }));
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
    const open = await screen.findByRole("button", {
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
});
