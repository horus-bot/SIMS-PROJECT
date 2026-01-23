import { apiFetch } from "./client"

export type HealthResponse = {
  status: string
}

export function fetchHealth() {
  return apiFetch<HealthResponse>("/api/v1/health")
}
