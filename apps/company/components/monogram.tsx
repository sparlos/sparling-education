import styles from "./monogram.module.css";

/**
 * The company's monogram: "SE" in the serif on an ink square, over a brass
 * rule. app/icon.svg is the same drawing for the browser tab.
 */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.monogram, className].filter(Boolean).join(" ")}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect width="64" height="64" fill="var(--ink)" />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontSize="26"
        fontWeight="500"
        fill="var(--paper)"
      >
        SE
      </text>
      <rect x="20" y="48" width="24" height="2" fill="var(--brass)" />
    </svg>
  );
}
