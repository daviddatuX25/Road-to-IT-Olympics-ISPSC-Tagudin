# Handoff Addendum — Staff-Side Candidate Evaluation & Suggested Pairings

**Relationship to handoff.md:** this is additive, not a revision. handoff.md's §1 ("the wall between practice data and selection authority"), §4 (schema), and §7 (the proctored gate) are unchanged — this addendum adds a new, staff-only layer that sits *next to* those, not on top of them. Read this alongside handoff.md, not instead of it.

---

## 0. The line this still respects

Nothing about the public-facing leaderboard changes. Students still see only streak/completion — never AI scores, never a skill ranking, never anything selection-adjacent. That was never actually in conflict with this new idea; it's a separate, parallel concern.

What *is* new: a second, **staff-only** view — call it the Leading Candidates panel — that exists purely to make the human selection call easier. The hard rule that makes this safe to add without reopening §1's conflict:

🔒 **This panel never writes to `team_selections` by itself.** It produces a recommendation a human reads. A human still has to take the separate, explicit action of creating a `team_selections` row (from handoff.md §4). No automation closes that gap, ever — not "auto-select unless overridden," not a default-checked box. The AI's read is an input to a person's decision, structurally incapable of becoming the decision itself.

If that line gets blurred later (e.g. "just auto-fill the team and let the instructor approve in bulk"), it stops being decision support and starts being the thing the proctored gate exists to prevent. Worth re-reading handoff.md §1 before changing that boundary.

## 1. What the panel actually is

Per domain, visible only to that domain's captains + the instructor + admin (same `domain_captains` scoping as handoff.md §3):

- A list of students (or, for paired domains, candidate **pairs**) with an AI-generated read on each — built from their practice history early in the season, and increasingly weighted toward proctored mock results once those exist.
- Each entry shows its **provenance** plainly: "based on practice data only" vs. "based on proctored results" vs. "combined" — so staff always know how much weight to put on it. Early-season recommendations should visually read as more tentative than post-proctored ones.
- For Java and IT Quiz Bee specifically, the panel can also surface **suggested pairings** — not just individual reads, but candidate pairs the AI thinks complement each other (e.g. one strong on syntax/speed, one strong on debugging/edge cases; or two whose journal reflections suggest they'd work well under time pressure together).

This is a coaching/decision-support tool. It is explicitly not a ranking that compiles itself into a roster.

## 2. The staff-side evaluation workflow

This mirrors the student-facing pattern from the original concept doc almost exactly — prompt out, structured result in — just flipped to the staff side:

1. A captain/instructor opens the panel for their domain and picks a student (or a candidate pair) to evaluate.
2. The app assembles an **evaluation prompt** from that student's history — submission scores, `weakness_tags`, journal reflections, consistency/streak, and proctored mock results if any exist — and presents it ready to copy.
3. Staff pastes it into Claude/ChatGPT/whatever AI tool they're using, the same way students do for practice sessions.
4. The AI comes back with a structured read — strengths, weaknesses, (for pairs) a complementarity assessment.
5. Staff pastes that result back into the app. It's stored as a new evaluation record and shows up in the panel.

This is **manually triggered, per student or pair, by a staff member** — not a background job that re-runs automatically on every new submission. Keeps it deliberate, keeps it matched to the human-in-the-loop spirit of the rest of the system, and avoids quietly running AI calls on a schedule nobody asked for.

## 3. Data model addition

```
candidate_evaluations
  id                     UUID PK
  domain_id               UUID FK
  user_id                  UUID FK                    -- the student being evaluated
  paired_with_user_id      UUID NULLABLE FK -> users   -- for Java / Quiz Bee suggested pairings
  evaluated_by              UUID FK -> users           -- captain/instructor who ran it
  evaluation_basis            ENUM('practice_only','proctored_only','combined')
  ai_summary                   TEXT                     -- human-readable read, shown in the panel
  raw_payload                   JSONB                   -- full structured AI output, for audit
  created_at                     TIMESTAMPTZ
```

A few things worth calling out:

- 🔒 **Append-only, never overwritten.** Each evaluation is a new row, not an update to an existing one. That gives you a history across the season — useful both for "did the AI's read on this student improve as practice data piled up" and, after November, "did the final pick match the AI's read, and if not, why." That second question matters precisely *because* this is new, selection-adjacent territory — you want to be able to show your work later if anyone ever asks why the team looks the way it does.
- `team_selections.rationale` (already in handoff.md §4) can reference a `candidate_evaluations.id` if staff want to cite "this is what informed the call" — but the FK relationship is optional, never required, and `team_selections` rows can exist with no evaluation behind them at all (e.g. a purely proctored-score-driven pick that didn't need AI input).
- No numeric "confidence score" field. An AI assigning itself a number on its own certainty is mostly theatre and invites false precision — staff reading a plain-language caveat in `ai_summary` ("this read is thin, only one week of data") is more honest than a 73% that means nothing. 🎨 Your call if you'd rather structure this differently.

## 4. Access control

Same approach as the rest of the system: `domain_captains` (per handoff.md §3) + instructor + admin, scoped to that domain, enforced via RLS — not a UI-only restriction. Students should have **no read path** to this table at all, not even their own row. Unlike the diagnostic data in `submissions` (which a student can see their own copy of), there's no version of this feature where a student should see their own candidate evaluation — seeing "the AI thinks you should be paired with X" before staff have actually decided anything would create exactly the kind of premature, gameable signal the whole system is built to avoid.

## 5. Open for you

- The exact evaluation prompt template — what gets pulled in, how it's worded, how much proctored data dominates once it exists
- Panel UI for pairing suggestions — side-by-side cards, a match score, a simple list — your call
- Whether `ai_summary` gets any lightweight structure (e.g. strengths/weaknesses as separate fields) or stays freeform text
- Whether evaluations get archived/hidden once a domain's `team_selections` are finalized, or stay visible as historical record indefinitely
