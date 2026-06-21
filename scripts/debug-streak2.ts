import { PrismaClient } from '@prisma/client'
import { computeStreakBreakdown } from '../src/lib/streaks'
const db = new PrismaClient()
async function main() {
  const activeSeason = await db.season.findFirst({ where: { status: 'active' } })
  if (!activeSeason) { console.log('no active season'); return }

  for (const email of ['mark@ito.test', 'tasha@ito.test', 'pia@ito.test', 'jico@ito.test']) {
    const u = await db.user.findUnique({ where: { email } })
    if (!u) continue
    const b = await computeStreakBreakdown(u.id, activeSeason.id)
    console.log(email, b.filter(x => x.streak > 0).map(x => `${x.domainKey}=${x.streak}`).join(', ') || 'no streaks')
  }
}
main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect() })
