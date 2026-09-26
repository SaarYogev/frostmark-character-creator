import os
import sys
import re
import json
from pypdf import PdfReader

# The canonical Frostmark rulebook is the sole deterministic source of truth for feats.
PDF_PATH = os.path.join(
    os.path.dirname(__file__), "..", "reference", "Frostmark RPG - Playing Frostmark 0.3.7.pdf"
)
OUTPUT_TOML_PATH = os.path.join(
    os.path.dirname(__file__), "..", "src", "data", "toml", "feats.toml"
)

# 0-indexed page indices 2 through 12 correspond to printed pages 2 through 12 (PDF pages 3 to 13).
FEAT_PAGE_START = 2
FEAT_PAGE_END = 13

# Ordered canonical feat roster partitioned across the 5 rulebook sections.
CATEGORY_FEATS = [
    (
        "General Feats",
        [
            "Actor", "Alert", "Athlete", "Charger", "Cloudshooter", "Defensive Duelist",
            "Dual Wielder", "Durable", "Elemental Adept", "Grappler", "Great Weapon Master",
            "Healer", "Inspiring Leader", "Keen Mind", "Linguist", "Lucky",
            "Mage Slayer", "Martial Adept", "Mobile", "Mounted Combatant", "Observant",
            "Resilient", "Ritual Caster", "Savage Attack", "Sentinel", "Sharpshooter",
            "Skilled", "Skulker", "Spell Sniper", "Tough", "War Caster"
        ]
    ),
    (
        "Weapon Feats",
        [
            "Bladed Mastery", "Brawler", "Crossbow Expert", "Fell Handed", "Flail Mastery",
            "Polearm Master", "Shield Master", "Spear Mastery", "Weapon Master"
        ]
    ),
    (
        "Armor Feats",
        [
            "Lightly Armored", "Light Armor Master", "Moderately Armored", "Medium Armor Master",
            "Heavily Armored", "Heavy Armored Master"
        ]
    ),
    (
        "Skill Feats",
        [
            "Acrobat", "Animal Handling", "Diplomat", "Empathic", "Historian",
            "Investigator", "Medic", "Menacing", "Naturalist", "Occultist",
            "Perceptive", "Performer", "Quick-Fingered", "Silver-Tongued", "Stealthy",
            "Survivalist", "Theologian"
        ]
    ),
    (
        "Tool Feats",
        [
            "Alchemist", "Gourmand", "Master of Disguise"
        ]
    )
]

VALID_STATS = [
    "Brawn", "Dexterity", "Vitality", "Intelligence",
    "Cunning", "Resolve", "Presence", "Manipulation", "Composure"
]

def normalize_skill_name(raw: str) -> str:
    s = raw.strip().rstrip(".,")
    if re.search(r"academics\s*\(\s*history\s*\)", s, re.I):
        return "Academics: History"
    if re.search(r"academics\s*:\s*alchemy", s, re.I):
        return "Academics: Alchemy"
    if re.search(r"arts\s*&\s*craft\s*:\s*cooking", s, re.I):
        return "Arts & Craft: Cooking"
    if re.search(r"crafts?\s*&\s*art\s*:\s*acting", s, re.I):
        return "Arts & Craft: Acting"

    known = [
        "Athletics", "Acrobatics", "Subterfuge", "Stealth", "Animal Handling",
        "Persuasion", "Deception", "Intimidation", "Empathy", "Leadership",
        "Insight", "Perception", "Survival", "Medicine", "Investigation",
        "Nature", "Religion", "Occult"
    ]
    for k in known:
        if k.lower() == s.lower():
            return k
    return s

def extract_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    pages_text = []
    for idx in range(FEAT_PAGE_START, min(FEAT_PAGE_END, len(reader.pages))):
        text = reader.pages[idx].extract_text() or ""
        # Strip header page number line to prevent digits merging into body text.
        text = re.sub(r"^\s*\d+\s*\n", "", text.lstrip())
        pages_text.append(text)
    return "\n".join(pages_text)

