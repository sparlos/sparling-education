// The composition root: the only file that knows which platform the shell
// runs on. Swap createStandInPlatform for the real platform here when the
// backend exists; see src/platform/README.md.
import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/nunito-sans/wght.css";
import "./ui/global.css";
import { UIProvider } from "@repo/ui/provider";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { games } from "./games.ts";
import { createStandInPlatform } from "./platform/stand-ins/index.ts";
import { standInSignInPath } from "./platform/stand-ins/links.ts";
import { StandInSignInScreen } from "./platform/stand-ins/SignInScreen.tsx";
import { newId } from "./play/ids.ts";
import { isLabUrl } from "./play/routes.ts";
import { browserStorage } from "./play/storage.ts";
import { App } from "./ui/App.tsx";

// The prototype lab is dev only; production builds drop it entirely.
const Lab = import.meta.env.DEV ? lazy(() => import("./lab/index.tsx")) : null;

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const base = import.meta.env.BASE_URL;
const url = new URL(window.location.href);
const storage = browserStorage();
const navigate = (to: string) => window.location.assign(to);

const platform = createStandInPlatform({
  storage,
  base,
  hubUrl:
    import.meta.env.VITE_HUB_URL ??
    `${window.location.protocol}//${window.location.hostname}:3001/`,
  // Add ?stand-in-offline to a game link to watch attempts wait and retry.
  offline: () => url.searchParams.has("stand-in-offline"),
});

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      {Lab && isLabUrl(url, base) ? (
        <Suspense>
          <Lab url={url} base={base} storage={storage} navigate={navigate} />
        </Suspense>
      ) : url.pathname === `${base}${standInSignInPath}` ? (
        <StandInSignInScreen
          url={url}
          storage={storage}
          navigate={navigate}
          newId={newId}
        />
      ) : (
        <App
          url={url}
          base={base}
          platform={platform}
          games={games}
          storage={storage}
          navigate={navigate}
          newId={newId}
        />
      )}
    </UIProvider>
  </StrictMode>,
);
