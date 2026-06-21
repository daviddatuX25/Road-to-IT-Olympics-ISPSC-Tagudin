# The Forge
### A practice concept for the 15th IT Skills Olympics (Makati, November 2026)

*This is a working concept, not a finished spec — meant to give you, your co-leaders, and your instructor the full shape of the idea before any of it gets built. UI design is intentionally left light here since that's being worked out separately.*

"The Forge" is a placeholder name — it borrows from this year's competition theme of *forging a resilient digital future*, and from the idea that skill gets shaped under repeated, low-grade heat over months, not a single hot afternoon in November. Rename freely.

---

## Why this exists

We're sending a delegation into a field of 40–60 schools, competing across six domains: Database Management, Java Programming, IT Quiz Bee, Web Design, Python Programming, and Computer Networking. We have roughly four working months — July, August, October, and a final stretch before the November competition — to get a group of busy students from "interested" to "ready."

The hard part has never been the technical material. It's that everyone involved is also carrying a full course load, and any plan that depends on daily willpower from busy people quietly dies by week three. So the real design problem isn't "how do we teach SQL and Java" — it's "how do we make consistent practice require less effort than skipping it."

## The one rule everything else follows

Keep almost everything in this system low-stakes, except the one place that genuinely has to be high-stakes.

Concretely: a lightweight, AI-guided practice loop runs all season, tracking effort and giving students a private sense of where they stand. It does **not** decide who represents the school. That decision comes from proctored mock contests, run in the literal restricted conditions of the real event, watched live by captains or the instructor, a few weeks before November.

This single rule quietly solves a problem that would otherwise eat the whole design: cheating on a self-reported AI score. If a student inflates their own diagnostic, nothing happens — they just show up to the proctored mock underprepared and get filtered out there, where it can't be faked. The system is self-correcting. We don't need to police the practice loop; the gate at the end polices itself. That frees us to make the day-to-day experience generous and low-friction instead of locked down and suspicious.

## A week, walked through

Monday morning, a new milestone appears in the app for whichever domain a student is working on. It's not a worksheet — it's a short, engineered prompt, written ahead of time by whoever's curating that domain's curriculum, designed to be pasted straight into Claude, Gemini, or ChatGPT. Early in the season, that prompt puts the AI in tutor mode: explain, demonstrate, ask follow-up questions, no scoring attached. Later in the season, the same milestone slot switches to assessment mode — the AI is told explicitly that this is a self-assessment for a competition, given a rubric, and instructed not to hand over solutions.

The student has the conversation in their own time, sometime between Monday and Friday. When they're done, they bring back whatever the milestone asked for: a structured score in a small JSON block for assessment-mode milestones, a short written reflection for exploratory ones, or a screenshot as backup evidence either way. They paste it into a form. That's it — no retyping, no manual grading queue.

By the weekend, the leaderboard refreshes. It doesn't show AI scores — it shows who kept their streak alive and who completed the week's rep. Someone gets featured for a sharp piece of reflection or a clean solve. The AI's actual diagnostic — the score, the flagged weaknesses — stays private, visible only to the student and their domain captain, who uses it to decide what that pair should focus on next.

Multiply that by six domains and you have the season.

## The six domains, and what practice actually means for each

What "practicing Java" should mean is shaped entirely by the real contest's constraints, not by generic Java study:

- **Java Programming** — six problems (two each at Easy/10pts, Average/20pts, Difficult/30pts) in two hours, written in Notepad and compiled/run from the command line. No IDE allowed. The real skill gap isn't algorithms, it's losing the autocomplete and inline error-checking everyone's used to. Practice needs to happen in that exact restricted setup from week one, in pairs, since the contest itself is pair-based.
- **Web Design** — a single themed page built in two hours, HTML/HTML5 and CSS/CSS3 only, in Notepad++, using only assets the organizers hand over on the day. There's no time for deliberation — the practice that transfers is fast, decisive, hand-coded layout work against a brief the student has never seen before, not slow portfolio-building.
- **Database Management** — queries run through XAMPP via the command line (not a GUI tool), with results proven by screenshots pasted into a Word doc under time pressure, and winners decided by fastest correct submission. The practice gap is the raw `mysql` CLI, which almost nobody touches anymore, plus the documentation workflow itself needs timed reps, not just the SQL.
- **IT Quiz Bee** — pairs compete through an elimination round before roughly 15 schools reach a tiered final (Easy → Intermediate → Difficult). The real bottleneck is surviving the elimination round, not being brilliant in the final — so broad recall fluency matters earlier and more than deep specialization.
- **Python Programming** and **Computer Networking** — mechanics not yet in hand. Same approach applies once we get the official documents: design practice around the actual constraints (environment, time limit, individual vs. pair, what's allowed), not around generic skill-building.

## The milestone system

Curriculum lives as editable content, not hardcoded app logic — a list of milestones (domain, week, mode, the underlying prompt template) that an instructor or future club officer can add to or adjust without touching code. This matters because it means the system outlives this specific season and this specific group of leaders.

Each milestone prompt is engineered, not improvised: it states plainly that this is a self-assessment for competition prep, gives the AI a concrete rubric instead of asking for a vague score, and tells it not to hand over direct solutions — just ask probing questions and grade against the criteria. A unique session ID gets embedded in the prompt and echoed back in the result, which doesn't make cheating impossible, but does make the laziest version of it (two students submitting an identical session) trivially visible to a captain skimming submissions.

Submission format follows the milestone's nature rather than forcing everything into one shape: structured JSON with a score for assessment-mode milestones, a written reflection for exploratory ones, a screenshot as optional supporting evidence either way.

## What keeps people coming back

No grade-linked points — tying practice to academic grades creates a direct, easily-gamed incentive, and we already know our environment has students who'd find that gap fast. Motivation instead comes from:

- A visible **milestone path** per domain — a game-style trail of topics, with the periodic proctored mock contests appearing as distinct checkpoints along it, not hidden away in a separate admin process.
- A **streak-and-completion leaderboard**, public and motivational, deliberately not built on AI scores.
- A **weekly feature** spotlight — a sharp reflection, a clean solve, a strong streak — rotating who gets seen.
- **Two profiles per student**: a nickname for the public leaderboard, real name/student ID visible only to whoever handles eventual team selection.
- Real-world recognition that doesn't carry cheating risk: training certificates useful for a CV or scholarship application, a department shoutout, the framing of representing the school on an intercollegiate stage against 40+ other institutions — which, honestly, does most of the motivational work on its own.

## Two pipelines, never confused

**Training loop** (low stakes): milestone → AI-guided session → student submits → app logs a private diagnostic plus a public completion mark.

**Eligibility gate** (high stakes): proctored mock contest, in real conditions → captains and instructor decide the final pairs.

The first only ever *informs* the second. It never substitutes for it.

## Who's watching, and why that's a good thing

The natural companion to the student's milestone path is a simple aggregated view for captains and the instructor — not surveillance, just a quick read on who's stalled where, who's ready for a harder mock, who needs a nudge before a streak breaks. It's the coaching signal made visible, nothing more.

## The calendar

- **July** — diagnostic week per domain to find natural strengths, plus open trivia nights to recruit broadly and get people through the door with something low-commitment and fun.
- **August** — real practice cycles begin, captains per domain take the lead, first scrimmage under timed conditions.
- **September** (light touch, if this is exam season for us) — drop to maintenance mode: optional async milestones only, just enough to keep streaks alive without demanding much. Each milestone still includes a short callback to material from two or three weeks earlier — that spaced repetition is what prevents the forgetting that four months would otherwise risk.
- **October** — intensive sprint, full-dress mock contests in the real restricted environment, pairs finalized.
- **Final 2–3 weeks before November** — almost no new material, high-frequency mocks for speed and nerves, then an actual taper in the last few days: light review, real rest.

## Where people actually talk

Messenger (or wherever the group already checks daily) stays the announcement funnel — "this week's milestone is up." Discord, or whatever the actual hub ends up being, is where the organized work lives: guild channels per domain, pinned resources, a place captains and instructor can see in one view. We're not asking people to abandon what's comfortable; we're using it to point toward the place built for the work.

## Who runs this

- A **system admin** role (initially: us) maintaining the curriculum, prompts, and the app itself.
- **Domain captains** — one per domain ideally — running their guild's weekly drop and answering questions.
- A **faculty adviser/coach** — worth securing early. Past winning delegations consistently had a named coach providing mentorship and strategic prep; it also lends the whole effort legitimacy and a path to actual department backing.

## Still open, on purpose

- Final UI direction (being designed separately).
- Exact JSON schema and the curriculum-editor interface.
- Python and Computer Networking mechanics — need the official documents.
- Final branding/name.

## The one-line version, for when you only get one line

*A low-friction weekly practice habit, an AI-guided study loop, and a real proctored gate that decides the team — so we can show up in November having actually trained, not just hoped.*
