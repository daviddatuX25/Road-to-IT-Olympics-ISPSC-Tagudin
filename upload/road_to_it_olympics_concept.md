# Road to IT Olympics
### A practice concept for the 15th IT Skills Olympics (Makati, November 2026)

*This is a working concept, not a finished spec — meant to give you, your co-leaders, and your instructor the full shape of the idea before any of it gets built. UI design is intentionally left light here since that's being worked out separately.*

---

## Why this exists

We're sending a delegation into a field of 40–60 schools, competing across six domains: Database Management, Java Programming, IT Quiz Bee, Web Design, Python Programming, and Computer Networking. We have roughly four working months — July, August, October, and a final stretch before the November competition — to get a group of busy students from "interested" to "ready."

The hard part has never been the technical material. It's that everyone involved is also carrying a full course load, and any plan that depends on daily willpower from busy people quietly dies by week three. So the real design problem isn't "how do we teach SQL and Java" — it's "how do we make consistent practice require less effort than skipping it."

## The one rule everything else follows

Keep almost everything in this system low-stakes, except the one place that genuinely has to be high-stakes.

Concretely: a lightweight, AI-guided practice loop runs all season, tracking effort and giving students a private sense of where they stand. It does **not** decide who represents the school. That decision comes from proctored mock contests, run in the literal restricted conditions of the real event, watched live by captains or the instructor, a few weeks before November.

This single rule quietly solves a problem that would otherwise eat the whole design: cheating on a self-reported AI score. If a student inflates their own diagnostic, nothing happens — they just show up to the proctored mock underprepared and get filtered out there, where it can't be faked. The system is self-correcting. We don't need to police the practice loop; the gate at the end polices itself.

## Who uses this, and what they can do

Three roles, kept deliberately simple:

| Role | What they can do |
|---|---|
| **Admin** | Full system configuration, manages user accounts and roles, full control over the milestone pool (create, edit, archive), sees every dashboard. This is the leadership team, day one. |
| **IT instructor** | Creates and edits milestones and course topics directly — not just an observer. Monitors student and domain progress through the dashboard. Doesn't need system-level config access to do their part. |
| **Student** | Completes milestones, submits results, sees their own diagnostic history, sees the public leaderboard, picks an avatar. |

Giving the instructor real authoring rights (not just a viewing window) matters — it means coursework and competition prep can actually merge over time instead of running as two disconnected efforts.

## A week, walked through

Monday morning, a new milestone appears in the app for whichever domain a student is working on. It's not a worksheet — it's a short, engineered prompt, written ahead of time by whoever's curating that domain's curriculum, designed to be pasted straight into Claude, Gemini, or ChatGPT. Early in the season, that prompt puts the AI in tutor mode: explain, demonstrate, ask follow-up questions, no scoring attached. Later in the season, the same milestone slot switches to assessment mode — the AI is told explicitly that this is a self-assessment for a competition, given a rubric, and instructed not to hand over solutions.

The student has the conversation in their own time, sometime between Monday and Friday. When they're done, they bring the result back into the app — either through a simple guided form, or by pasting a JSON block directly if that's what the AI session produced. By the weekend, the leaderboard refreshes: not on AI scores, but on who kept their streak alive and who completed the week's rep. Someone gets featured for a sharp piece of reflection or a clean solve. The AI's actual diagnostic — score, flagged weaknesses — stays private, visible only to the student and their domain captain or instructor.

Multiply that by six domains and you have the season.

## The six domains, and what practice actually means for each

What "practicing Java" should mean is shaped entirely by the real contest's constraints, not by generic Java study:

- **Java Programming** — six problems (two each at Easy/10pts, Average/20pts, Difficult/30pts) in two hours, written in Notepad and compiled/run from the command line. No IDE allowed. Practice needs to happen in that exact restricted setup from week one, in pairs, since the contest itself is pair-based.
- **Web Design** — a single themed page built in two hours, HTML/HTML5 and CSS/CSS3 only, in Notepad++, using only assets the organizers hand over on the day. The practice that transfers is fast, decisive, hand-coded layout work against a brief the student has never seen before.
- **Database Management** — queries run through XAMPP via the command line, results proven by screenshots pasted into a Word doc under time pressure, winners decided by fastest correct submission. The practice gap is the raw `mysql` CLI, plus the documentation workflow itself needs timed reps.
- **IT Quiz Bee** — pairs compete through an elimination round before roughly 15 schools reach a tiered final (Easy → Intermediate → Difficult). The real bottleneck is surviving the elimination round, so broad recall fluency matters earlier than deep specialization.
- **Python Programming** and **Computer Networking** — mechanics not yet in hand. Same approach applies once we get the official documents.

## What keeps people coming back

No grade-linked points — tying practice to academic grades creates a direct, easily-gamed incentive. Motivation instead comes from:

