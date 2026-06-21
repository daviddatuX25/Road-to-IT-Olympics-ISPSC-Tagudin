import { PrismaClient } from '@prisma/client'
import { manilaWeekKey, lastNWeekStarts, getActiveWeekKeysForDomain } from '../src/lib/streaks'
const db = new PrismaClient()
async function main() {
  const mark = await db.user.findUnique({ where: { email: 'mark@ito.test' } })
  const java = await db.domain.findUnique({ where: { key: 'java' } })
  if (!mark || !java) { console.log('missing'); return }
  const subs = await db.submission.findMany({
    where: { userId: mark.id, milestone: { domainId: java.id } },
    select: { clientSubmissionTimestamp: true },
  })
  console.log('mark java submissions:', subs.length)
  for (const s of subs) {
    console.log('  at:', s.clientSubmissionTimestamp, 'key:', manilaWeekKey(s.clientSubmissionTimestamp.getTime()))
  }
  const activeSeason = await db.season.findFirst({ where: { status: 'active' } })
  if (!activeSeason) { console.log('no active season'); return }

  const weeks = lastNWeekStarts(8)
  const activeKeys = await getActiveWeekKeysForDomain(java.id, activeSeason.id, weeks)
  console.log('active week keys (last 8):', Array.from(activeKeys).slice(0, 8))
}
main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
