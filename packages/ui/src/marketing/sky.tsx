import { useEffect, useRef } from "react";
import { cx } from "../cx";
import { Glint, Sparkle, Wing } from "./decor";
import classes from "./sky.module.css";

/*
 * A backdrop of slow aurora light, big wings beating slowly off the corners
 * and small glints drifting. `night` is deep indigo, for a screen with one bright
 * card on it; `day` is the pale page, lightly lit, for screens whose text
 * sits on the page. It fills its positioned parent, or with `fixed` the
 * screen, behind everything.
 *
 * `playful` (the student side) makes the sparkles gold. Without it they stay
 * violet: in the teacher app gold means a misconception. A `day` sky that
 * isn't playful is quiet: fainter and still, so it never pulls a teacher's
 * eye from their results.
 *
 * `parallax` (with `fixed`) moves the sky up as the page scrolls, by that
 * fraction of the scroll, so it seems far behind. Still with reduced motion.
 */
export function Sky({
  variant,
  playful,
  fixed,
  parallax,
}: {
  variant: "night" | "day";
  playful?: boolean;
  fixed?: boolean;
  parallax?: number;
}) {
  const ref = useParallax(fixed ? parallax : undefined);
  const night = variant === "night";
  const glint = playful ? "sparkle" : night ? "tone-soft" : "tone";
  const facet = night ? "tone-soft" : "tone";
  return (
    <div
      ref={ref}
      className={classes.sky}
      data-variant={variant}
      data-fixed={fixed || undefined}
      data-quiet={(!night && !playful) || undefined}
      aria-hidden="true"
    >
      <span className={cx(classes.aurora, classes.auroraA)} />
      <span className={cx(classes.aurora, classes.auroraB)} />
      <span className={cx(classes.aurora, classes.auroraC)} />
      <span className={classes.stars} />
      <Wing
        size={560}
        opacity={night ? 0.3 : 0.11}
        sway
        left="-150px"
        top="-120px"
      />
      <Wing
        size={480}
        opacity={night ? 0.24 : 0.09}
        sway
        flip
        delay={4}
        right="-130px"
        bottom="-150px"
      />
      <Wing
        size={190}
        opacity={night ? 0.22 : 0.08}
        float
        flip
        rotate={-8}
        right="8%"
        top="10%"
        hideOnMobile
      />
      <Sparkle
        size={26}
        color={glint}
        opacity={night ? 1 : 0.7}
        drift
        left="5%"
        top="22%"
        hideOnMobile
      />
      <Glint
        size={16}
        color={facet}
        opacity={night ? 1 : 0.35}
        drift
        delay={6}
        left="10%"
        top="64%"
      />
      <Sparkle
        size={18}
        color={glint}
        opacity={night ? 1 : 0.7}
        drift
        delay={11}
        right="14%"
        bottom="24%"
      />
      <Glint
        size={14}
        color={facet}
        opacity={night ? 1 : 0.35}
        drift
        delay={3}
        right="24%"
        top="30%"
      />
      <Sparkle
        size={14}
        color={glint}
        opacity={night ? 1 : 0.6}
        drift
        delay={8}
        left="30%"
        bottom="12%"
        hideOnMobile
      />
      <Glint
        size={20}
        color={playful ? "sparkle" : facet}
        opacity={night ? 1 : 0.5}
        drift
        delay={14}
        right="6%"
        top="52%"
        hideOnMobile
      />
    </div>
  );
}

/** Writes the page's scroll, times `rate`, to the sky as `--sky-shift`, once a frame at most. */
function useParallax(rate: number | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sky = ref.current;
    if (
      !sky ||
      !rate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let frame = 0;
    const update = () => {
      frame = 0;
      sky.style.setProperty("--sky-shift", `${window.scrollY * rate}px`);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      sky.style.removeProperty("--sky-shift");
    };
  }, [rate]);
  return ref;
}