- A visible **milestone path** per domain — a game-style trail of topics, with the periodic proctored mock contests appearing as distinct checkpoints along it.
- A **streak-and-completion leaderboard**, public and motivational, deliberately not built on AI scores.
- **Avatars** next to each nickname on the dashboard and leaderboard — small, low-effort personalization that gives the streak board a face instead of just a username. Start with a small fixed set to choose from; it can evolve into something tied to milestones completed later if it's worth the build effort.
- A **weekly feature** spotlight — a sharp reflection, a clean solve, a strong streak — rotating who gets seen.
- Real-world recognition without cheating risk: training certificates useful for a CV or scholarship application, a department shoutout, the framing of representing the school against 40+ other institutions.

## Two pipelines, never confused

**Training loop** (low stakes): milestone → AI-guided session → student submits → app logs a private diagnostic plus a public completion mark.

**Eligibility gate** (high stakes): proctored mock contest, in real conditions → captains and instructor decide the final pairs.

The first only ever *informs* the second. It never substitutes for it.

## The calendar

- **July** — diagnostic week per domain to find natural strengths, plus open trivia nights to recruit broadly.
- **August** — real practice cycles begin, captains per domain take the lead, first scrimmage under timed conditions.
- **September** (light touch, if this is exam season for us) — maintenance mode: optional async milestones only, just enough to keep streaks alive. Each milestone still includes a short callback to material from two or three weeks earlier — that spaced repetition is what prevents the forgetting that four months would otherwise risk.
- **October** — intensive sprint, full-dress mock contests in the real restricted environment, pairs finalized.
- **Final 2–3 weeks** — almost no new material, high-frequency mocks for speed and nerves, then an actual taper: light review, real rest.

## Where people actually talk

Discord isn't the training hub anymore — the app is. Discord becomes the social layer: group chat, casual trivia nights, banter, encouragement, the kind of camaraderie that genuinely matters for a delegation. It replaces the role Messenger would have played, since Discord just handles group conversation better. Nothing curriculum-related needs to live there — milestones, scores, and dashboards stay inside the app, where they're structured and where access can actually be controlled by role.

---

## Under the hood

### The core entities
A rough shape for the data, kept simple on purpose:

- **User** — id, role, nickname (public), real name/student ID (admin and instructor only), avatar, current streak.
- **Domain** — the six competition categories.
- **Milestone** — id, domain, week/phase, mode (tutor / assessment / journal), difficulty tier (easy / average / difficult — deliberately mirroring the actual contest's own scoring tiers), the prompt template, which input type(s) it accepts, status (draft / active / archived), version number.
- **Submission** — id, which milestone *and version* it was submitted against, student id, session id, type (json / journal / screenshot), the payload itself, score (nullable — journal-mode submissions don't have one), timestamp.
- **Streak/leaderboard record** — derived from submission *completion*, never from score.

### The rule you asked for: milestones don't disappear once they're scored
Once a milestone has at least one submission against it, it locks from edits and deletion. An instructor or captain who needs to change it creates a **new version** instead — the old version and every submission tied to it stay exactly as they were. This protects two things at once: no student's existing diagnostic history quietly vanishes, and there's a clean, auditable trail if anyone ever needs to see what a given milestone actually asked for back in week three.

### Organizing the pool as it grows
Six domains over four-plus months will produce a real volume of milestones, so the taxonomy needs to exist from day one rather than getting bolted on later: every milestone is tagged by domain, week/phase, mode, difficulty tier, and status. That's what lets the system answer "show me every active Java assessment-mode milestone for week 3" without manual sorting, and keeps two captains from accidentally building overlapping content for the same week.

### The interface, precisely: prompt out, structured result in
This is worth stating plainly so it never gets muddled while building: the app's output to the student is the engineered **prompt** — rendered and ready to copy into Claude, Gemini, or ChatGPT. Students never write that prompt themselves. What comes back into the app is the **input** — and it can arrive either way:
- a guided form with separate fields (score, weaknesses, confidence) that the app assembles into the stored record automatically, for students who'd rather not handle raw JSON, or
- a direct JSON paste-box, for milestones where the AI session reliably hands back clean structured output already.

Both land in the same submission record underneath. The student doesn't need to know or care which path they used.

### A stack that fits a small club's bandwidth
Nothing here needs to be enterprise-grade. A single web app (something like React/Next.js) paired with a managed backend (Supabase or Firebase-style) covers authentication with role-based access, the milestone/submission database, and file storage for the optional screenshots — without needing to run or maintain your own server. It's also realistic to vibe-code incrementally, domain by domain, rather than needing the whole thing built before anyone can use it.

## Still open, on purpose

- Final UI direction (being designed separately).
- Avatar set — placeholder art vs. something custom.
- Exact JSON schema field names, finalized once the first real milestone prompts are drafted.
- Python and Computer Networking mechanics — need the official documents.

## The one-line version, for when you only get one line

*A low-friction weekly practice habit, an AI-guided study loop, and a real proctored gate that decides the team — so we can show up in November having actually trained, not just hoped.*
