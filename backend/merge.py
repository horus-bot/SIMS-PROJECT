import json
import re

# -------------------- CONFIG --------------------

files = {
    "data/graphData_firstfloor.json": 1,
    "data/graphData4th.json": 4,
    "data/graphData_5th.json": 5,
    "data/groundFloor.json": 0
}
ENTRANCE_ALIASES = ["entrance", "entry", "main entrance", "gate"]

# -------------------- HELPERS --------------------

def clean_name(name):
    return re.sub(r"\s+", " ", name).strip()

def generate_id(name, floor):
    base = clean_name(name).upper().replace(" ", "_")
    return f"{base}_F{floor}"

def build_aliases(name):
    normalized = clean_name(name).lower()
    aliases = {
        normalized,
        normalized.replace(" ", ""),
    }

    if any(keyword in normalized for keyword in ["reception", "entrance", "entry", "gate"]):
        aliases.update(ENTRANCE_ALIASES)

    return sorted(aliases)

# -------------------- MERGE --------------------

merged_destinations = {}

for file, floor in files.items():
    with open(file, "r", encoding="utf-8") as f:
        data = json.load(f)
        destinations = data.get("destinations", {})

        for name, info in destinations.items():
            clean = clean_name(name)
            unique_id = generate_id(clean, floor)

            merged_destinations[unique_id] = {
                "id": unique_id,
                "name": clean,
                "node": info.get("node"),
                "floor": floor,
                "aliases": build_aliases(clean)
            }

# -------------------- SAVE --------------------

with open("data/merged_destinations.json", "w") as f:
    json.dump({"destinations": merged_destinations}, f, indent=2)

print(f"✅ Total merged locations: {len(merged_destinations)}")