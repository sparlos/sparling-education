/// <reference types="vite/client" />

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "virtual:voice-lines/*" {
  /** Current recordings by string ID, from `@repo/voice/vite`. */
  const lines: Record<string, string>;
  export default lines;
}
