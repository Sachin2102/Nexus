/**
 * NEXUS — Universal Backend Proxy
 * Forwards all /api/proxy/* requests to the FastAPI backend.
 * Eliminates CORS issues when the browser calls the backend directly.
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const maxDuration = 60

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const url  = new URL(req.url)
  const backendUrl = `${BACKEND}/${path}${url.search}`

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const init: RequestInit = {
      method:  req.method,
      headers,
      signal: AbortSignal.timeout(55000),
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = await req.text()
      if (body) init.body = body
    }

    const res = await fetch(backendUrl, init)

    // Handle plain text responses (e.g. chat)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/plain')) {
      const text = await res.text()
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': contentType || 'application/json' },
    })

  } catch (err) {
    return NextResponse.json(
      { error: 'Backend unreachable. Make sure the backend is running on port 8000.' },
      { status: 502 }
    )
  }
}

export const GET    = proxy
export const POST   = proxy
export const PA