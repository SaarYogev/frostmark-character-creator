import os
import sys
import re
import json
from collections import defaultdict
from pypdf import PdfReader

PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "reference", "Frostmark RPG - Player's Guide 0.3.7.pdf")
OUTPUT_TOML_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "toml", "abilities.toml")

ORIGIN_PAGES = [
    ("Artistry", 119, 127),
    ("Devotion", 128, 139),
    ("Discipline", 140, 146),
    ("Divine Oath", 147, 157),
    ("Finesse", 158, 164),
    ("Occult Student", 165, 172),
    ("Pact", 173, 184),
    ("Power", 185, 191),
    ("Predator", 192, 198),
    ("Soul Oath", 199, 205),
    ("Soul Weapon", 206, 212),
    ("Tactics", 213, 222),
    ("Unique Ancestry", 223, 231),
    ("World Magic", 232, 238)
]

COMPOUND_SINGLE_ABILITIES = {
    "Mastery",
    "Font of Magic",
    "Proclaim Judgement",
    "Wild Shape",
    "Rage",
    "General Upgrade",
    "General Upgrades",
    "Improved Magical Upgrade",
    "Channel Divinity",
    "Inspiration",
    "Jack Of All Trades",
    "Unarmored Defense",
    "Martial Arts",
    "Unburdened Celerity",
    "Deflect Missiles",
    "Slow-Fall",
    "Purity of Body",
    "Evasion",
    "Stillness of Mind",
    "Extra Attack",
    "Stunning Strike",
    "Soul-Infused Strikes",
    "Nirvana",
    "Spellbook",
    "Arcane Recovery",
    "Favored Enemy",
    "Natural Explorer",
    "Born to Ride",
    "Divine Sense",
    "Divine Health",
    "Cleansing Touch",
    "Aura of Courage",
    "Aura of Protection",
    "Lay On Hands",
    "Aura of Vitality",
    "Primeval Awareness",
    "Land's Stride",
    "Hide in Plain Sight",
    "Vanish",
    "Feral Senses",
    "Foe Slayer",
    "Fast Movement",
    "Feral Instinct",
    "Brutal Critical",
    "Relentless Rage",
    "Persistent Rage",
    "Indomitable Might",
    "Primal Champion",
    "Infuse Soul",
    "Arcane and Martial Mastery"
}

SPLIT_OPTION_ABILITIES = {
    "Fighting style",
    "Fighting Style",
    "Metamagic",
    "Pact Boon"
}

def clean_page_text(txt: str | None) -> str:
    if not txt:
        return ""
    lines = txt.split("\n")
    cleaned = []
    for l in lines:
        if re.match(r"^\s*\d+\s*$", l):
            continue
        cleaned.append(l)
    return "\n".join(cleaned)

def is_bullet_line(l: str) -> bool:
    s = l.strip()
    if s.startswith("❖"):
        return True
    if s.startswith("•") and re.match(r"^•\s*[A-Za-z0-9\s’'\/]+?\s*[-–—]\s*.+?:", s):
        return True
    return False

