# Product

The platform itself: the terms every part of the product shares, whatever app or package implements them.

## Language

### People

**Real name**:
A student's first name and last initial (e.g. "Maya R."), taken from their sign-in. Shown only to adults responsible for the student (their teacher and parent), never in the class world. The platform never keeps a student's email or full surname.
_Avoid_: Full name, display name

**Nickname**:
The name a student is known by in the class world and to classmates. The only student name other students ever see. Built by picking from curated word lists (e.g. "Cosmic Otter"), never typed freely, and a teacher can re-roll it.
_Avoid_: Username, handle, display name

**Avatar**:
A student's character, designed by them and the same everywhere: in the class world and in every game. Games always show it, at least as a reacting portrait, and some also make it a character in the game.
_Avoid_: Character, player, skin

### Classes

**Class join link**:
A link that carries a class's join code so a student can join that class in one step, landing in their locker.
_Avoid_: Invite link

**Game link**:
A direct link to one game for one class, usually shared by a teacher in a class stream. A full entry point for students: opening it joins the student to that class if they aren't in it yet, and their results go to that class exactly as if the game were opened from their locker.
_Avoid_: Deep link, assignment link

**Class colour**:
The colour a teacher picks for a class, from a fixed set, which every screen for that class takes its hue from. Never shown to students as a choice.
_Avoid_: Theme, class theme, skin

**Demo class**:
A class of simulated students with results already in, which every new teacher gets at their first sign-in, alongside their own classes, and can explore as both teacher and student ("view as a student"). Its plays come from each game's **simulator** and are scored like any others. Only its own simulated students are ever in it. The teacher can delete it in one step, and it never comes back.
_Avoid_: Sandbox, trial, test class

