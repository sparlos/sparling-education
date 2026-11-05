// The dev dashboard, http://localhost:3001: links to every dev tool and site,
// with which dev servers are up. `pnpm dev` starts it and opens it in the
// browser. Never deployed.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { categories, commands, servers } from "./links.ts";
import { renderPage } from "./page.ts";
import { status } from "./status.ts";

const port = Number(process.env.PORT ?? 3001);
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const page = renderPage({ servers, categories, commands });

const server = createServer(async (req, res) => {
  if (req.url === "/status") {
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(await status(servers, repoRoot)));
    return;
  }
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page);
    return;
  }
  res.writeHead(404).end();
});

/** Opens the dashboard in the default browser. Quietly does nothing if it can't. */
function openInBrowser(url: string) {
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`dev dashboard at ${url}`);
  // DEV_DASHBOARD_OPEN=false (in the shell or .env.local) keeps the tab shut.
  if (!process.env.CI && process.env.DEV_DASHBOARD_OPEN !== "false")
    openInBrowser(url);
});
