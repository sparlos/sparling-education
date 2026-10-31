import { brandName } from "@repo/tokens";
export const privacy = {
  meta: {
    title: "Privacy",
    description: `The privacy promises we're building ${brandName} around: we never keep student emails, only teachers see student names, there's no chat, and data stays in Canada.`,
  },
  title: `Privacy at ${brandName}`,
  lead: `${brandName} is still in development. This page sets out the promises we're building it around. We'll publish a full privacy policy before any student uses ${brandName}.`,
  sections: [
    {
      title: "What we'll collect from students",
      body: "Students sign in with their school account. We keep only their first name and last initial, never their email or photo. Only their teacher sees that name. Other students never do.",
    },
    {
      title: "Where data will live",
      body: "Student data will be stored in Canada.",
    },
    {
      title: "No chat",
      body: "Students never type anything other students can see.",
    },
    {
      title: "No ads, and no selling data",
      body: `${brandName} will never show ads, and we will never sell or share student data for marketing.`,
    },
    {
      title: "Clear deletion",
      body: "Teachers and boards will be able to delete their classes' data, and we'll delete any data when asked.",
    },
    {
      title: "This website",
      body: `Our signup forms ask only for what we need: an email address and, for teachers, the grade you teach. We use it to contact you about ${brandName} and nothing else. Students are never asked for information on this site.`,
    },
  ],
  contact: "Questions about privacy? We'd love to hear them.",
};
