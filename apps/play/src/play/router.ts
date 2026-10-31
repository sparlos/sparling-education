// Moving between the shell's pages without loading the page again: home, the
// locker, the wardrobe and games all open in the same page. A page load would
// throw away the tap the browser needs before it plays sound, so a student
// would hear nothing on the next page until they tapped again. Only a page
// outside the shell (Google's sign-in, the API) loads the page.
import { useCallback, useEffect, useState } from "react";

/** Whether `to` is one of the shell's pages, under its base path on this site. */
export function isShellUrl(to: URL, here: URL, base: string): boolean {
  return (
    to.origin === here.origin &&
    (to.pathname.startsWith(base) || `${to.pathname}/` === base)
  );
}

/**
 * Where a click on a link goes, when the shell should open it itself; null
 * when the browser should follow it as usual: a modified or other-button
 * click, a link to a new tab or a download, or one leaving the shell.
 */
export function linkToOpen(event: MouseEvent, base: string): URL | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return null;
  const target = event.target;
  const link = target instanceof Element ? target.closest("a[href]") : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  if (link.target && link.target !== "_self") return null;
  if (link.hasAttribute("download")) return null;
  const to = new URL(link.href);
  return isShellUrl(to, new URL(window.location.href), base) ? to : null;
}

const loadPage = (href: string) => window.location.assign(href);

export interface BrowserRoute {
  /** The page showing. */
  url: URL;
  /** Counts every move between pages, so each page can start afresh, as after a load. */
  visit: number;
  /** Opens a page: in this page when it's the shell's, otherwise by loading it. */
  navigate(to: string): void;
}

/**
 * The page the browser is on. Links to the shell's pages and `navigate` open
 * them in this page, Back and Forward too; anything else loads as usual.
 */
export function useBrowserRoute(
  base: string,
  { load = loadPage }: { load?(href: string): void } = {},
): BrowserRoute {
  const [route, setRoute] = useState(() => ({
    url: new URL(window.location.href),
    visit: 0,
  }));

  const navigate = useCallback(
    (to: string) => {
      const here = new URL(window.location.href);
      const next = new URL(to, here);
      if (!isShellUrl(next, here, base)) return load(next.href);
      // Opening the page that's showing again (to try again) adds no history.
      if (next.href === here.href) window.history.replaceState(null, "", next);
      else window.history.pushState(null, "", next);
      setRoute((r) => ({ url: next, visit: r.visit + 1 }));
    },
    [base, load],
  );

  useEffect(() => {
    const onPop = () =>
      setRoute((r) => ({
        url: new URL(window.location.href),
        visit: r.visit + 1,
      }));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const to = linkToOpen(event, base);
      if (!to) return;
      event.preventDefault();
      navigate(to.href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [base, navigate]);

  return { ...route, navigate };
}
