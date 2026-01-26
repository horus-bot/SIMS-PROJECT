const API_BASE = import.meta.env.VITE_API_BASE_URL

if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is not defined")
}


export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    let message = `API error: ${res.status}`

    try {
      const data = await res.json()
      message = data?.detail || message
    } catch {
      
    }

    throw new Error(message)
  }

  return res.json() as Promise<T>
}
