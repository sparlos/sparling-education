import { UIProvider } from "@repo/ui/provider";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createFakePlatform,
  type FakePlatformOptions,
} from "../platform/fake/index.tsx";
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
