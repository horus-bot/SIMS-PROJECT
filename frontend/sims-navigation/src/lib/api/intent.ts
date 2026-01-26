import { apiFetch } from "./client";

export type IntentRequest = {
  text: string;
};

export type IntentResponse = {
  intent: "NAVIGATE" | "UNKNOWN";
  origin_place: string | null;
  destination_place: string | null;
};

export async function extractIntent(text: string) {
  return apiFetch<IntentResponse>("/api/v1/intent/", {
    method: "POST",
    body: JSON.stringify({ text } as IntentRequest),
  });
}
