from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json

from groq import Groq

router = APIRouter(prefix="/intent", tags=["Intent"])

# -------------------- Request/Response Schemas --------------------

class IntentRequest(BaseModel):
    text: str

class IntentResponse(BaseModel):
    intent: str
    origin_place: str | None = None
    destination_place: str | None = None


# -------------------- Groq Client --------------------

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")
    return Groq(api_key=api_key)


# -------------------- Endpoint --------------------

@router.post("/", response_model=IntentResponse)
def extract_intent(req: IntentRequest):
    """
    Extract intent + origin + destination from user text.
    """

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # ✅ allowed destinations list (from your system)
    allowed_places = [
        "BW204",
        "B wing Staff room",
        "BW206",
        "BW207",
        "BW208",
        "HOD ETECH",
        "BWING STAFF ROOM",
        "ECE STAFF ROOM",
        "ELECTRONIC AND CIRCUIT LAB",
        "NS LAB"
    ]

    prompt = f"""
You are an intent extractor for an indoor navigation app.

User text: "{text}"

Pick origin_place and destination_place ONLY from this allowed list:
{allowed_places}

Rules:
- If user says "go to X" then origin_place can be null and destination_place is X
- If user says "from X to Y" then origin_place is X and destination_place is Y
- If unsure, keep fields null
- Output ONLY valid JSON. No extra text.

JSON format:
{{
  "intent": "NAVIGATE" | "UNKNOWN",
  "origin_place": string|null,
  "destination_place": string|null
}}
"""

    client = get_groq_client()

    try:
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Return ONLY JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )

        content = res.choices[0].message.content.strip()

        # ✅ Parse JSON safely
        data = json.loads(content)

        return {
            "intent": data.get("intent", "UNKNOWN"),
            "origin_place": data.get("origin_place"),
            "destination_place": data.get("destination_place"),
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"Groq returned non-JSON output: {content}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

#test
if __name__ == "__main__":
    text = input("Enter text: ")
    req = IntentRequest(text=text)
    result = extract_intent(req)
    print(result)

