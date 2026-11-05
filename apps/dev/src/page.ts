// The dashboard page: one self-contained HTML document. The server fills in
// the links; the page polls /status to light up each server as it comes up.
import type { Category, Command, Server } from "./links.ts";

export interface PageData {
  servers: Server[];
  categories: Category[];
  commands: Command[];
}

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const hostPath = (url: string) => url.replace(/^https?:\/\//, "");

export function renderPage({ servers, categories, commands }: PageData) {
  let key = 0;
  const sections = categories
    .map(
      (category) => `
    <section>
      <h2><span class="tag">${esc(category.tag)}</span>${esc(category.title)}<span class="rule"></span></h2>
      <div class="grid">${category.links
        .map((link) => {
          key += 1;
          return `
        <a class="card" href="${esc(link.url)}" target="_blank" rel="noopener" data-server="${esc(link.server)}" data-key="${key}">
          <div class="card-top">
            <kbd>${key}</kbd>
            <span class="dot" aria-hidden="true"></span>
          </div>
          <h3>${esc(link.title)}</h3>
          <p>${esc(link.blurb)}</p>
          <code>${esc(hostPath(link.url))}<span class="arrow">↗</span></code>
        </a>`;
        })
        .join("")}
      </div>
    </section>`,
    )
    .join("");

  const serverPills = servers
    .map(
      (s) => `
      <li class="pill" data-server="${esc(s.id)}">
        <span class="dot" aria-hidden="true"></span>
        <span class="name">${esc(s.name)}</span>
        <span class="port">:${s.port}</span>
        <span class="ms">…</span>
      </li>`,
    )
    .join("");

  const commandRows = commands
    .map(
      (c) => `
      <button class="cmd" type="button" data-copy="${esc(c.command)}">
        <span class="prompt">$</span>
        <span class="text">${esc(c.command)}</span>
        <span class="hint">${esc(c.blurb)}</span>
        <span class="copied">copied</span>
      </button>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dev dashboard</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2 29 11 16 30 3 11Z" fill="#a78bfa"/></svg>',
  )}">
<style>
  :root {
    --bg: #07080c;
    --panel: #0e1017;
    --panel-2: #131621;
    --line: #1d2130;
    --line-2: #2a2f44;
    --text: #e6e8f0;
    --muted: #7d849c;
    --dim: #4a5068;
    --accent: #a78bfa;
    --accent-2: #22d3ee;
    --up: #34d399;
    --down: #f43f5e;
    --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    background:
      radial-gradient(1200px 600px at 85% -10%, rgb(167 139 250 / 0.14), transparent 60%),
      radial-gradient(900px 500px at -10% 110%, rgb(34 211 238 / 0.08), transparent 60%),
      var(--bg);
    color: var(--text);
    font: 15px/1.5 var(--sans);
    -webkit-font-smoothing: antialiased;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(var(--line) 1px, transparent 1px),
      linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 50% 0%, #000 20%, transparent 75%);
    opacity: 0.55;
  }
  main {
    position: relative;
    max-width: 1120px;
    margin: 0 auto;
    padding: 48px 24px 64px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
  }
  .brand { font-family: var(--mono); }
  .brand .path { color: var(--muted); font-size: 13px; letter-spacing: 0.04em; }
  .brand h1 {
    margin: 4px 0 0;
    font-size: clamp(30px, 5vw, 44px);
    font-weight: 700;
    letter-spacing: -0.03em;
    background: linear-gradient(90deg, #fff 0%, var(--accent) 55%, var(--accent-2) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .cursor {
    display: inline-block;
    width: 0.5em;
    height: 0.9em;
    margin-left: 6px;
    vertical-align: -0.08em;
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent);
    animation: blink 1.1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  .git {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font: 12px/1 var(--mono);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    background: rgb(14 16 23 / 0.8);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chip b { color: var(--text); font-weight: 500; }
  .chip.branch b { color: var(--accent); }
  .chip.dirty b { color: #fbbf24; }
  .chip.clean b { color: var(--up); }
  .chip.subject { max-width: 340px; }

  .servers {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 40px;
    padding: 10px;
    list-style: none;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: rgb(14 16 23 / 0.7);
    backdrop-filter: blur(6px);
    font: 12px/1 var(--mono);
  }
  .servers .label {
    align-self: center;
    padding: 0 8px 0 4px;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
  }
  .pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--panel-2);
  }
  .pill .name { color: var(--text); }
  .pill .port { color: var(--dim); }
  .pill .ms { min-width: 34px; color: var(--muted); text-align: right; }
  .pill.down .ms { color: var(--down); }

  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--dim);
    transition: background 0.3s, box-shadow 0.3s;
  }
  .up .dot {
    background: var(--up);
    box-shadow: 0 0 0 3px rgb(52 211 153 / 0.15), 0 0 10px var(--up);
    animation: pulse 2.4s ease-in-out infinite;
  }
  .down .dot { background: var(--down); box-shadow: 0 0 0 3px rgb(244 63 94 / 0.15); }
  @keyframes pulse { 50% { box-shadow: 0 0 0 5px rgb(52 211 153 / 0.06), 0 0 14px var(--up); } }

  section { margin-bottom: 40px; }
  h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 16px;
    font: 600 13px/1 var(--mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  h2 .tag {
    padding: 4px 6px;
    border-radius: 4px;
    background: rgb(167 139 250 / 0.12);
    color: var(--accent);
    letter-spacing: 0.04em;
  }
  h2 .rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--line-2), transparent); }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 168px;
    padding: 18px 18px 16px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: linear-gradient(180deg, var(--panel-2), var(--panel));
    color: inherit;
    text-decoration: none;
    transition: transform 0.18s ease, border-color 0.18s, box-shadow 0.18s;
    isolation: isolate;
  }
  .card::before {
    content: "";
    position: absolute;
    inset: -1px;
    z-index: -1;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, var(--accent), transparent 40%, transparent 60%, var(--accent-2));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.18s;
  }
  .card:hover, .card:focus-visible {
    outline: none;
    transform: translateY(-2px);
    border-color: transparent;
    box-shadow: 0 12px 40px -12px rgb(167 139 250 / 0.35);
  }
  .card:hover::before, .card:focus-visible::before { opacity: 1; }
  .card.down { opacity: 0.55; }
  .card.down:hover { opacity: 0.85; }
  .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  kbd {
    display: inline-grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--line-2);
    border-bottom-width: 2px;
    border-radius: 5px;
    background: var(--bg);
    color: var(--muted);
    font: 11px/1 var(--mono);
  }
  .card h3 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
  .card p { margin: 0; color: var(--muted); font-size: 14px; }
  .card code {
    margin-top: auto;
    padding-top: 12px;
    color: var(--accent-2);
    font: 12px/1.3 var(--mono);
    overflow-wrap: anywhere;
  }
  .arrow { display: inline-block; margin-left: 6px; color: var(--dim); transition: transform 0.18s, color 0.18s; }
  .card:hover .arrow { transform: translate(2px, -2px); color: var(--accent-2); }

  .cmds { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 8px; }
  .cmd {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    color: var(--text);
    font: 13px/1.4 var(--mono);
    text-align: left;
    cursor: copy;
    transition: border-color 0.15s, background 0.15s;
  }
  .cmd:hover, .cmd:focus-visible { outline: none; border-color: var(--line-2); background: var(--panel-2); }
  .cmd .prompt { color: var(--accent); }
  .cmd .hint { margin-left: auto; padding-left: 12px; color: var(--dim); font-size: 12px; }
  .cmd .copied {
    position: absolute;
    right: 14px;
    color: var(--up);
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .cmd.done .hint { opacity: 0; }
  .cmd.done .copied { opacity: 1; }

  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 12px;
    padding-top: 18px;
    border-top: 1px solid var(--line);
    color: var(--dim);
    font: 12px/1 var(--mono);
  }
  footer kbd { margin-right: 6px; }

  @media (max-width: 560px) {
    main { padding: 32px 16px 48px; }
    .grid, .cmds { grid-template-columns: 1fr; }
    .cmd { flex-wrap: wrap; }
    .cmd .hint { margin-left: 18px; padding-left: 0; flex-basis: 100%; }
    .chip.subject { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
<main>
  <header>
    <div class="brand">
      <div class="path">~/edtech-startup</div>
      <h1>dev<span class="cursor" aria-hidden="true"></span></h1>
    </div>
    <div class="git" id="git"></div>
  </header>

  <ul class="servers" aria-label="Dev servers">
    <li class="label">servers</li>${serverPills}
  </ul>
${sections}
  <section>
    <h2><span class="tag">sh</span>Commands<span class="rule"></span></h2>
    <div class="cmds">${commandRows}
    </div>
  </section>

  <footer>
    <span><kbd>1</kbd>–<kbd>${key}</kbd>open a link in a new tab</span>
    <span id="checked">checking…</span>
  </footer>
</main>
<script>
  const cards = [...document.querySelectorAll(".card")];
  const pills = [...document.querySelectorAll(".pill")];
  const gitEl = document.getElementById("git");
  const checked = document.getElementById("checked");

  const chip = (cls, label, value) => {
    const el = document.createElement("span");
    el.className = "chip " + cls;
    el.append(label);
    const b = document.createElement("b");
    b.textContent = value;
    el.append(b);
    return el;
  };

  async function refresh() {
    try {
      const res = await fetch("/status", { cache: "no-store" });
      const { servers, git } = await res.json();
      const byId = Object.fromEntries(servers.map((s) => [s.id, s]));
      for (const el of [...pills, ...cards]) {
        const s = byId[el.dataset.server];
        el.classList.toggle("up", !!s?.up);
        el.classList.toggle("down", !s?.up);
        const ms = el.querySelector(".ms");
        if (ms) ms.textContent = s?.up ? s.ms + "ms" : "down";
      }
      if (git) {
        gitEl.replaceChildren(
          chip("branch", "⎇ ", git.branch),
          chip("", "@ ", git.commit),
          chip("subject", "", git.subject),
          git.dirty
            ? chip("dirty", "± ", git.dirty + " changed")
            : chip("clean", "✓ ", "clean"),
        );
      }
      checked.textContent = "checked " + new Date().toLocaleTimeString();
    } catch {
      checked.textContent = "dashboard server stopped";
    }
  }
  refresh();
  setInterval(refresh, 2000);

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const n = Number.parseInt(e.code.replace(/^Digit/, ""), 10);
    const card = cards.find((c) => Number(c.dataset.key) === n);
    if (!card) return;
    e.preventDefault();
    window.open(card.href, "_blank", "noopener");
  });

  for (const btn of document.querySelectorAll(".cmd")) {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add("done");
        setTimeout(() => btn.classList.remove("done"), 1200);
      } catch {}
    });
  }
</script>
</body>
</html>
`;
}
