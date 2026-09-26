import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse } from 'smol-toml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// The canonical Player's Guide PDF is the sole source of truth for Background rules,
// superseding legacy MediaWiki scraping which suffered from DOM flattening and inconsistent formatting.
const PDF_PATH = path.join(REPO_ROOT, 'reference/Frostmark RPG - Player\'s Guide 0.3.7.pdf');
const TOML_PATH = path.join(REPO_ROOT, 'src/data/toml/backgrounds.toml');
const INGEST_PY = path.join(__dirname, 'ingest_backgrounds_pdf.py');
const VERIFY_PY = path.join(__dirname, 'verify_backgrounds_resilience.py');

const CANONICAL_KINGDOMS = [
  'Applegate', 'Armathain', 'Beornhelm', 'Crowhill', 'Eastcreek',
  'Greenfield', 'Karthmere', 'Malgrave', 'Oldwood', 'Sirendale', 'Stormholme'
];

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(
      `Canonical Player's Guide PDF not found at ${PDF_PATH}. ` +
      `Ensure the reference PDF is copied into reference/ before running ingestion.`
    );
  }

  console.log(`Ingesting Backgrounds from canonical PDF: ${PDF_PATH}`);
  try {
    execSync(`python3 "${INGEST_PY}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to execute PDF ingestion script:', err.message);
    throw err;
  }

  if (!fs.existsSync(TOML_PATH)) {
    throw new Error(`Ingestion completed but output file not found at ${TOML_PATH}`);
  }

  const tomlContent = fs.readFileSync(TOML_PATH, 'utf-8');
  const parsed = parse(tomlContent);
  const backgrounds = Array.isArray(parsed?.backgrounds) ? parsed.backgrounds : [];

  validateIngestedBackgrounds(backgrounds);

  // Invariant verification ensures runtime immunity against downstream schema regressions
  try {
    execSync(`python3 "${VERIFY_PY}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Resilience verification failed:', err.message);
    throw err;
  }
}

function validateIngestedBackgrounds(backgrounds) {
  // Architectural invariant: 54 canonical backgrounds plus 5 legacy fallbacks for backwards compatibility
  if (!Array.isArray(backgrounds) || backgrounds.length !== 59) {
    throw new Error(`Expected exactly 59 backgrounds, found ${backgrounds?.length}`);
  }

  const legacyBgs = backgrounds.filter(b => b?.isLegacy === true);
  const canonicalBgs = backgrounds.filter(b => b?.isLegacy !== true);

  if (legacyBgs.length !== 5) {
    throw new Error(`Expected exactly 5 legacy backgrounds, found ${legacyBgs.length}`);
  }

  if (canonicalBgs.length !== 54) {
    throw new Error(`Expected exactly 54 canonical backgrounds, found ${canonicalBgs.length}`);
  }

  const generalCanonical = canonicalBgs.filter(b => b?.category === 'General');
  const kingdomCanonical = canonicalBgs.filter(b => b?.category === 'Kingdom');

  if (generalCanonical.length !== 19) {
    throw new Error(`Expected exactly 19 canonical General backgrounds, found ${generalCanonical.length}`);
  }

  if (kingdomCanonical.length !== 35) {
    throw new Error(`Expected exactly 35 canonical Kingdom backgrounds, found ${kingdomCanonical.length}`);
  }

  const kingdomsFound = new Set(kingdomCanonical.map(b => b?.kingdom).filter(Boolean));
  for (const k of CANONICAL_KINGDOMS) {
    if (!kingdomsFound.has(k)) {
      throw new Error(`Missing expected kingdom among ingested backgrounds: ${k}`);
    }
  }

  for (const bg of backgrounds) {
    if (!bg?.name || typeof bg.name !== 'string') {
      throw new Error(`Background missing valid name: ${JSON.stringify(bg)}`);
    }
    if (!bg?.category || (bg.category !== 'General' && bg.category !== 'Kingdom')) {
      throw new Error(`Background '${bg?.name}' missing valid category: ${bg?.category}`);
    }
    if (bg.category === 'Kingdom' && !bg?.kingdom) {
      throw new Error(`Kingdom background '${bg.name}' missing originating kingdom`);
    }
    if (typeof bg?.gold !== 'number' || bg.gold < 0) {
      throw new Error(`Background '${bg?.name}' missing valid gold: ${bg?.gold}`);
    }
    if (!bg?.trait || typeof bg.trait !== 'string') {
      throw new Error(`Background '${bg?.name}' missing valid trait`);
    }
    if (typeof bg?.freeSkillPoints !== 'number' || bg.freeSkillPoints < 0) {
      throw new Error(`Background '${bg?.name}' invalid freeSkillPoints: ${bg?.freeSkillPoints}`);
    }
  }

  console.log(`[VALIDATION] Successfully validated all 59 backgrounds from TOML.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
