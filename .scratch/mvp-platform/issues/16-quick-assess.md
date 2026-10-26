# 16: Quick assess

**What to build:** A teacher views quick assess for their class or for one student: a summary for writing report cards that states which curriculum expectations and Learning Skills each piece of evidence contributes to, without assigning a level or rating. It prints cleanly from the browser.

**Blocked by:** 11, 13

**Status:** ready-for-agent

- [ ] Class and student quick assess are screens in the teacher app, reached from the dashboard and the student page
- [ ] Each piece of evidence names its expectations (product-layer descriptions only, per ADR 0001), its tier and the Learning Skills it contributes to. No level, rating or mark appears anywhere
- [ ] The print stylesheet hides navigation, never splits a row across pages, is legible in greyscale, and puts the class or student and the date in the page header
- [ ] Integration tests cover the quick-assess data. Rendered-app tests cover both views
- [ ] The founder checks print preview of a class and a student by hand before closing
