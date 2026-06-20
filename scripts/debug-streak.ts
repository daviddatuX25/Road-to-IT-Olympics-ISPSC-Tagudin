import { PrismaClient } from '@prisma/client'
import { computeStreakForUserDomain, computeStreakBreakdown, manilaWeekKey, lastNWeekStarts, getActiveWeekKeysForDomain } from '../src/lib/streaks'

const db = new PrismaClient()

async function main() {
  // Find lia
  const lia = await db.user.findUnique({ where: { email: 'lia@ito.test' } })
  if (!lia) { console.log('no lia'); return }
  console.log('lia id:', lia.id)
  
  // Find Java domain
  const java = await db.domain.findUnique({ where: { key: 'java' } })
  if (!java) { console.log('no java'); return }
  console.log('java id:', java.id)
  
  // Get lia's Java submissions
  const subs = await db.submission.findMany({
    where: { userId: lia.id, milestone: { domainId: java.id } },
    include: { milestone: true },
  })
  console.log('submissions count:', subs.length)
  for (const s of subs) {
    console.log('  sub at:', s.clientSubmissionTimestamp, 'weekKey:', manilaWeekKey(s.clientSubmissionTimestamp.getTime()))
  }
  
  // Get active week keys for Java
  const weeks = lastNWeekStarts(8)
  console.log('weeks (most recent first):')
  for (const w of weeks) {
    console.log('  ', w.toISOString(), 'weekKey:', manilaWeekKey(w.getTime()))
  }
  
  const activeKeys = await getActiveWeekKeysForDomain(java.id, weeks)
  console.log('active week keys for java:', Array.from(activeKeys))
  
  // Compute streak
  const streak = await computeStreakForUserDomain(lia.id, java.id)
  console.log('computed streak:', streak)
  
  const breakdown = await computeStreakBreakdown(lia.id)
  console.log('breakdown:')
  for (const b of breakdown) {
    console.log('  ', b.domainKey, 'streak:', b.streak, 'thisWeek:', b.thisWeekSubmitted)
  }
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); process.exit(1) })
