// Seed the database with a realistic in-season state.
// Run with: bun run /home/z/my-project/scripts/seed.ts
//
// Creates:
//  - 6 domains
//  - 1 admin + 1 instructor + 8 students (4 of them domain captains)
//  - Captains per domain
//  - Milestones across multiple domains/weeks/phases/modes/difficulties
//  - Submissions (some students practicing, some not — leaderboard has variety)
//  - 1 proctored mock (so the eligibility gate screen has data)
//  - 1 team selection (Java pair already picked)
//  - 1 weekly spotlight
//  - A handful of app events

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Precomputed scrypt hash for password "olypmics2026" (format: scrypt$<salt-b64>$<hash-b64>).
// Inlined so the seed can run inside the runtime container, where the compiled
// standalone build has no `src/` tree to import `hashPassword` from.
const passwordHash =
  'scrypt$dYzmcS7GHuc+iWlll4wARA==$itpkznSobeC1nABRWQ2Xj6iimHZwLtM/zDxfS2OMXI0='

async function main() {
  console.log('Seeding…')

  const admin = await db.user.create({
    data: {
      email: 'admin@ito.test',
      passwordHash,
      role: 'admin',
      nickname: 'Capt. Mara',
      realName: 'Mara Santos',
      studentId: 'ADMIN-001',
      avatarId: 'avatar-09',
    },
  })

  const instructor = await db.user.create({
    data: {
      email: 'instructor@ito.test',
      passwordHash,
      role: 'instructor',
      nickname: 'Prof. Reyes',
      realName: 'Engr. Jaime Reyes',
      studentId: 'FAC-001',
      avatarId: 'avatar-03',
    },
  })

  const students = await Promise.all([
    db.user.create({ data: { email: 'lia@ito.test',    passwordHash, role: 'student', nickname: 'lia.exe',    realName: 'Alia Cruz',     studentId: '2024-001', avatarId: 'avatar-01' } }),
    db.user.create({ data: { email: 'mark@ito.test',   passwordHash, role: 'student', nickname: 'markbyte',   realName: 'Mark Villanueva', studentId: '2024-002', avatarId: 'avatar-05' } }),
    db.user.create({ data: { email: 'tasha@ito.test',  passwordHash, role: 'student', nickname: 'tashadb',    realName: 'Tasha Lim',     studentId: '2024-003', avatarId: 'avatar-08' } }),
    db.user.create({ data: { email: 'jico@ito.test',   passwordHash, role: 'student', nickname: 'jico.bin',   realName: 'Jico Reyes',    studentId: '2024-004', avatarId: 'avatar-06' } }),
    db.user.create({ data: { email: 'pia@ito.test',    passwordHash, role: 'student', nickname: 'pia.css',    realName: 'Pia Gutierrez', studentId: '2024-005', avatarId: 'avatar-04' } }),
    db.user.create({ data: { email: 'rico@ito.test',   passwordHash, role: 'student', nickname: 'rico_byte',  realName: 'Rico Mendoza',  studentId: '2024-006', avatarId: 'avatar-02' } }),
    db.user.create({ data: { email: 'gina@ito.test',   passwordHash, role: 'student', nickname: 'gina.dev',   realName: 'Gina Aquino',   studentId: '2024-007', avatarId: 'avatar-12' } }),
    db.user.create({ data: { email: 'noel@ito.test',   passwordHash, role: 'student', nickname: 'noel.net',   realName: 'Noel Dela Cruz',studentId: '2024-008', avatarId: 'avatar-10' } }),
  ])

  const [lia, mark, tasha, jico, pia, rico, gina, noel] = students

  // --- Domains --------------------------------------------------------------
  const domains = await Promise.all([
    db.domain.create({ data: { key: 'db',     name: 'Database Management', description: 'SQL fluency under time pressure, mysql CLI via XAMPP.', color: '#0ea5e9', icon: 'Database' } }),
    db.domain.create({ data: { key: 'java',   name: 'Java Programming',    description: '6 problems in 2 hours. Notepad + CLI only. Pair-based.', color: '#ea580c', icon: 'Code2' } }),
    db.domain.create({ data: { key: 'quiz',   name: 'IT Quiz Bee',         description: 'Elimination round → tiered final. Broad recall fluency.', color: '#8b5cf6', icon: 'Brain' } }),
    db.domain.create({ data: { key: 'web',    name: 'Web Design',          description: 'Single themed page in 2 hours. HTML/CSS only, Notepad++.', color: '#ec4899', icon: 'Globe' } }),
    db.domain.create({ data: { key: 'python', name: 'Python Programming',  description: 'Mechanics TBD — pending official documents.', color: '#16a34a', icon: 'Terminal' } }),
    db.domain.create({ data: { key: 'net',    name: 'Computer Networking', description: 'Mechanics TBD — pending official documents.', color: '#f59e0b', icon: 'Network' } }),
  ])
  const [dbDom, javaDom, quizDom, webDom, pyDom, netDom] = domains

  // --- Captains -------------------------------------------------------------
  // Each domain gets one captain from the student body.
  await db.domainCaptain.create({ data: { user: { connect: { id: tasha.id } }, domain: { connect: { id: dbDom.id } } } })
  await db.domainCaptain.create({ data: { user: { connect: { id: lia.id } },   domain: { connect: { id: javaDom.id } } } })
  await db.domainCaptain.create({ data: { user: { connect: { id: jico.id } },  domain: { connect: { id: quizDom.id } } } })
  await db.domainCaptain.create({ data: { user: { connect: { id: pia.id } },   domain: { connect: { id: webDom.id } } } })
  await db.domainCaptain.create({ data: { user: { connect: { id: gina.id } },  domain: { connect: { id: pyDom.id } } } })
  await db.domainCaptain.create({ data: { user: { connect: { id: noel.id } },  domain: { connect: { id: netDom.id } } } })

  // --- Milestones -----------------------------------------------------------
  // We'll seed an active season: late August, so Aug W1-W3 have published
  // milestones and some have submissions.

  const now = Date.now()
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000)

  async function milestone(data: {
    domainId: string
    weekOrPhase: string
    mode: string
    difficulty: string
    title: string
    promptTemplate: string
    acceptedInputTypes: string
    status?: string
    createdById: string
    createdAt: Date
  }) {
    return db.milestone.create({
      data: {
        domain: { connect: { id: data.domainId } },
        weekOrPhase: data.weekOrPhase,
        mode: data.mode,
        difficulty: data.difficulty,
        title: data.title,
        promptTemplate: data.promptTemplate,
        acceptedInputTypes: data.acceptedInputTypes,
        status: data.status ?? 'active',
        creator: { connect: { id: data.createdById } },
        createdAt: data.createdAt,
      },
    })
  }

  // --- Java milestones (lia is captain) ------------------------------------
  const javaAug1Tutor = await milestone({
    domainId: javaDom.id, weekOrPhase: 'aug-w1', mode: 'tutor', difficulty: 'easy',
    title: 'Java · Week 1 · Loops & Conditionals',
    promptTemplate: `You are a Java tutor helping me prepare for the 15th IT Skills Olympics.

I'm a beginner working in Notepad + javac only (no IDE — that's the contest format).

Today's topic: for-loops, while-loops, and if/else conditionals.

Walk me through 3 small problems, one at a time. For each:
1. State the problem.
2. Ask me to write the solution in Notepad and compile it.
3. When I paste my code, give me specific feedback — but DO NOT just hand me the answer.
4. After I get it working, ask one follow-up that pushes me slightly beyond what I just did.

Topics to cover:
- Counting even numbers from 1 to N
- Finding the largest of three integers (no Math.max)
- Printing a right triangle of asterisks

End the session by asking me to write a 1-2 sentence reflection on which problem felt hardest and why.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: lia.id, createdAt: daysAgo(28),
  })

  const javaAug2Tutor = await milestone({
    domainId: javaDom.id, weekOrPhase: 'aug-w2', mode: 'tutor', difficulty: 'easy',
    title: 'Java · Week 2 · Arrays & String Basics',
    promptTemplate: `You are my Java tutor. Same rules as last week: Notepad + javac only, ask me to write code first, don't hand me answers.

Today's topic: arrays and String methods.

Problems:
1. Read 5 integers, print them in reverse.
2. Count how many times the letter 'a' appears in a String (no loops allowed — use charAt? no, use a method).
3. Reverse a String without using StringBuilder.reverse().

After each problem, ask me a "what if" question. End with a reflection prompt.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: lia.id, createdAt: daysAgo(21),
  })

  const javaAug3Assess = await milestone({
    domainId: javaDom.id, weekOrPhase: 'aug-w3', mode: 'assessment', difficulty: 'average',
    title: 'Java · Week 3 · Self-Assessment (Easy/Average tier)',
    promptTemplate: `You are now in ASSESSMENT MODE for my IT Skills Olympics preparation.

CRITICAL RULES:
- Do NOT give me the solution to any problem, even if I ask.
- Do NOT write code for me, even partial code.
- Pose one problem at a time, wait for my answer, then evaluate it against a 10-point rubric:
  - Correctness (4 pts): does it compile and produce the right output?
  - Efficiency (2 pts): reasonable time/space complexity for the problem tier?
  - Code clarity (2 pts): readable, sensibly named, no dead code?
  - Edge cases (2 pts): handles empty input, negative numbers, max int, etc.

Problems (Easy tier, 10 pts each in the real contest):
1. Given an integer N, print the sum of all even numbers from 1 to N.
2. Given a String, determine if it is a palindrome (case-insensitive, ignore spaces).

After I attempt both, give me:
- A score out of 20
- 2-3 weakness tags (short phrases like "off-by-one errors", "string immutability")
- A confidence prompt: ask me how confident I feel about the August scrimmage (1-5)

Do not break character. Do not reveal solutions even after the assessment is over.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: lia.id, createdAt: daysAgo(14),
  })

  const javaAug4Difficult = await milestone({
    domainId: javaDom.id, weekOrPhase: 'aug-w4', mode: 'assessment', difficulty: 'difficult',
    title: 'Java · Week 4 · Difficult Tier Mock',
    promptTemplate: `Assessment mode. Same rules as Week 3 — no solutions, score against rubric.

This week is a single difficult-tier problem (30 pts in the contest):

Given a string S containing only lowercase letters, find the length of the longest substring in which every character appears an even number of times. If no such substring exists, return 0.

Constraints: |S| ≤ 1000. Time limit: 2 seconds.

Score me on:
- Correctness (4), Efficiency (4 — bitmask expected for O(N)), Clarity (1), Edge cases (1)
Total 10.

After scoring, give me weakness tags and a confidence prompt.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: lia.id, createdAt: daysAgo(7),
  })

  // --- DB milestones (tasha is captain) ------------------------------------
  const dbAug1Tutor = await milestone({
    domainId: dbDom.id, weekOrPhase: 'aug-w1', mode: 'tutor', difficulty: 'easy',
    title: 'DB · Week 1 · SELECT & WHERE basics',
    promptTemplate: `You are my SQL tutor for IT Skills Olympics DB Management prep.

CRITICAL: I will be using the mysql CLI through XAMPP — no GUI. Help me build muscle memory for typing queries by hand.

Today: SELECT, WHERE, ORDER BY, LIMIT.

Walk me through:
1. SELECT * FROM employees WHERE department = 'IT' ORDER BY salary DESC LIMIT 5
2. Ask me to write a query that finds all employees hired after 2020 in the Sales dept, ordered by name.
3. Don't run my queries for me — make me type them and reason about the output.

End with: ask me to take a screenshot of my CLI showing the query and result. I'll paste that as my submission.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: tasha.id, createdAt: daysAgo(28),
  })

  const dbAug2Tutor = await milestone({
    domainId: dbDom.id, weekOrPhase: 'aug-w2', mode: 'tutor', difficulty: 'average',
    title: 'DB · Week 2 · JOINs',
    promptTemplate: `SQL tutor mode. mysql CLI only.

Today: INNER JOIN, LEFT JOIN, GROUP BY, HAVING.

Walk me through:
1. INNER JOIN between employees and departments.
2. Ask me to write: list departments with more than 5 employees, showing dept name and count.
3. Then: LEFT JOIN — find employees with no department assigned.

After each, ask me a follow-up. End with reflection.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: tasha.id, createdAt: daysAgo(21),
  })

  const dbAug3Assess = await milestone({
    domainId: dbDom.id, weekOrPhase: 'aug-w3', mode: 'assessment', difficulty: 'average',
    title: 'DB · Week 3 · Self-Assessment',
    promptTemplate: `ASSESSMENT MODE — DB Management.

Do NOT run queries for me. Do NOT write the final SQL for me.

Pose 3 queries, one at a time. Wait for my SQL. Score each out of 10:
- Correctness (5): would it produce the right result on a real schema?
- Syntax (3): valid mysql CLI syntax?
- Documentation (2): did I describe what the query does in plain English?

Problems:
1. Find the top 3 customers by total order amount in 2024.
2. List products that have never been ordered.
3. Calculate the average salary per department, exclude departments with < 2 employees.

After all 3: give me a score /30, weakness tags, and a confidence prompt (1-5).

I will screenshot my mysql CLI session for the submission — describe what to capture.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: tasha.id, createdAt: daysAgo(14),
  })

  // --- Web Design milestones (pia is captain) ------------------------------
  const webAug1Tutor = await milestone({
    domainId: webDom.id, weekOrPhase: 'aug-w1', mode: 'tutor', difficulty: 'easy',
    title: 'Web · Week 1 · Layout Fundamentals (No Framework)',
    promptTemplate: `You are my Web Design tutor for IT Skills Olympics prep.

CRITICAL CONSTRAINTS (contest rules):
- HTML/HTML5 + CSS/CSS3 only. No JavaScript. No frameworks. No preprocessors.
- Notepad++ is the only editor allowed.
- Assets are handed over on the day — I can't bring my own.

Today: build a one-page "About Me" layout in 30 minutes.
- Header with name + tagline
- Two-column main content (sidebar + content)
- Footer with contact info

Walk me through the structure first (semantic HTML), then the CSS (flexbox or grid — your call).

After I write it, give feedback on:
- Did I use semantic tags (header, main, aside, footer)?
- Is the CSS reasonable, or am I overusing absolute positioning?
- Does it actually render in a browser? (I'll tell you.)

End with reflection: what's the one thing I'd change about my CSS approach?`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: pia.id, createdAt: daysAgo(28),
  })

  const webAug2Tutor = await milestone({
    domainId: webDom.id, weekOrPhase: 'aug-w2', mode: 'tutor', difficulty: 'average',
    title: 'Web · Week 2 · Responsive Without Media Queries',
    promptTemplate: `Web Design tutor mode. HTML + CSS only, Notepad++ only.

Today's challenge: build a responsive card grid that reflows from 3 columns to 1 column on narrow screens, WITHOUT using media queries. (Hint: CSS grid auto-fill + minmax, or flexbox + flex-wrap.)

Walk me through the approach. Pose the problem. Don't write the full CSS for me — let me write it, then critique.

End with: ask me to take a screenshot of the result at 1200px wide and at 600px wide. I'll paste those.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: pia.id, createdAt: daysAgo(21),
  })

  const webAug3Assess = await milestone({
    domainId: webDom.id, weekOrPhase: 'aug-w3', mode: 'assessment', difficulty: 'average',
    title: 'Web · Week 3 · Self-Assessment (Themed Page)',
    promptTemplate: `ASSESSMENT MODE — Web Design.

THEME: "Local Coffee Shop Landing Page"

You will hand me a brief (below). I have 2 hours — but for this self-assessment, limit myself to 45 minutes.

BRIEF:
- Hero section with shop name "Kape Pilipinas" + tagline + background image (use placeholder).
- Menu section with 6 items (name, description, price).
- Location section with address + hours table.
- Footer with social links (text only, no JS).

Rules: HTML5 + CSS3 only, no JS, no frameworks.

Do NOT write code for me. After I submit my HTML/CSS, score out of 30:
- Layout fidelity to brief (10)
- CSS quality (10 — no inline styles, semantic classes, no div soup)
- Responsive behavior (5 — works on mobile)
- Code cleanliness (5 — indentation, comments where needed)

Give weakness tags + confidence prompt (1-5).

I will paste my full HTML and CSS as the submission.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: pia.id, createdAt: daysAgo(14),
  })

  // --- Quiz Bee milestones (jico is captain) -------------------------------
  const quizAug1Journal = await milestone({
    domainId: quizDom.id, weekOrPhase: 'aug-w1', mode: 'journal', difficulty: 'easy',
    title: 'Quiz · Week 1 · Broad Recall Inventory',
    promptTemplate: `This is a JOURNAL entry for IT Quiz Bee.

Goal: identify what you already know and where your gaps are.

Open the journal prompt and write 200-400 words covering:
1. Which IT topics do you feel strong in right now? (hardware, networking basics, history of computing, web technologies, programming languages, databases, security basics, etc.)
2. Which topics make you freeze when asked about them?
3. Were there any quiz bee questions you remember hearing that you couldn't answer? What were they?
4. What's your plan this week to plug one specific gap?

No AI scoring — this is reflection only. Captains will read it to plan future sessions.`,
    acceptedInputTypes: '["guided_form"]',
    createdById: jico.id, createdAt: daysAgo(28),
  })

  const quizAug2Tutor = await milestone({
    domainId: quizDom.id, weekOrPhase: 'aug-w2', mode: 'tutor', difficulty: 'easy',
    title: 'Quiz · Week 2 · Hardware & History Rapid Fire',
    promptTemplate: `You are my Quiz Bee practice partner.

Format: rapid-fire. Ask me 10 questions, one at a time, on IT history and computer hardware basics. Wait for my answer after each. Give me the correct answer + a one-sentence context note.

Difficulty: Easy tier (the kind that survive elimination rounds).

Topics to draw from:
- Generations of computers (vacuum tube → transistor → IC → microprocessor)
- Key inventors (Turing, von Neumann, Babbage, Lovelace, Berners-Lee)
- Common hardware components and their roles
- Number systems (binary, hex, decimal conversions)

After 10 questions, give me a tally and ask: which topic felt weakest? End with reflection.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: jico.id, createdAt: daysAgo(21),
  })

  const quizAug3Assess = await milestone({
    domainId: quizDom.id, weekOrPhase: 'aug-w3', mode: 'assessment', difficulty: 'average',
    title: 'Quiz · Week 3 · Self-Assessment (Intermediate tier)',
    promptTemplate: `ASSESSMENT MODE — IT Quiz Bee.

Intermediate tier questions. Pose 15 questions, one at a time. Wait for my answer. Mark each as right/wrong. Don't reveal the correct answer until after I respond.

Topics:
- Networking (OSI layers, TCP vs UDP, common ports)
- Database concepts (ACID, normalization, indexes)
- Web protocols (HTTP methods, status codes, DNS)
- Security basics (symmetric vs asymmetric, hashing, common attacks)

After 15: score /15, weakness tags by topic area, confidence prompt (1-5) for the August scrimmage.`,
    acceptedInputTypes: '["guided_form","json"]',
    createdById: jico.id, createdAt: daysAgo(14),
  })

  // --- Python (gina is captain) — only journal/tutor for now, mechanics TBD
  const pyAug1Journal = await milestone({
    domainId: pyDom.id, weekOrPhase: 'aug-w1', mode: 'journal', difficulty: 'easy',
    title: 'Python · Week 1 · Inventory & Goals',
    promptTemplate: `JOURNAL entry for Python Programming.

Note: official Python contest mechanics are still TBD. While we wait, this journal helps captains plan.

Write 150-300 words on:
1. What's your Python background? (none / some scripts / comfortable)
2. Which standard library modules have you used? (os, sys, json, re, datetime, collections, etc.)
3. What's harder for you: algorithmic thinking, or Python idioms?
4. One specific thing you want to be able to do by October.`,
    acceptedInputTypes: '["guided_form"]',
    createdById: gina.id, createdAt: daysAgo(28),
  })

  // --- Net (noel is captain) — journal only, mechanics TBD -----------------
  const netAug1Journal = await milestone({
    domainId: netDom.id, weekOrPhase: 'aug-w1', mode: 'journal', difficulty: 'easy',
    title: 'Networking · Week 1 · Background Inventory',
    promptTemplate: `JOURNAL entry for Computer Networking.

Note: official contest mechanics still TBD. This journal helps the captain plan.

Write 150-300 words on:
1. Have you configured a router or switch before? (home lab, packet tracer, etc.)
2. Which subnetting concepts are clear vs fuzzy?
3. Have you ever crimped a cable? Troubleshoot a real network issue?
4. One specific topic you'd like to drill by October.`,
    acceptedInputTypes: '["guided_form"]',
    createdById: noel.id, createdAt: daysAgo(28),
  })

  // --- Submissions ----------------------------------------------------------
  // Spread across the past 3 weeks. Some students streak, some miss weeks.
  async function submit(data: {
    milestoneId: string
    userId: string
    daysAgo: number
    inputType: string
    aiScore?: number
    confidence?: number
    weaknessTags?: string[]
    reflection?: string
    rawPayload?: Record<string, unknown>
    aiShareLink?: string
  }) {
    const milestone = await db.milestone.findUnique({ where: { id: data.milestoneId } })
    if (!milestone) throw new Error('milestone missing')
    await db.submission.create({
      data: {
        milestone: { connect: { id: data.milestoneId } },
        milestoneVersion: milestone.version,
        user: { connect: { id: data.userId } },
        clientSubmissionTimestamp: daysAgo(data.daysAgo),
        serverReceivedTimestamp: daysAgo(data.daysAgo),
        syncStatus: 'synced',
        inputType: data.inputType,
        aiShareLink: data.aiShareLink ?? null,
        aiScore: data.aiScore ?? null,
        confidence: data.confidence ?? null,
        weaknessTags: JSON.stringify(data.weaknessTags ?? []),
        reflection: data.reflection ?? null,
        rawPayload: JSON.stringify(data.rawPayload ?? {}),
      },
    })
  }

  // lia streaks Java every week (4-week streak, includes this week)
  await submit({ milestoneId: javaAug1Tutor.id, userId: lia.id, daysAgo: 26, inputType: 'guided_form', aiScore: 8, confidence: 4, weaknessTags: ['off-by-one', 'naming'], reflection: 'For loops clicked once I drew the iteration table.' })
  await submit({ milestoneId: javaAug2Tutor.id, userId: lia.id, daysAgo: 19, inputType: 'guided_form', aiScore: 9, confidence: 4, weaknessTags: ['string-methods'], reflection: 'charAt vs toCharArray — I keep mixing them up.' })
  await submit({ milestoneId: javaAug3Assess.id, userId: lia.id, daysAgo: 12, inputType: 'guided_form', aiScore: 16, confidence: 3, weaknessTags: ['edge-cases', 'palindrome-edge'], reflection: 'Palindrome case-insensitivity caught me.' })
  await submit({ milestoneId: javaAug4Difficult.id, userId: lia.id, daysAgo: 4, inputType: 'guided_form', aiScore: 7, confidence: 2, weaknessTags: ['bitmask', 'time-complexity'], reflection: 'Bitmask DP — I knew the concept but fumbled the implementation.' })

  // mark streaks Java every week too (pairs with lia) — 3-week streak ending last week
  await submit({ milestoneId: javaAug1Tutor.id, userId: mark.id, daysAgo: 20, inputType: 'json', aiScore: 7, confidence: 3, weaknessTags: ['syntax'] })
  await submit({ milestoneId: javaAug2Tutor.id, userId: mark.id, daysAgo: 13, inputType: 'json', aiScore: 8, confidence: 3, weaknessTags: ['arrays'] })
  await submit({ milestoneId: javaAug3Assess.id, userId: mark.id, daysAgo: 6, inputType: 'json', aiScore: 14, confidence: 3, weaknessTags: ['edge-cases'] })

  // tasha streaks DB — 3-week streak ending last week
  await submit({ milestoneId: dbAug1Tutor.id, userId: tasha.id, daysAgo: 20, inputType: 'guided_form', aiScore: 9, confidence: 4, weaknessTags: ['cli-typo'], reflection: 'CLI muscle memory coming along.' })
  await submit({ milestoneId: dbAug2Tutor.id, userId: tasha.id, daysAgo: 13, inputType: 'guided_form', aiScore: 8, confidence: 4, weaknessTags: ['left-join-nulls'], reflection: 'LEFT JOIN behavior on nulls finally clicked.' })
  await submit({ milestoneId: dbAug3Assess.id, userId: tasha.id, daysAgo: 6, inputType: 'guided_form', aiScore: 24, confidence: 4, weaknessTags: ['group-by-order'] })

  // tasha also does Java (she's not captain there but participating) — earlier in the season
  await submit({ milestoneId: javaAug1Tutor.id, userId: tasha.id, daysAgo: 26, inputType: 'guided_form', aiScore: 6, confidence: 2, weaknessTags: ['java-syntax'] })

  // pia streaks Web — 3-week streak ending last week
  await submit({ milestoneId: webAug1Tutor.id, userId: pia.id, daysAgo: 20, inputType: 'guided_form', aiScore: 9, confidence: 4, weaknessTags: ['semantic-tags'] })
  await submit({ milestoneId: webAug2Tutor.id, userId: pia.id, daysAgo: 13, inputType: 'guided_form', aiScore: 8, confidence: 4, weaknessTags: ['minmax-syntax'] })
  await submit({ milestoneId: webAug3Assess.id, userId: pia.id, daysAgo: 6, inputType: 'guided_form', aiScore: 24, confidence: 4, weaknessTags: ['card-spacing'] })

  // jico streaks Quiz — 3-week streak ending last week
  await submit({ milestoneId: quizAug1Journal.id, userId: jico.id, daysAgo: 20, inputType: 'guided_form', reflection: 'Strong on hardware history, fuzzy on networking. Plan: drill OSI layers.' })
  await submit({ milestoneId: quizAug2Tutor.id, userId: jico.id, daysAgo: 13, inputType: 'guided_form', aiScore: 8, confidence: 3, weaknessTags: ['von-neumann-vs-harvard'] })
  await submit({ milestoneId: quizAug3Assess.id, userId: jico.id, daysAgo: 6, inputType: 'guided_form', aiScore: 11, confidence: 3, weaknessTags: ['ports', 'subnetting'] })

  // gina, noel — only one submission each (Python/Net journals), early in the season
  await submit({ milestoneId: pyAug1Journal.id, userId: gina.id, daysAgo: 25, inputType: 'guided_form', reflection: 'Done some scripting. Want to master collections by October.' })
  await submit({ milestoneId: netAug1Journal.id, userId: noel.id, daysAgo: 25, inputType: 'guided_form', reflection: 'Packet tracer labs in HS. Subnetting /24-/28 mostly clear, /29 fuzzy.' })

  // rico — did Aug W1 only, missed since (lapsed student)
  await submit({ milestoneId: javaAug1Tutor.id, userId: rico.id, daysAgo: 26, inputType: 'guided_form', aiScore: 5, confidence: 2, weaknessTags: ['syntax', 'naming'] })

  // --- Proctored mocks (August scrimmage, week 3) --------------------------
  const augScrimmageDate = daysAgo(10)
  await db.proctoredMock.create({ data: { domain: { connect: { id: javaDom.id } }, user: { connect: { id: lia.id } },  partner: { connect: { id: mark.id } }, score: 50, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Clean solve on easy + average. Bitmask problem stumped them.' } })
  await db.proctoredMock.create({ data: { domain: { connect: { id: javaDom.id } }, user: { connect: { id: mark.id } }, partner: { connect: { id: lia.id } },  score: 50, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Same pair as lia.' } })
  await db.proctoredMock.create({ data: { domain: { connect: { id: dbDom.id } },   user: { connect: { id: tasha.id } },                                                score: 70, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Fastest correct in the room. One screenshot failed — would have placed in real contest.' } })
  await db.proctoredMock.create({ data: { domain: { connect: { id: webDom.id } },  user: { connect: { id: pia.id } },                                                score: 78, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Strong layout, weak responsive — would lose points on mobile in real contest.' } })
  await db.proctoredMock.create({ data: { domain: { connect: { id: quizDom.id } }, user: { connect: { id: jico.id } },  partner: { connect: { id: rico.id } },  score: 11, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Survived elimination — that was the goal. Intermediate tier got them.' } })
  await db.proctoredMock.create({ data: { domain: { connect: { id: quizDom.id } }, user: { connect: { id: rico.id } },  partner: { connect: { id: jico.id } },  score: 11, enteredBy: { connect: { id: instructor.id } }, eventDate: augScrimmageDate, notes: 'Same pair as jico.' } })

  // --- Team selection (Java pair locked in early based on scrimmage) --------
  await db.teamSelection.create({ data: { domain: { connect: { id: javaDom.id } }, user: { connect: { id: lia.id } },  decidedBy: { connect: { id: admin.id } }, rationale: 'Highest scrimmage score + longest streak. Locking in early.' } })
  await db.teamSelection.create({ data: { domain: { connect: { id: javaDom.id } }, user: { connect: { id: mark.id } }, decidedBy: { connect: { id: admin.id } }, rationale: 'Pair partner to lia. Same scrimmage result.' } })

  // --- Weekly spotlight -----------------------------------------------------
  const thisWeek = new Date(now)
  thisWeek.setHours(0, 0, 0, 0)
  thisWeek.setDate(thisWeek.getDate() - ((thisWeek.getDay() + 6) % 7))
  await db.weeklySpotlight.create({ data: { user: { connect: { id: lia.id } }, weekOf: thisWeek, reason: 'streak', blurb: '4-week Java streak, kept it alive even on the week she was sick. Discipline over talent.' } })

  // --- App events -----------------------------------------------------------
  await db.appEvent.create({ data: { kind: 'milestone-published', title: 'Java · Week 4 · Difficult Tier Mock published', detail: 'lia.exe published a new assessment milestone', createdAt: daysAgo(7) } })
  await db.appEvent.create({ data: { kind: 'mock-graded',         title: 'August scrimmage results entered',                detail: '6 proctored mock scores recorded by Prof. Reyes', createdAt: daysAgo(10) } })
  await db.appEvent.create({ data: { kind: 'team-selected',       title: 'Java pair finalized',                            detail: 'lia.exe + markbyte selected by Capt. Mara', createdAt: daysAgo(9) } })
  await db.appEvent.create({ data: { kind: 'spotlight',           title: "This week's spotlight: lia.exe",                detail: '4-week Java streak', createdAt: daysAgo(1) } })

  // --- Candidate evaluations (staff-only, from handoff_added.md) ------------
  // Seed a couple of evaluations so the Leading Candidates panel has data to show.
  await db.candidateEvaluation.create({
    data: {
      domain: { connect: { id: javaDom.id } },
      user: { connect: { id: lia.id } },
      pairedWith: { connect: { id: mark.id } },
      evaluatedBy_: { connect: { id: instructor.id } },
      evaluationBasis: 'combined',
      aiSummary: 'lia + mark form a strong pair. lia is the stronger syntactically (consistent 7-9 across assessments) and has the longest streak on the team. mark complements with steady edge-case work. Both struggled with the bitmask difficult-tier problem in W4.',
      strengths: JSON.stringify(['consistent weekly practice (4-week streak)', 'clean readable code', 'strong on easy + average tier problems']),
      weaknesses: JSON.stringify(['bitmask DP not intuitive yet', 'palindrome edge cases', 'low confidence under difficult-tier time pressure']),
      complementarity: 'Strong complementarity — lia leads on syntax/speed, mark catches edge cases. Their one shared weakness (bitmask DP) is a real risk for the difficult tier in November.',
      roleAssignment: 'A (lia.exe) handles Easy-tier problems first — she is consistently faster on syntax-heavy solves (8-9 avg on easy tier). B (markbyte) takes Average-tier and serves as the debug partner on Difficult — his edge-case catching is stronger (caught the palindrome case-insensitivity issue lia missed). For the 2-hour contest: lia starts on problem 1 (easy) while mark reads problems 4-6 (difficult) and plans the approach. They reconvene on problem 3 (average) together.',
      recommendation: 'Lock them in as the Java pair. Drill bitmask problems through September. If you have time for one more mock before October, give them a difficult-tier problem under timed conditions to test the nerves.',
      rawPayload: JSON.stringify({ source: 'seed', basis: 'combined' }),
      createdAt: daysAgo(8),
    },
  })

  await db.candidateEvaluation.create({
    data: {
      domain: { connect: { id: javaDom.id } },
      user: { connect: { id: lia.id } },
      evaluatedBy_: { connect: { id: lia.id } }, // self-eval by captain (unusual but valid for the demo)
      evaluationBasis: 'practice_only',
      aiSummary: 'Early-season read on lia as solo candidate. Strong tutor-mode performance (8-9 average) but no proctored data yet. The difficult-tier assessment in W4 dropped to 7 — flag for follow-up.',
      strengths: JSON.stringify(['fast on easy tier', 'clean code style', 'good reflection quality']),
      weaknesses: JSON.stringify(['difficult-tier dropoff', 'bitmask intuition not yet there']),
      recommendation: 'Too early to lock in for solo Java if the contest format allowed it — keep watching the difficult-tier trend through August.',
      rawPayload: JSON.stringify({ source: 'seed', basis: 'practice_only' }),
      createdAt: daysAgo(20),
    },
  })

  await db.candidateEvaluation.create({
    data: {
      domain: { connect: { id: dbDom.id } },
      user: { connect: { id: tasha.id } },
      evaluatedBy_: { connect: { id: instructor.id } },
      evaluationBasis: 'combined',
      aiSummary: 'tasha is the clear DB captain. Highest proctored score in the room (70). Strong assessment trajectory. One screenshot failed during the scrimmage — would have placed in the real contest.',
      strengths: JSON.stringify(['fastest correct submission in scrimmage', 'strong JOIN intuition', 'consistent weekly practice']),
      weaknesses: JSON.stringify(['screenshot-to-Word documentation workflow needs reps', 'group-by ordering']),
      recommendation: 'Lock in for DB. Drill the documentation workflow — the screenshot failure cost her a real placement in the scrimmage.',
      rawPayload: JSON.stringify({ source: 'seed', basis: 'combined' }),
      createdAt: daysAgo(8),
    },
  })

  await db.appEvent.create({ data: { kind: 'candidate-evaluated', title: 'Candidate evaluation recorded: combined', detail: 'by Prof. Reyes', createdAt: daysAgo(8) } })

  console.log('Seed complete.')
  console.log('  Admin:       admin@ito.test')
  console.log('  Instructor:  instructor@ito.test')
  console.log('  Students:    lia/mark/tasha/jico/pia/rico/gina/noel @ito.test')
  console.log('  Password:    olypmics2026')
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
