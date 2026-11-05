# Dev dashboard

Dev only, never deployed: http://localhost:3001 links to every dev tool and local site, by category, and shows which dev servers are up, the branch and the last commit. `pnpm dev` starts it and opens it in the browser.

```sh
pnpm dev                       # everything, and opens the dashboard
pnpm --filter dev dev          # the dashboard alone
pnpm --filter dev test
```

Set `DEV_DASHBOARD_OPEN=false` to stop it opening a tab. It doesn't open in CI.

It's a plain Node server with no dependencies: `src/links.ts` lists the links and servers, `src/page.ts` renders the page, and `src/status.ts` checks each server's port with a TCP connect (so checking never makes Next or Vite build a page). Add a tool by adding a link to `src/links.ts`.
