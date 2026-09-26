import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import * as smolToml from 'smol-toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_TOML_PATH = path.join(__dirname, '../src/data/toml/spells.toml');
const ENRICH_PDF_SCRIPT = path.join(__dirname, 'enrich_spells_pdf.py');

export function getHeuristicSpell(name, level = 1, school = 'Abjuration') {
  const levelStr = level === 0 ? 'cantrip' : `level ${level} spell`;
  return {
    castingTime: '1 action',
    range: 18,
    rangeLabel: '18m',
    damageTypes: [],
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    desc: `A ${school} ${levelStr}.`
  };
}

export async function fetchSpellDetails(spellName, fallbackLevel = null, fallbackSchool = null) {
  if (typeof spellName !== 'string' || !spellName.trim()) {
    return getHeuristicSpell('Unknown', fallbackLevel ?? 1, fallbackSchool ?? 'Abjuration');
  }

  // Pre-generated TOML database acts as the canonical offline source of truth
  if (fs.existsSync(SPELLS_TOML_PATH)) {
    try {
      const tomlContent = fs.readFileSync(SPELLS_TOML_PATH, 'utf8');
      const spellsDb = smolToml.parse(tomlContent);

      const normalizedQuery = spellName.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
      for (const [name, entry] of Object.entries(spellsDb || {})) {
        if (!name || !entry) continue;
        const normalizedDbName = name.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
        if (normalizedDbName === normalizedQuery) {
          return {
            school: entry.school || fallbackSchool || 'Abjuration',
            level: entry.level !== undefined ? entry.level : (fallbackLevel !== null ? fallbackLevel : 1),
            castingTime: entry.castingTime || '1 action',
            range: entry.range !== undefined ? entry.range : 18,
            rangeLabel: entry.rangeLabel || '18m',
            damageTypes: Array.isArray(entry.damageTypes) ? entry.damageTypes : [],
            duration: entry.duration || 'Instant',
            concentration: Boolean(entry.concentration),
            ritual: Boolean(entry.ritual),
            desc: entry.desc || ''
          };
        }
      }
    } catch {
      // Degrade gracefully to heuristic defaults if TOML file parsing errors out
    }
  }

  return getHeuristicSpell(spellName, fallbackLevel !== null ? fallbackLevel : 1, fallbackSchool || 'Abjuration');
}

export function validateSpellsToml(tomlPath) {
  if (!fs.existsSync(tomlPath)) {
    throw new Error(`Target spells TOML file does not exist at ${tomlPath}`);
  }

  const rawToml = fs.readFileSync(tomlPath, 'utf8');
  const spellsData = smolToml.parse(rawToml);
  if (!spellsData || typeof spellsData !== 'object') {
    throw new Error(`Invalid or empty spells TOML data at ${tomlPath}`);
  }
  const spellKeys = Object.keys(spellsData);

  if (spellKeys.length < 360) {
    throw new Error(`Expected at least 360 spells in ${tomlPath}, found ${spellKeys.length}`);
  }

  const validSchools = new Set([
    'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Transmutation', 'Vismancy'
  ]);

  for (const [name, entry] of Object.entries(spellsData)) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Spell "${name}" has missing or invalid entry object`);
    }
    if (!validSchools.has(entry.school)) {
      throw new Error(`Spell "${name}" has invalid school: "${entry.school}"`);
    }
    if (typeof entry.level !== 'number' || entry.level < 0 || entry.level > 9) {
      throw new Error(`Spell "${name}" has invalid level: ${entry.level}`);
    }
    if (typeof entry.castingTime !== 'string' || !entry.castingTime.trim()) {
      throw new Error(`Spell "${name}" has invalid castingTime: ${entry.castingTime}`);
    }
    if (typeof entry.range !== 'number' || entry.range < 0) {
      throw new Error(`Spell "${name}" has invalid range: ${entry.range}`);
    }
    if (typeof entry.rangeLabel !== 'string' || !entry.rangeLabel.trim()) {
      throw new Error(`Spell "${name}" has invalid rangeLabel: ${entry.rangeLabel}`);
    }
    if (!Array.isArray(entry.damageTypes)) {
      throw new Error(`Spell "${name}" has invalid damageTypes array: ${entry.damageTypes}`);
    }
    if (typeof entry.duration !== 'string' || !entry.duration.trim()) {
      throw new Error(`Spell "${name}" has invalid duration: ${entry.duration}`);
    }
    if (typeof entry.concentration !== 'boolean') {
      throw new Error(`Spell "${name}" has invalid concentration boolean: ${entry.concentration}`);
    }
    if (typeof entry.ritual !== 'boolean') {
      throw new Error(`Spell "${name}" has invalid ritual boolean: ${entry.ritual}`);
    }
    if (typeof entry.desc !== 'string' || !entry.desc.trim()) {
      throw new Error(`Spell "${name}" has empty description`);
    }
  }

  return {
    totalSpells: spellKeys.length,
    cantrips: spellKeys.filter(k => spellsData[k].level === 0).length,
    leveled: spellKeys.filter(k => spellsData[k].level > 0).length
  };
}

async function main() {
  console.log('--- Frostmark Spells PDF Enrichment ---');
  console.log(`Executing ${ENRICH_PDF_SCRIPT}...`);

  execFileSync('python3', [ENRICH_PDF_SCRIPT], { stdio: 'inherit' });

  console.log('Validating output in src/data/toml/spells.toml...');
  const stats = validateSpellsToml(SPELLS_TOML_PATH);

  console.log('\n--- Ingestion & Validation Summary ---');
  console.log(`Total Spells: ${stats.totalSpells}`);
  console.log(`Cantrips (Level 0): ${stats.cantrips}`);
  console.log(`Leveled Spells (1-9): ${stats.leveled}`);
  console.log('Validation passed: All spells adhere to the Frostmark SpellData schema.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error in enrichment runner:', err);
    process.exit(1);
  });
}
