// Screenshots and recordings of the platform's own apps, for the "screen" scene.
// They live in screens/<app>/ and are captured from the app running on its
// in-memory platform at 1440 px wide (docs/agents/frontend-testing.md):
// screenshots at 2× pixel density, recordings with Playwright's recordVideo.
// Only scenes import this file: Node can't load the media, so briefs refer to
// a screen by name.
import playFractionHopClip from "../screens/play/fraction-hop.mp4";
import playFractionHopStart from "../screens/play/fraction-hop-start.png";
import teachAnswers from "../screens/teach/answers.png";
import teachDashboard from "../screens/teach/dashboard.png";
import teachQuickAssessPrint from "../screens/teach/quick-assess-print.png";
import teachStudent from "../screens/teach/student.png";

export interface Screenshot {
  /** The still, or a recording's first frame. */
  src: string;
  /** Size in pixels. */
  width: number;
  height: number;
  /** A recording that plays from the still. */
  clip?: {
    src: string;
    /** Seconds into the clip of the moment that lands on the scene's cue. */
    cueAt: number;
  };
}

export const screens = {
  /** Room 12's dashboard, the whole page. */
  "teach-dashboard": { src: teachDashboard, width: 2880, height: 2798 },
  /** Ben T.'s page, the whole page. */
  "teach-student": { src: teachStudent, width: 2880, height: 2370 },
  /** Every answer from one of Ben T.'s games, the whole page. */
  "teach-answers": { src: teachAnswers, width: 2880, height: 2990 },
  /** Quick assess as it prints: every student, one after another. */
  "teach-quick-assess-print": {
    src: teachQuickAssessPrint,
    width: 2880,
    height: 3852,
  },
  /**
   * Fraction Hop in the play shell: a Grade 4 student's plan of two 1 hops
   * and a 1/4 hop, Play pressed a second in, then the hops land on 9/4.
   */
  "play-fraction-hop": {
    src: playFractionHopStart,
    width: 1440,
    height: 900,
    clip: { src: playFractionHopClip, cueAt: 1 },
  },
} satisfies Record<string, Screenshot>;

export type ScreenName = keyof typeof screens;
