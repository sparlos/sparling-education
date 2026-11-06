// The composition root: the only file that knows which platform the shell
// runs on: the platform's API, or the stand-ins with VITE_PLAY_PLATFORM=stand-in.
// See src/platform/README.md.
import "./ui/shell-styles.ts";
import shellLines from "virtual:voice-lines/shell";
import titleLines from "virtual:voice-titles";
import { UIProvider } from "@repo/ui/provider";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { games } from "./games.ts";
import { createApiPlatform } from "./platform/api/index.ts";
import { createStandInPlatform } from "./platform/stand-ins/index.ts";
import { standInSignInPath } from "./platform/stand-ins/links.ts";
import {
  standInClasses,
  standInGames,
} from "./platform/stand-ins/memberships.ts";
import { StandInSignInScreen } from "./platform/stand-ins/SignInScreen.tsx";
import { standInSetTimer } from "./platform/stand-ins/timer.ts";
import { newId } from "./play/ids.ts";
import { useBrowserRoute } from "./play/router.ts";
import { isAvatarFitUrl, isLabUrl } from "./play/routes.ts";
import { browserStorage } from "./play/storage.ts";
import { App } from "./ui/App.tsx";

// The prototype lab is dev only; production builds drop it entirely.
const Lab = import.meta.env.DEV ? lazy(() => import("./lab/index.tsx")) : null;
// So is the tool for fitting avatar art to the body.
const AvatarFit = import.meta.env.DEV
  ? lazy(() => import("./dev/AvatarFit.tsx"))
  : null;

// Pressable things show a press a child can see (@repo/ui's press.module.css).
document.documentElement.dataset.press = "touch";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const base = import.meta.env.BASE_URL;
const storage = browserStorage();

const standIn = import.meta.env.VITE_PLAY_PLATFORM === "stand-in";
const standInClassGames = standInGames(Object.keys(games));
// Add ?stand-in-offline to a game link to watch attempts wait and retry.
const offline = () =>
  new URL(window.location.href).searchParams.has("stand-in-offline");

// Add ?stand-in-timer=<minutes> to any page to start a class timer (0 clears it).
const timerMinutes = new URL(window.location.href).searchParams.get(
  "stand-in-timer",
);
if (standIn && timerMinutes !== null) {
  const minutes = Number(timerMinutes);
  standInSetTimer(
    storage,
    minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null,
  );
}

const platform = standIn
  ? createStandInPlatform({ storage, base, games: standInClassGames, offline })
  : createApiPlatform({
      apiBase: "/api",
      base,
      origin: window.location.origin,
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    });

/**
 * The page showing. Moving between the shell's pages stays in this page, so
 * sound the student has allowed keeps playing; each page starts afresh, as
 * after a load.
 */
function Shell() {
  const { url, visit, navigate } = useBrowserRoute(base);
  if (AvatarFit && isAvatarFitUrl(url, base))
    return (
      <Suspense key={visit}>
        <AvatarFit />
      </Suspense>
    );
  if (Lab && isLabUrl(url, base))
    return (
      <Suspense key={visit}>
        <Lab url={url} base={base} storage={storage} navigate={navigate} />
      </Suspense>
    );
  if (standIn && url.pathname === `${base}${standInSignInPath}`)
    return (
      <StandInSignInScreen
        key={visit}
        url={url}
        storage={storage}
        navigate={navigate}
        newId={newId}
        classes={standInClasses(standInClassGames)}
      />
    );
  return (
    <App
      key={visit}
      url={url}
      base={base}
      platform={platform}
      games={games}
      storage={storage}
      navigate={navigate}
      newId={newId}
      shellLines={shellLines}
      titleLines={titleLines}
    />
  );
}

createRoot(root).render(
  <StrictMode>
    <UIProvider>
      <Shell />
    </UIProvider>
  </StrictMode>,
);
