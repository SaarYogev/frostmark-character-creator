#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
import pypdf

# Zero-based page bounds corresponding to the Spells chapter (pp. 29-133) in Playing Frostmark 0.3.7
PDF_REL_PATH = Path('reference/Frostmark RPG - Playing Frostmark 0.3.7.pdf')
TOML_REL_PATH = Path('src/data/toml/spells.toml')
SPELLS_START_PAGE_INDEX = 28
SPELLS_END_PAGE_INDEX = 132

SCHOOL_MAP = {
    'abj': 'Abjuration',
    'conj': 'Conjuration',
    'div': 'Divination',
    'enc': 'Enchantment',
    'ench': 'Enchantment',
    'evo': 'Evocation',
    'evoc': 'Evocation',
    'ill': 'Illusion',
    'trans': 'Transmutation',
    'vis': 'Vismancy'
}

NAME_ALIASES = {
    'Truestrike': 'True Strike'
}

VALID_DAMAGE_TYPES = [
    'bludgeoning', 'piercing', 'slashing',
    'acid', 'cold', 'fire', 'force', 'lightning',
    'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
]
DAMAGE_TYPE_REGEX = '|'.join(VALID_DAMAGE_TYPES)


def extract_raw_pages_text(pdf_path: Path) -> str:
    reader = pypdf.PdfReader(str(pdf_path))
    chunks = []
    for page_idx in range(SPELLS_START_PAGE_INDEX, SPELLS_END_PAGE_INDEX + 1):
        page_text = reader.pages[page_idx].extract_text() or ''
        # Strip header page numbers emitted by PDF layout engine at the start of each page
        stripped_text = re.sub(r'^\s*\d+\s*\n+', '', page_text)
        chunks.append(stripped_text)
    return '\n'.join(chunks)


def parse_range_fields(raw_range: str) -> tuple[int, str]:
    cleaned = raw_range.strip()
    if re.match(r'^Self\b', cleaned, re.IGNORECASE):
        return 0, 'Self'
    if re.match(r'^Touch\b', cleaned, re.IGNORECASE):
        return 0, 'Touch'
    if re.match(r'^Sight\b', cleaned, re.IGNORECASE):
        km_search = re.search(r'(\d+)\s*km', cleaned, re.IGNORECASE)
        if km_search:
            meters = int(km_search.group(1)) * 1000
            return meters, f'{meters}m'
        return 0, 'Sight'
    if re.match(r'^Unlimited\b', cleaned, re.IGNORECASE):
        return 0, 'Unlimited'

    km_prefix = re.match(r'^(\d+)\s*(?:km|kilometre)\b', cleaned, re.IGNORECASE)
    if km_prefix:
        meters = int(km_prefix.group(1)) * 1000
        return meters, f'{meters}m'

    meter_prefix = re.match(r'^(\d+)\s*(?:m|meter|meters)\b', cleaned, re.IGNORECASE)
    if meter_prefix:
        meters = int(meter_prefix.group(1))
        return meters, f'{meters}m'

    meter_anywhere = re.search(r'(\d+)\s*(?:m|meter|meters)\b', cleaned, re.IGNORECASE)
    if meter_anywhere:
        meters = int(meter_anywhere.group(1))
        return meters, f'{meters}m'

    return 0, cleaned


def parse_casting_time_field(raw_casting_time: str) -> str:
    cleaned = raw_casting_time.strip()
    # Reaction casting times require trailing asterisk per Frostmark character sheet specification
    if re.search(r'reaction|\*', cleaned, re.IGNORECASE):
        return 'Reaction*'
    if cleaned == '10 min':
        return '10 minutes'
    return cleaned


def parse_duration_and_concentration(raw_duration: str, header_meta: str) -> tuple[str, bool]:
    dur = raw_duration.strip()
    is_conc = bool(re.search(r'\bconc\b', header_meta, re.IGNORECASE))

    if re.search(r'\bconc\b', dur, re.IGNORECASE):
        is_conc = True
        dur = re.sub(r'^conc[.,\s]*', '', dur, flags=re.IGNORECASE).strip()
        dur = dur[:1].upper() + dur[1:] if dur else 'Instant'

    # Correct typographic irregularities present in original manuscript
    if dur == '1nstant':
        dur = 'Instant'
    elif dur in ('24', '24 hour'):
        dur = '24 hours'

    return dur, is_conc


