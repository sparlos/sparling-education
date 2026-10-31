import { brandByline, brandName } from "@repo/tokens";
import {
  gemFacets,
  gemOutline,
  gemSeams,
  markBox,
  sparkleGapStroke,
  sparkleOutline,
} from "@repo/tokens/mark";
import { useId } from "react";
import classes from "./wordmark.module.css";

interface WordmarkProps {
  /** Wraps the wordmark in a link, usually to the home page. */
  href?: string;
  size?: "md" | "lg";
  /** For dark backgrounds. */
  inverse?: boolean;
  /** Adds "by Sparling Education" under the name. Only where it's readable. */
  byline?: boolean;
}

/** The logo: the gem mark beside the product name. */
export function Wordmark({
  href,
  size = "md",
  inverse,
  byline,
}: WordmarkProps) {
  const content = (
    <>
      <Mark />
      <span className={classes.text}>
        <span className={classes.name}>{brandName}</span>
        {byline && <span className={classes.byline}>{brandByline}</span>}
      </span>
    </>
  );
  const shared = {
    className: classes.root,
    "data-size": size,
    "data-inverse": inverse || undefined,
    "data-byline": byline || undefined,
  };
  return href ? (
    <a href={href} aria-label={`${brandName} home`} {...shared}>
      {content}
    </a>
  ) : (
    <span {...shared}>{content}</span>
  );
}

/** The gem with its sparkle, on its own. */
export function Mark({ mono }: { mono?: boolean }) {
  const id = useId();
  const sparkleFill = mono ? "currentColor" : "var(--k-sparkle)";
  return (
    <svg
      className={classes.mark}
      viewBox={`${markBox.x} ${markBox.y} ${markBox.width} ${markBox.height}`}
      aria-hidden="true"
    >
      <mask
        id={`${id}-cut`}
        maskUnits="userSpaceOnUse"
        x="-10"
        y="-40"
        width="160"
        height="150"
      >
        <path d={gemOutline} fill="#fff" />
        {mono && (
          <path
            d={gemSeams}
            fill="none"
            stroke="#000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )}
        <path
          d={sparkleOutline}
          fill="#000"
          stroke="#000"
          strokeWidth={sparkleGapStroke}
          strokeLinejoin="round"
        />
      </mask>
      <clipPath id={`${id}-clip`}>
        <path d={gemOutline} />
      </clipPath>
      <g mask={`url(#${id}-cut)`}>
        {mono ? (
          <path d={gemOutline} fill="currentColor" />
        ) : (
          <g clipPath={`url(#${id}-clip)`}>
            {gemFacets.map((facet) => (
              <path key={facet.name} d={facet.d} fill={facet.fill} />
            ))}
          </g>
        )}
      </g>
      <path d={sparkleOutline} fill={sparkleFill} />
    </svg>
  );
}
