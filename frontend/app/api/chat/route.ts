import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const res = await fetch(`${BACKEND}/api/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    return new NextResponse('⚠️ Could not reach backend. Is it running on port 8000?', { status: 502 })
  }
}
