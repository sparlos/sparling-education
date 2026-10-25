// One composition per brief in videos/. Timings come from the brief's voice
// manifest (public/<id>/voice.json) once the voice step has run, and from
// estimates until then, so any brief previews in the Studio straight away.
import { Composition, staticFile } from "remotion";
import { briefs } from "../videos/index.ts";
import { estimateVoice, layout, type VoiceManifest } from "./timeline.ts";
import { Video, type VideoProps } from "./Video.tsx";

async function voiceFor(id: string): Promise<VoiceManifest | null> {
  try {
    const res = await fetch(staticFile(`${id}/voice.json`));
    return res.ok ? ((await res.json()) as VoiceManifest) : null;
  } catch {
    return null;
  }
}

async function exists(path: string) {
  try {
    return (await fetch(staticFile(path), { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

export function Root() {
  return (
    <>
      {briefs.map((brief) => (
        <Composition
          key={brief.id}
          id={brief.id}
          component={Video}
          width={brief.format.width}
          height={brief.format.height}
          fps={brief.format.fps}
          durationInFrames={brief.format.fps * 30}
          defaultProps={
            {
              id: brief.id,
              tone: brief.tone,
              timeline: null,
              hasMix: false,
            } satisfies VideoProps
          }
          calculateMetadata={async ({ props }) => {
            const voice = await voiceFor(brief.id);
            const takes = { ...estimateVoice(brief).takes, ...voice?.takes };
            const timeline = layout(brief, { takes });
            return {
              durationInFrames: timeline.durationInFrames,
              props: {
                ...props,
                timeline,
                hasMix: await exists(`${brief.id}/mix.wav`),
              },
            };
          }}
        />
      ))}
    </>
  );
}
