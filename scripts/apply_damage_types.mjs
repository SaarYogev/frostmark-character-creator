import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as smolToml from 'smol-toml';
import { fetchSpellDetails } from './enrich_spells.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_TOML_PATH = path.join(__dirname, '../js/data/spells.toml');
const OVERRIDE_TOML_PATH = path.join(__dirname, '../js/data/spells_override.toml');

const DAMAGE_TYPES = [
  'bludgeoning', 'piercing', 'slashing',
  'acid', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
];
const TYPES_ALT = DAMAGE_TYPES.slice().sort((a, b) => b.length - a.length).join('|');

// Detector A: enumeration-aware — matches "<type> damage" / lists ending in "damage"
function detectEnumerationAware(text) {
  const found = new Set();
  if (!text) return [];
  const enumRe = new RegExp(`((?:\\b(?:${TYPES_ALT})\\b(?:\\s*(?:,|and|or)\\s*)?)+)\\s+damage`, 'gi');
  let m;
  while ((m = enumRe.exec(text)) !== null) {
    const inner = new RegExp(`\\b(${TYPES_ALT})\\b`, 'gi');
    let x;
    while ((x = inner.exec(m[1])) !== null) found.add(x[1].toLowerCase());
  }
  return [...found];
}

// Detector B: bare substring scan over the full text
function detectSubstring(text) {
  const found = new Set();
  if (!text) return [];
  const lower = text.toLowerCase();
  for (const dt of DAMAGE_TYPES) {
    if (lower.includes(dt)) found.add(dt);
  }
  return [...found];
}

function damageSentences(text) {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => /\bdamage\b/i.test(s))
    .map((s) => s.trim());
}

function confirmedTypes(sentences) {
  const set = new Set();
  for (const s of sentences) {
    const inner = new RegExp(`\\b(${TYPES_ALT})\\b`, 'gi');
    let x;
    while ((x = inner.exec(s)) !== null) set.add(x[1].toLowerCase());
  }
  return set;
}

// Union strategy: enumeration-aware (precise) is always kept, while the loose
// substring scan is only kept when it is confirmed by a damage-context sentence
// or strongly implied by the spell name.
function detectUnion(text, spellName) {
  const enumTypes = detectEnumerationAware(text);
  const loose = detectSubstring(text);
  const confirmed = confirmedTypes(damageSentences(text));
  const nameLower = (spellName || '').toLowerCase();
  const result = new Set(enumTypes);
  for (const dt of loose) {
    if (confirmed.has(dt) || nameLower.includes(dt)) {
      result.add(dt);
    }
  }
  return [...result];
}

async function main() {
  const spells = smolToml.parse(fs.readFileSync(SPELLS_TOML_PATH, 'utf8'));
  const override = fs.existsSync(OVERRIDE_TOML_PATH)
    ? smolToml.parse(fs.readFileSync(OVERRIDE_TOML_PATH, 'utf8'))
    : {};

  let changed = 0;
  const names = Object.keys(spells).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    // Spells with a manual override are patched at runtime; leave them untouched here.
    if (override[name]) {
      console.log(`Skipped (override): ${name}`);
      continue;
    }
    let desc = spells[name].desc || '';
    const fetched = await fetchSpellDetails(name);
    if (fetched && fetched.desc) desc = fetched.desc;
    await new Promise((r) => setTimeout(r, 50));

    const detected = detectUnion(desc, name);
    const stored = spells[name].damageTypes || [];
    const same = stored.length === detected.length && stored.every((t) => detected.includes(t));
    if (!same) {
      spells[name].damageTypes = detected;
      changed++;
      console.log(`Updated ${name}: [${stored.join(', ')}] -> [${detected.join(', ')}]`);
    }
  }

  const tomlContent = smolToml.stringify(spells);
  fs.writeFileSync(SPELLS_TOML_PATH, tomlContent, 'utf8');
  console.log(`\nWrote ${changed} updated spell(s) to spells.toml`);
}

main().catch((err) => {
  console.error('Fatal error applying damage types:', err);
  process.exit(1);
});