def ingest_abilities():
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"Canon PDF not found at {PDF_PATH}")

    reader = PdfReader(PDF_PATH)
    all_abilities = []

    for org_name, start_p, end_p in ORIGIN_PAGES:
        full_text = []
        for p in range(start_p - 1, end_p):
            txt = reader.pages[p].extract_text()
            full_text.append(clean_page_text(txt))
        raw_content = "\n".join(full_text)

        lines = raw_content.split("\n")
        cur_lvl = 0
        cur_sel = "Primary"
        i = 0

        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            lvl_m = re.match(r"^Level\s+(\d+)$", line, re.I)
            if lvl_m:
                cur_lvl = int(lvl_m.group(1))
                cur_sel = "Primary"
                i += 1
                continue

            if line.lower() == "primary selection":
                cur_sel = "Primary"
                i += 1
                continue
            if line.lower() == "secondary selection":
                cur_sel = "Secondary"
                i += 1
                continue

            ab_m = re.match(r"^([A-Z][A-Za-z0-9\s’'\/,\-–—]+?)\s*\[([^\]]+)\]$", line)
            if ab_m and cur_lvl > 0 and len(ab_m.group(1)) < 60:
                header_name = ab_m.group(1).strip()
                if cur_lvl == 20 and header_name.lower() in ["soul gifts", "absorbed soul aspects", "absorbed soul aspect"]:
                    cur_lvl = 0
                    break

                body_lines = []
                i += 1
                while i < len(lines):
                    next_l = lines[i].strip()
                    if not next_l:
                        body_lines.append("")
                        i += 1
                        continue
                    if re.match(r"^Level\s+\d+$", next_l, re.I):
                        break
                    if next_l.lower() in ["primary selection", "secondary selection"]:
                        break
                    next_ab = re.match(r"^([A-Z][A-Za-z0-9\s’'\/,\-–—]+?)\s*\[([^\]]+)\]$", next_l)
                    if next_ab and len(next_ab.group(1)) < 60:
                        break
                    if cur_lvl == 20 and next_l.lower() in ["soul gifts", "absorbed soul aspects", "absorbed soul aspect"]:
                        cur_lvl = 0
                        break
                    body_lines.append(lines[i])
                    i += 1

                bullet_indices = [idx for idx, bl in enumerate(body_lines) if is_bullet_line(bl)]

                is_compound = (
                    header_name in COMPOUND_SINGLE_ABILITIES or
                    any(header_name.lower().startswith(c.lower()) for c in ["General Upgrade", "Improved Magical Upgrade"])
                )

                has_subclass_bullets = any(re.match(r"^[❖•]\s*[A-Za-z0-9\s’'\/]+?\s*[-–—]\s*.+?:", body_lines[idx].strip()) for idx in bullet_indices)
                is_option_split = any(header_name.lower().startswith(o.lower()) for o in SPLIT_OPTION_ABILITIES)

                if not is_compound and (has_subclass_bullets or is_option_split) and len(bullet_indices) > 0:
                    intro_lines = body_lines[:bullet_indices[0]]
                    intro_text = "\n".join(intro_lines).strip()

                    sub_entries = defaultdict(list)

                    for d_idx, start_line_idx in enumerate(bullet_indices):
                        end_line_idx = bullet_indices[d_idx + 1] if d_idx + 1 < len(bullet_indices) else len(body_lines)
                        chunk = body_lines[start_line_idx:end_line_idx]
                        first_line = chunk[0].strip().lstrip("❖•").strip()
                        if not first_line:
                            continue
                        rest_lines = chunk[1:]

                        sub_match = re.match(r"^([A-Za-z0-9\s’'\/]+?)\s*[-–—]\s*(.+?):\s*(.*)$", first_line)
                        if sub_match:
                            subclass_name = sub_match.group(1).strip()
                            feature_title = sub_match.group(2).strip()
                            inline_desc = sub_match.group(3).strip()

                            desc_parts = []
                            if feature_title:
                                desc_parts.append(f"**{feature_title}**")
                            if inline_desc:
                                desc_parts.append(inline_desc)
                            for rl in rest_lines:
                                rl_s = rl.strip()
                                if rl_s.startswith("o "):
                                    desc_parts.append(f"  * {rl_s[2:].strip()}")
                                elif rl_s:
                                    desc_parts.append(rl_s)
                            if subclass_name:
                                sub_entries[subclass_name].append("\n\n".join(desc_parts))
                        elif is_option_split:
                            opt_match = re.match(r"^([A-Za-z0-9\s’'\/,\-]+?):\s*(.*)$", first_line)
                            if opt_match:
                                opt_name = opt_match.group(1).strip()
                                inline_desc = opt_match.group(2).strip()
                                desc_parts = [inline_desc] if inline_desc else []
                                for rl in rest_lines:
                                    rl_s = rl.strip()
                                    if rl_s.startswith("o "):
                                        desc_parts.append(f"  * {rl_s[2:].strip()}")
                                    elif rl_s:
                                        desc_parts.append(rl_s)
                                if opt_name:
                                    sub_entries[opt_name].append("\n\n".join(desc_parts))
                            else:
                                clean_opt = first_line.strip()
                                if clean_opt:
                                    sub_entries[clean_opt[:30]].append("\n".join([first_line] + rest_lines).strip())
                        else:
                            fallback_text = "\n".join([first_line] + rest_lines).strip()
                            if fallback_text:
                                sub_entries[header_name].append(fallback_text)

                    for sub_key, desc_blocks in sub_entries.items():
                        sub_key_clean = sub_key.strip()
                        if not sub_key_clean:
                            continue
                        sub_title = f"{header_name} ({sub_key_clean})" if sub_key_clean != header_name else header_name
                        valid_blocks = [b.strip() for b in desc_blocks if b.strip()]
                        if not valid_blocks:
                            continue
                        combined_body = "\n\n".join(valid_blocks)
                        full_desc = f"{intro_text}\n\n{combined_body}".strip() if intro_text else combined_body.strip()
                        if not full_desc:
                            continue
                        all_abilities.append({
                            "origin": org_name,
                            "level": cur_lvl,
                            "selection": cur_sel,
                            "name": sub_title,
                            "desc": full_desc
                        })
                else:
                    desc_lines = []
                    for bl in body_lines:
                        bl_s = bl.strip()
                        if bl_s.startswith("❖"):
                            desc_lines.append(f"- {bl_s[1:].strip()}")
                        elif bl_s.startswith("o "):
                            desc_lines.append(f"  * {bl_s[2:].strip()}")
                        elif bl_s.startswith("•"):
                            desc_lines.append(f"- {bl_s[1:].strip()}")
                        elif bl_s:
                            desc_lines.append(bl_s)
                    full_desc = "\n\n".join(desc_lines).strip()
                    if full_desc:
                        all_abilities.append({
                            "origin": org_name,
                            "level": cur_lvl,
                            "selection": cur_sel,
                            "name": header_name,
                            "desc": full_desc
                        })
                continue
            i += 1

    header = "# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!\n# Generated by scripts/ingest_abilities.js\n\n"
    toml_chunks = [header]

    for a in all_abilities:
        chunk = "[[abilities]]\norigin = {}\nlevel = {}\nselection = {}\nname = {}\ndesc = {}\n\n".format(
            json.dumps(a["origin"]),
            a["level"],
            json.dumps(a["selection"]),
            json.dumps(a["name"]),
            json.dumps(a["desc"])
        )
        toml_chunks.append(chunk)

    output_content = "".join(toml_chunks)
    with open(OUTPUT_TOML_PATH, "w", encoding="utf-8") as f:
        f.write(output_content)

    print(f"[SUCCESS] Wrote {len(all_abilities)} canonical abilities to {OUTPUT_TOML_PATH}")

if __name__ == "__main__":
    ingest_abilities()
