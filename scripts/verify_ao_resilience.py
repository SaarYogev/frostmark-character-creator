#!/usr/bin/env python3
"""
Resilience & Ingest Verification Script for Abilities TOML (Seam A).
Validates structural invariants of parsed ability data without node/vite dependencies.
"""
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    import tomli as tomllib
else:
    import tomllib

REPO_ROOT = Path(__file__).resolve().parent.parent
TOML_PATH = REPO_ROOT / "src" / "data" / "toml" / "abilities.toml"

def load_abilities():
    if not TOML_PATH.exists():
        raise FileNotFoundError(f"Missing abilities TOML file at {TOML_PATH}")
    with open(TOML_PATH, "rb") as f:
        data = tomllib.load(f)
    return data.get("abilities", [])

def get_features(abilities, origin, level, selection):
    return [
        a for a in abilities
        if a.get("origin") == origin and a.get("level") == level and a.get("selection") == selection
    ]

def verify_seam_a():
    abilities = load_abilities()
    failures = []

    disc_l2 = [a.get("name", "") for a in get_features(abilities, "Discipline", 2, "Primary")]
    if disc_l2 != ["Mastery"]:
        failures.append(f"Discipline L2 Primary expected ['Mastery'], got {disc_l2}")

    occult_l1 = sorted([a.get("name", "") for a in get_features(abilities, "Occult Student", 1, "Primary")])
    expected_occult = sorted([
        "Arcane Tradition (Abjuration)",
        "Arcane Tradition (Conjuration)",
        "Arcane Tradition (Divination)",
        "Arcane Tradition (Enchantment)",
        "Arcane Tradition (Evocation)",
        "Arcane Tradition (Illusion)",
        "Arcane Tradition (Necromancy)",
        "Arcane Tradition (Transmutation)",
        "Arcane Tradition (War Magic)"
    ])
    if occult_l1 != expected_occult:
        failures.append(f"Occult Student L1 Primary expected {expected_occult}, got {occult_l1}")

    pact_l3 = sorted([a.get("name", "") for a in get_features(abilities, "Pact", 3, "Primary")])
    expected_pact = sorted([
        "Pact Boon (Blade)",
        "Pact Boon (Bond)",
        "Pact Boon (Stellar Bond)",
        "Pact Boon (Tome)"
    ])
    if pact_l3 != expected_pact:
        failures.append(f"Pact L3 Primary expected {expected_pact}, got {pact_l3}")

    pred_l3 = sorted([a.get("name", "") for a in get_features(abilities, "Predator", 3, "Primary")])
    expected_pred = sorted([
        "Conclave (Butcher of Behemoths)",
        "Conclave (Exterminator of Woe)",
        "Conclave (Hunter)",
        "Conclave (Ranger)",
        "Conclave (Realm Marshal)"
    ])
    if pred_l3 != expected_pred:
        failures.append(f"Predator L3 Primary expected {expected_pred}, got {pred_l3}")

    ua_l2 = [a.get("name", "") for a in get_features(abilities, "Unique Ancestry", 2, "Primary")]
    if ua_l2 != ["Font of Magic"]:
        failures.append(f"Unique Ancestry L2 Primary expected ['Font of Magic'], got {ua_l2}")

    do_l1 = sorted([a.get("name", "") for a in get_features(abilities, "Divine Oath", 1, "Primary")])
    expected_do = sorted(["Divine Sense", "Proclaim Judgement"])
    if do_l1 != expected_do:
        failures.append(f"Divine Oath L1 Primary expected {expected_do}, got {do_l1}")

    empty_descs = [f"{a.get('origin')} L{a.get('level')}: {a.get('name')}" for a in abilities if not a.get("desc", "").strip()]
    if empty_descs:
        failures.append(f"Found {len(empty_descs)} abilities with empty description: {empty_descs[:5]}")

    empty_suffixes = [f"{a.get('origin')} L{a.get('level')}: {a.get('name')}" for a in abilities if a.get("name", "").endswith("()") or a.get("name", "").endswith("[]")]
    if empty_suffixes:
        failures.append(f"Found {len(empty_suffixes)} abilities with trailing empty parens/brackets: {empty_suffixes[:5]}")

    prereqs = [f"{a.get('origin')} L{a.get('level')}: {a.get('name')}" for a in abilities if a.get("name", "").startswith("Prerequisite:")]
    if prereqs:
        failures.append(f"Found {len(prereqs)} abilities starting with 'Prerequisite:': {prereqs[:5]}")

    corrupted = [f"{a.get('origin')} L{a.get('level')}: {a.get('name')}" for a in abilities if "Oaths (Threat)" in a.get("name", "")]
    if corrupted:
        failures.append(f"Found {len(corrupted)} abilities with corrupted name 'Oaths (Threat)': {corrupted}")

    return failures

if __name__ == "__main__":
    failures = verify_seam_a()
    if failures:
        print(f"FAILED Seam A Verification ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("PASSED Seam A Verification: All resilient AO invariants hold!")
        sys.exit(0)
