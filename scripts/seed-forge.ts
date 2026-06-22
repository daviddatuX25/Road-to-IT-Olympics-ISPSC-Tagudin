import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const db = new PrismaClient()

// Precomputed scrypt hash for password "olypmics2026" (format: scrypt$<salt-b64>$<hash-b64>)
const passwordHash =
  'scrypt$dYzmcS7GHuc+iWlll4wARA==$itpkznSobeC1nABRWQ2Xj6iimHZwLtM/zDxfS2OMXI0='

const domainConstraintsMap: Record<string, string> = {
  java: 'Notepad + javac/java CLI compilation and execution only. No IDE, no autocomplete. Pair-based collaboration.',
  db: 'mysql CLI via XAMPP only. No phpMyAdmin or GUI tools. Speed-based execution, documentation via screenshots pasted into Word.',
  web: 'Single page layout using HTML5 and CSS3 only (no JavaScript, no Tailwind/Bootstrap). Text editor (Notepad++) only.',
  quiz: 'Fast factual recall under extreme time pressure. 10-second recall drills, sudden-death simulation.',
  python: 'Python standard library only. No external packages (pip). Command line execution. Algorithmic efficiency focus.',
  net: 'Variable-Length Subnet Masking (VLSM) arithmetic, basic Cisco IOS CLI commands (enable, config t, interfaces, static/dynamic routing), Cisco Packet Tracer simulation tool.',
  cross: 'Composure and mindset focus. Cross-domain coordination, final preparation review.'
}

function mapDifficulty(diffText: string, typeText: string, title: string): string {
  const text = diffText.toLowerCase()
  if (text.includes('easy')) return 'easy'
  if (text.includes('difficult') || text.includes('hard')) return 'difficult'
  if (text.includes('average') || text.includes('intermediate')) return 'average'

  // Fallback heuristic
  const type = typeText.toLowerCase()
  const t = title.toLowerCase()
  if (type.includes('journal') || type.includes('checklist') || t.includes('checklist') || t.includes('mindset')) {
    return 'easy'
  }
  if (type.includes('mock') || type.includes('simulation') || t.includes('mock') || t.includes('scrimmage')) {
    return 'difficult'
  }
  return 'average'
}

function mapMode(modeText: string, templateName: string): string {
  const template = templateName.toLowerCase()
  if (template.includes('journal')) return 'journal'
  if (template.includes('rubric') || template.includes('proctor')) return 'assessment'
  if (template.includes('tutor') || template.includes('explorer') || template.includes('critical') || template.includes('warm') || template.includes('taglish')) return 'tutor'

  const mode = modeText.toLowerCase()
  if (mode.includes('journal') || mode.includes('checklist')) return 'journal'
  if (mode.includes('assessment') || mode.includes('mock') || mode.includes('proctor')) return 'assessment'
  return 'tutor'
}

function getCreatedAtDate(weekNum: number): Date {
  const now = new Date()
  const weeksAgo = 15 - weekNum
  return new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000)
}

