#!/usr/bin/env python3
"""
Resilience & Ingest Verification Script for Spells TOML.
Validates structural invariants of parsed spells data without node/vite dependencies.
"""
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    import tomli as tomllib
else:
    import tomllib

REPO_ROOT = Path(__file__).resolve().parent.parent
TOML_PATH = REPO_ROOT / "src" / "data" / "toml" / "spells.toml"

CANONICAL_SCHOOLS = {
    "Abjuration", "Conjuration", "Divination", "Enchantment",
    "Evocation", "Illusion", "Transmutation", "Vismancy"
}

EXPECTED_LEVELS = set(range(10))

def load_spells():
    if not TOML_PATH.exists():
        raise FileNotFoundError(f"Missing spells TOML file at {TOML_PATH}")
    with open(TOML_PATH, "rb") as f:
        data = tomllib.load(f)
    return data

def verify_spells_resilience():
    spells = load_spells()
    failures = []

    # Architectural invariant: extensive spell catalog of at least 350 spells
    if len(spells) < 350:
        failures.append(f"Expected at least 350 spells, found {len(spells)}")

    schools_found = set()
    levels_found = set()

    for name, s in spells.items():
        if not isinstance(name, str) or not name.strip():
            failures.append(f"Invalid spell name key: {name}")
            continue

        # Ingest cleaning invariant: MediaWiki edit markers and bracket artifacts must be stripped
        if name.endswith("[]") or name.endswith("()"):
            failures.append(f"Spell name '{name}' has trailing brackets/parens artifact")

        desc = s.get("desc", "")
        if not isinstance(desc, str) or not desc.strip():
            failures.append(f"Spell '{name}' missing valid description")
        elif desc.rstrip().endswith("[]"):
            failures.append(f"Spell '{name}' has unstripped trailing '[]' in description")

        school = s.get("school")
        if not school or school not in CANONICAL_SCHOOLS:
            failures.append(f"Spell '{name}' has invalid school: {school}")
        else:
            schools_found.add(school)

        lvl = s.get("level")
        if not isinstance(lvl, int) or lvl not in EXPECTED_LEVELS:
            failures.append(f"Spell '{name}' has invalid level: {lvl}")
        else:
            levels_found.add(lvl)

        ct = s.get("castingTime")
        if not isinstance(ct, str) or not ct.strip():
            failures.append(f"Spell '{name}' missing valid castingTime: {ct}")

        rng = s.get("range")
        if not isinstance(rng, int) or rng < 0:
            failures.append(f"Spell '{name}' invalid range: {rng}")

        duration = s.get("duration")
        if not isinstance(duration, str) or not duration.strip():
            failures.append(f"Spell '{name}' missing valid duration: {duration}")

        conc = s.get("concentration")
        if not isinstance(conc, bool):
            failures.append(f"Spell '{name}' invalid concentration boolean: {conc}")

        ritual = s.get("ritual")
        if not isinstance(ritual, bool):
            failures.append(f"Spell '{name}' invalid ritual boolean: {ritual}")

    missing_schools = CANONICAL_SCHOOLS - schools_found
    if missing_schools:
        failures.append(f"Missing canonical spell schools: {missing_schools}")

    missing_levels = EXPECTED_LEVELS - levels_found
    if missing_levels:
        failures.append(f"Missing spell levels: {missing_levels}")

    # Canonical integrity: Blade Ward
    blade_ward = spells.get("Blade Ward")
    if not blade_ward:
        failures.append("Missing canonical spell: 'Blade Ward'")
    else:
        if blade_ward.get("level") != 0 or blade_ward.get("school") != "Abjuration":
            failures.append(f"Blade Ward mismatch: level={blade_ward.get('level')}, school={blade_ward.get('school')}")

    # Canonical integrity: Shield
    shield = spells.get("Shield")
    if not shield:
        failures.append("Missing canonical spell: 'Shield'")
    else:
        if shield.get("level") != 1 or shield.get("school") != "Abjuration":
            failures.append(f"Shield mismatch: level={shield.get('level')}, school={shield.get('school')}")

    # Canonical integrity: Fireball
    fireball = spells.get("Fireball")
    if not fireball:
        failures.append("Missing canonical spell: 'Fireball'")
    else:
        if fireball.get("level") != 4 or fireball.get("school") != "Evocation":
            failures.append(f"Fireball mismatch: level={fireball.get('level')}, school={fireball.get('school')}")

    # Canonical integrity: Alarm
    alarm = spells.get("Alarm")
    if not alarm:
        failures.append("Missing canonical spell: 'Alarm'")
    else:
        if alarm.get("level") != 1 or alarm.get("school") != "Abjuration" or alarm.get("ritual") is not True:
            failures.append(f"Alarm mismatch: level={alarm.get('level')}, ritual={alarm.get('ritual')}")

    # Canonical integrity: Identify
    identify = spells.get("Identify")
    if not identify:
        failures.append("Missing canonical spell: 'Identify'")
    else:
        if identify.get("level") != 1 or identify.get("school") != "Divination" or identify.get("ritual") is not True:
            failures.append(f"Identify mismatch: level={identify.get('level')}, ritual={identify.get('ritual')}")

    # Canonical integrity: Detect Magic
    detect_magic = spells.get("Detect Magic")
    if not detect_magic:
        failures.append("Missing canonical spell: 'Detect Magic'")
    else:
        if detect_magic.get("level") != 1 or detect_magic.get("concentration") is not True:
            failures.append(f"Detect Magic mismatch: level={detect_magic.get('level')}, concentration={detect_magic.get('concentration')}")

    # Canonical integrity: Guidance
    guidance = spells.get("Guidance")
    if not guidance:
        failures.append("Missing canonical spell: 'Guidance'")
    else:
        if guidance.get("level") != 0 or guidance.get("concentration") is not True:
            failures.append(f"Guidance mismatch: level={guidance.get('level')}, concentration={guidance.get('concentration')}")

    return failures

if __name__ == "__main__":
    failures = verify_spells_resilience()
    if failures:
        print(f"FAILED Spells Resilience Verification ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("PASSED Spells Resilience Verification: All structural invariants hold!")
        sys.exit(0)