**Walkthrough**:
A guide through the teacher app's real controls, one at a time: each is spotlit with the rest of the screen dimmed, beside a card saying what it's for, with Back, Next and Skip. Each starts by itself once per teacher, is remembered on the server once finished or skipped, and can be replayed from Help.
_Avoid_: Tour (that's the automated playthrough of a game), onboarding, tutorial

**Welcome walkthrough**:
The walkthrough a new teacher gets on their first dashboard: what the platform does in a nutshell, across the dashboard and quick assess (the classes, sharing a game link, the misconceptions showing up, the grid, quick assess, viewing the demo class as a student, Help). The other screens each have a short walkthrough of their own, which starts the first time the teacher opens that screen after the welcome.
_Avoid_: Tour, onboarding, tutorial

### Locker

**Locker**:
A student's own home screen, outside any class world: their avatar and wardrobe, the games their teacher has turned on, and where every game returns them, with any new rewards revealed. A student can decorate it. Nobody visits it.
_Avoid_: Home, dashboard, hub, profile

### Class world

**Class world**:
The shared 3D space belonging to one class: the hub plus every student's house. One way into games, never the only way.
_Avoid_: Hubworld (outside code), class hub, world (unqualified, when ambiguous)

**Hub**:
The arrival area of a class world, where students spawn and where portals to games are.
_Avoid_: Using it to mean the whole class world

**Portal**:
A doorway in the hub that opens a game.
_Avoid_: Door, gate

**House**:
A student's own space, separate from the hub, where they place the furniture they've earned. Only its owner can change it.
_Avoid_: Plot, room, home base

**Invite**:
A student's invitation for a classmate to visit their house. A student can enter a house that isn't theirs only with an invite. An invite lasts for one visit, only goes to classmates, and is only valid while the owner is home.
_Avoid_: Friend request, permission

**Visit**:
Time a classmate spends in another student's house on an invite. Visitors can look around, emote and use preset phrases but can't change anything, and the owner can end the visit or remove a visitor at any time. A teacher can view any house without an invite.
_Avoid_: Hangout, playdate

### Learning

**Game**:
A self-contained curriculum activity where the concept being taught is the core mechanic. The heart of the platform. A game teaches one concept across a range of grades (e.g. fractions, Grades 3–8) and can be played on its own, without the class world. A teacher turns games on or off for their class.
_Avoid_: Quiz, activity, minigame, level, unit

**Game spec**:
The approved design of a game, written before it is built: its concept, tiers and the curriculum expectations each evidences, its core mechanic, the misconceptions the mechanic surfaces, what counts as an attempt, and how the avatar appears. A game is built only from an approved game spec.
_Avoid_: Design doc, brief, GDD

**Teacher card**:
A game's summary for teachers: what it teaches and for which grades, the curriculum expectations it evidences, its mechanic in brief, the misconceptions it can reveal and how they show up in results, and when to use it alongside instruction. Derived from the game spec.
_Avoid_: Teacher guide, lesson plan

**Tier**:
One grade's worth of content within a game. A student plays the tier for their grade.
_Avoid_: Level, difficulty, stage

**Result**:
The record of a student's play of a game, always including the tier it was played at. Captures both understanding and effort. What teachers use as assessment evidence. Students never see a result as a score.
_Avoid_: Score, grade, mark

**Attempt**:
One try at one task within a game: which curriculum expectation it evidences, whether it succeeded, and which misconception it revealed, if any. It can also carry, for teachers, what the task asked and what the student did on this try, in the game's own short text. An exploring try (a probe, e.g. a test run before committing) is an attempt that never counts: teachers see it as "Explored", and scoring and effort ignore it. Games record attempts; the platform turns a play's attempts into its result.
_Avoid_: Answer, response, question, event (unqualified)

**Simulator**:
A game's way of playing a whole play as a **simulated student** (how often they're right, the misconceptions they hold, how often they take help), through the game's own rules, giving the attempts the game would have sent. The demo class is made of simulated plays. Every game has one.
_Avoid_: Bot, fake player, generator (that makes a play's tasks)

**Misconception**:
A specific, named wrong idea an attempt can reveal (e.g. "thinks a larger denominator means a larger fraction"). Each game defines the misconceptions its mechanic can surface.
_Avoid_: Mistake, error (when the underlying idea is meant)

**Understanding**:
How well a result shows the student grasps the concept at that tier. Evidence of curriculum achievement.
_Avoid_: Correctness, accuracy, mastery (unqualified)

**Effort**:
How a student worked during a play: retrying, improving after mistakes, persisting. Evidence of Learning Skills, and the only thing rewards are earned from.
_Avoid_: Engagement, time spent

**Quick assess**:
A summary of a student's or a class's results that a teacher views, or prints, when writing report cards. It names which curriculum expectations and Learning Skills each piece of evidence contributes to, but never assigns a level or a Learning Skills rating: that judgement stays with the teacher.
_Avoid_: Report card, grade report, rubric (as the product name)

### Rewards

**Reward**:
An item (an outfit piece, a sticker, or a piece of furniture) a student earns through effort. Never bought, never random. Earnable anywhere, up to a weekly cap a student can reach in class time alone, so home play is never an advantage.
_Avoid_: Prize, loot, unlock

**Outfit piece**:
An item an avatar wears: a top, bottom, shoes or a hat. Every student owns a **base set** from the start; the rest are rewards. Skin tones and hairstyles aren't outfit pieces: every student can pick any of them.
_Avoid_: Clothing item, skin, cosmetic

**Wardrobe**:
Where a student changes their avatar's look, opened from their avatar in the locker. It offers every skin tone and hairstyle, and only the outfit pieces they own.
_Avoid_: Closet, customiser

**Sticker**:
A reward a student places on their locker to decorate it.
_Avoid_: Decal, badge

**Recognition**:
An exclusive sticker a teacher awards a student for a character trait (e.g. kindness, perseverance, leadership), one design per trait. Only teachers can give it, games never do, and it doesn't count toward the weekly cap.
_Avoid_: Badge, award (as a separate term), teacher reward
