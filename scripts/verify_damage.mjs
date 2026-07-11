import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as smolToml from 'smol-toml';
import { fetchSpellDetails } from './enrich_spells.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_TOML_PATH = path.join(__dirname, '../js/data/spells.toml');

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
// or strongly implied by the spell name. This recovers edge cases (e.g. "7d8
// cold" without the word "damage") while avoiding obvious false positives.
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

function highlightTypes(text) {
  return (text || '').replace(new RegExp(`\\b(${TYPES_ALT})\\b`, 'gi'), (m) => `[${m.toUpperCase()}]`);
}

function sanitizeCell(s) {
  return (s || '')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function verdict(stored, detected, sentences) {
  const confirmed = confirmedTypes(sentences);
  const stSet = new Set(stored);
  const deSet = new Set(detected);
  const onlyStored = [...stSet].filter((t) => !confirmed.has(t));
  const onlyDetected = [...deSet].filter((t) => !confirmed.has(t));
  const missing = [...confirmed].filter((t) => !stSet.has(t) && !deSet.has(t));
  const fmt = (a) => (a.length ? a.join(', ') : '∅');

  if (sentences.length === 0) {
    if (stored.length > 0) return `NEW (current likely FP; no damage text)`;
    return `BOTH`;
  }
  if (confirmed.size === 0) return `REVIEW (choose-a-type / unconfirmed)`;
  if (onlyStored.length === 0 && onlyDetected.length === 0 && missing.length === 0) return `BOTH correct`;
  if (onlyStored.length > 0 && onlyDetected.length === 0 && missing.length === 0)
    return `NEW correct (current over-includes [${fmt(onlyStored)}])`;
  if (onlyDetected.length > 0 && onlyStored.length === 0 && missing.length === 0)
    return `CURRENT correct (new misses [${fmt(onlyDetected)}])`;
  if (missing.length > 0 && onlyStored.length === 0 && onlyDetected.length === 0)
    return `BOTH miss [${fmt(missing)}]`;
  return `REVIEW (st+:[${fmt(onlyStored)}] de+:[${fmt(onlyDetected)}] miss:[${fmt(missing)}])`;
}

async function main() {
  const spells = smolToml.parse(fs.readFileSync(SPELLS_TOML_PATH, 'utf8'));
  const names = Object.keys(spells).sort((a, b) => a.localeCompare(b));

  const rows = [];
  for (const name of names) {
    const stored = spells[name].damageTypes || [];
    let desc = spells[name].desc || '';
    let source = 'stored toml desc';
    const fetched = await fetchSpellDetails(name);
    if (fetched && fetched.desc) {
      desc = fetched.desc;
      source = 'fetched wiki desc';
    }
    await new Promise((r) => setTimeout(r, 50));

    const detected = detectUnion(desc, name);
    const same = stored.length === detected.length && stored.every((t) => detected.includes(t));
    if (!same) {
      rows.push({ name, stored, detected, desc, source });
    }
  }

  console.log(`Total spells: ${names.length}`);
  console.log(`Differences (stored vs union detection): ${rows.length}\n`);

  // Markdown table emitted directly by the script. Description is its own column,
  // fully present and separate from evidence/verdict.
  console.log('| Spell | Current | New (union) | Description | Verdict | Evidence |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    const sentences = damageSentences(r.desc);
    const v = verdict(r.stored, r.detected, sentences);
    const evidence = sentences.length
      ? sentences.map(highlightTypes).join(' ⏎ ')
      : `(no "damage" sentence in ${r.source})`;
    const descCell = sanitizeCell(r.desc);
    const evCell = sanitizeCell(evidence);
    console.log(
      `| ${r.name} | [${r.stored.join(', ')}] | [${r.detected.join(', ')}] | ${descCell} | ${v} | ${evCell} |`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error in verify script:', err);
  process.exit(1);
});