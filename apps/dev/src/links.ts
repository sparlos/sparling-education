// Everything the dashboard links to, by category. Each link names the dev
// server behind it, so the page can show whether that server is up.

/** A dev server `pnpm dev` starts, probed by its port. */
export interface Server {
  id: string;
  name: string;
  port: number;
}

export interface Link {
  title: string;
  blurb: string;
  url: string;
  /** The server that has to be up for the link to work. */
  server: Server["id"];
}

export interface Category {
  title: string;
  /** Two-letter tag shown beside the heading. */
  tag: string;
  links: Link[];
}

export interface Command {
  command: string;
  blurb: string;
}

export const servers: Server[] = [
  { id: "web", name: "web", port: 3000 },
  { id: "api", name: "api", port: 3002 },
  { id: "play", name: "play", port: 3003 },
  { id: "teach", name: "teach", port: 3004 },
];

export const categories: Category[] = [
  {
    title: "Dev tools",
    tag: "dt",
    links: [
      {
        title: "Prototype lab",
        blurb: "Play candidate mechanics before a game spec exists.",
        url: "http://localhost:3003/play/lab",
        server: "play",
      },
      {
        title: "Avatar editor",
        blurb: "Fit each avatar picture to the body, then save to the repo.",
        url: "http://localhost:3003/play/avatar-fit",
        server: "play",
      },
      {
        title: "API reference",
        blurb: "Scalar docs for every route, from the OpenAPI document.",
        url: "http://localhost:3002/reference",
        server: "api",
      },
    ],
  },
  {
    title: "Sites",
    tag: "st",
    links: [
      {
        title: "Public site",
        blurb: "The marketing site for teachers, boards and parents.",
        url: "http://localhost:3000",
        server: "web",
      },
      {
        title: "Play",
        blurb: "The student shell: home, wardrobe, locker and every game.",
        url: "http://localhost:3003/play/",
        server: "play",
      },
      {
        title: "Teach",
        blurb: "The teacher app, with the play shell on the same origin.",
        url: "http://localhost:3004/teach/",
        server: "teach",
      },
    ],
  },
];

export const commands: Command[] = [
  { command: "pnpm tour <slug>", blurb: "play every tier in headless Chrome" },
  {
    command: "pnpm mutate <slug>",
    blurb: "check the tests catch broken rules",
  },
  { command: "pnpm new-game <slug>", blurb: "scaffold a game from the kit" },
  { command: "pnpm voice", blurb: "record changed voice lines (Mac)" },
];
