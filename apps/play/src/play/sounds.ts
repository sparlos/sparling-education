// Plays a game's sound effects and music with Web Audio: every file is decoded
// up front, so an effect starts within a few milliseconds of the call, and
// many can overlap. Nothing here is required to play (no grade requires
// sound), so a file or a device that fails just stays silent.
import type { SoundOptions } from "@repo/game-contract";

export interface Sounds {
  /**
   * Starts the audio and loads the game's files. Call it from a tap: browsers
   * keep audio silent until one.
   */
  start(): void;
  /** Plays an effect now. One that isn't loaded yet is dropped, since a late effect is worse than none. */
  play(id: string, options?: SoundOptions): void;
  /** Loops a track, fading from the one before, or fades out on null. A track still loading starts when it's ready. */
  music(id: string | null): void;
  /** Lowers the music until the returned function is called. */
  duck(): () => void;
  /** Silences effects and music, or brings them back. Music keeps its place. */
  mute(muted: boolean): void;
  /** Pauses everything, music where it is, until `release`. */
  hold(): void;
  release(): void;
  close(): void;
}

/** The levels against the voice lines' loudness: effects sit under the voice. */
const effectsLevel = 0.7;
const musicLevel = 0.35;
const duckedLevel = 0.12;
/** How quickly music fades, as a Web Audio time constant in seconds. */
const fadeS = 0.15;
const muteFadeS = 0.02;

interface Mix {
  context: AudioContext;
  effects: GainNode;
  music: GainNode;
  /** Everything but the voice, which is played apart from this. */
  master: GainNode;
}

export function createSounds(
  files: Readonly<Record<string, string>> = {},
): Sounds {
  let mix: Mix | null = null;
  const buffers = new Map<string, AudioBuffer>();
  let wanted: string | null = null;
  let track: {
    id: string;
    source: AudioBufferSourceNode;
    gain: GainNode;
  } | null = null;
  let ducks = 0;
  let held = false;
  let muted = false;

  function setMusicLevel() {
    mix?.music.gain.setTargetAtTime(
      ducks > 0 ? duckedLevel : musicLevel,
      mix.context.currentTime,
      fadeS,
    );
  }

  function startTrack() {
    if (!mix || !wanted || track) return;
    const buffer = buffers.get(wanted);
    if (!buffer) return;
    const { context } = mix;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, context.currentTime, fadeS);
    source.connect(gain).connect(mix.music);
    source.start();
    track = { id: wanted, source, gain };
  }

  function stopTrack() {
    if (!mix || !track) return;
    const now = mix.context.currentTime;
    track.gain.gain.setTargetAtTime(0, now, fadeS);
    // Five time constants is silence.
    track.source.stop(now + 5 * fadeS);
    track = null;
  }

  async function load(mine: Mix, id: string, url: string) {
    try {
      const response = await fetch(url);
      const buffer = await mine.context.decodeAudioData(
        await response.arrayBuffer(),
      );
      if (mix !== mine) return;
      buffers.set(id, buffer);
      if (id === wanted) startTrack();
    } catch (error) {
      console.warn(`[play] the sound ${id} won't load`, error);
    }
  }

  return {
    start() {
      const entries = Object.entries(files);
      if (mix || entries.length === 0) return;
      const Context = globalThis.AudioContext;
      if (!Context) return;
      try {
        const context = new Context();
        const effects = context.createGain();
        effects.gain.value = effectsLevel;
        const music = context.createGain();
        music.gain.value = ducks > 0 ? duckedLevel : musicLevel;
        const master = context.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(context.destination);
        // Many effects at once would add up past full volume and crackle.
        effects.connect(context.createDynamicsCompressor()).connect(master);
        music.connect(master);
        const mine = { context, effects, music, master };
        mix = mine;
        if (!held) void context.resume();
        for (const [id, url] of entries) void load(mine, id, url);
      } catch (error) {
        mix = null;
        console.warn("[play] sound won't start", error);
      }
    },
    play(id, options) {
      const buffer = buffers.get(id);
      if (!mix || !buffer || mix.context.state !== "running") return;
      const { context } = mix;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = options?.rate ?? 1;
      const gain = context.createGain();
      gain.gain.value = options?.volume ?? 1;
      source.connect(gain).connect(mix.effects);
      source.start();
    },
    music(id) {
      if (id === (track?.id ?? null)) {
        wanted = id;
        return;
      }
      stopTrack();
      wanted = id;
      startTrack();
    },
    duck() {
      ducks += 1;
      setMusicLevel();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        ducks -= 1;
        setMusicLevel();
      };
    },
    mute(next) {
      muted = next;
      // Quick, but not instant, which would click.
      mix?.master.gain.setTargetAtTime(
        muted ? 0 : 1,
        mix.context.currentTime,
        muteFadeS,
      );
    },
    hold() {
      held = true;
      void mix?.context.suspend();
    },
    release() {
      held = false;
      void mix?.context.resume();
    },
    close() {
      if (!mix) return;
      void mix.context.close();
      mix = null;
      track = null;
      wanted = null;
      buffers.clear();
    },
  };
}
