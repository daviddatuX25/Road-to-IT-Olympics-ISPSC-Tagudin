import { db } from './db'
import { hashPassword, verifyPassword } from './auth'

export async function seedProduction() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminRealName = process.env.ADMIN_REALNAME || 'Mara Santos'
  const adminNickname = process.env.ADMIN_NICKNAME || 'Capt. Mara'

  if (adminEmail && adminPassword) {
    console.log(`[Prod Seed] Running database sync for admin: ${adminEmail}`)

    // 1. Seed or update the Admin User
    const existingAdmin = await db.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      await db.user.create({
        data: {
          email: adminEmail,
          passwordHash: hashPassword(adminPassword),
          role: 'admin',
          nickname: adminNickname,
          realName: adminRealName,
          studentId: 'ADMIN-001',
          avatarId: 'avatar-09',
          status: 'active',
        }
      })
      console.log(`[Prod Seed] Created admin user: ${adminEmail}`)
    } else {
      // If admin exists, check if password or name/nickname changed
      const passwordMatches = verifyPassword(adminPassword, existingAdmin.passwordHash)
      const nameMatches = existingAdmin.realName === adminRealName
      const nicknameMatches = existingAdmin.nickname === adminNickname
      const roleMatches = existingAdmin.role === 'admin'

      if (!passwordMatches || !nameMatches || !nicknameMatches || !roleMatches) {
        await db.user.update({
          where: { email: adminEmail },
          data: {
            passwordHash: passwordMatches ? undefined : hashPassword(adminPassword),
            realName: adminRealName,
            nickname: adminNickname,
            role: 'admin', // Ensure the role is indeed admin
          }
        })
        console.log(`[Prod Seed] Updated admin user configurations for: ${adminEmail}`)
      }
    }
  } else {
    console.log('[Prod Seed] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin user creation.')
  }

  // 2. Seed Default Season & Phases if not exists
  const seasonName = '2026 Season'
  let season = await db.season.findUnique({
    where: { name: seasonName }
  })

  if (!season) {
    season = await db.season.create({
      data: {
        name: seasonName,
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2026-11-30T23:59:59Z'),
        status: 'active',
      }
    })
    console.log(`[Prod Seed] Created active season: ${seasonName}`)
  }

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
    await db.seasonPhase.upsert({
      where: {
        seasonId_key: {
          seasonId: season.id,
          key: p.key
        }
      },
      update: {
        label: p.label,
        shortLabel: p.shortLabel,
        description: p.description,
        isMockHeavy: p.isMockHeavy,
        sequence: p.sequence
      },
      create: {
        ...p,
        seasonId: season.id
      }
    })
  }

  // 3. Seed Default Domains if not exist
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
      description: 'Mechanics TBD — pending official documents.',
      color: '#16a34a',
      icon: 'Terminal',
      practiceNote: 'Mechanics TBD — same practice loop applies once official docs arrive.',
      contestFormat: 'TBD — pending official contest documents.',
      pairBased: false,
    },
    {
      key: 'net',
      name: 'Computer Networking',
      shortName: 'Net',
      description: 'Mechanics TBD — pending official documents.',
      color: '#f59e0b',
      icon: 'Network',
      practiceNote: 'Mechanics TBD — same practice loop applies once official docs arrive.',
      contestFormat: 'TBD — pending official contest documents.',
      pairBased: false,
    }
  ]

  for (const d of domainsList) {
    await db.domain.upsert({
      where: { key: d.key },
      update: {
        name: d.name,
        shortName: d.shortName,
        description: d.description,
        color: d.color,
        icon: d.icon,
        practiceNote: d.practiceNote,
        contestFormat: d.contestFormat,
        pairBased: d.pairBased
      },
      create: d
    })
  }

  // 4. Seed Prompt Templates if not exist
  const systemPromptTemplatesList = [
    {
      name: 'Tutor Mode Template',
      description: 'Default prompt for tutor mode milestones',
      template: 'You are an expert AI tutor helping me prepare for the 15th IT Skills Olympics. Under timed, high-pressure conditions, explain key concepts, guide me step-by-step, but do not solve problems for me. Instead, check my understanding and ask follow-up questions.',
      mode: 'tutor'
    },
    {
      name: 'Assessment Mode Rubric',
      description: 'Standard prompt to score submissions against a rubric',
      template: 'You are an assessor for the IT Skills Olympics. Rate the user\'s solution on a scale of 0 to 100 based on syntax correctness, efficiency, and edge case coverage. Return a JSON block containing "score" (number), "reflection" (string), "confidence" (1-5), and "weaknessTags" (array of strings). Do not provide the solution.',
      mode: 'assessment'
    },
    {
      name: 'Journal Reflection Template',
      description: 'Journaling guidelines to log weekly learnings',
      template: 'Explain what you learned this week, any blockers you encountered, and how you overcame them. Reflect on your trajectory and consistency.',
      mode: 'journal'
    },
    {
      name: 'candidate_evaluation',
      description: 'Central evaluation prompt used to analyze student readiness and suggest role divisions',
      template: 'You are evaluating {{candidate_name}} for the IT Skills Olympics {{domain_name}} team. This is a staff-only read to help a human (the instructor or domain captain) decide whether to select them for the November competition. Your output is INPUT to a human decision, not the decision itself.\n\nCRITICAL RULES:\n- Be honest, specific, and brief. Avoid hedging fluff.\n- Cite the data you\'re drawing on (which weeks, which scores).\n- If the data is thin, say so explicitly in plain language — don\'t invent a confidence score.\n- Don\'t just summarize; give the staff a useful read. What pattern do you see? What\'s the risk? What would you want to see more of before locking in the pick?\n- {{partner_rules}}\n\nDOMAIN: {{domain_name}}\nDOMAIN CONTEXT: {{domain_description}}\nCONTEST FORMAT: {{contest_format}}\n\n{{candidate_identity}}\n\nPRACTICE DATA (most recent first):\n{{practice_data}}\n\nPROCTORED MOCK RESULTS (most recent first):\n{{mock_data}}\n\nEVALUATION BASIS: {{basis}}\n{{basis_guidelines}}\n\nOUTPUT FORMAT (respond as valid JSON, no markdown fences):\n{\n  "aiSummary": "2-4 sentence honest read of where this candidate stands right now",\n  "strengths": ["2-4 specific strengths, citing data where possible"],\n  "weaknesses": ["2-4 specific weaknesses or risks"]{{partner_output_format}},\n  "recommendation": "1-2 sentence coaching note for the instructor — what to watch for, what to drill, whether to lock them in or wait"\n}',
      mode: 'assessment'
    }
  ]

  for (const t of systemPromptTemplatesList) {
    await db.systemPromptTemplate.upsert({
      where: { name: t.name },
      update: {
        description: t.description,
        template: t.template,
        mode: t.mode
      },
      create: t
    })
  }

  console.log('[Prod Seed] Database sync/seeding complete.')
}
