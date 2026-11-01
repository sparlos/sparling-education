# 05: How students find it

**What to build:** a student notices the notebook without any game suggesting it. The button glows silently until they've opened it once, and that first opening plays one spoken welcome with a caption. See the spec's "How students find it" section.

The line is: "Here's your notebook. Work things out here, like on paper. It's just for you, and it empties when you move on."

**Blocked by:** 02: Notebook over Cargo Line, with a pen

**Status:** ready-for-agent

- [ ] The button glows, with no sound, until the student opens the notebook for the first time
- [ ] Having opened it is remembered on this device only, and is never sent to the platform
- [ ] If the device can't remember it, the notebook still works and the glow simply shows again
- [ ] The first opening plays the welcome with a caption, and later openings don't
- [ ] If the welcome cuts off a game's line, Hear Again brings that line back
- [ ] The glow respects reduced-motion settings
- [ ] The line is added to the shell's strings, and the founder is told to run `pnpm voice`, listen and commit (`pnpm check-voice` fails until then, and the line falls back to browser speech)
