import { brandName } from "@repo/tokens";
import type { IconName } from "@repo/ui/icon";
import type { Tone } from "@repo/ui/tone";

export const contact = {
  meta: {
    title: "Contact",
    description: `Get in touch with ${brandName}: teachers, principals, boards and parents welcome.`,
  },
  title: "Talk to us",
  lead: "Whether you're a teacher, a principal, a school board or a parent, we'd love to hear from you.",
  emailLabel: "Email us",
  options: [
    {
      icon: "teacher",
      tone: "educator",
      title: "Teachers",
      body: `Want to help shape ${brandName}? Join the teacher pilot.`,
      action: { label: "Join the pilot", href: "/educators#pilot" },
    },
    {
      icon: "privacy",
      tone: "brand",
      title: "Schools and boards",
      body: "Questions about privacy, licences, or how the games fit the curriculum? Email us and we'll set up a time to talk.",
    },
    {
      icon: "parent",
      tone: "parent",
      title: "Parents",
      body: `Want to know when ${brandName} is ready? Sign up for updates.`,
      action: { label: "Get updates", href: "/parents#updates" },
    },
  ] satisfies {
    icon: IconName;
    tone: Tone;
    title: string;
    body: string;
    action?: { label: string; href: string };
  }[],
};
