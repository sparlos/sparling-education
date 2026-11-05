import { execFile } from "node:child_process";
import { connect } from "node:net";
import { promisify } from "node:util";
import type { Server } from "./links.ts";

const run = promisify(execFile);

export interface ServerStatus {
  id: string;
  up: boolean;
  /** How long the port took to accept a connection, or null when it's down. */
  ms: number | null;
}

export interface GitStatus {
  branch: string;
  commit: string;
  subject: string;
  /** Files changed, staged or not, including untracked ones. */
  dirty: number;
}

export interface Status {
  servers: ServerStatus[];
  git: GitStatus | null;
}

/**
 * Whether something is listening on the port. A TCP connect, not an HTTP
 * request, so probing never makes Next compile a page or Vite transform one.
 */
export function probe(
  port: number,
  host = "127.0.0.1",
  timeoutMs = 800,
): Promise<number | null> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = connect({ port, host });
    const done = (ms: number | null) => {
      socket.destroy();
      resolve(ms);
    };
    socket.setTimeout(timeoutMs, () => done(null));
    socket.once("connect", () => done(Math.round(performance.now() - start)));
    socket.once("error", () => done(null));
  });
}

export async function gitStatus(cwd: string): Promise<GitStatus | null> {
  try {
    const git = (...args: string[]) =>
      run("git", args, { cwd }).then((r) => r.stdout.trimEnd());
    const [branch, log, porcelain] = await Promise.all([
      git("rev-parse", "--abbrev-ref", "HEAD"),
      git("log", "-1", "--format=%h%x00%s"),
      git("status", "--porcelain"),
    ]);
    const [commit = "", subject = ""] = log.split("\0");
    return {
      branch,
      commit,
      subject,
      dirty: porcelain ? porcelain.split("\n").length : 0,
    };
  } catch {
    return null;
  }
}

export async function status(servers: Server[], cwd: string): Promise<Status> {
  const [probes, git] = await Promise.all([
    Promise.all(servers.map((s) => probe(s.port))),
    gitStatus(cwd),
  ]);
  return {
    servers: servers.map((s, i) => ({
      id: s.id,
      up: probes[i] !== null,
      ms: probes[i] ?? null,
    })),
    git,
  };
}
