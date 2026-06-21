export const dynamic = 'force-dynamic'

export function HEAD() {
  return new Response(null, { status: 200 })
}

export function GET() {
  return Response.json({ ok: true })
}
