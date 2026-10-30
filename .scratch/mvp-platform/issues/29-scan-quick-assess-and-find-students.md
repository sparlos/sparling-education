# 29: Scan quick assess one student at a time, and find a student by name

**What to build:** Class quick assess shows one student at a time, the way a teacher writes report cards. A list of the class's names sits beside that student's block, and a search box filters the list as the teacher types. ‹ › buttons (and the arrow keys) step through the class. Print still prints every student. The dashboard grid gets the same search box, which narrows its rows to the matching students. Both filter in the browser; nothing new is loaded.

**Blocked by:** 16, 28

**Status:** ready-for-human

- [x] Quick assess on screen shows one student's block. Which one is in the URL (`?student=<id>`), so a reload or a shared link opens the same student. Without it, the first student shows
- [x] Beside it (above it on a phone), the class's names as links, the shown student marked. A "Find a student" box filters them by the start of the first name or last initial, ignoring case and accents. When nothing matches, it says so
- [x] ‹ and › go to the previous and next student in class order, with "3 of 24" between them. The left and right arrow keys do the same, except while typing
- [x] Moving between students doesn't pile up history: the back link still goes to the dashboard
- [x] Printing still gives every student, one block each, as before (issue 16)
- [x] The dashboard has the same "Find a student" box above the grid, which narrows the grid's rows. When nothing matches, it says so
- [x] The quick assess walkthrough step describes the new layout
- [x] Rendered-app tests cover searching on both screens, stepping with the buttons and keys, the URL opening a student, and print still holding every student
- [x] Headless Chrome at 1366×768 and 360×640 on the demo class: no page overflow, targets 48 px or more

## Comments

**Agent, 2026-10-29:** Built; over to the founder to try it and commit.

- **Quick assess** (`QuickAssess.tsx`): names on the left (sticky; above the block on a phone), "Find a student" filters them, ‹ Previous / 3 of 24 / Next › above the student's block. The arrow keys step too, except in a text box or a dialog (the walkthrough has its own arrow keys). `?student=<id>` holds who's shown, replacing history, so the back link still goes to the dashboard. Every student is still in the page for print; on screen the rest are hidden.
- **Dashboard**: the same box sits above the grid and narrows its rows. The misconception strip and "Not recognised yet" aren't filtered.
- **Matching** (`FindStudent.tsx`): each typed word must start the first name or last initial, ignoring case and accents ("chloe" finds Chloé G., "ben o" finds Ben O.).
- `@repo/ui`'s `TextInput` gained `type="search"` and controlled `value`/`onChange`.
- **Checks:** teach 192 tests pass (3 new), types and Biome clean. Headless Chrome on the demo class at 1366 and 360: no page overflow, no target under 48 px. Print still holds every student.
