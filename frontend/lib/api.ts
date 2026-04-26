// ─────────────────────────────────────────────────
// NEXUS — API Client
// ─────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

// ── Dashboard ─────────────────────────────────────
export const api = {
  dashboard: {
    metrics:  () => get('/api/dashboard/metrics'),
    activity: (limit = 20) => get(`/api/dashboard/activity?limit=${limit}`),
    pulse:    () => get('/api/dashboard/org-pulse'),
  },

  emails: {
    list:         (status?: string) => get(`/api/emails/${status ? `?status=${status}` : ''}`),
    get:          (id: string)      => get(`/api/emails/${id}`),
    process:      (id: string)      => post(`/api/emails/${id}/process`),
    approveDraft: (id: string)      => post(`/api/emails/${id}/approve-draft`),
    archive:      (id: string)      => post(`/api/emails/${id}/archive`),
  },

  meetings: {
    list:          ()          => get('/api/meetings/'),
    get:           (id: string) => get(`/api/meetings/${id}`),
    generateBrief: (id: string) => post(`/api/meetings/${id}/generate-brief`),
    postMeeting:   (id: string, notes: string) => post(`/api/meetings/${id}/post-meeting`, { notes }),
  },

  projects: {
    list:   ()               => get('/api/projects/'),
    get:    (id: string)     => get(`/api/projects/${id}`),
    assess: (id: string)     => post(`/api/projects/${id}/assess`),
    update: (id: string, body: object) => fetch(`${BASE}/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),
  },

  decisions: {
    list:    (status?: string) => get(`/api/decisions/${status ? `?status=${status}` : ''}`),
    get:     (id: string)      => get(`/api/decisions/${id}`),
    resolve: (id: string, resolution: string) => post(`/api/decisions/${id}/resolve`, { resolution }),
  },
}

// SWR fetcher
export const fetcher = (url: string) => fetch(`${BASE}${url}`).then(r => r.json())
