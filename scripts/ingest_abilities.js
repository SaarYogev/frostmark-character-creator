import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { parse } from 'smol-toml';

// The canonical Player's Guide PDF is the sole source of truth for Accord Origin rules,
// superseding legacy MediaWiki scraping which suffered from DOM flattening and inconsistent formatting.
const PDF_PATH = path.resolve('reference/Frostmark RPG - Player\'s Guide 0.3.7.pdf');
const TOML_PATH = path.resolve('src/data/toml/abilities.toml');

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(
      `Canonical Player's Guide PDF not found at ${PDF_PATH}. ` +
      `Ensure the reference PDF is copied into reference/ before running ingestion.`
    );
  }

  console.log(`Ingesting Accord Origin abilities from canonical PDF: ${PDF_PATH}`);
  try {
    execSync('python3 scripts/ingest_abilities_pdf.py', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to execute PDF ingestion script:', err.message);
    throw err;
  }

  if (!fs.existsSync(TOML_PATH)) {
    throw new Error(`Ingestion completed but output file not found at ${TOML_PATH}`);
  }

  const tomlContent = fs.readFileSync(TOML_PATH, 'utf-8');
  const parsed = parse(tomlContent);
  const abilities = Array.isArray(parsed?.abilities) ? parsed.abilities : [];

  validateIngestedChoices(abilities);
}

function validateIngestedChoices(abilities) {
  const choiceKeywords = [
    'when you pick this ability',
    'when you choose this ability',
    'when you gain this ability',
    'when you take this ability',
    'choose one:',
    'choose two:',
    'choose three:',
    'gain one of the following',
    'gain two of the following',
    'choose either'
  ];

  const registeredKeys = [
    'Charmer', 'Connoisseur', 'Extension of the Soul', 'Divine Smite',
    'Absorbed Soul Aspect', 'Pact Boon', 'Survival Instincts',
    'Child of the Natural World', 'Animalistic Virtue', 'Soul of the Wild',
    'Beast Bond', 'Force of Nature', 'Favored Enemy', 'Hunter’s Prey',
    'Greater Favored Enemy', 'Relentless Chaser', 'Superior Elusive Stalker',
    'Threaten', 'Oaths', 'Braggadocio', 'Dictate of Order', 'Metamagic',
    'Elemental Affinity', 'Improved Magical Upgrade', 'General Upgrade'
  ];

  const unmapped = abilities.filter(a => {
    const text = `${a.name} ${a.desc}`.toLowerCase();
    const hasChoiceKeyword = choiceKeywords.some(kw => text.includes(kw));
    if (!hasChoiceKeyword) return false;
    return !registeredKeys.some(key => a.name.toLowerCase().includes(key.toLowerCase()));
  });

  if (unmapped.length > 0) {
    console.warn(`\n[WARNING] Found ${unmapped.length} abilities with choice keywords not registered in aoChoices.ts:`);
    unmapped.forEach(a => console.warn(`  - [${a.origin} Lvl ${a.level}] ${a.name}`));
    console.warn(`Please review src/data/aoChoices.ts to add choice definitions for these abilities.\n`);
  } else {
    console.log(`[VALIDATION] All ingested abilities with choices are registered in aoChoices.ts.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