def locate_feat_spans(full_text: str) -> list[tuple[int, int, str, str]]:
    spans = []
    for cat, feats in CATEGORY_FEATS:
        for f in feats:
            pattern = r"(?:^|\n)\s*" + re.escape(f) + r"\s*(?:\n|$)"
            m = re.search(pattern, full_text)
            if not m:
                raise ValueError(f"Could not locate feat '{f}' ({cat}) in PDF text")
            spans.append((m.start(), m.end(), f, cat))
    spans.sort(key=lambda x: x[0])
    return spans

def parse_feat_block(name: str, category: str, raw_text: str) -> dict:
    prerequisite = ""
    prereq_match = re.search(r"Prerequisite\s*:\s*([^\n]+)", raw_text, re.I)
    if prereq_match:
        prerequisite = prereq_match.group(1).strip()

    ability_score_increase = None
    asi_match = re.search(
        r"Ability score\s*:\s*Increase (?:your|one)\s+([^.\n]+?)(?:score)?\s+by\s+\+?(\d+)",
        raw_text,
        re.I
    )
    if asi_match:
        raw_stats = asi_match.group(1)
        val = int(asi_match.group(2))
        matched_stats = [
            stat for stat in VALID_STATS
            if re.search(r"\b" + re.escape(stat) + r"\b", raw_stats, re.I)
        ]
        # Preserve natural reading order of ability choices from source text.
        matched_stats.sort(key=lambda s: raw_stats.lower().index(s.lower()))
        if matched_stats:
            ability_score_increase = {
                "choices": matched_stats,
                "value": val
            }

    skill_ranks = []
    for rm in re.finditer(r"(?:Gain|gain) a rank in ([A-Za-z0-9:&() ]+?)(?:\.|$)", raw_text):
        raw_skill = rm.group(1)
        norm_skill = normalize_skill_name(raw_skill)
        allow_r5 = bool(re.search(r"gain rank 5 (?:in (?:the|this) skill|with \w+)", raw_text, re.I))
        if not any(sr["skill"] == norm_skill for sr in skill_ranks):
            entry = {
                "skill": norm_skill,
                "rank": 1
            }
            if allow_r5:
                entry["allow_rank_5"] = True
            skill_ranks.append(entry)

    armor_proficiencies = []
    if re.search(r"proficiency with light armor and shields", raw_text, re.I):
        armor_proficiencies = ["Light", "Shields"]
    elif re.search(r"proficiency with medium armor and shields", raw_text, re.I):
        armor_proficiencies = ["Medium", "Shields"]
    elif re.search(r"proficiency with heavy armor and shields", raw_text, re.I):
        armor_proficiencies = ["Heavy", "Shields"]
    elif re.search(r"proficiency with shields", raw_text, re.I):
        armor_proficiencies = ["Shields"]

    weapon_proficiencies = []
    if re.search(r"proficient with improvised weapons", raw_text, re.I):
        weapon_proficiencies.append("Improvised Weapons")
    if re.search(r"proficiency with all simple and martial weapons", raw_text, re.I):
        weapon_proficiencies.extend(["Simple Weapons", "Martial Weapons"])

    saving_throws = []
    st_match = re.search(
        r"your (Brawn|Dexterity|Vitality|Intelligence|Cunning|Resolve|Presence|Manipulation|Composure) saving throw score by \+(\d+)",
        raw_text,
        re.I
    )
    if st_match:
        saving_throws.append({
            "stat": st_match.group(1),
            "bonus": int(st_match.group(2))
        })

    ac_bonus = None
    if re.search(r"Increase your (?:AV|AC) by \+(\d+)", raw_text, re.I):
        ac_bonus = int(re.search(r"Increase your (?:AV|AC) by \+(\d+)", raw_text, re.I).group(1))
    elif re.search(r"gain a \+(\d+) bonus to (?:AV|AC) while you are wielding a separate melee weapon", raw_text, re.I):
        ac_bonus = int(re.search(r"gain a \+(\d+) bonus to (?:AV|AC) while you are wielding a separate melee weapon", raw_text, re.I).group(1))

    # Reconstruct coherent paragraphs from multi-line text by folding line wraps within bullets.
    lines = raw_text.split("\n")
    desc_paragraphs = []
    curr_para = []
    for line in lines:
        ls = line.strip()
        if not ls:
            if curr_para:
                desc_paragraphs.append(" ".join(curr_para))
                curr_para = []
            continue
        if ls.startswith("❖") or ls.startswith("Prerequisite:") or ls.startswith("Ability score:"):
            if curr_para:
                desc_paragraphs.append(" ".join(curr_para))
                curr_para = []
            curr_para.append(ls)
        else:
            curr_para.append(ls)
    if curr_para:
        desc_paragraphs.append(" ".join(curr_para))

    clean_desc = "\n\n".join(desc_paragraphs).strip()

    feat = {
        "name": name,
        "category": category,
        "prerequisite": prerequisite,
        "desc": clean_desc
    }
    if ability_score_increase:
        feat["ability_score_increase"] = ability_score_increase
    if skill_ranks:
        feat["skill_ranks"] = skill_ranks
    if armor_proficiencies:
        feat["armor_proficiencies"] = armor_proficiencies
    if weapon_proficiencies:
        feat["weapon_proficiencies"] = weapon_proficiencies
    if saving_throws:
        feat["saving_throws"] = saving_throws
    if ac_bonus is not None:
        feat["ac_bonus"] = ac_bonus

    return feat