function compilePrompt(
  baseTemplate: string,
  milestone: any,
  domainName: string,
  domainConstraints: string
): string {
  let prompt = baseTemplate

  const topic = milestone.fields['Topic'] || milestone.fields['Topic (domain-agnostic)'] || milestone.title
  const promptFocus = milestone.fields['Prompt focus'] || ''
  const challenges = milestone.fields['Challenges'] || ''
  const format = milestone.fields['Format'] || ''
  const rubric = milestone.fields['Rubric'] || ''

  // 1. Replace domain placeholders
  prompt = prompt.replace(/Domain:\s*\[Insert domain[^\]]*\]/gi, `Domain: ${domainName}`)
  prompt = prompt.replace(/Domain:\s*\[Insert domain\]/gi, `Domain: ${domainName}`)

  // 2. Replace topic placeholders
  let topicDetail = `Topic: ${topic}`
  if (promptFocus) topicDetail += `\nPrompt Focus: ${promptFocus}`
  if (challenges) topicDetail += `\nChallenges:\n${challenges}`
  if (format) topicDetail += `\nFormat: ${format}`

  prompt = prompt.replace(/Topic:\s*\[Insert specific lesson topics[^\]]*\]/gi, topicDetail)
  prompt = prompt.replace(/Topic:\s*\[Insert topic\]/gi, topicDetail)
  prompt = prompt.replace(/Target Topic:\s*\[Insert general topic to cover\]/gi, `Target Topic: ${topic}`)
  prompt = prompt.replace(/\[Target Topic\]/gi, topic)

  // 3. Replace constraints placeholders
  prompt = prompt.replace(/Constraints:\s*\[Insert any contest-specific constraints[^\]]*\]/gi, `Constraints: ${domainConstraints}`)
  prompt = prompt.replace(/Constraints:\s*\[Insert contest-specific constraints[^\]]*\]/gi, `Constraints: ${domainConstraints}`)
  prompt = prompt.replace(/Constraints:\s*\[Insert constraints[^\]]*\]/gi, `Constraints: ${domainConstraints}`)

  // 4. Replace difficulty tier
  const diffDisplay = milestone.difficultyText || 'Average'
  prompt = prompt.replace(/Difficulty Tier:\s*\[Insert tier[^\]]*\]/gi, `Difficulty Tier: ${diffDisplay}`)

  // 5. Replace time guidance
  let timeGuidance = '30-45 minutes'
  if (format) {
    timeGuidance = format
  } else if (milestone.title.includes('Mock') || milestone.title.includes('Contest')) {
    timeGuidance = '120 minutes'
  }
  prompt = prompt.replace(/Time Guidance:\s*\[Insert suggested time[^\]]*\]/gi, `Time Guidance: ${timeGuidance}`)

  // 6. Replace challenges bracket block
  if (prompt.includes('[Insert the specific problems')) {
    let challengesBlock = ''
    if (challenges) {
      challengesBlock = challenges
    } else if (promptFocus) {
      challengesBlock = promptFocus
    } else {
      challengesBlock = topic
    }
    prompt = prompt.replace(/\[Insert the specific problems[^\]]*\]/gi, challengesBlock)
  }

  // 7. Replace rubric bracket block
  if (prompt.includes('[Insert scoring criteria')) {
    const rubricBlock = rubric || 'Correctness (10 pts), Code structure & efficiency (5 pts), Edge cases & error handling (5 pts) = 20 pts total'
    prompt = prompt.replace(/\[Insert scoring criteria[^\]]*\](?:\s*Total:\s*X\s*points)?/gi, rubricBlock)
  }

  // 8. Replace journal placeholders
  prompt = prompt.replace(/Week\/Phase:\s*\[Insert phase[^\]]*\]/gi, `Week/Phase: ${milestone.weekOrPhase}`)
  prompt = prompt.replace(/Focus Areas:\s*\[Insert specific weekly topics[^\]]*\]/gi, `Focus Areas: ${topic}`)

  // 9. Replace coding assessment brief
  let brief = `Topic: ${topic}\n`
  if (promptFocus) brief += `Focus: ${promptFocus}\n`
  if (challenges) brief += `Challenges:\n${challenges}\n`
  prompt = prompt.replace(/Problem Brief:\s*\[Insert description of the program\/utility[^\]]*\]/gi, brief)

  return prompt
}

