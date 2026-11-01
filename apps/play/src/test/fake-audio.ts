// A stand-in for Web Audio and the fetch of its files, which jsdom doesn't
// have: records what plays. Tests call `vi.unstubAllGlobals()` afterwards.
import { vi } from "vitest";

export interface FakeSource {
  buffer: AudioBuffer | null;
  loop: boolean;
  playbackRate: { value: number };
  started: boolean;
  stoppedAt: number | undefined;
  gain?: FakeGain;
}

export interface FakeGain {
  gain: { value: number; target?: number };
}

export interface FakeAudio {
  /** Every context made. */
  contexts: FakeContext[];
  /** The URLs fetched. */
  fetched: string[];
  /** Lets the files that have been fetched finish decoding. */
  loaded(): Promise<void>;
}

export interface FakeContext {
  state: AudioContextState;
  sources: FakeSource[];
  gains: FakeGain[];
}

/** A file's "bytes" are its URL, and so is its decoded buffer, so tests can tell them apart. */
export function stubAudio({ failing = [] as string[] } = {}): FakeAudio {
  const contexts: FakeContext[] = [];
  const fetched: string[] = [];
  const decoding: Promise<unknown>[] = [];

  class FakeAudioContext implements FakeContext {
    state: AudioContextState = "suspended";
    sources: FakeSource[] = [];
    gains: FakeGain[] = [];
    currentTime = 0;
    destination = {};
    constructor() {
      contexts.push(this);
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
    close() {
      this.state = "closed";
      return Promise.resolve();
    }
    createDynamicsCompressor() {
      return { connect: (next: unknown) => next };
    }
    createGain() {
      const node = {
        gain: {
          value: 1,
          target: undefined as number | undefined,
          setTargetAtTime(target: number) {
            node.gain.target = target;
          },
        },
        connect: (next: unknown) => next,
      };
      this.gains.push(node);
      return node;
    }
    createBufferSource() {
      const source = {
        buffer: null,
        loop: false,
        playbackRate: { value: 1 },
        started: false,
        stoppedAt: undefined as number | undefined,
        gain: undefined as FakeGain | undefined,
        connect(next: FakeGain) {
          source.gain = next;
          return next;
        },
        start() {
          source.started = true;
        },
        stop(at: number) {
          source.stoppedAt = at;
        },
      };
      this.sources.push(source);
      return source;
    }
    decodeAudioData(data: string) {
      const result = failing.includes(data)
        ? Promise.reject(new Error("can't decode"))
        : Promise.resolve(data);
      decoding.push(result.catch(() => {}));
      return result;
    }
  }

  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("fetch", (url: string) => {
    fetched.push(url);
    const result = Promise.resolve({ arrayBuffer: async () => url });
    decoding.push(result);
    return result;
  });
  return {
    contexts,
    fetched,
    async loaded() {
      // Fetch, read and decode each take a few ticks.
      for (let i = 0; i < 10; i++) await Promise.all(decoding);
    },
  };
}
