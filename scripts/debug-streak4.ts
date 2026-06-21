import { PrismaClient } from '@prisma/client'
import { computeStreakForUserDomain, manilaWeekKey } from '../src/lib/streaks'
const db = new PrismaClient()
async function main() {
  const tasha = await db.user.findUnique({ where: { email: 'tasha@ito.test' } })
  const dbDom = await db.domain.findUnique({ where: { key: 'db' } })
  if (!tasha || !dbDom) { console.log('missing'); return }
  const subs = await db.submission.findMany({
    where: { userId: tasha.id, milestone: { domainId: dbDom.id } },
    select: { clientSubmissionTimestamp: true },
  })
  console.log('tasha db submissions:', subs.length)
  for (const s of subs) {
    console.log('  at:', s.clientSubmissionTimestamp, 'key:', manilaWeekKey(s.clientSubmissionTimestamp.getTime()))
  }
  const activeSeason = await db.season.findFirst({ where: { status: 'active' } })
  if (!activeSeason) { console.log('no active season'); return }

  const streak = await computeStreakForUserDomain(tasha.id, dbDom.id, activeSeason.id)
  console.log('streak:', streak)
}
main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
