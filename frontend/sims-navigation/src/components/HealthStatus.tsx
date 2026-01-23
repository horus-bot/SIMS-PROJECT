import { useEffect, useState } from "react"
import { fetchHealth , type HealthResponse } from "../lib/api/health"

export function HealthStatus() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchHealth()
      .then(res => {
        setData(res)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  if (loading) return <p>Checking backend status…</p>
  if (error) return <p style={{ color: "red" }}> Backend down</p>

  return (
    <p style={{ color: "green" }}>
       Backend healthy and strong suiiiii ({data?.status})
    </p>
  )
}
