# 13: Effort and the student page

**What to build:** Kindling computes effort from how a student worked, and the teacher opens a student's page (from their grid row) to see their effort evidence by Learning Skill.

**Blocked by:** 10, 21

**Status:** ready-for-agent

- [ ] The scoring module computes effort using the spec's provisional rule: tasks failed and later succeeded on (the same task ID across retries), plus finished plays. Raw attempts and time spent never count, and a crashed play counts neither for nor against
- [ ] Effort maps onto the curriculum package's Learning Skills
- [ ] The student page shows the student's effort evidence by Learning Skill, links to their results, and has space for recognition (ticket 15) and quick assess (ticket 16)
- [ ] Integration tests post play records covering retries, improvement, spamming attempts, crashes and plays left partway, and check the effort that comes back. Rendered-app tests cover the student page
