"use client";

import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useState } from "react";
import classes from "./hero-video.module.css";

export interface HeroVideoProps {
  /** The video file. Swap for a hosted URL later; nothing else changes. */
  src: string;
  /** The frame shown before it plays. */
  poster: string;
  /** What the button says, e.g. "Watch the 1-minute tour". */
  label: string;
  /** Describes the poster for screen readers. */
  alt: string;
}

/**
 * A video behind its poster and a play button. It loads and plays, with
 * sound, only when the visitor asks, so the page stays light.
 */
export function HeroVideo({ src, poster, label, alt }: HeroVideoProps) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={classes.root}>
      {playing ? (
        // biome-ignore lint/a11y/useMediaCaption: the captions are burned into the video
        <video
          className={classes.video}
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
        />
      ) : (
        <button
          type="button"
          className={classes.start}
          onClick={() => setPlaying(true)}
        >
          {/* biome-ignore lint/performance/noImgElement: @repo/ui is framework-agnostic, not Next-only */}
          <img className={classes.video} src={poster} alt={alt} />
          <span className={classes.play}>
            <span className={classes.icon} aria-hidden="true">
              <IconPlayerPlayFilled size={22} />
            </span>
            {label}
          </span>
        </button>
      )}
    </div>
  );
}
