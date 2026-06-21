import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  // Mimic what createMilestoneAction does
  const admin = await db.user.findUnique({ where: { email: 'admin@ito.test' } })
  const dom = await db.domain.findFirst({ where: { key: 'java' } })
  const season = await db.season.findFirst({ where: { status: 'active' } })
  if (!admin || !dom || !season) { console.log('missing'); return }
  
  try {
    const milestone = await db.milestone.create({
      data: {
        domain: { connect: { id: dom.id } },
        season: { connect: { id: season.id } },
        creator: { connect: { id: admin.id } },
        weekOrPhase: 'aug-w1',
        mode: 'tutor',
        difficulty: 'easy',
        title: 'Test',
        promptTemplate: 'test prompt',
        acceptedInputTypes: '["guided_form"]',
        status: 'draft',
      },
    })
    console.log('milestone created:', milestone.id)
    
    const event = await db.appEvent.create({
      data: {
        kind: 'milestone-published',
        title: 'Test event',
        detail: 'by test',
      },
    })
    console.log('event created:', event.id)
    
    await db.milestone.delete({ where: { id: milestone.id } })
    await db.appEvent.delete({ where: { id: event.id } })
    console.log('cleaned up')
  } catch (e) {
    console.error('ERROR:', e)
  }
}
main().then(() => db.$disconnect())
