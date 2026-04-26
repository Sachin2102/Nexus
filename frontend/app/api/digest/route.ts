import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const maxDuration = 60 // allow up to 60s for digest generation

export async function POST(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/digest/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(55000), // 55s timeout
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Backend error