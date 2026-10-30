# 19: Blocking screens too small to play

**What to build:** The games can't be played on a phone; Kindling is for iPads, Chromebooks, laptops and desktops. When the student side (`apps/play`: sign-in, locker, wardrobe, every game) is open on a screen that's too small, a full-screen block covers everything and says, out loud, that this device is too small and to use a tablet or computer. When the screen gets big enough again (rotating, resizing the window), the block goes away and the student is back where they were.

**Blocked by:** 21

**Status:** ready-for-human

- [x] "Too small" is decided by the screen's shorter side, not just its width, so a phone turned sideways (about 850 × 390) is still blocked. Starting point: blocked when `min(innerWidth, innerHeight) < 600` CSS px, which lets through an iPad mini in either orientation (744 × 1133) and a 1366 × 768 Chromebook with the browser's toolbars. It's one named constant, with that reasoning next to it
- [x] It's one block mounted once at the play shell's root, above every route and the game host, so no page or game has to know about it. It covers the whole viewport, can't be dismissed, and takes all input; nothing underneath can be clicked, tapped or tabbed to
- [x] A game that's running is paused or not started while blocked, and nothing of the student's is lost: unblocking puts them back on the same page, and a game resumes where it was
- [x] It re-checks on resize and orientation change, so it appears and disappears live
- [x] When it appears it says one new shell line (in `apps/play/src/ui/shell-strings.ts`, short and plain, e.g. "This screen is too small for Kindling. Please use a tablet or a computer."), and the same words are on screen with the "hear it again" control
- [x] Its line takes precedence over every other voice line: showing the block stops whatever is being said (shell or game), and while it's up no other line can start. A game or page calling `say` while blocked is silently dropped, not queued to play afterwards. Implemented once in the shell's voice (`apps/play/src/play/voice.ts` / wherever the shell's `Voice` is created), not per game
- [x] Browsers won't play sound before the first tap on a fresh page load, so if the line can't autoplay it's said on the student's first tap on the block
- [x] The teacher side isn't affected
- [x] Rendered-app tests cover: blocked at phone portrait and phone landscape sizes, not blocked at iPad mini and Chromebook sizes, appearing and disappearing on resize, input not reaching the page underneath, and its line cutting off and then silencing other lines. A headless-Chrome look at phone size before calling it done
- [ ] (founder) The new line is recorded: tell the founder to run `pnpm voice`, listen, and commit the MP3 and lockfile

## Comments

**Agent, 2026-10-30:** Built; over to the founder to record the line, check and commit.

- `apps/play/src/ui/TooSmall.tsx` has the block, `tooSmallPx = 600` (with its reasoning), and `useTooSmall`, which re-checks on `resize` and `orientationchange`. `App` mounts the block once above every route and makes the page under it `inert`; the page stays mounted, so unblocking leaves the student where they were.
- Voice precedence lives in one place: a `VoiceGate` in `play/voice.ts`, shared through context by every shell voice and the game's voice. Showing the block closes the gate, which stops whatever is playing. While it's closed, `say` and `again` are dropped. The dropped instruction's promise settles only when the gate opens, so a game awaiting a line waits at that line instead of racing through its tutorial in silence. The block's own voice sits outside the gate.
- Keys: the inert page can't hold focus, but the stickers listen for Escape on `window`, so a capture-phase guard stops keys aimed past the block, and the block stops its own keys.
- First tap: if `navigator.userActivation.hasBeenActive` is false when the line is said, the first tap on the block says it again.
- **Limit on "paused":** the game contract has no pause, so a running game isn't truly paused. Its voice-led steps wait at their next line, but plain timers keep running (e.g. Fraction Hop's hint nudge, `pause()`/`later()`). Nothing can be tapped, so no attempts are recorded. A real pause needs a contract change (e.g. a `paused` prop), so it would be its own ticket.
- Proof: 6 rendered-app tests in `App.test.tsx` (phone upright and sideways blocked; iPad mini both ways and a 1366 × 650 Chromebook viewport let through; comes and goes on resize with the game's progress kept; keys don't reach the page; it cuts off a game line and drops one said while blocked; first-tap replay), checked by breaking each guard. There are also 6 gate unit tests in `voice.test.ts`. The play suite (292 tests), `tsc` and Biome pass. Headless Chrome at 360 × 640 and 844 × 390 shows the block with a 48 px hear-again button, focused. Resizing to 1133 × 744 brings back the Start screen.
- `pnpm check-voice` fails until `too-small` is recorded: run `pnpm voice`, listen, and commit the MP3 and lockfile.
