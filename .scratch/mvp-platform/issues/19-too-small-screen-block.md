# 19: Blocking screens too small to play

**What to build:** The games can't be played on a phone; Kindling is for iPads, Chromebooks, laptops and desktops. When the student side (`apps/play`: sign-in, locker, wardrobe, every game) is open on a screen that's too small, a full-screen block covers everything and says, out loud, that this device is too small and to use a tablet or computer. When the screen gets big enough again (rotating, resizing the window), the block goes away and the student is back where they were.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] "Too small" is decided by the screen's shorter side, not just its width, so a phone turned sideways (about 850 × 390) is still blocked. Starting point: blocked when `min(innerWidth, innerHeight) < 600` CSS px, which lets through an iPad mini in either orientation (744 × 1133) and a 1366 × 768 Chromebook with the browser's toolbars. It's one named constant, with that reasoning next to it
- [ ] It's one block mounted once at the play shell's root, above every route and the game host, so no page or game has to know about it. It covers the whole viewport, can't be dismissed, and takes all input; nothing underneath can be clicked, tapped or tabbed to
- [ ] A game that's running is paused or not started while blocked, and nothing of the student's is lost: unblocking puts them back on the same page, and a game resumes where it was
- [ ] It re-checks on resize and orientation change, so it appears and disappears live
- [ ] When it appears it says one new shell line (in `apps/play/src/ui/shell-strings.ts`, short and plain, e.g. "This screen is too small for Kindling. Please use a tablet or a computer."), and the same words are on screen with the "hear it again" control
- [ ] Its line takes precedence over every other voice line: showing the block stops whatever is being said (shell or game), and while it's up no other line can start. A game or page calling `say` while blocked is silently dropped, not queued to play afterwards. Implemented once in the shell's voice (`apps/play/src/play/voice.ts` / wherever the shell's `Voice` is created), not per game
- [ ] Browsers won't play sound before the first tap on a fresh page load, so if the line can't autoplay it's said on the student's first tap on the block
- [ ] The teacher side isn't affected
- [ ] Rendered-app tests cover: blocked at phone portrait and phone landscape sizes, not blocked at iPad mini and Chromebook sizes, appearing and disappearing on resize, input not reaching the page underneath, and its line cutting off and then silencing other lines. A headless-Chrome look at phone size before calling it done
- [ ] The new line is recorded: tell the founder to run `pnpm voice`, listen, and commit the MP3 and lockfile
