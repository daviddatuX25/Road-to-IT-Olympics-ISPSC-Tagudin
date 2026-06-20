import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const admin = await db.user.findUnique({ where: { email: 'admin@ito.test' } })
  const dom = await db.domain.findFirst()
  if (!admin || !dom) { console.log('missing'); return }
  try {
    const m = await db.milestone.create({
      data: {
        domain: { connect: { id: dom.id } },
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
