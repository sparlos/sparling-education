import { setBaseUrl } from "@repo/hubworld-api-client";
import { createHubWorld } from "./hubworld";

const canvas = document.getElementById("app");
if (!(canvas instanceof HTMLCanvasElement))
  throw new Error("Missing #app canvas");

setBaseUrl(
  import.meta.env.VITE_HUBWORLD_API_URL ??
    `${window.location.protocol}//${window.location.hostname}:3002`,
);

const world = createHubWorld(canvas);
import.meta.hot?.dispose(() => world.destroy());