def parse_damage_types(effect_text: str, desc_text: str) -> list[str]:
    detected_types = set()
    effect_lower = effect_text.lower()
    for dt in VALID_DAMAGE_TYPES:
        if dt in effect_lower:
            detected_types.add(dt)

    damage_clause_pattern = re.compile(
        r'(?:deals?|taking|takes?|take|suffer(?:s|ing)?|receive(?:s)?|extra|additional|dealing(?:\s+at\s+least)?|as well as)\s+([a-zA-Z0-9\s,.-]+?)\s+damage\b',
        re.IGNORECASE
    )
    for match in damage_clause_pattern.finditer(desc_text):
        clause_phrase = match.group(1).lower()
        for dt in VALID_DAMAGE_TYPES:
            if re.search(rf'\b{dt}\b', clause_phrase):
                detected_types.add(dt)

    dice_damage_pattern = re.compile(rf'\b\d+d\d+\s+([a-zA-Z0-9\s,.-]+?)\s+damage\b', re.IGNORECASE)
    for match in dice_damage_pattern.finditer(desc_text):
        clause_phrase = match.group(1).lower()
        for dt in VALID_DAMAGE_TYPES:
            if re.search(rf'\b{dt}\b', clause_phrase):
                detected_types.add(dt)

    # Modal choices allow character-builder search filters to surface spells granting player choice of damage type
    has_choice_damage = bool(re.search(
        r'(?:deals?|takes?|taking|extra)\s+(?:[a-zA-Z0-9\s]+\s+)?damage\s+(?:of|to)\s+(?:the chosen|that|the)\s+(?:damage\s+)?type',
        desc_text, re.IGNORECASE
    ) or 'deals 7d6 damage' in desc_text.lower())

    if has_choice_damage:
        choice_matches = re.finditer(
            r'(?:damage types?|choose a damage type|choice between|choose)[:\s]+([a-zA-Z\s,]+?)(?:\.|\n|;|\)|for the duration)',
            desc_text, re.IGNORECASE
        )
        for cm in choice_matches:
            choice_phrase = cm.group(1).lower()
            for dt in VALID_DAMAGE_TYPES:
                if re.search(rf'\b{dt}\b', choice_phrase):
                    detected_types.add(dt)

    return sorted(detected_types)


def clean_description(raw_desc: str) -> str:
    normalized = raw_desc.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    # Reconnect words split across font glyph boundary kerning in PDF extraction
    normalized = re.sub(r'\bt\s+akes\b', 'takes', normalized)
    normalized = re.sub(r'\bd\s+amage\b', 'damage', normalized)
    normalized = re.sub(r'\bdamag\s+e\b', 'damage', normalized)

    # School descriptions and tier separators leak into description text when splitting by spell headers
    school_section_pattern = r'(?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Transmutation|Vismancy)'
    cleaned = re.sub(rf'\n+{school_section_pattern}\b[\s\S]*$', '', normalized, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r'\n+(?:Level\s*\d+|Cantrips)\s*$', '', cleaned, flags=re.IGNORECASE).strip()

    raw_lines = [re.sub(r'\s+', ' ', line.strip()) for line in cleaned.split('\n')]
    paragraphs = []
    current_paragraph = []

    for line in raw_lines:
        if not line:
            if current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            continue

        if line.startswith('❖') or re.match(r'^\d+\.\s', line) or line.startswith('At higher levels:'):
            if current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            current_paragraph.append(line)
        else:
            current_paragraph.append(line)

    if current_paragraph:
        paragraphs.append(' '.join(current_paragraph))

    result = ' '.join(paragraphs)
    # Remove kerning space preceding punctuation introduced by PDF font glyph boxes
    result = re.sub(r'\s+([.,;:!?])', r'\1', result)
    return result.strip()


