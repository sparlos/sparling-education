import { brandName } from "@repo/tokens";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { contactEmail, productSiteUrl } from "../content/site";
import Home from "./page";

describe("the company site", () => {
  test("introduces the company and what it makes", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Games that teach the lesson by the way they play",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "About Sparling Education" }),
    ).toHaveTextContent("Stephen Sparling, founder");
  });

  test("features the product by its current name and links to its site", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", {
        name: `Meet ${brandName}, our first product`,
      }),
    ).toHaveAttribute("href", "#product");
    const product = screen.getByRole("region", { name: brandName });
    expect(
      within(product).getByRole("img", { name: /^Fraction Hop/ }),
    ).toBeInTheDocument();
    expect(
      within(product).getByRole("link", {
        name: `Visit the ${brandName} website`,
      }),
    ).toHaveAttribute("href", productSiteUrl);
    expect(
      within(product).getByRole("link", { name: "Try the games" }),
    ).toHaveAttribute("href", "https://tryplaceholder.sparlingeducation.ca/");
  });

  test("states what the company holds to", () => {
    render(<Home />);
    for (const name of [
      "The curriculum comes first.",
      "Children's privacy is not negotiable.",
      "Teachers decide what's good.",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name }),
      ).toBeInTheDocument();
    }
  });

  test("gives a way to get in touch, and the privacy page", () => {
    render(<Home />);
    const contact = screen.getByRole("region", { name: "Get in touch" });
    expect(
      within(contact).getByRole("link", { name: contactEmail }),
    ).toHaveAttribute("href", "mailto:hello@sparlingeducation.ca");
    const footer = screen.getByRole("navigation", { name: "Footer" });
    expect(
      within(footer).getByRole("link", { name: "Privacy" }),
    ).toHaveAttribute("href", `${productSiteUrl}/privacy`);
  });

  test("lets keyboard users skip to the content", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main");
    expect(document.getElementById("main")).not.toBeNull();
  });
});
