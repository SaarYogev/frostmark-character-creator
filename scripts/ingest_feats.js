import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse } from 'smol-toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// The canonical rulebook PDF is the sole source of truth for Feats,
// superseding legacy MediaWiki scraping which suffered from incomplete DOM parsing and text leakage.
const PDF_PATH = path.join(REPO_ROOT, 'reference/Frostmark RPG - Playing Frostmark 0.3.7.pdf');
const TOML_PATH = path.join(REPO_ROOT, 'src/data/toml/feats.toml');
const INGEST_PY = path.join(__dirname, 'ingest_feats_pdf.py');

const EXPECTED_CATEGORIES = {
  'General Feats': 31,
  'Weapon Feats': 9,
  'Armor Feats': 6,
  'Skill Feats': 17,
  'Tool Feats': 3
};

export async function ingestFeats() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(
      `Canonical rulebook PDF not found at ${PDF_PATH}. ` +
      `Ensure the reference PDF is located in reference/ before running ingestion.`
    );
  }

  console.log(`Ingesting Feats from canonical PDF: ${PDF_PATH}`);
  try {
    execSync(`python3 "${INGEST_PY}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to execute PDF feats ingestion script:', err.message);
    throw err;
  }

  if (!fs.existsSync(TOML_PATH)) {
    throw new Error(`Ingestion completed but output file not found at ${TOML_PATH}`);
  }

  const tomlContent = fs.readFileSync(TOML_PATH, 'utf-8');
  if (!tomlContent.startsWith('# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!')) {
    throw new Error('Missing required auto-generated warning header in feats.toml');
  }

  const parsed = parse(tomlContent);
  const feats = Array.isArray(parsed?.feats) ? parsed.feats : [];

  validateFeats(feats);
  logFeatMetrics(feats);

  return feats;
}

function validateFeats(feats) {
  if (!Array.isArray(feats) || feats.length !== 66) {
    throw new Error(`Feat count mismatch: expected 66 canonical feats, found ${feats?.length}`);
  }

  const categoryCounts = {};
  for (const feat of feats) {
    if (!feat?.name || typeof feat.name !== 'string' || !feat.name.trim()) {
      throw new Error(`Feat entry missing valid name: ${JSON.stringify(feat)}`);
    }
    if (!feat?.category || typeof feat.category !== 'string') {
      throw new Error(`Feat ${feat?.name} missing category`);
    }
    if (typeof feat?.desc !== 'string' || !feat.desc.trim()) {
      throw new Error(`Feat ${feat?.name} missing description text`);
    }
    if (typeof feat?.prerequisite !== 'string') {
      throw new Error(`Feat ${feat?.name} missing prerequisite string`);
    }

    categoryCounts[feat.category] = (categoryCounts[feat.category] || 0) + 1;
  }

  for (const [cat, expectedCount] of Object.entries(EXPECTED_CATEGORIES)) {
    const actualCount = categoryCounts[cat] || 0;
    if (actualCount !== expectedCount) {
      throw new Error(`Category count mismatch for '${cat}': expected ${expectedCount}, got ${actualCount}`);
    }
  }
}

function logFeatMetrics(feats) {
  const metrics = {
    total: feats.length,
    byCategory: {},
    withASI: 0,
    withSkillRanks: 0,
    withArmorProfs: 0,
    withWeaponProfs: 0,
    withSavingThrows: 0,
    withACBonus: 0
  };

  for (const f of feats) {
    metrics.byCategory[f.category] = (metrics.byCategory[f.category] || 0) + 1;
    if (f.ability_score_increase) metrics.withASI += 1;
    if (f.skill_ranks && f.skill_ranks.length > 0) metrics.withSkillRanks += 1;
    if (f.armor_proficiencies && f.armor_proficiencies.length > 0) metrics.withArmorProfs += 1;
    if (f.weapon_proficiencies && f.weapon_proficiencies.length > 0) metrics.withWeaponProfs += 1;
    if (f.saving_throws && f.saving_throws.length > 0) metrics.withSavingThrows += 1;
    if (f.ac_bonus != null) metrics.withACBonus += 1;
  }

  console.log('\n--- Feats Ingestion Validation & Metrics ---');
  console.log(`Total feats ingested: ${metrics.total}`);
  console.log('Feats per category:');
  for (const [cat, count] of Object.entries(metrics.byCategory)) {
    console.log(`  - ${cat}: ${count}`);
  }
  console.log('Feature breakdown:');
  console.log(`  - Ability score increases: ${metrics.withASI}`);
  console.log(`  - Skill ranks granted:     ${metrics.withSkillRanks}`);
  console.log(`  - Armor proficiencies:     ${metrics.withArmorProfs}`);
  console.log(`  - Weapon proficiencies:    ${metrics.withWeaponProfs}`);
  console.log(`  - Saving throw bonuses:    ${metrics.withSavingThrows}`);
  console.log(`  - AC bonuses:              ${metrics.withACBonus}`);
  console.log('-------------------------------------------\n');
}

if (process.argv[1] && process.argv[1].endsWith('ingest_feats.js')) {
  ingestFeats().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
