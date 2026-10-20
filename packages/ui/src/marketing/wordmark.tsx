import { brandName } from "@repo/tokens";
import classes from "./wordmark.module.css";

interface WordmarkProps {
  /** Wraps the wordmark in a link, usually to the home page. */
  href?: string;
  size?: "md" | "lg";
  /** For dark backgrounds. */
  inverse?: boolean;
}

/** Placeholder logo: a flame mark plus the product name. */
export function Wordmark({ href, size = "md", inverse }: WordmarkProps) {
  const content = (
    <>
      <FlameMark />
      <span>{brandName}</span>
    </>
  );
  const shared = {
    className: classes.root,
    "data-size": size,
    "data-inverse": inverse || undefined,
  };
  return href ? (
    <a href={href} aria-label={`${brandName} home`} {...shared}>
      {content}
    </a>
  ) : (
    <span {...shared}>{content}</span>
  );
}

function FlameMark() {
  return (
    <svg className={classes.mark} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--k-brand-fill)" />
      <path
        d="M16.4 6.5c.6 3.2-1.1 5-2.8 6.8-1.6 1.7-3.1 3.4-3.1 6.2 0 3.6 2.6 6 5.6 6s5.5-2.3 5.5-5.8c0-2.4-1.2-4-2.3-5.3-.2 1.6-.9 2.7-2 3.1.6-3.4.2-7.5-.9-11z"
        fill="#FFF4EC"
      />
      <path
        d="M16.1 25.5c-1.6 0-2.8-1.2-2.8-2.8 0-1.7 1.3-2.6 2.4-3.9.2 1 .8 1.6 1.6 1.8.3-.4.5-.9.5-1.4.8.9 1.2 1.9 1.2 3 0 1.9-1.3 3.3-2.9 3.3z"
        fill="var(--k-student-fill)"
      />
    </svg>
  );
}