def parse_spells_from_pdf(pdf_path: Path) -> dict[str, dict]:
    full_text = extract_raw_pages_text(pdf_path)

    # Some manuscript entries mistakenly delimit level with a period instead of a comma
    header_pattern = re.compile(
        r'^(?P<name>[^\n(]+?)\s*\((?P<meta>(?:cantrip|\d+(?:st|nd|rd|th)?|\d+)[,.]\s*(?:abj|conj|div|enc|evo|ill|trans|vis)[^)]*)\)\s*$',
        re.MULTILINE | re.IGNORECASE
    )
    headers = list(header_pattern.finditer(full_text))

    spells = {}
    for i, header_match in enumerate(headers):
        next_start = headers[i + 1].start() if i + 1 < len(headers) else len(full_text)
        spell_chunk = full_text[header_match.start():next_start]

        metadata_match = re.search(
            r'Casting Time:\s*(?P<ct>.*?)(?=\s*Range(?:/Area)?:)\s*'
            r'Range(?:/Area)?:\s*(?P<ra>.*?)(?=\s*Duration:)\s*'
            r'Duration:\s*(?P<dur>.*?)(?=\s*Attack(?:/Save)?:)\s*'
            r'Attack(?:/Save)?:\s*(?P<as>.*?)(?=\s*Components:)\s*'
            r'Components:\s*(?P<comp>.*?)(?=\s*Effect:)\s*'
            r'Effect:\s*(?P<eff>.*?)\n(?P<desc>[\s\S]*)$',
            spell_chunk,
            re.IGNORECASE
        )
        if not metadata_match:
            print(f'Warning: failed to match metadata for spell header: {header_match.group("name")}', file=sys.stderr)
            continue

        raw_name = header_match.group('name').strip()
        norm_name = raw_name.replace('’', "'").replace('‘', "'")
        name = NAME_ALIASES.get(norm_name, norm_name)
        meta = header_match.group('meta').strip()

        level_match = re.search(r'^(cantrip|\d+(?:st|nd|rd|th)?|\d+)', meta, re.IGNORECASE)
        level_str = level_match.group(1).lower() if level_match else '1'
        level = 0 if level_str in ('cantrip', '0') else int(re.sub(r'\D', '', level_str))

        school_match = re.search(r'\b(abj|conj|div|enc|ench|evo|evoc|ill|trans|vis)\b', meta, re.IGNORECASE)
        school_key = school_match.group(1).lower() if school_match else 'abj'
        school = SCHOOL_MAP[school_key]

        is_ritual = bool(re.search(r'\britual\b', meta, re.IGNORECASE))
        casting_time = parse_casting_time_field(metadata_match.group('ct'))
        range_meters, range_label = parse_range_fields(metadata_match.group('ra'))
        duration, is_conc = parse_duration_and_concentration(metadata_match.group('dur'), meta)
        desc = clean_description(metadata_match.group('desc'))
        damage_types = parse_damage_types(metadata_match.group('eff'), desc)

        spells[name] = {
            'school': school,
            'level': level,
            'castingTime': casting_time,
            'range': range_meters,
            'rangeLabel': range_label,
            'damageTypes': damage_types,
            'duration': duration,
            'concentration': is_conc,
            'ritual': is_ritual,
            'desc': desc
        }

    return spells


def serialize_toml_value(value) -> str:
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        items = [serialize_toml_value(item) for item in value]
        return '[' + ', '.join(items) + ']'
    raise TypeError(f'Unsupported TOML data type: {type(value)}')


def serialize_spells_to_toml(spells: dict[str, dict]) -> str:
    lines = [
        '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!',
        '# Generated by scripts/enrich_spells_pdf.py',
        ''
    ]
    # Sorting ensures git diff stability across regeneration cycles
    for name in sorted(spells.keys()):
        data = spells[name]
        escaped_key = json.dumps(name, ensure_ascii=False)
        lines.append(f'[{escaped_key}]')
        for key in ['school', 'level', 'castingTime', 'range', 'rangeLabel', 'damageTypes', 'duration', 'concentration', 'ritual', 'desc']:
            if key in data:
                lines.append(f'{key} = {serialize_toml_value(data[key])}')
        lines.append('')
    return '\n'.join(lines)


def main():
    repo_root = Path(__file__).resolve().parent.parent
    pdf_path = repo_root / PDF_REL_PATH
    toml_path = repo_root / TOML_REL_PATH

    if not pdf_path.exists():
        print(f'Error: source PDF not found at {pdf_path}', file=sys.stderr)
        sys.exit(1)

    print(f'Ingesting spells from {pdf_path} (pages {SPELLS_START_PAGE_INDEX} to {SPELLS_END_PAGE_INDEX})...')
    spells = parse_spells_from_pdf(pdf_path)

    if len(spells) < 360:
        print(f'Error: expected at least 360 spells, found {len(spells)}', file=sys.stderr)
        sys.exit(1)

    toml_content = serialize_spells_to_toml(spells)
    toml_path.parent.mkdir(parents=True, exist_ok=True)
    toml_path.write_text(toml_content, encoding='utf-8')

    cantrips_count = sum(1 for s in spells.values() if s['level'] == 0)
    spells_count = sum(1 for s in spells.values() if s['level'] > 0)
    print(f'Successfully parsed and saved {len(spells)} spells ({cantrips_count} cantrips, {spells_count} leveled spells) to {toml_path}')


if __name__ == '__main__':
    main()
