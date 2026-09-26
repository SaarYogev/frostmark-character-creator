#!/usr/bin/env python3
"""
Resilience & Ingest Verification Script for Backgrounds TOML.
Validates structural invariants of parsed background data without node/vite dependencies.
"""
import sys
from pathlib import Path

if sys.version_info < (3, 11):
    import tomli as tomllib
else:
    import tomllib

REPO_ROOT = Path(__file__).resolve().parent.parent
TOML_PATH = REPO_ROOT / "src" / "data" / "toml" / "backgrounds.toml"

CANONICAL_KINGDOMS = {
    "Applegate", "Armathain", "Beornhelm", "Crowhill", "Eastcreek",
    "Greenfield", "Karthmere", "Malgrave", "Oldwood", "Sirendale", "Stormholme"
}

def load_backgrounds():
    if not TOML_PATH.exists():
        raise FileNotFoundError(f"Missing backgrounds TOML file at {TOML_PATH}")
    with open(TOML_PATH, "rb") as f:
        data = tomllib.load(f)
    return data.get("backgrounds", [])

def verify_backgrounds_resilience():
    backgrounds = load_backgrounds()
    failures = []

    # Architectural invariant: 54 canonical backgrounds plus 5 legacy fallbacks for backwards compatibility
    if len(backgrounds) != 59:
        failures.append(f"Expected exactly 59 backgrounds, found {len(backgrounds)}")

    legacy_bg = [b for b in backgrounds if b.get("isLegacy") is True]
    canonical_bg = [b for b in backgrounds if b.get("isLegacy") is not True]

    if len(legacy_bg) != 5:
        failures.append(f"Expected exactly 5 legacy backgrounds, found {len(legacy_bg)}")

    if len(canonical_bg) != 54:
        failures.append(f"Expected exactly 54 canonical backgrounds, found {len(canonical_bg)}")

    general_canonical = [b for b in canonical_bg if b.get("category") == "General"]
    kingdom_canonical = [b for b in canonical_bg if b.get("category") == "Kingdom"]

    if len(general_canonical) != 19:
        failures.append(f"Expected exactly 19 canonical General backgrounds, found {len(general_canonical)}")

    if len(kingdom_canonical) != 35:
        failures.append(f"Expected exactly 35 canonical Kingdom backgrounds, found {len(kingdom_canonical)}")

    kingdoms_found = {b.get("kingdom") for b in kingdom_canonical if b.get("kingdom")}
    if kingdoms_found != CANONICAL_KINGDOMS:
        missing = CANONICAL_KINGDOMS - kingdoms_found
        extra = kingdoms_found - CANONICAL_KINGDOMS
        failures.append(f"Kingdom mismatch across kingdom backgrounds: missing={missing}, extra={extra}")

    # Core fields validation for character progression and UI stability
    for b in backgrounds:
        name = b.get("name", "")
        if not name or not isinstance(name, str) or not name.strip():
            failures.append(f"Background missing valid name: {b}")
            continue

        desc = b.get("desc", "")
        if not desc or not isinstance(desc, str) or not desc.strip():
            failures.append(f"Background '{name}' missing valid description")

        trait = b.get("trait", "")
        if not trait or not isinstance(trait, str) or not trait.strip():
            failures.append(f"Background '{name}' missing valid trait")

        gold = b.get("gold")
        if not isinstance(gold, int) or gold < 0:
            failures.append(f"Background '{name}' invalid gold: {gold}")

        free_sp = b.get("freeSkillPoints")
        if not isinstance(free_sp, int) or free_sp < 0:
            failures.append(f"Background '{name}' invalid freeSkillPoints: {free_sp}")

        # MediaWiki scraping artifacts check: unrendered template tags or empty headings
        if name.endswith("()") or name.endswith("[]"):
            failures.append(f"Background '{name}' contains trailing empty parens/brackets")

    bg_map = {b.get("name"): b for b in backgrounds}

    # Canonical integrity: Hunter
    hunter = bg_map.get("Hunter")
    if not hunter:
        failures.append("Missing canonical background: 'Hunter'")
    else:
        if hunter.get("category") != "General":
            failures.append(f"Hunter category expected 'General', got '{hunter.get('category')}'")
        if hunter.get("trait") != "Expert Survivalist":
            failures.append(f"Hunter trait expected 'Expert Survivalist', got '{hunter.get('trait')}'")

    # Canonical integrity: Hermit requires fixed rank 1 allocations per Player's Guide specification
    hermit = bg_map.get("Hermit")
    if not hermit:
        failures.append("Missing canonical background: 'Hermit'")
    else:
        expected_hermit_ranks = {"Medicine": 1, "Survival": 1}
        if hermit.get("builtInRanks") != expected_hermit_ranks:
            failures.append(f"Hermit builtInRanks expected {expected_hermit_ranks}, got {hermit.get('builtInRanks')}")

    # Canonical integrity: Peeler Priest (Applegate)
    peeler = bg_map.get("Peeler Priest")
    if not peeler:
        failures.append("Missing canonical background: 'Peeler Priest'")
    else:
        if peeler.get("kingdom") != "Applegate":
            failures.append(f"Peeler Priest kingdom expected 'Applegate', got '{peeler.get('kingdom')}'")
        if peeler.get("category") != "Kingdom":
            failures.append(f"Peeler Priest category expected 'Kingdom', got '{peeler.get('category')}'")

    # Canonical integrity: Charlatan
    charlatan = bg_map.get("Charlatan")
    if not charlatan:
        failures.append("Missing canonical background: 'Charlatan'")
    else:
        if charlatan.get("trait") != "False Identity":
            failures.append(f"Charlatan trait expected 'False Identity', got '{charlatan.get('trait')}'")

    # Canonical integrity: Cultist
    cultist = bg_map.get("Cultist")
    if not cultist:
        failures.append("Missing canonical background: 'Cultist'")
    else:
        if cultist.get("trait") != "Occult Knowledge":
            failures.append(f"Cultist trait expected 'Occult Knowledge', got '{cultist.get('trait')}'")

    # Canonical integrity: Scholar
    scholar = bg_map.get("Scholar")
    if not scholar:
        failures.append("Missing canonical background: 'Scholar'")
    else:
        if scholar.get("trait") != "Researcher":
            failures.append(f"Scholar trait expected 'Researcher', got '{scholar.get('trait')}'")

    return failures

if __name__ == "__main__":
    failures = verify_backgrounds_resilience()
    if failures:
        print(f"FAILED Backgrounds Resilience Verification ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("PASSED Backgrounds Resilience Verification: All structural invariants hold!")
        sys.exit(0)
