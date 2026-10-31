/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  /** The platform's Google OAuth client ID, for the sign-in button. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "fake" runs the app on the in-memory teacher port, without the API. */
  readonly VITE_TEACH_PLATFORM?: string;
}
