/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  /** The platform's Google OAuth client ID, for the student sign-in button. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "stand-in" runs the shell on the stand-ins, without the API or Google. */
  readonly VITE_PLAY_PLATFORM?: string;
}

declare module "virtual:voice-lines/*" {
  /** Current recordings by string ID, from `@repo/voice/vite`. */
  const lines: Record<string, string>;
  export default lines;
}

declare module "virtual:voice-titles" {
  /** Each game's current title recording, by slug, from `@repo/voice/vite`. */
  const titles: Record<string, string>;
  export default titles;
}
