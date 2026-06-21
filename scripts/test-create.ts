import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const admin = await db.user.findUnique({ where: { email: 'admin@ito.test' } })
  const dom = await db.domain.findFirst()
  const season = await db.season.findFirst({ where: { status: 'active' } })
  if (!admin || !dom || !season) { console.log('missing'); return }
  try {
    const m = await db.milestone.create({
      data: {
        domain: { connect: { id: dom.id } },
        season: { connect: { id: season.id } },
        creator: { connect: { id: admin.id } },
        weekOrPhase: 'aug-w1',
        mode: 'tutor',
        difficulty: 'easy',
        title: 'Test milestone',
        promptTemplate: 'Test prompt',
        acceptedInputTypes: '["guided_form"]',
        status: 'draft',
      },
    })
    console.log('created:', m.id)
    await db.milestone.delete({ where: { id: m.id } })
    console.log('deleted')
  } catch (e) {
    console.error('ERROR:', e)
  }
}
main().then(() => db.$disconnect())
