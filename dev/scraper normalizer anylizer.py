import os
import json
import re
from collections import defaultdict, Counter

DATA_DIR = "./dev/store_database"

def load_store_files(data_dir=DATA_DIR):
    files = [f for f in os.listdir(data_dir) if f.endswith(".json")]
    stores = {}
    for f in files:
        path = os.path.join(data_dir, f)
        try:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
                stores[f.split(".")[0]] = data
        except Exception as e:
            print(f"❌ Error loading {f}: {e}")
    return stores

def extract_field_stats(store_data):
    stats = {}
    for store, items in store_data.items():
        if not isinstance(items, list):
            continue
        all_keys = Counter()
        unit_patterns = Counter()
        for p in items:
            all_keys.update(p.keys())
            unit = str(p.get("unitInfo") or p.get("unitSize") or "").lower()
            unit_patterns[unit] += 1
        stats[store] = {
            "total_products": len(items),
            "field_counts": all_keys,
            "unit_patterns": unit_patterns
        }
    return stats

def suggest_common_fields(stats):
    all_fields = [set(s["field_counts"].keys()) for s in stats.values()]
    common = set.intersection(*all_fields) if all_fields else set()
    missing = set.union(*all_fields) - common
    return common, missing

def suggest_unit_normalization(stats):
    known_map = {
        "g": "kg",
        "gram": "kg",
        "ml": "l",
        "milliliter": "l",
        "st": "stuk",
        "stuk": "stuk",
        "per stuk": "stuk",
        "zak": "pkg",
        "pak": "pkg",
        "pack": "pkg",
        "doos": "pkg",
    }
    unit_usage = Counter()
    for store, s in stats.items():
        for unit, count in s["unit_patterns"].items():
            unit_usage[unit] += count
    suggestions = {}
    for unit, count in unit_usage.items():
        for k, v in known_map.items():
            if re.search(rf"\b{k}\b", unit):
                suggestions[unit] = v
                break
    return suggestions

def main():
    print("🔍 Analyzing store JSON data...\n")
    data = load_store_files()
    stats = extract_field_stats(data)
    for store, info in stats.items():
        print(f"🛒 {store} → {info['total_products']} products")
        print("   Common fields:", ", ".join(list(info["field_counts"].keys())[:10]))
        print("   Units found:", list(info["unit_patterns"].keys())[:10])
        print()

    common, missing = suggest_common_fields(stats)
    print("📦 Common fields across stores:", common)
    print("⚠️ Missing fields:", missing)
    print()

    unit_suggestions = suggest_unit_normalization(stats)
    print("📏 Suggested unit normalizations:")
    for u, n in unit_suggestions.items():
        print(f"  - {u} → {n}")

if __name__ == "__main__":
    main()
