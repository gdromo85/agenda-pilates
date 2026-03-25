const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function fetchJson(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts)
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

export default { fetchJson }
