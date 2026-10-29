// The composition root: the only file that picks the platform the teacher
// app runs on. See README.md.
import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/nunito-sans/wght.css";
import "./ui/global.css";
import { UIProvider } from "@repo/ui/provider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createApiPlatform } from "./platform/api/index.ts";
import { createFakePlatform } from "./platform/fake/index.tsx";
import { fakeSampleClasses } from "./platform/fake/sample.ts";
import { App } from "./ui/App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const platform =
  import.meta.env.VITE_TEACH_PLATFORM === "fake"
    ? createFakePlatform({
        origin: window.location.origin,
        classes: fakeSampleClasses,
      })
    : createApiPlatform({
        apiBase: "/api",
        origin: window.location.origin,
        googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      });
if (platform.name === "fake")
  console.warn(
    "[teach] Running on the FAKE platform: accounts and classes are kept in memory and sign-in is simulated.",
  );

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      <App platform={platform} />
    </UIProvider>
  </StrictMode>,
);
