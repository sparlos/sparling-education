import styles from "./principle-icon.module.css";

// Small engravings over the principles: an open book for the curriculum, a
// shield with a keyhole for privacy, a marked page for teachers' judgement.

export type PrincipleIconName = "curriculum" | "privacy" | "teachers";

const drawings: Record<PrincipleIconName, React.ReactNode> = {
  curriculum: (
    <>
      <path d="M24 13 C18 9 10 9 5 11 V37 C10 35 18 35 24 39 Z" />
      <path d="M24 13 C30 9 38 9 43 11 V37 C38 35 30 35 24 39 Z" />
      <path className={styles.accent} d="M10 18 C14 17 18 17 20 18.5" />
      <path className={styles.accent} d="M10 24 C14 23 18 23 20 24.5" />
      <path className={styles.accent} d="M28 18.5 C30 17 34 17 38 18" />
    </>
  ),
  privacy: (
    <>
      <path d="M24 5 L40 11 V23 C40 33 33 40 24 43 C15 40 8 33 8 23 V11 Z" />
      <circle className={styles.accent} cx="24" cy="21" r="4" />
      <path className={styles.accent} d="M24 25 V32" />
    </>
  ),
  teachers: (
    <>
      <path d="M11 6 H31 L38 13 V42 H11 Z" />
      <path d="M31 6 V13 H38" />
      <path className={styles.accent} d="M17 27 L22 32 L32 20" />
    </>
  ),
};

export function PrincipleIcon({ name }: { name: PrincipleIconName }) {
  return (
    <svg className={styles.icon} viewBox="0 0 48 48" aria-hidden="true">
      {drawings[name]}
    </svg>
  );
}
