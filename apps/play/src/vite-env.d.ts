/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the class world runs, for the stand-in hub link. Defaults to port 3001 on this host. */
  readonly VITE_HUB_URL?: string;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "virtual:voice-lines/*" {
  /** Current recordings by string ID, from `@repo/voice/vite`. */
  const lines: Record<string, string>;
  export default lines;
}
