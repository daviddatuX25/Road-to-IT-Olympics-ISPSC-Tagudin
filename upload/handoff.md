# Engineering Handoff — Road to IT Olympics Platform

**Audience:** whoever is actually building this.
**Status:** pre-build. Nothing here is sacred except where marked 🔒 — everything else is a judgment call you should feel free to override if you have a better read on the real constraints than I do.
**What this consolidates:** the original concept doc (the why, the roles, the calendar, the six domains' practice mechanics) and the v2 architecture pass (offline-first PWA, self-hosted Supabase, streak logic, theming). This doc merges both, fills in the gaps that show up once you try to actually build the thing, and is explicit about which decisions are made vs. still open.

---

## 1. The one rule everything else has to answer to

The system exists to solve one specific trust problem: self-reported AI practice data is useful as a coaching signal but cannot be trusted enough to decide who represents the school. The concept doc's answer is structural — practice stays low-stakes, selection happens at a proctored mock under real contest conditions, and the first only ever *informs* the second, never substitutes for it.

That's not just a product principle, it needs to be a database property. Every technical decision below should get checked against: *does this preserve the wall between practice data and selection authority, or does it quietly let one leak into the other?* Concretely, that means proctored mock results live in their own table, structurally separate from practice submissions (§4) — not as a special milestone type, not as a join that a future "leaderboard v2" query could accidentally pull from. If that separation only exists in the UI and not in the schema, it'll get violated by accident the first time someone's in a hurry in October.

## 2. Build order, not feature list

Read literally, the two source docs describe: an offline-first PWA with an IndexedDB sync queue, self-hosted Supabase on a home server, three full theme packs, a 12-avatar progression system, Discord webhook alerting, milestone versioning, a six-domain taxonomy, and a proctoring/eligibility dashboard. Building all of it before July is probably not the right plan for a small club's actual bandwidth. Suggested sequencing, mapped to what each part of the calendar actually needs — re-sequence freely if your real constraints differ:

**Phase 0 — Foundations** *(needed before the July diagnostic week)*
- Auth + 3 roles, admin-provisioned accounts
- Domains, milestones (with the versioning/locking rule), submissions — online-only, no sync queue yet
- Guided-form submission only; skip the raw JSON paste-box for now, it's the harder path and the diagnostic week doesn't need it
- A leaderboard that's just "did they submit this week" — nothing clever yet

**Phase 1 — Core training loop** *(needed for August practice cycles)*
- Streak logic as a SQL view/function, not client-side computation (§5)
- Domain captain visibility — needs the role-scoping fix in §3 first
- JSON paste-box path, weakness-tag aggregation for instructor view
- Weekly spotlight — manual curation by a captain/instructor is fine, don't build auto-selection

**Phase 2 — Resilience** *(build once the home server has actually gone down on you a couple of times — not preemptively)*
- IndexedDB queue, sync_status, the green/yellow status dot
- Discord downtime webhook
- This is the most complex slice of the entire system, and the one that's invisible if the server happens to stay up. Don't let it gate the August launch.

**Phase 3 — Delight layer** *(anytime, fully parallelizable — good to hand off to a second contributor)*
- Theme packs, avatar picker, the Duolingo-style milestone trail, motion polish

**Phase 4 — Eligibility gate tooling** *(needed by October)*
- Captain/admin proctored-mock entry screen, final team selection view
- See §7 — the "online-only" assumption here deserves a second look

## 3. The role gap that needs closing before §4 makes sense

The concept doc's role table has three roles — Admin, Instructor, Student — but the surrounding prose leans heavily on "domain captains" who see private diagnostics and lead practice cycles per domain. Modeled as a fourth global role, this either over-grants (a Java captain can see Python diagnostics) or under-grants (captains quietly become plain students because a 4-value enum felt like overkill).

🔒 Recommend instead: keep the 3 base roles, add a join table —

```
domain_captains
  user_id    UUID  FK -> users
  domain_id  UUID  FK -> domains
  PRIMARY KEY (user_id, domain_id)
```

Captain status is then "does this row exist," checked in RLS policies, not baked into `users.role`. This also lets one student captain Java and just participate in Python, which is realistic for a club this size.

The same visibility logic applies to PII: nickname/avatar/streak are public; real name/student ID are admin+instructor only. Recommend a `public_profiles` view exposing only the public fields, with RLS locking the underlying `users` table so no API path can join its way into a real name.

## 4. Data model

Consolidated from both docs, plus two tables that the concept doc describes in prose but never actually schemas — without them, "selection is based *only* on proctored_mocks" is a sentence, not an enforceable rule.

```
users
  id            UUID PK
  role          ENUM('admin','instructor','student')
  nickname      TEXT          -- public
  real_name     TEXT          -- private: admin/instructor only
  student_id    TEXT          -- private: admin/instructor only
  avatar_id     TEXT          -- FK into fixed avatar set
  created_at    TIMESTAMPTZ

domain_captains
  user_id UUID, domain_id UUID   -- see §3

domains
  id     UUID PK
  name   TEXT   -- Database Mgmt, Java, IT Quiz Bee, Web Design, Python, Networking

milestones
  id                   UUID PK
  domain_id            UUID FK
  version              INT
  parent_milestone_id  UUID NULLABLE   -- links versions of "the same" milestone
  week_or_phase        TEXT
  mode                 ENUM('tutor','assessment','journal')
  difficulty           ENUM('easy','average','difficult')
  prompt_template      TEXT
  accepted_input_types TEXT[]          -- e.g. ['guided_form','json','screenshot']
  status               ENUM('draft','active','archived')
  is_locked            BOOLEAN         -- true once ≥1 submission exists; enforce
                                        -- at the DB/RLS level, not just the UI
  created_by           UUID FK -> users
  created_at           TIMESTAMPTZ

submissions
  id                          UUID PK
  milestone_id                UUID FK
  milestone_version            INT    -- pinned at submit time, not inferred via join
  user_id                      UUID FK
  client_submission_timestamp TIMESTAMPTZ  -- device clock; drives the streak
  server_received_timestamp   TIMESTAMPTZ  -- set by Supabase on insert; audit only
  sync_status                  ENUM('pending','synced','error')
  input_type                   ENUM('guided_form','json','screenshot')
  ai_share_link                 TEXT NULLABLE
  screenshot_path               TEXT NULLABLE   -- Supabase Storage path
  ai_score                       INT NULLABLE
  weakness_tags                 TEXT[]
  raw_payload                   JSONB           -- exact field names: still open, see §10

proctored_mocks
  id              UUID PK
  domain_id        UUID FK
  user_id          UUID FK
  pair_partner_id  UUID NULLABLE FK -> users   -- Java + Quiz Bee are pair-based
  score            NUMERIC
  entered_by       UUID FK -> users            -- captain/instructor who keyed it in
  event_date       DATE
  notes            TEXT

team_selections
  id           UUID PK
  domain_id     UUID FK
  user_id       UUID FK
  decided_by    UUID FK -> users
  decided_at    TIMESTAMPTZ
  rationale     TEXT NULLABLE   -- optional paper trail
```

Why the additions:
- **`proctored_mocks` / `team_selections`** didn't exist as schema in either source doc, only as workflow description. Giving them their own tables, structurally separate from `submissions`, is what makes §1's wall real at the database level instead of a convention someone has to remember.
- **`milestone_version` pinned on the submission row** matters specifically for the offline case: a student can queue a submission against v3 while offline; if v4 ships before they reconnect, the submission should still resolve against what they actually saw, not silently re-point at v4.
- **`is_locked` as an enforced column**, not just a UI convention — "milestones don't disappear once scored" is stated as a hard rule in the concept doc, worth having the database refuse the edit outright.

## 5. The streak engine — solid core, a few undefined edges

The lazy-evaluator approach (no cron, computed from `client_submission_timestamp` at query time) is the right call for surviving downtime gracefully. A few things need pinning down before it's actually implementable:

- **Timezone authority.** "Monday 00:00–Sunday 23:59" only means something with one fixed timezone behind it — recommend Asia/Manila, regardless of device locale, computed server-side (or in one shared utility both client and server import). A student with a misconfigured device clock shouldn't get a different week boundary than everyone else.
- **Weeks with nothing to submit.** July diagnostic week and September maintenance mode both have stretches where a domain may have no active milestone at all — September is explicitly optional-async-only. As written, "at least one submission this week" silently breaks the streak on any such week. 🎨 Recommend treating zero-active-milestone weeks as skip weeks that neither extend nor break the streak — but flag this as a real decision for whoever owns the gamification feel, since "does the streak survive September" directly affects motivation heading into the October sprint.
- **Client-clock trust.** Using the device clock is what makes a Sunday-night-bad-wifi submission count — also means a student could backdate one by changing their clock. Since this only touches a non-stakes leaderboard (per §1's own logic), severity is low. Cheap option if you want a guardrail anyway: keep `server_received_timestamp` alongside it and *flag* (don't reject) submissions where the gap is implausible, so an instructor can eyeball outliers without ever blocking a good-faith offline submission.
- **Query performance.** Fine to compute live now; write it as a SQL view or Postgres function from day one rather than pulling raw rows client-side — saves a rewrite once the submissions table has a few months of six-domain history, and keeps the private-diagnostic/public-completion split enforced at the query layer, not in app logic that someone could forget to apply.

## 6. Offline-first PWA — what it actually buys you

Worth being precise here, because "offline-first" reads like "home server downtime is now a solved problem" — it solves *temporary* downtime well. It does nothing for *permanent* data loss. If the home server's disk dies in September, the IndexedDB queues on student devices that already synced are fine, but the server holding everyone's diagnostic history for four months is still one machine with no backup story described anywhere in either source doc.

🔒 Recommend a scheduled off-box backup (nightly `pg_dump` pushed somewhere physically separate — a free-tier object store, even just a different machine) regardless of whether Phase 2 ever gets built. It's boring, it's cheap, and it's the thing that's actually catastrophic to skip.

A few implementation specifics worth deciding explicitly rather than discovering mid-build:
- Screenshots need to queue as Blobs in IndexedDB, not JSON — Dexie handles this, but retry/timeout behavior for a multi-megabyte file is genuinely different from a small JSON payload. Compress client-side before queueing, both for sync reliability and storage cost on a self-hosted instance.
- Pick a service-worker caching strategy on purpose: cache-first makes sense for milestone content (immutable once active), but the leaderboard wants to feel live, so stale-while-revalidate or network-first fits better there. These are genuinely different needs — worth not leaving implicit.
- Make "yellow" (local mode) testable in dev — a dev-only toggle to force offline mode will save you from waiting around for the actual server to misbehave.

## 7. The proctored gate — the one place "online-only" is a real risk

Worth flagging directly: the v2 doc describes the eligibility gate as strictly online, server-must-be-up — and it's also the single highest-stakes moment on the whole calendar. Everything else in this architecture exists specifically to protect against the failure mode (home server flakiness) that the most important data-entry moment of the year is explicitly *not* protected against. If the server hiccups while a captain is keying in scores in October, there's no fallback path anywhere in the design.

This probably doesn't need the same offline-PWA machinery — overkill for a once-a-month, in-person, low-data-volume event. A simple local-only entry form (or honestly a paper score sheet with a same-day re-entry window) gives this one screen the same "the server was down and it didn't matter" property the training loop already has.

## 8. Self-host vs. managed Supabase — a fork worth a deliberate sign-off

The entire sync-queue/offline layer exists because of one upstream choice: self-hosting on a home server instead of Supabase's hosted free tier. That's a reasonable choice — more control, no third party holding student data, presumably free — but it's the single decision that determines whether Phase 2 needs to exist at all. On a hosted tier, "the database might go down" mostly stops being something you design around, and a real chunk of this document's complexity disappears with it. The trade is the inverse: less control, a third party in the loop, an external dependency that's free today and might not stay that way.

If the home server is already a reliable, known part of how the club runs — sounds like it is, given the Discord-alert-on-reboot detail — self-hosting is probably right and the offline-first work earns its complexity. If this is the first time its uptime will matter to people other than whoever runs it, it's worth five minutes of conscious thought before committing to the harder path.

## 9. Security & data handling, briefly

- RLS policies need to exist for every table in §4 before this touches real student data — that's what actually enforces the public/private profile split (§3) and the locked-milestone rule (§4), not frontend convention.
- The Discord webhook URL is a secret. Server-side env var (Edge Function / cron), never in the client bundle.
- Real names and student IDs are the only genuinely sensitive PII here. The scope is small enough that this doesn't need a compliance program, but it's worth a deliberate answer to "who besides admin/instructor can ever see this, and does the client even need a path to query it at all."

## 10. Explicitly left to you

Calling these out on purpose, because the creative room matters as much as the structure:
- Theme pack execution (cyberpunk / formal / terminal) — palette's sketched, the actual implementation is yours
- Avatar art — placeholder vs. custom, the exact set of 12
- Exact field names inside `raw_payload` — both source docs already flag this as open, leave it open until the first real milestone prompts are drafted
- IndexedDB library choice (Dexie's a suggestion, not a requirement)
- Milestone trail / progression visuals
- Sync status and error-state copy/UX

## 11. A concrete place to start

If a single starting point is more useful than the phased list in §2: auth + 3 roles + `domain_captains`, the `domains`/`milestones`/`submissions` schema from §4 running online-only (no sync queue yet), and a guided-form-only submission flow for one domain, end to end. That's enough to run the July diagnostic week for real, and every later phase builds on top of it without a rewrite.
