// Dev only: what the avatar fit tool (src/dev/AvatarFit.tsx) saves to. Writes
// the fits and masks into packages/avatar, for the founder to commit.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";
import {
  fitMasksSource,
  fitsSource,
  isPiece,
  parseFits,
} from "@repo/avatar/fit-file";
import type { Plugin } from "vite";

const maxBody = 40 * 1024 * 1024;
const pngData = "data:image/png;base64,";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBody) reject(new Error("Too big"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** Only this machine, from its own page: the dev server is open to the LAN. */
function isLocal(req: IncomingMessage): boolean {
  const from = req.socket.remoteAddress ?? "";
  const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(from);
  const origin = req.headers.origin;
  return loopback && !!origin && new URL(origin).host === req.headers.host;
}

export function avatarFitSaver(repoRoot: string): Plugin {
  const avatar = join(repoRoot, "packages/avatar");
  const masks = join(avatar, "art/masks");
  return {
    name: "avatar-fit-saver",
    apply: "serve",
    // The tool holds what it just saved, and reloading would lose its undo.
    handleHotUpdate({ file }) {
      if (/packages\/avatar\/src\/fit(s|-masks)\.ts$/.test(file)) return [];
    },
    configureServer(server) {
      server.middlewares.use("/__avatar-fit", async (req, res) => {
        const reply = (status: number, text: string) => {
          res.statusCode = status;
          res.end(text);
        };
        if (req.method !== "POST" || !isLocal(req))
          return reply(403, "Local saves only");
        try {
          const body = JSON.parse(await readBody(req));
          const fits = parseFits(body.fits);
          const changed = Object.entries(body.masks ?? {});
          const validMasks = changed.every(
            ([id, mask]) =>
              isPiece(id) &&
              (mask === null ||
                (typeof mask === "string" && mask.startsWith(pngData))),
          );
          if (!fits || !validMasks) return reply(400, "Not valid fits");
          mkdirSync(masks, { recursive: true });
          for (const [id, mask] of changed) {
            const file = join(masks, `${id}.png`);
            if (mask === null) rmSync(file, { force: true });
            else
              writeFileSync(
                file,
                Buffer.from((mask as string).slice(pngData.length), "base64"),
              );
          }
          const saved = readdirSync(masks)
            .filter((f) => f.endsWith(".png"))
            .map((f) => f.slice(0, -4));
          writeFileSync(join(avatar, "src/fits.ts"), fitsSource(fits));
          writeFileSync(
            join(avatar, "src/fit-masks.ts"),
            fitMasksSource(saved),
          );
          reply(200, "Saved");
        } catch (error) {
          reply(500, String(error));
        }
      });
    },
  };
}
