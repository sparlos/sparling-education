// Usage: install playwright-core in a scratch folder, run the play dev server on :3003,
// then: node fraction-hop-tour.mjs <screenshot dir> <grades, e.g. 3,4,5> <chrome-headless-shell path>
// Browser tour of Fraction Hop: every tier at Chromebook sizes. Checks the
// screen fits, the goal caption shows, targets are 64 px, and plays every task.
import { chromium } from "playwright-core";

// Point at Playwright's chrome-headless-shell (~/.cache/ms-playwright/chromium_headless_shell-*/).
const exe = process.argv[4];
const out = process.argv[2];
const sizes = [
  [1366, 650],
  [1280, 650],
];
const grades = process.argv[3].split(",").map(Number);
const browser = await chromium.launch({ executablePath: exe });
let problems = 0;
const fail = (m) => {
  problems++;
  console.log("  PROBLEM:", m);
};

async function readCourse(page) {
  return page.evaluate(() => {
    const svg = document.querySelector("svg[data-unit]");
    const unit = Number(svg.dataset.unit);
    const stones = [
      0,
      ...[...svg.querySelectorAll("[data-stone]")].map((g) =>
        Number(g.dataset.stone),
      ),
    ];
    const [n, d] = document
      .querySelector('[data-testid="goal-at"] [data-frac]')
      .dataset.frac.split("/")
      .map(Number);
    const blocks = [...document.querySelectorAll('[data-testid="block"]')].map(
      (b) => Number(b.dataset.d),
    );
    const budget = document.querySelectorAll(
      '[data-testid="empty-slot"], [data-testid="planned"]',
    ).length;
    return {
      unit,
      stones,
      goal: (n * unit) / d,
      blocks,
      budget,
      shown: `${n}/${d}`,
    };
  });
}
function route(c) {
  const best = new Map([[0, []]]);
  for (let at = 0; at < c.goal; at++) {
    const r = best.get(at);
    if (!r) continue;
    for (const d of [...c.blocks].sort((a, b) => a - b)) {
      const to = at + c.unit / d;
      if (
        to <= c.goal &&
        c.stones.includes(to) &&
        (!best.get(to) || best.get(to).length > r.length + 1)
      )
        best.set(to, [...r, d]);
    }
  }
  return best.get(c.goal);
}
async function checkFit(page, label) {
  const m = await page.evaluate(() => {
    const se = document.scrollingElement;
    const goal = document
      .querySelector('[data-hand="goal"]')
      .getBoundingClientRect();
    const small = [...document.querySelectorAll("button")]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && (r.width < 64 || r.height < 64);
      })
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    const board = document
      .querySelector('[data-testid="board"]')
      .getBoundingClientRect();
    const svg = document
      .querySelector("svg[data-unit]")
      .getBoundingClientRect();
    return {
      sh: se.scrollHeight,
      sw: se.scrollWidth,
      ih: innerHeight,
      iw: innerWidth,
      goal: [goal.left, goal.right, goal.top, goal.bottom],
      small,
      board: board.bottom,
      svgH: svg.height,
      svgW: svg.width,
    };
  });
  if (m.sh > m.ih || m.sw > m.iw)
    fail(`${label}: page scrolls (${m.sw}x${m.sh} in ${m.iw}x${m.ih})`);
  if (m.goal[0] < 0 || m.goal[1] > m.iw || m.goal[2] < 0 || m.goal[3] > m.ih)
    fail(`${label}: goal caption cut off ${m.goal}`);
  if (m.small.length)
    fail(`${label}: targets under 64px: ${m.small.join(", ")}`);
  if (m.board > m.ih + 1) fail(`${label}: board overflows (${m.board})`);
  return m;
}
async function tap(page, sel) {
  await page.locator(sel).first().click();
}
async function waitIdle(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-hand="play"]').disabled,
    null,
    { timeout: 20000 },
  );
}
for (const grade of grades)
  for (const [w, h] of sizes) {
    const label = `G${grade} ${w}x${h}`;
    console.log(label);
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(
      ([grade]) => {
        localStorage.setItem(
          "kindling.stand-in.student",
          JSON.stringify({
            id: "tour",
            grade,
            locale: "en-CA",
            look: { body: "sky", eyes: "round", headwear: null },
            classId: null,
          }),
        );
        window.__spoken = [];
        const s = window.speechSynthesis;
        s.speak = (u) => {
          window.__spoken.push(u.text);
          setTimeout(() => u.dispatchEvent(new Event("end")), 300);
        };
        s.cancel = () => {};
      },
      [grade],
    );
    await page.goto("http://127.0.0.1:3003/play/fraction-hop");
    await page.getByRole("button", { name: "Start" }).click();
    await page.waitForSelector('[data-testid="board"]');
    await page.waitForTimeout(4000);
    const first = w === 1366;
    if (first)
      await page.screenshot({ path: `${out}/g${grade}-tutorial-plan.png` });
    await checkFit(page, `${label} tutorial`);
    if (first && grade === 3) {
      // Watch the whole tutorial once.
      const t0 = Date.now();
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll("button")].some(
            (b) => b.textContent === "Skip",
          ),
        null,
        { timeout: 90000 },
      );
      console.log(
        `  tutorial took ${Math.round((Date.now() - t0) / 1000) + 4}s; said: ${(await page.evaluate(() => window.__spoken.join(" / "))).slice(0, 400)}`,
      );
    } else {
      await page.getByRole("button", { name: "Skip" }).click();
    }
    await page.waitForTimeout(300);
    for (let task = 1; task <= 6; task++) {
      await waitIdle(page);
      const c = await readCourse(page);
      const r = route(c);
      if (!r) {
        fail(`${label} task ${task}: no route ${JSON.stringify(c)}`);
        break;
      }
      const m = await checkFit(page, `${label} task ${task}`);
      // A miss: the smallest block until the plan is full.
      const smallest = Math.max(...c.blocks);
      for (let i = 0; i < c.budget; i++)
        await tap(page, `[data-testid="block"][data-d="${smallest}"]`);
      await tap(page, '[data-hand="play"]');
      await page.waitForTimeout(400);
      await waitIdle(page);
      if (first && task === 1)
        await page.screenshot({ path: `${out}/g${grade}-task1-miss.png` });
      // Clear and solve, after tapping hint twice on task 2.
      if (task === 2) {
        await tap(page, "[data-hint-level]");
        await tap(page, "[data-hint-level]");
      }
      while (
        await page.locator('[data-testid="planned"]:not(:disabled)').count()
      )
        await tap(page, '[data-testid="planned"]:not(:disabled)');
      const locked = await page.locator('[data-testid="planned"]').count();
      for (const d of r.slice(locked))
        await tap(page, `[data-testid="block"][data-d="${d}"]`);
      if (first && task === 2)
        await page.screenshot({ path: `${out}/g${grade}-task2-hints.png` });
      await tap(page, '[data-hand="play"]');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="caption"]')
            .textContent.includes("You found the goal"),
        null,
        { timeout: 20000 },
      );
      if (first && task === 6)
        await page.screenshot({ path: `${out}/g${grade}-solved.png` });
      console.log(
        `  task ${task}: goal ${c.shown}, ticks ${c.unit}, blocks ${c.blocks}, budget ${c.budget}, route ${r}; course ${Math.round(m.svgW)}x${Math.round(m.svgH)}`,
      );
      if (task < 6) await page.waitForTimeout(2800);
    }
    await page.waitForTimeout(5500);
    const end = await page.evaluate(() => document.body.innerText.slice(0, 80));
    if (!/Well done|See you|again/i.test(end))
      fail(`${label}: no end screen: ${end}`);
    if (errors.length) fail(`${label}: errors ${errors.join(" | ")}`);
    if (first)
      console.log(
        "  spoken sample:",
        (await page.evaluate(() => window.__spoken.slice(0, 4))).join(" / "),
      );
    await page.close();
  }
await browser.close();
console.log(problems ? `${problems} problems` : "tour clean");