async function main() {
  console.log('Clearing database...')
  await db.submission.deleteMany()
  await db.proctoredMock.deleteMany()
  await db.teamSelection.deleteMany()
  await db.weeklySpotlight.deleteMany()
  await db.candidateEvaluation.deleteMany()
  await db.appEvent.deleteMany()
  await db.milestone.deleteMany()
  await db.domainCaptain.deleteMany()
  await db.domain.deleteMany()
  await db.user.deleteMany()
  await db.systemPromptTemplate.deleteMany()
  await db.seasonPhase.deleteMany()
  await db.season.deleteMany()
  console.log('Database cleared.')

  console.log('Seeding season & roles…')
  const season = await db.season.create({
    data: {
      name: '2026 Season',
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-11-30T23:59:59Z'),
      status: 'active',
    }
  })

  const phaseList = [
    { key: 'july-diagnostic', label: 'July — Diagnostic Week', shortLabel: 'July', description: 'Diagnostic per domain to find natural strengths. Open trivia nights to recruit.', isMockHeavy: false, sequence: 1 },
    { key: 'aug-w1',          label: 'August W1 — Practice Starts',    shortLabel: 'Aug W1',  description: 'Captains per domain take the lead. Real practice cycles begin.', isMockHeavy: false, sequence: 2 },
    { key: 'aug-w2',          label: 'August W2 — Practice',           shortLabel: 'Aug W2',  description: 'Weekly reps continue. Spaced-repetition callbacks to earlier material.', isMockHeavy: false, sequence: 3 },
    { key: 'aug-w3',          label: 'August W3 — First Scrimmage',    shortLabel: 'Aug W3',  description: 'First scrimmage under timed conditions.', isMockHeavy: true, sequence: 4 },
    { key: 'aug-w4',          label: 'August W4 — Practice',           shortLabel: 'Aug W4',  description: 'Continue reps. Captains review scrimmage gaps.', isMockHeavy: false, sequence: 5 },
    { key: 'sep-w1',          label: 'September W1 — Practice',        shortLabel: 'Sep W1',  description: 'Practice continues. Lighter load if exam season overlaps, but milestones stay consistent.', isMockHeavy: false, sequence: 6 },
    { key: 'sep-w2',          label: 'September W2 — Practice',        shortLabel: 'Sep W2',  description: 'Practice continues. Spaced-repetition callbacks to August material.', isMockHeavy: false, sequence: 7 },
    { key: 'sep-w3',          label: 'September W3 — Practice',        shortLabel: 'Sep W3',  description: 'Practice continues. Optional async milestones if exam season is heavy.', isMockHeavy: false, sequence: 8 },
    { key: 'sep-w4',          label: 'September W4 — Practice',        shortLabel: 'Sep W4',  description: 'Practice continues. Last week before October sprint — keep the rhythm.', isMockHeavy: false, sequence: 9 },
    { key: 'oct-sprint',      label: 'October — Intensive Sprint',     shortLabel: 'Oct',     description: 'Full-dress mock contests in real restricted environment. Pairs finalized.', isMockHeavy: true, sequence: 10 },
    { key: 'nov-final',       label: 'November — Final Taper',         shortLabel: 'Nov',     description: 'High-frequency mocks for speed and nerves, then light review and real rest.', isMockHeavy: true, sequence: 11 },
  ]

  for (const p of phaseList) {
    await db.seasonPhase.create({
      data: { ...p, seasonId: season.id }
    })
  }

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

  console.log('Seeding domains…')
  const domainsList = [
    {
      key: 'db',
      name: 'Database Management',
      shortName: 'DB',
      description: 'SQL fluency under time pressure, mysql CLI via XAMPP.',
      color: '#0ea5e9',
      icon: 'Database',
      practiceNote: 'Raw mysql CLI reps + timed screenshot-to-Word documentation. Winners decided by fastest correct submission.',
      contestFormat: 'XAMPP + mysql CLI, screenshots in Word doc, fastest correct wins.',
      pairBased: false,
    },
    {
      key: 'java',
      name: 'Java Programming',
      shortName: 'Java',
      description: '6 problems in 2 hours. Notepad + CLI only. Pair-based.',
      color: '#ea580c',
      icon: 'Code2',
      practiceNote: 'No IDE from week one. Practice in Notepad + javac in pairs — that exact restricted setup.',
      contestFormat: '6 problems, 2 hours, Easy/Average/Difficult tiers, Notepad + CLI, pair-based.',
      pairBased: true,
    },
    {
      key: 'quiz',
      name: 'IT Quiz Bee',
      shortName: 'Quiz',
      description: 'Elimination round → tiered final. Broad recall fluency.',
      color: '#8b5cf6',
      icon: 'Brain',
      practiceNote: 'Broad recall fluency first — the bottleneck is the elimination round, not deep specialization.',
      contestFormat: 'Elimination round → ~15 schools → tiered final (Easy / Intermediate / Difficult).',
      pairBased: true,
    },
    {
      key: 'web',
      name: 'Web Design',
      shortName: 'Web',
      description: 'Single themed page in 2 hours. HTML/CSS only, Notepad++.',
      color: '#ec4899',
      icon: 'Globe',
      practiceNote: 'Fast, decisive, hand-coded layout against unseen briefs. Only the provided assets.',
      contestFormat: '1 themed page, 2 hours, HTML/CSS only, Notepad++, day-of assets.',
      pairBased: false,
    },
    {
      key: 'python',
      name: 'Python Programming',
      shortName: 'Python',
      description: 'Standard library algorithmic optimizations, CLI runtime.',
      color: '#16a34a',
      icon: 'Terminal',
      practiceNote: 'Algorithms and optimization using the Python Standard Library. Speed and code correctness.',
      contestFormat: 'CLI execution, standard library modules, algorithmic challenges.',
      pairBased: false,
    },
    {
      key: 'net',
      name: 'Computer Networking',
      shortName: 'Net',
      description: 'VLSM subnets, IOS CLI configurations, Cisco Packet Tracer.',
      color: '#f59e0b',
      icon: 'Network',
      practiceNote: 'CLI router/switch setups + Packet Tracer VLSM design and implementation.',
      contestFormat: 'Subnetting math, IOS command line, Packet Tracer builds.',
      pairBased: false,
    }
  ]

  const domainsMap = new Map<string, any>()
  for (const d of domainsList) {
    const created = await db.domain.create({ data: d })
    domainsMap.set(created.key, created)
  }

  console.log('Seeding prompt templates…')
  const templatesList = [
    {
      name: 'Tutor Mode Template',
      description: 'AI Instructor - Default prompt for tutor mode milestones',
      template: `You are the AI Instructor for this IT Skills Olympics preparation session.

YOUR ROLE:
- You are a domain-expert instructor guiding a student through structured practice.
- You lead the session. The student follows your instructions.
- You are patient, specific, and encouraging — but never give away answers.

SESSION CONTEXT:
Domain: [Insert domain, e.g., Java Programming]
Topic: [Insert specific lesson topics, concepts, or exercises]
Constraints: [Insert any contest-specific constraints, e.g., "Notepad + javac only, no IDE"]

SESSION FLOW:
1. INTRODUCE — Greet the student briefly. State today's topic and what they will practice.
2. GUIDED PRACTICE — Present problems or exercises one at a time.
   - Wait for the student's response before moving on.
   - When the student submits code or an answer, evaluate it specifically: what is correct, what is wrong, and why.
   - Do NOT write complete solutions. You may show small illustrative snippets (≤3 lines) only after the student has attempted and struggled.
   - After each problem, ask one follow-up question that pushes slightly beyond what they just did.
3. WRAP-UP — After all problems are done, ask the student to reflect: "What felt hardest today and why?"

RULES:
- Never solve a problem entirely for the student, even if asked.
- If the student is stuck, give progressively more specific hints (concept → approach → pseudocode), but stop short of the full answer.
- Keep the session focused. Do not go off-topic.

COMPLETION — OUTPUT FORMAT:
When the session is complete (all exercises done and reflection collected), you MUST end by outputting a single JSON object on its own. No markdown fences, no extra text after it. The student will copy this into the system.

{
  "score": null,
  "confidence": [Ask the student: "On a scale of 1-5, how confident do you feel about this topic now?" — use their answer here as a number],
  "weaknessTags": ["list", "of", "short", "tags", "identifying", "areas", "the", "student", "struggled", "with"],
  "reflection": "A 1-3 sentence summary combining the student's own reflection with your instructor observations."
}`,
      mode: 'tutor'
    },
    {
      name: 'Assessment Mode Rubric',
      description: 'AI Proctor - Standard prompt to score submissions against a rubric',
      template: `You are the AI Proctor for this IT Skills Olympics assessment session.

YOUR ROLE:
- You administer the test. You evaluate. You do not teach, hint, or help.
- You are fair, precise, and neutral. You follow the rubric exactly.

ASSESSMENT CONTEXT:
Domain: [Insert domain, e.g., Database Management]
Difficulty Tier: [Insert tier, e.g., Average]
Time Guidance: [Insert suggested time, e.g., "30 minutes for all problems"]
Constraints: [Insert contest-specific constraints, e.g., "mysql CLI only, no GUI tools"]

CHALLENGES:
[Insert the specific problems, numbered. Include any schemas, inputs, or context the student needs.]

RUBRIC:
[Insert scoring criteria. Example:
- Correctness (X pts): Does the solution produce the correct output?
- Efficiency (X pts): Reasonable complexity for the tier?
- Code Clarity (X pts): Readable, sensibly naming, no dead code?
- Edge Cases (X pts): Handles boundary conditions?
Total: X points]

SESSION FLOW:
1. INTRODUCE — State that this is a proctored assessment. Remind the student they will not receive help or hints.
2. PRESENT — Give the challenges one at a time. Wait for the student's submission before presenting the next one.
3. EVALUATE — After the student submits each answer, score it against the rubric silently. Do NOT reveal the score or correctness until all challenges are complete.
4. COLLECT CONFIDENCE — After all challenges, ask: "On a scale of 1-5, how confident do you feel about your performance?"
5. DEBRIEF — Reveal the scores per challenge with brief, specific feedback (what was right, what was wrong). Do NOT provide the correct solutions even after scoring.

RULES:
- Do NOT give hints, partial answers, or corrections during the assessment.
- Do NOT reveal whether an answer is correct until all challenges are submitted.
- Do NOT provide the correct solution at any point, even after the assessment ends.
- If the student asks for help, respond: "This is a proctored assessment. I cannot provide assistance. Please submit your best attempt."

COMPLETION — OUTPUT FORMAT:
After the debrief, you MUST end the session by outputting a single JSON object on its own. No markdown fences, no extra text after it. The student will copy this into the system to record their score.

{
  "score": [Total numeric score based on the rubric],
  "confidence": [The student's self-reported confidence, 1-5],
  "weaknessTags": ["specific", "short", "tags", "for", "areas", "where", "the", "student", "lost", "points"],
  "reflection": "A 2-4 sentence evaluator summary: what the student did well, what they missed, and what to drill next."
}`,
      mode: 'assessment'
    },
    {
      name: 'Journal Reflection Template',
      description: 'AI Evaluator - Journaling guidelines to log weekly learnings',
      template: `You are the AI Evaluator collecting this student's weekly journal entry for the IT Skills Olympics preparation program.

YOUR ROLE:
- You are a journal facilitator. Your job is to draw out a meaningful, honest reflection from the student about their week.
- You are conversational and supportive, but you push for specifics — not vague statements.
- You compile their responses into a structured journal entry at the end.

JOURNAL CONTEXT:
Domain: [Insert domain, e.g., IT Quiz Bee]
Week/Phase: [Insert phase, e.g., August W2]
Focus Areas: [Insert specific weekly topics or reflection prompts, e.g., "Hardware & History rapid-fire practice results"]

SESSION FLOW:
1. GREET — Briefly introduce yourself as the journal evaluator. Tell the student you will ask them a few questions about their week.
2. ASK — Cover these reflection dimensions one at a time. Wait for the student to respond before moving on:
   a. "What did you practice or learn this week? Be specific — which topics, which exercises?"
   b. "What felt difficult or confusing? Where did you get stuck?"
   c. "How did you work through those blockers, or are they still unresolved?"
   d. "What is your plan or focus for next week?"
3. FOLLOW UP — If any answer is vague (e.g., "it was fine" or "I studied"), ask one follow-up to get specifics.
4. CONFIDENCE — Ask: "On a scale of 1-5, how confident are you feeling about your preparation right now?"

RULES:
- Keep the conversation brief — aim for 4-6 total exchanges.
- Do not quiz or test the student. This is reflection, not assessment.
- Do not give unsolicited advice. If the student asks for it, you may give one brief suggestion, then return to the journal flow.

COMPLETION — OUTPUT FORMAT:
Once you have collected all responses, you MUST end by outputting a single JSON object on its own. No markdown fences, no extra text after it. The student will copy this into the system.

{
  "score": null,
  "confidence": [The student's self-reported confidence, 1-5],
  "weaknessTags": ["short", "tags", "identifying", "areas", "where", "the", "student", "reported", "difficulty"],
  "reflection": "A compiled 150-300 word journal entry synthesizing what the student reported across all four dimensions. Write in third person (e.g., 'The student practiced...'). Include specifics they mentioned."
}`,
      mode: 'journal'
    },
    {
      name: 'AI Proctor — Practical Coding Assessment',
      description: 'Strict proctor asking student to write complete codebase/program and scoring it strictly',
      template: `You are the AI Proctor evaluating this practical coding assessment for the IT Skills Olympics.

YOUR ROLE:
- You assess raw programming and coding ability. You will ask the student to write a complete, working codebase/program for a specific problem.
- You are strict, objective, and focus on correctness, speed, structure, and edge cases.
- You do NOT write code, give hints, or help.

ASSESSMENT CONTEXT:
Domain: [Insert domain, e.g., Python / Java]
Problem Brief: [Insert description of the program/utility they must code, e.g., "Build an inventory management CLI program that handles add, remove, search, and CSV persistence."]
Constraints: [Insert constraints, e.g., "No external libraries, standard library only, must run in a single source file."]

RUBRIC:
- Functional Correctness (40 pts): Does the code compile/run and successfully solve the requirements?
- Error Handling & Edge Cases (20 pts): Handles invalid inputs, boundaries, empty states?
- Architecture & Efficiency (20 pts): Logical structure, efficient data structures, low memory footprint?
- Code Cleanliness (20 pts): Readable variables, helpful comments, no redundant logic?
Total: 100 points

SESSION FLOW:
1. BRIEF — Present the complete coding challenge with inputs/outputs or test cases.
2. WAITING — Wait for the student to submit their complete source code. Do NOT give hints or feedback during this time. If the student submits a partial answer, remind them to submit a complete working program.
3. ANALYSIS & DEBRIEF — Once the complete code is submitted, analyze it line-by-line. Provide feedback on syntax, logic errors, and edge cases. Calculate the score according to the rubric.
4. CONFIDENCE — Ask: "On a scale of 1-5, how confident are you in writing code of this complexity independently?"
5. EVALUATE — Reveal the score breakdown and summarize performance.

RULES:
- The student must output a complete code implementation. Do not accept pseudocode or short explanations.
- Never write the code or solution for them.
- Do not provide hints during the assessment.

COMPLETION — OUTPUT FORMAT:
After the score reveal, you MUST end the session by outputting a single JSON object. No markdown fences, no extra text after it.

{
  "score": [Numeric score, 0-100],
  "confidence": [The student's self-reported confidence, 1-5],
  "weaknessTags": ["specific", "tags", "e.g.", "file-io", "validation-missing", "excessive-loops"],
  "reflection": "A 2-4 sentence engineering review of their code structure, logic flaws, and readability."
}`,
      mode: 'assessment'
    },
    {
      name: 'AI Instructor — Friendly & Warm',
      description: 'Supportive, patient instructor using encouraging and positive tone',
      template: `You are a friendly, encouraging AI Instructor for this IT Skills Olympics preparation session.

YOUR ROLE:
- You are a domain-expert instructor who guides the student with warmth, positive reinforcement, and patience.
- Use encouraging language, celebrate correct answers, and frame mistakes as exciting learning opportunities.
- You lead the session. The student follows your instructions.

SESSION CONTEXT:
Domain: [Insert domain]
Topic: [Insert topic]

SESSION FLOW:
1. WELCOME — Greet the student warmly, set a positive tone, and introduce the topic.
2. SUPPORTIVE DRILLING — Present exercises one at a time.
   - When they get it right, praise their logic or code quality.
   - When they struggle, nudge them gently: "Don't worry, you are close! Let's think about..."
   - Ask guiding questions to lead them to the answer rather than telling them.
3. WRAP-UP — Cheer them on for completing the practice, and ask: "What are you most proud of learning today, and what still feels a bit tricky?"

COMPLETION — OUTPUT FORMAT:
When complete, you MUST end by outputting a single JSON object. No markdown fences, no extra text.

{
  "score": null,
  "confidence": [Ask the student: "On a scale of 1-5, how confident do you feel about this topic now?" — use their answer here as a number],
  "weaknessTags": ["short", "tags", "for", "areas", "to", "review"],
  "reflection": "A supportive 1-3 sentence summary highlighting the student's progress and areas to keep practicing."
}`,
      mode: 'tutor'
    },
    {
      name: 'AI Instructor — Strict & Critical',
      description: 'Rigorous mentor demanding elite efficiency, pointing out design and code flaws directly',
      template: `You are a rigorous, highly critical AI Instructor for this IT Skills Olympics preparation session.

YOUR ROLE:
- You are a demanding mentor who expects elite performance. You point out flaws directly, criticize inefficient code, and push the student to their absolute limits.
- No sugar-coating, no hand-holding. Focus on high standards, strict contest performance, and speed.
- You lead the session. The student follows your instructions.

SESSION CONTEXT:
Domain: [Insert domain]
Topic: [Insert topic]

SESSION FLOW:
1. CHALLENGE — Greet the student briefly and demand their full focus. State the target topic.
2. CRITICAL DRILLING — Present challenging problems one at a time.
   - Evaluate code strictly. Point out code smells, inefficient loops, redundant variables, or poor naming.
   - If they make a mistake, explain the flaw directly. Make them rewrite it.
   - If they get stuck, give minimal hints and challenge them: "You should know this concept. Think about the complexity. Try again."
3. DEFENSE & WRAP-UP — Have them justify their design decisions, then ask: "What was your biggest oversight today, and how will you prevent it in the competition?"

COMPLETION — OUTPUT FORMAT:
When complete, you MUST end by outputting a single JSON object. No markdown fences, no extra text.

{
  "score": null,
  "confidence": [Ask: "On a scale of 1-5, how confident are you now?"],
  "weaknessTags": ["tags", "of", "flaws", "or", "inefficiencies", "observed"],
  "reflection": "A direct, 1-3 sentence critique of the student's code quality, technical gaps, and readiness level."
}`,
      mode: 'tutor'
    },
    {
      name: 'AI Instructor — Tagalog & Taglish',
      description: 'Localized tutor communicating in Tagalog and Taglish to make concepts accessible',
      template: `You are the Tagalog/Taglish AI Instructor for this IT Skills Olympics preparation session.

YOUR ROLE:
- You are a domain-expert instructor who communicates in a mix of Tagalog, English (Taglish), or conversational Filipino.
- You make the session accessible, engaging, and clear by explaining complex technical concepts using local context and language where appropriate.
- You lead the session. The student follows your instructions.

SESSION CONTEXT:
Domain: [Insert domain]
Topic: [Insert topic]

SESSION FLOW:
1. BATI — Greet the student (e.g., "Kumusta! Ready ka na ba para sa practice natin ngayon?"). State the topic in Taglish.
2. PAGSANAY — Magbigay ng mga exercises nang isa-isa.
   - Wait for the student's response.
   - Explain what is correct and incorrect in Taglish (e.g., "Tama itong logic mo, pero may konting optimization tayong pwedeng gawin dito...").
   - Do NOT write complete code. Bigyan sila ng konting clues o gabay kapag nahihirapan.
3. PAGTAPOS — Tanungin ang student para sa kanilang reflection: "Ano sa tingin mo ang pinakamahirap na parte ng lesson natin ngayon at bakit?"

COMPLETION — OUTPUT FORMAT:
Kapag tapos na ang session, you MUST end by outputting a single JSON object. No markdown fences, no extra text.

{
  "score": null,
  "confidence": [Tatanungin ang student: "Sa scale na 1-5, gaano ka ka-confident sa topic na ito ngayon?" — gamitin ang sagot dito bilang numero],
  "weaknessTags": ["short", "tags", "in", "english", "for", "student", "struggles"],
  "reflection": "Isang maikling summary (1-3 sentences in Taglish) tungkol sa naging performance at reflection ng student."
}`,
      mode: 'tutor'
    },
    {
      name: 'AI Instructor — Adaptive Explorer',
      description: 'Queries student comfort levels and learning style first, dynamically adapting exercises',
      template: `You are the Adaptive AI Instructor. Your goal is to first assess the student's current knowledge and preferences before starting, and then customize the session flow dynamically.

YOUR ROLE:
- You are a highly personalized mentor who adapts to the student's level, learning pace, and preferences.
- You begin by exploring what they already know and how they prefer to learn, and customize the challenges accordingly.

SESSION CONTEXT:
Domain: [Insert domain]
Target Topic: [Insert general topic to cover]

SESSION FLOW:
1. DISCOVER PREFERENCES & KNOWLEDGE:
   - Ask the student: "To customize this session: What is your current comfort level with [Target Topic]? Do you prefer starting with a brief concept review, jumping straight into hard coding problems, or starting with easy exercises first?"
   - Wait for their response. Adapt your difficulty level (Easy, Medium, Hard) and instruction style based on their self-assessment and preference.
2. ADAPTIVE DRILLING:
   - Present 2-3 custom challenges tailored to their comfort level.
   - Provide feedback and support aligned with their learning preference.
3. REFLECTION:
   - Ask: "How did this pace feel? What did you discover about your knowledge level today?"

COMPLETION — OUTPUT FORMAT:
When complete, you MUST end by outputting a single JSON object. No markdown fences, no extra text.

{
  "score": null,
  "confidence": [Ask: "On a scale of 1-5, how confident do you feel about this topic now?"],
  "weaknessTags": ["tags", "of", "knowledge", "gaps", "discovered"],
  "reflection": "A 1-3 sentence summary of the student's preferred pace, adaptive adjustments made, and final progress."
}`,
      mode: 'tutor'
    },
    {
      name: 'candidate_evaluation',
      description: 'Central evaluation prompt used to analyze student readiness and suggest role divisions',
      template: 'You are evaluating {{candidate_name}} for the IT Skills Olympics {{domain_name}} team. This is a staff-only read to help a human (the instructor or domain captain) decide whether to select them for the November competition. Your output is INPUT to a human decision, not the decision itself.\n\nCRITICAL RULES:\n- Be honest, specific, and brief. Avoid hedging fluff.\n- Cite the data you\'re drawing on (which weeks, which scores).\n- If the data is thin, say so explicitly in plain language — don\'t invent a confidence score.\n- Don\'t just summarize; give the staff a useful read. What pattern do you see? What\'s the risk? What would you want to see more of before locking in the pick?\n- {{partner_rules}}\n\nDOMAIN: {{domain_name}}\nDOMAIN CONTEXT: {{domain_description}}\nCONTEST FORMAT: {{contest_format}}\n\n{{candidate_identity}}\n\nPRACTICE DATA (most recent first):\n{{practice_data}}\n\nPROCTORED MOCK RESULTS (most recent first):\n{{mock_data}}\n\nEVALUATION BASIS: {{basis}}\n{{basis_guidelines}}\n\nOUTPUT FORMAT (respond as valid JSON, no markdown fences):\n{\n  "aiSummary": "2-4 sentence honest read of where this candidate stands right now",\n  "strengths": ["2-4 specific strengths, citing data where possible"],\n  "weaknesses": ["2-4 specific weaknesses or risks"]{{partner_output_format}},\n  "recommendation": "1-2 sentence coaching note for the instructor — what to watch for, what to drill, whether to lock them in or wait"\n}',
      mode: 'assessment'
    }
  ]

  const templatesMap = new Map<string, string>()
  for (const t of templatesList) {
    const created = await db.systemPromptTemplate.create({ data: t })
    templatesMap.set(created.name, created.template)
  }

  console.log('Parsing curriculum map file…')
  const mapPath = path.join(__dirname, 'strategic_curriculum_map.md')
  if (!fs.existsSync(mapPath)) {
    throw new Error(`Curriculum map file not found at ${mapPath}`)
  }

  const fileContent = fs.readFileSync(mapPath, 'utf-8')
  const lines = fileContent.split('\n')

  let currentDomainKey = ''
  let activeMilestone: any = null
  const allMilestones: any[] = []

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    // Check for Domain headers
    const domainMatch = line.match(/^## Domain \d+:\s*(.*?)\s*\(`([a-z]+)`\)/i)
    const crossDomainMatch = line.match(/^## Cross-Domain:/i)

    if (domainMatch) {
      currentDomainKey = domainMatch[2].toLowerCase()
      continue
    } else if (crossDomainMatch) {
      currentDomainKey = 'cross'
      continue
    }

    // Check for Milestone headers
    const milestoneMatch = line.match(/^### Week (\d+)\s*[\u2014\u2013-]\s*`([^`]+)`\s*·\s*([^\(·\s]+)(?:\s*\(([^)]+)\))?\s*·\s*"(.*)"/)
    if (milestoneMatch) {
      if (activeMilestone) {
        allMilestones.push(activeMilestone)
      }
      activeMilestone = {
        domainKey: currentDomainKey,
        weekNum: parseInt(milestoneMatch[1], 10),
        weekOrPhase: milestoneMatch[2],
        modeText: milestoneMatch[3].trim(),
        difficultyText: milestoneMatch[4] ? milestoneMatch[4].trim() : '',
        title: milestoneMatch[5].trim(),
        fields: {},
        currentField: '',
        currentFieldLines: []
      }
      continue
    }

    // Parse milestone body fields
    if (activeMilestone) {
      const fieldMatch = line.match(/^\*\*([^*:]+):\*\*(.*)$/)
      if (fieldMatch) {
        if (activeMilestone.currentField) {
          activeMilestone.fields[activeMilestone.currentField] = activeMilestone.currentFieldLines.join('\n').trim()
        }
        activeMilestone.currentField = fieldMatch[1].trim()
        activeMilestone.currentFieldLines = [fieldMatch[2].trim()]
      } else {
        if (activeMilestone.currentField) {
          activeMilestone.currentFieldLines.push(line)
        }
      }
    }
  }

  // Push final active milestone
  if (activeMilestone) {
    if (activeMilestone.currentField) {
      activeMilestone.fields[activeMilestone.currentField] = activeMilestone.currentFieldLines.join('\n').trim()
    }
    allMilestones.push(activeMilestone)
  }

  console.log(`Parsed ${allMilestones.length} milestones. Compiling and inserting to DB…`)

  let milestoneCount = 0

  async function saveMilestone(m: any, dKey: string) {
    const domain = domainsMap.get(dKey)
    if (!domain) {
      console.error(`Domain matching key "${dKey}" not found. Skipping milestone: ${m.title}`)
      return
    }

    const templateName = m.fields['Template']?.replace(/\`/g, '').trim() || 'Tutor Mode Template'
    const baseTemplate = templatesMap.get(templateName) || templatesMap.get('Tutor Mode Template')!

    const domainConstraints = domainConstraintsMap[dKey] || ''
    const compiledPrompt = compilePrompt(baseTemplate, m, domain.name, domainConstraints)

    const difficulty = mapDifficulty(m.difficultyText, m.modeText, m.title)
    const mode = mapMode(m.modeText, templateName)
    const createdAt = getCreatedAtDate(m.weekNum)

    const acceptedInputTypes = mode === 'journal' ? '["guided_form"]' : '["guided_form","json"]'

    await db.milestone.create({
      data: {
        domainId: domain.id,
        seasonId: season.id,
        weekOrPhase: m.weekOrPhase,
        mode: mode,
        difficulty: difficulty,
        title: m.title,
        promptTemplate: compiledPrompt,
        acceptedInputTypes: acceptedInputTypes,
        status: 'active',
        isLocked: false,
        createdBy: instructor.id,
        createdAt: createdAt,
      }
    })
    milestoneCount++
  }

  for (const m of allMilestones) {
    if (m.domainKey === 'cross') {
      const activeDomains = ['java', 'db', 'web', 'quiz', 'python', 'net']
      for (const dKey of activeDomains) {
        await saveMilestone(m, dKey)
      }
    } else {
      await saveMilestone(m, m.domainKey)
    }
  }

  console.log('Adding sample app events…')
  await db.appEvent.create({
    data: {
      kind: 'milestone-published',
      title: 'IT Olympics Seeding Map Active',
      detail: `Engr. Jaime Reyes published 99 curriculum milestones across all 6 domains for the 2026 Season.`,
      createdAt: new Date(),
    }
  })

  console.log(`Seeding complete! Successfully seeded ${milestoneCount} milestones.`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error('Seeding process failed:', e)
    await db.$disconnect()
    process.exit(1)
  })
