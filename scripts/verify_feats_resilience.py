#!/usr/bin/env python3
"""
Resilience & Ingest Verification Script for Feats TOML.
Validates structural invariants of parsed feats data without node/vite dependencies.
"""
import sys
from pathlib import Path
from collections import Counter

if sys.version_info < (3, 11):
    import tomli as tomllib
else:
    import tomllib

REPO_ROOT = Path(__file__).resolve().parent.parent
TOML_PATH = REPO_ROOT / "src" / "data" / "toml" / "feats.toml"

EXPECTED_CATEGORY_COUNTS = {
    "General Feats": 31,
    "Weapon Feats": 9,
    "Armor Feats": 6,
    "Skill Feats": 17,
    "Tool Feats": 3,
}

def load_feats():
    if not TOML_PATH.exists():
        raise FileNotFoundError(f"Missing feats TOML file at {TOML_PATH}")
    with open(TOML_PATH, "rb") as f:
        data = tomllib.load(f)
    return data.get("feats", [])

def verify_feats_resilience():
    feats = load_feats()
    failures = []

    # Architectural invariant: exactly 66 feats across standard categories
    if len(feats) != 66:
        failures.append(f"Expected exactly 66 feats, found {len(feats)}")

    category_counts = Counter(f.get("category") for f in feats)
    for cat, expected_count in EXPECTED_CATEGORY_COUNTS.items():
        actual_count = category_counts.get(cat, 0)
        if actual_count != expected_count:
            failures.append(f"Category '{cat}' expected {expected_count} feats, got {actual_count}")

    unknown_categories = set(category_counts.keys()) - set(EXPECTED_CATEGORY_COUNTS.keys())
    if unknown_categories:
        failures.append(f"Found unrecognized feat categories: {unknown_categories}")

    # Validation of mandatory schema fields required for feat selection and UI rendering
    mandatory_fields = ["name", "category", "desc", "prerequisite"]
    for f in feats:
        name = f.get("name", "")
        if not name or not isinstance(name, str) or not name.strip():
            failures.append(f"Feat missing valid name: {f}")
            continue

        for field in mandatory_fields:
            if field not in f or f[field] is None:
                failures.append(f"Feat '{name}' missing mandatory field: '{field}'")
            elif field != "prerequisite" and isinstance(f[field], str) and not f[field].strip():
                failures.append(f"Feat '{name}' has empty mandatory field: '{field}'")

    feat_map = {f.get("name"): f for f in feats}

    # Canonical integrity: Actor
    actor = feat_map.get("Actor")
    if not actor:
        failures.append("Missing canonical feat: 'Actor'")
    else:
        if actor.get("category") != "General Feats":
            failures.append(f"Actor category expected 'General Feats', got '{actor.get('category')}'")

    # Canonical integrity: Alert
    alert = feat_map.get("Alert")
    if not alert:
        failures.append("Missing canonical feat: 'Alert'")
    else:
        if alert.get("category") != "General Feats":
            failures.append(f"Alert category expected 'General Feats', got '{alert.get('category')}'")

    # Canonical integrity: Defensive Duelist
    dd = feat_map.get("Defensive Duelist")
    if not dd:
        failures.append("Missing canonical feat: 'Defensive Duelist'")
    else:
        if dd.get("category") != "General Feats":
            failures.append(f"Defensive Duelist category expected 'General Feats', got '{dd.get('category')}'")

    # Canonical integrity: Heavily Armored
    ha = feat_map.get("Heavily Armored")
    if not ha:
        failures.append("Missing canonical feat: 'Heavily Armored'")
    else:
        if ha.get("category") != "Armor Feats":
            failures.append(f"Heavily Armored category expected 'Armor Feats', got '{ha.get('category')}'")

    # Canonical integrity: Medic
    medic = feat_map.get("Medic")
    if not medic:
        failures.append("Missing canonical feat: 'Medic'")
    else:
        if medic.get("category") != "Skill Feats":
            failures.append(f"Medic category expected 'Skill Feats', got '{medic.get('category')}'")

    return failures

if __name__ == "__main__":
    failures = verify_feats_resilience()
    if failures:
        print(f"FAILED Feats Resilience Verification ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("PASSED Feats Resilience Verification: All structural invariants hold!")
        sys.exit(0)