def serialize_toml(feats: list[dict]) -> str:
    header = (
        "# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!\n"
        "# Generated by scripts/ingest_feats_pdf.py\n\n"
    )
    chunks = [header]

    for f in feats:
        chunks.append("[[feats]]\n")
        chunks.append(f"name = {json.dumps(f['name'])}\n")
        chunks.append(f"category = {json.dumps(f['category'])}\n")
        chunks.append(f"prerequisite = {json.dumps(f['prerequisite'])}\n")
        chunks.append(f"desc = {json.dumps(f['desc'])}\n")

        if "ac_bonus" in f:
            chunks.append(f"ac_bonus = {f['ac_bonus']}\n")

        if "armor_proficiencies" in f:
            chunks.append(f"armor_proficiencies = {json.dumps(f['armor_proficiencies'])}\n")

        if "weapon_proficiencies" in f:
            chunks.append(f"weapon_proficiencies = {json.dumps(f['weapon_proficiencies'])}\n")

        if "ability_score_increase" in f:
            asi = f["ability_score_increase"]
            chunks.append("\n[feats.ability_score_increase]\n")
            chunks.append(f"choices = {json.dumps(asi['choices'])}\n")
            chunks.append(f"value = {asi['value']}\n")

        if "skill_ranks" in f:
            for sr in f["skill_ranks"]:
                chunks.append("\n[[feats.skill_ranks]]\n")
                chunks.append(f"skill = {json.dumps(sr['skill'])}\n")
                chunks.append(f"rank = {sr['rank']}\n")
                if sr.get("allow_rank_5"):
                    chunks.append("allow_rank_5 = true\n")

        if "saving_throws" in f:
            for st in f["saving_throws"]:
                chunks.append("\n[[feats.saving_throws]]\n")
                chunks.append(f"stat = {json.dumps(st['stat'])}\n")
                chunks.append(f"bonus = {st['bonus']}\n")

        chunks.append("\n")

    return "".join(chunks)

def ingest_feats_from_pdf() -> list[dict]:
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"Reference PDF not found at {PDF_PATH}")

    full_text = extract_pdf_text(PDF_PATH)
    spans = locate_feat_spans(full_text)

    all_feats = []
    section_headers = ["Weapon Feats", "Armor Feats", "Skill Feats", "Tool Feats"]

    for i in range(len(spans)):
        start_content = spans[i][1]
        end_content = spans[i + 1][0] if i + 1 < len(spans) else len(full_text)
        f_name = spans[i][2]
        cat = spans[i][3]
        raw_block = full_text[start_content:end_content].strip()

        for sh in section_headers:
            if raw_block.endswith(sh):
                raw_block = raw_block[:-len(sh)].strip()

        feat = parse_feat_block(f_name, cat, raw_block)
        all_feats.append(feat)

    toml_output = serialize_toml(all_feats)
    os.makedirs(os.path.dirname(OUTPUT_TOML_PATH), exist_ok=True)
    with open(OUTPUT_TOML_PATH, "w", encoding="utf-8") as f:
        f.write(toml_output)

    print(f"[SUCCESS] Ingested {len(all_feats)} feats to {OUTPUT_TOML_PATH}")
    return all_feats

if __name__ == "__main__":
    ingest_feats_from_pdf()
