from functools import lru_cache
from pathlib import Path
from typing import Any
import ast

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
import re

from groq import Groq
from dotenv import load_dotenv
from rapidfuzz import fuzz

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")

router = APIRouter(prefix="/intent", tags=["Intent"])

# -------------------- Load Data --------------------

with (BASE_DIR / "data" / "merged_destinations.json").open(encoding="utf-8") as f:
    DESTINATIONS = json.load(f)["destinations"]

# -------------------- Request/Response Schemas --------------------

class IntentRequest(BaseModel):
    text: str

class IntentResponse(BaseModel):
    intent: str
    origin_place: str | None = None
    destination_place: str | None = None
    node: str | None = None

# -------------------- Helpers --------------------

SEARCH_THRESHOLD = 68
MAX_CANDIDATES = 10
FLOOR_KEYWORDS = {
    "ground floor": 0,
    "first floor": 1,
    "1st floor": 1,
    "second floor": 2,
    "2nd floor": 2,
    "third floor": 3,
    "3rd floor": 3,
    "fourth floor": 4,
    "4th floor": 4,
    "fifth floor": 5,
    "5th floor": 5,
}
ENTRANCE_ALIASES = ["entrance", "entry", "main entrance", "gate"]

def normalize_for_search(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()

def extract_floor(text: str | None) -> int | None:
    if not text:
        return None

    normalized_text = normalize_for_search(text)
    for phrase, floor in FLOOR_KEYWORDS.items():
        if phrase in normalized_text:
            return floor
    return None

def extract_origin_floor_hint(text: str) -> int | None:
    normalized_text = normalize_for_search(text)
    for phrase, floor in FLOOR_KEYWORDS.items():
        if (
            f"from {phrase}" in normalized_text
            or f"at {phrase}" in normalized_text
            or f"in {phrase}" in normalized_text
        ):
            return floor
    return None

def extract_destination_floor_hint(text: str) -> int | None:
    normalized_text = normalize_for_search(text)
    for phrase, floor in FLOOR_KEYWORDS.items():
        if (
            f"to {phrase}" in normalized_text
            or f"towards {phrase}" in normalized_text
            or f"on {phrase}" in normalized_text
        ):
            return floor
    return None

def extract_room_number(text: str | None) -> str | None:
    if not text:
        return None

    match = re.search(r"\b\d{3,4}\b", text)
    return match.group(0) if match else None

def infer_floor_from_room_number(room: str | None) -> int | None:
    if not room:
        return None

    if not room[0].isdigit():
        return None

    inferred_floor = int(room[0])
    if inferred_floor in {0, 1, 2, 3, 4, 5}:
        return inferred_floor
    return None

def match_room(room: str, destinations: dict, preferred_floor: int | None = None) -> str | None:
    exact_matches = []

    for dest_id, data in destinations.items():
        if str(data.get("name", "")) == room:
            exact_matches.append(dest_id)

    if not exact_matches:
        return None

    if preferred_floor is not None:
        for dest_id in exact_matches:
            if destinations[dest_id].get("floor") == preferred_floor:
                return dest_id

    inferred_floor = infer_floor_from_room_number(room)
    if inferred_floor is not None:
        for dest_id in exact_matches:
            if destinations[dest_id].get("floor") == inferred_floor:
                return dest_id

    return exact_matches[0]

def filter_by_floor(candidates: list[dict], floor: int | None):
    if floor is None:
        return candidates
    return [candidate for candidate in candidates if candidate.get("floor") == floor]

def build_candidate(dest_id: str, destinations: dict):
    return {
        "id": dest_id,
        "name": destinations[dest_id]["name"],
        "floor": destinations[dest_id]["floor"],
    }

def resolve_candidates(query: str, destinations: dict, floor_hint: int | None = None):
    room = extract_room_number(query)
    if room:
        room_match = match_room(room, destinations, preferred_floor=floor_hint)
        if room_match:
            return [build_candidate(room_match, destinations)]
        # Keep room numbers deterministic: if no exact room match, do not fuzzy-match to nearby rooms.
        return []

    candidates = search_locations(query, destinations, limit=MAX_CANDIDATES)
    return filter_by_floor(candidates, floor_hint)

def enrich_entrance_aliases(destinations: dict):
    for data in destinations.values():
        name_normalized = normalize_for_search(str(data.get("name", "")))
        id_normalized = normalize_for_search(str(data.get("id", "")))
        is_entrance_like = (
            "entrance" in name_normalized
            or "entry" in name_normalized
            or "gate" in name_normalized
            or "reception" in name_normalized
            or "reception" in id_normalized
        )
        if not is_entrance_like:
            continue

        aliases = data.setdefault("aliases", [])
        existing = {
            normalize_for_search(str(alias))
            for alias in aliases
            if isinstance(alias, str) and alias.strip()
        }

        for alias in ENTRANCE_ALIASES:
            alias_normalized = normalize_for_search(alias)
            if alias_normalized not in existing:
                aliases.append(alias)
                existing.add(alias_normalized)

enrich_entrance_aliases(DESTINATIONS)

def parse_json_from_llm(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    candidates = [cleaned]
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        candidates.insert(0, match.group(0))

    parsed = None
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            break
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(candidate)
                break
            except (ValueError, SyntaxError):
                continue

    if parsed is None:
        raise json.JSONDecodeError("Unable to parse model output as JSON", cleaned, 0)

    if not isinstance(parsed, dict):
        raise json.JSONDecodeError("Expected top-level JSON object", cleaned, 0)

    return parsed

def extract_entities_with_rules(text: str) -> dict[str, str | None]:
    normalized = re.sub(r"\s+", " ", text).strip()

    patterns = [
        re.compile(r"\bfrom\s+(.+?)\s+to\s+(.+)$", flags=re.IGNORECASE),
        re.compile(r"\bi\s+am\s+(?:at|in)\s+(.+?)\s+(?:and\s+)?(?:go|navigate|take\s+me)\s+to\s+(.+)$", flags=re.IGNORECASE),
        re.compile(r"\b(?:go|navigate|take\s+me|bring\s+me)\s+to\s+(.+)$", flags=re.IGNORECASE),
    ]

    for idx, pattern in enumerate(patterns):
        match = pattern.search(normalized)
        if not match:
            continue

        if idx < 2:
            origin, destination = match.group(1).strip(), match.group(2).strip()
            return {
                "origin": origin or None,
                "destination": destination or None,
            }

        destination = match.group(1).strip()
        return {
            "origin": None,
            "destination": destination or None,
        }

    return {
        "origin": None,
        "destination": None,
    }

def validate_location_id(location_id: Any) -> str | None:
    if isinstance(location_id, str) and location_id in DESTINATIONS:
        return location_id
    return None

def search_locations(query: str, destinations: dict, limit: int = MAX_CANDIDATES):
    normalized_query = normalize_for_search(query)
    if not normalized_query:
        return []

    query_tokens = [token for token in normalized_query.split() if len(token) >= 2]
    results = []

    for data in destinations.values():
        name = normalize_for_search(str(data.get("name", "")))
        aliases = [
            normalize_for_search(str(alias))
            for alias in data.get("aliases", [])
            if alias
        ]

        if not name and not aliases:
            continue

        best_score = 0
        if name:
            best_score = max(
                best_score,
                fuzz.partial_ratio(normalized_query, name),
                fuzz.token_set_ratio(normalized_query, name),
            )

        for alias in aliases:
            if not alias:
                continue
            best_score = max(
                best_score,
                fuzz.partial_ratio(normalized_query, alias),
                fuzz.token_set_ratio(normalized_query, alias),
            )
            if len(alias) >= 3 and alias in normalized_query:
                best_score = max(best_score, 95)

        token_hits = sum(
            1
            for token in query_tokens
            if token in name or any(token in alias for alias in aliases)
        )
        boosted_score = best_score + min(token_hits * 3, 12)

        if boosted_score >= SEARCH_THRESHOLD:
            results.append((boosted_score, data))

    results.sort(key=lambda x: (x[0], x[1].get("id", "")), reverse=True)

    return [
        {
            "id": d["id"],
            "name": d["name"],
            "floor": d["floor"],
        }
        for _, d in results[:limit]
    ]

def build_prompt(text: str, origin_candidates: list[dict], dest_candidates: list[dict]):
    return f"""
User input:
"{text}"

Origin candidates:
{json.dumps(origin_candidates, indent=2)}

Destination candidates:
{json.dumps(dest_candidates, indent=2)}

Select the BEST origin and destination.

Rules:
- Use meaning, not exact match
- Understand informal language (e.g., "xray", "scan", "washroom")
- If origin is not mentioned, keep origin_place null
- Always try to find a destination from candidates

Return ONLY JSON:
{{
  "intent": "NAVIGATE" | "UNKNOWN",
  "origin_place": "location_id or null",
  "destination_place": "location_id or null"
}}
"""

def extract_entities_with_llm(text: str, client: Groq) -> dict[str, str | None]:
    prompt = f"""
Extract origin and destination from the user input.

User input:
"{text}"

Rules:
- "from X to Y" means origin is X and destination is Y
- "go to X" means destination is X and origin is null
- "I am at X go to Y" means origin is X and destination is Y
- If unclear, keep fields null

Return ONLY JSON:
{{
  "origin": "string or null",
  "destination": "string or null"
}}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Return ONLY JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )

    content = (response.choices[0].message.content or "").strip()
    data = parse_json_from_llm(content)

    origin = data.get("origin")
    destination = data.get("destination")

    return {
        "origin": origin.strip() if isinstance(origin, str) and origin.strip() else None,
        "destination": destination.strip() if isinstance(destination, str) and destination.strip() else None,
    }

# -------------------- LLM Setup --------------------

@lru_cache(maxsize=1)
def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment")
    return Groq(api_key=api_key)


# -------------------- Endpoint --------------------

@router.post("/", response_model=IntentResponse)
def extract_intent(req: IntentRequest):
    """
    Extract intent, origin, and destination from user text.
    """

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    client = get_groq_client()

    try:
        entities = extract_entities_with_llm(text, client)
    except Exception:
        entities = extract_entities_with_rules(text)

    origin_text = entities.get("origin") or ""
    destination_text = entities.get("destination") or text

    origin_floor_hint = extract_floor(origin_text)
    if origin_floor_hint is None:
        origin_floor_hint = extract_origin_floor_hint(text)

    destination_floor_hint = extract_floor(destination_text)
    if destination_floor_hint is None:
        destination_floor_hint = extract_destination_floor_hint(text)

    origin_candidates = resolve_candidates(origin_text, DESTINATIONS, floor_hint=origin_floor_hint)
    destination_candidates = resolve_candidates(destination_text, DESTINATIONS, floor_hint=destination_floor_hint)
    origin_was_requested = bool(origin_text)

    def pick_origin_from_candidates() -> str | None:
        if not origin_candidates:
            return None
        if len(origin_candidates) == 1:
            return origin_candidates[0]["id"]
        if origin_was_requested:
            return origin_candidates[0]["id"]
        return None

    # If parsed destination was too narrow, fall back to full text.
    destination_room = extract_room_number(destination_text)
    if not destination_candidates and entities.get("destination") and not destination_room:
        fallback_floor_hint = destination_floor_hint or extract_destination_floor_hint(text)
        destination_candidates = resolve_candidates(text, DESTINATIONS, floor_hint=fallback_floor_hint)

    if not destination_candidates:
        origin_id = pick_origin_from_candidates()
        return {
            "intent": "UNKNOWN",
            "origin_place": origin_id,
            "destination_place": None,
            "node": None,
        }

    if len(destination_candidates) == 1:
        dest_id = destination_candidates[0]["id"]
        origin_id = pick_origin_from_candidates()
        return {
            "intent": "NAVIGATE",
            "origin_place": origin_id,
            "destination_place": dest_id,
            "node": DESTINATIONS[dest_id]["node"],
        }

    prompt = build_prompt(text, origin_candidates, destination_candidates)

    def fallback_decision():
        dest_id = destination_candidates[0]["id"] if destination_candidates else None
        origin_id = pick_origin_from_candidates()
        return {
            "intent": "NAVIGATE" if dest_id else "UNKNOWN",
            "origin_place": origin_id,
            "destination_place": dest_id,
            "node": DESTINATIONS[dest_id]["node"] if dest_id else None,
        }

    try:
        res = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Return ONLY JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )

        content = (res.choices[0].message.content or "").strip()
        data = parse_json_from_llm(content)

        origin_id = validate_location_id(data.get("origin_place"))
        dest_id = validate_location_id(data.get("destination_place"))
        intent = data.get("intent", "UNKNOWN")

        if not origin_id:
            origin_id = pick_origin_from_candidates()

        if not dest_id:
            intent = "UNKNOWN"

        return {
            "intent": intent,
            "origin_place": origin_id,
            "destination_place": dest_id,
            "node": DESTINATIONS[dest_id]["node"] if dest_id else None,
        }

    except (json.JSONDecodeError, ValueError):
        return fallback_decision()
    except Exception:
        return fallback_decision()

