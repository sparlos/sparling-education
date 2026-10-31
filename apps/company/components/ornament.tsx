/** A printer's ornament in brass: two rules meeting at a diamond. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 16"
      width="120"
      height="16"
      aria-hidden="true"
    >
      <g fill="none" stroke="var(--brass)" strokeWidth="1">
        <path d="M0 8 H48" />
        <path d="M72 8 H120" />
        <path d="M60 2 L66 8 L60 14 L54 8 Z" />
      </g>
      <circle cx="60" cy="8" r="1.75" fill="var(--brass)" />
      <circle cx="44" cy="8" r="1.25" fill="var(--brass)" />
      <circle cx="76" cy="8" r="1.25" fill="var(--brass)" />
    </svg>
  );
}
