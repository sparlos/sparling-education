import { brandName } from "@repo/tokens";

// All the page's words live here, so they can be reviewed in one place.
// The product's name is always `brandName`, never typed: see docs/RENAME.md.

export const companyName = "Sparling Education";

export const contactEmail = "hello@sparlingeducation.ca";

/** Where this site is published, for links shared on social media and search. Set per deploy. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sparlingeducation.ca"
).replace(/\/$/, "");

/** The product's own marketing site (apps/web). Set per deploy. */
export const productSiteUrl = (
  process.env.NEXT_PUBLIC_PRODUCT_SITE_URL ?? "http://localhost:3000/educators"
).replace(/\/$/, "");

/** The public site where anyone can try the games (apps/play). */
export const tryGamesUrl = "https://tryplaceholder.sparlingeducation.ca/";

export const site = {
  title: `${companyName}: learning games for Canadian classrooms`,
  description: `${companyName} makes learning games for Grades 1 to 8, built from the Ontario curriculum. Our first product is ${brandName}.`,

  /** The picture shown when a link to the site is shared. */
  shareImage: {
    alt: `${companyName}: games that teach the lesson by the way they play.`,
    tagline: "Learning games for Canadian classrooms",
  },

  masthead: {
    skipLink: "Skip to content",
  },

  hero: {
    title: "Games that teach the lesson by the way they play",
    lead: "We make classroom games built from the Ontario curriculum. Students learn by playing, and teachers can see what each student understands.",
    action: { label: `Meet ${brandName}, our first product`, href: "#product" },
  },

  product: {
    paragraphs: [
      "Kids practise the skill as part of the game, not in a quiz added on top. Teachers see which ideas their class is mixing up, and gather evidence for report cards.",
      "Rewards are earned by practising. There's no store and no ads, and kids and parents are never asked to pay.",
    ],
    facts:
      "Grades 1 to 8 · Ontario curriculum · Free for teachers, now in a pilot",
    screenshot: {
      src: "/screens/fraction-hop.png",
      width: 1440,
      height: 900,
      alt: "Fraction Hop: a girl stands at 0 on a number line over a river, with stepping stones up to 3. The goal is 9/4, and the student's plan so far is hops of 1, 1 and 1/4.",
      caption:
        "Fraction Hop, Grade 4. Students plan hops along a number line to land on a fraction.",
    },
    action: `Visit the ${brandName} website`,
    tryAction: "Try the games",
  },

  principles: {
    title: "What we hold to",
    items: [
      {
        icon: "curriculum",
        title: "The curriculum comes first.",
        body: "Every game starts from a specific Ontario curriculum expectation, so the time students spend playing counts in class.",
      },
      {
        icon: "privacy",
        title: "Children's privacy is not negotiable.",
        body: "Students don't need an email address, and only their teacher sees their name. There's no chat, and student data is stored in Canada.",
      },
      {
        icon: "teachers",
        title: "Teachers decide what's good.",
        body: "They try our games early in a free pilot and tell us what works in their classroom. We change the games based on what they say.",
      },
    ],
  },

  about: {
    title: `About ${companyName}`,
    lead: `${companyName} is a small, independent company making learning games for Canadian classrooms.`,
    body: "We think a good learning game should teach through the way it plays. It should show teachers something useful, and it should treat children's time and privacy with respect.",
    signature: "Stephen Sparling, founder",
    /** Decorative beside the signature, which already names him. */
    portrait: { src: "/founder.jpeg", width: 800, height: 800 },
  },

  contact: {
    title: "Get in touch",
    lead: "Teachers, school boards and partners, we'd like to hear from you.",
  },

  footer: {
    privacy: "Privacy",
    product: brandName,
  },
} as const;
