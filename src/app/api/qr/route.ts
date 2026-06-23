import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const base =
    process.env.APP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ''

  const fallback = base || 'http://localhost:3000'

  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallback)}`

  try {
    const res = await fetch(qrApi, {
      next: { revalidate: 0 }
    })

    if (!res.ok) {
      return new NextResponse('QR generation failed', { status: 502 })
    }

    const contentType = res.headers.get('content-type') || 'image/png'

    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        'content-type': contentType,
        cache-control: 'no-store'
      }
    })
  } catch (error) {
    console.error('QR route error:', error)
    return new NextResponse('QR generation failed', { status: 502 })
  }
}
