import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as smolToml from 'smol-toml';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPELLS_JS_PATH = path.join(__dirname, '../js/data/spells.js');
const SPELLS_TOML_PATH = path.join(__dirname, '../js/data/spells.toml');

// Duplicate of heuristic fallback logic from spells.js (to enrich missing spells)
export function getHeuristicSpell(name, level, school) {
  const nameLower = name.toLowerCase();

  let castingTime = '1 action';
  if (
    nameLower.includes('shield') ||
    nameLower.includes('counter') ||
    nameLower.includes('absorb') ||
    nameLower.includes('rebuke') ||
    nameLower.includes('feather fall')
  ) {
    castingTime = '1 reaction';
  } else if (
    nameLower.includes('healing word') ||
    nameLower.includes('misty') ||
    nameLower.includes('smite') ||
    nameLower.includes('hunter\'s') ||
    nameLower.includes('weapon') ||
    nameLower.includes('retreat')
  ) {
    castingTime = '1 bonus action';
  } else if (
    nameLower.includes('ritual') ||
    nameLower.includes('identify') ||
    nameLower.includes('find') ||
    nameLower.includes('commune') ||
    nameLower.includes('teleportation circle')
  ) {
    castingTime = '10 minutes';
  }

  let range = 18;
  if (nameLower.includes('self')) {
    range = 0;
  } else if (
    nameLower.includes('touch') ||
    nameLower.includes('cure') ||
    nameLower.includes('inflict') ||
    nameLower.includes('lay') ||
    nameLower.includes('hands')
  ) {
    range = 0;
  } else if (
    nameLower.includes('bolt') ||
    nameLower.includes('ray') ||
    nameLower.includes('arrow') ||
    nameLower.includes('missile') ||
    nameLower.includes('fire')
  ) {
    range = 36;
  } else if (level >= 5) {
    range = 36;
  } else if (level >= 3) {
    range = 27;
  }
  
  let rangeLabel = range === 0 ? 'Self/Touch' : (range >= 36 ? '36m+' : `${range}m`);

  let concentration = false;
  if (
    school === 'Divination' ||
    school === 'Illusion' ||
    nameLower.includes('detect') ||
    nameLower.includes('hold') ||
    nameLower.includes('suggest') ||
    nameLower.includes('bless') ||
    nameLower.includes('bane') ||
    nameLower.includes('hex') ||
    nameLower.includes('mark') ||
    nameLower.includes('aura') ||
    nameLower.includes('fly') ||
    nameLower.includes('haste') ||
    nameLower.includes('slow') ||
    nameLower.includes('wall') ||
    nameLower.includes('sphere') ||
    nameLower.includes('cloud') ||
    nameLower.includes('pattern') ||
    nameLower.includes('polymorph') ||
    nameLower.includes('control') ||
    nameLower.includes('animate')
  ) {
    concentration = true;
  }

  let duration = 'Instantaneous';
  if (concentration) {
    if (level === 0 || level === 1) {
      duration = 'Up to 1 minute';
    } else if (level >= 2 && level <= 4) {
      duration = 'Up to 10 minutes';
    } else {
      duration = 'Up to 1 hour';
    }
  } else {
    if (
      nameLower.includes('armor') ||
      nameLower.includes('ward') ||
      nameLower.includes('mind')
    ) {
      duration = '8 hours';
    } else if (
      nameLower.includes('shield') ||
      nameLower.includes('strike') ||
      nameLower.includes('touch')
    ) {
      duration = '1 round';
    } else if (
      nameLower.includes('charm') ||
      nameLower.includes('sleep')
    ) {
      duration = '1 hour';
    }
  }

  const damageTypes = [];
  if (nameLower.includes('fire') || nameLower.includes('flame') || nameLower.includes('burn') || nameLower.includes('bonfire') || nameLower.includes('scorch') || nameLower.includes('meteor')) {
    damageTypes.push('fire');
  }
  if (nameLower.includes('ice') || nameLower.includes('frost') || nameLower.includes('snow') || nameLower.includes('cold') || nameLower.includes('sleet')) {
    damageTypes.push('cold');
  }
  if (nameLower.includes('thunder') || nameLower.includes('shatter') || nameLower.includes('clap') || nameLower.includes('wave')) {
    damageTypes.push('thunder');
  }
  if (nameLower.includes('lightning') || nameLower.includes('shock') || nameLower.includes('bolt')) {
    damageTypes.push('lightning');
  }
  if (nameLower.includes('acid')) {
    damageTypes.push('acid');
  }
  if (nameLower.includes('poison') || nameLower.includes('sick')) {
    damageTypes.push('poison');
  }
  if (
    nameLower.includes('necro') ||
    nameLower.includes('death') ||
    nameLower.includes('vampiric') ||
    nameLower.includes('chill') ||
    nameLower.includes('harm') ||
    nameLower.includes('blight')
  ) {
    damageTypes.push('necrotic');
  }
  if (nameLower.includes('radiant') || nameLower.includes('sacred') || nameLower.includes('guiding') || nameLower.includes('sun') || nameLower.includes('dawn')) {
    damageTypes.push('radiant');
  }
  if (nameLower.includes('psychic') || nameLower.includes('mind') || nameLower.includes('intellect') || nameLower.includes('mockery') || nameLower.includes('madness') || nameLower.includes('blast')) {
    damageTypes.push('psychic');
  }
  if (nameLower.includes('force') || nameLower.includes('magic') || nameLower.includes('missile')) {
    damageTypes.push('force');
  }
  if (nameLower.includes('bludgeon') || nameLower.includes('strike') || nameLower.includes('earthquake') || nameLower.includes('stone') || nameLower.includes('meteor') || nameLower.includes('erupt')) {
    damageTypes.push('bludgeoning');
  }
  if (nameLower.includes('pierc') || nameLower.includes('spike') || nameLower.includes('thorn') || nameLower.includes('knife') || nameLower.includes('arrow')) {
    damageTypes.push('piercing');
  }
  if (nameLower.includes('slash') || nameLower.includes('blade') || nameLower.includes('sword')) {
    damageTypes.push('slashing');
  }

  const levelStr = level === 0 ? 'cantrip' : `level ${level} spell`;
  const desc = `A powerful ${school} ${levelStr} that targets a range of ${rangeLabel} with a duration of ${duration}.`;

  return {
    castingTime,
    range,
    rangeLabel,
    damageTypes: [...new Set(damageTypes)],
    duration,
    concentration,
    desc
  };
}

function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

export async function fetchSpellDetails(spellName) {
  // Normalize spelling to match wiki URL keys
  // Normalize spelling to match wiki URL keys
  let normalizedName = spellName
    .replace(/\u0027/g, '\u2019'); // convert normal quote to typographic apostrophe

  // Handle special case override mappings
  if (normalizedName === "True Strike") {
    normalizedName = "Truestrike";
  }
  if (normalizedName === "Arms Of An’her") {
    normalizedName = "Arms_of_An’her";
  }
  if (normalizedName === "Hunger Of An’her") {
    normalizedName = "Hunger_of_An’her";
  }

  const apiUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(normalizedName.replace(/\s+/g, '_'))}&format=json`;
  
  try {
    // First attempt: use normalizedName
    let res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    let data = await res.json();
    if (data.error) {
      // Fallback: search for correct title
      const searchUrl = `https://frostmark-rpg.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(spellName)}&format=json`;
      const sres = await fetch(searchUrl);
      if (!sres.ok) throw new Error(`Search HTTP error ${sres.status}`);
      const sdata = await sres.json();
      const pageTitle = sdata.query.search[0]?.title;
      if (!pageTitle) throw new Error('No search result for title correction');
      const correctedUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}&format=json`;
      res = await fetch(correctedUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      data = await res.json();
      if (data.error) throw new Error(data.error.info || 'API Error');
    }
    const html = data.parse.text['*'];
    const cleanHtml = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#160;/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');
    
    // Casting Time: matches words after "Casting Time" up to first space or boundary
    const castingTimeMatch = cleanHtml.match(/Casting\s+Time\s*:\s*(\d+\s+\w+|[\w*]+)/i);
    let castingTime = castingTimeMatch ? castingTimeMatch[1].trim() : null;
    
    // Clean complex casting time (e.g. Counterspell reaction text)
    if (castingTime && castingTime.toLowerCase().startsWith('reaction')) {
      castingTime = 'Reaction*';
    }

    // Range/Area: matches words/digits after "Range" or "Range/Area" up to next space or label
    const rangeMatch = cleanHtml.match(/Range(?:\/Area)?\s*:\s*([^\s]+)/i);
    const rawRange = rangeMatch ? rangeMatch[1].trim() : null;
    
    // Duration: matches text after "Duration" up to the next section keyword (Attack/Save, Components, etc.)
    const durationMatch = cleanHtml.match(/Duration\s*:\s*(.*?)\s*(?:Attack\/Save|Components|Effect|Choose|$)/i);
    const rawDuration = durationMatch ? durationMatch[1].trim() : null;

    // Parse level, school, and concentration from parenthetical header metadata
    // (e.g. "(1st, div., conc., ritual)" — allow trailing text after school/conc)
    const metaMatch = cleanHtml.match(/\(\s*(\d+(?:st|nd|rd|th)?|cantrip)\s*,\s*(abj|conj|div|enc|evo|ill|trans|vis)[^)]*\)/i);
    
    const SCHOOL_MAP = {
      abj: 'Abjuration',
      conj: 'Conjuration',
      div: 'Divination',
      enc: 'Enchantment',
      evo: 'Evocation',
      ill: 'Illusion',
      trans: 'Transmutation',
      vis: 'Vismancy'
    };

    const LEVEL_MAP = {
      cantrip: 0,
      '0': 0,
      '1st': 1,
      '1': 1,
      '2nd': 2,
      '2': 2,
      '3rd': 3,
      '3': 3,
      '4th': 4,
      '4': 4,
      '5th': 5,
      '5': 5,
      '6th': 6,
      '6': 6,
      '7th': 7,
      '7': 7,
      '8th': 8,
      '8': 8,
      '9th': 9,
      '9': 9
    };

    let level = null;
    let school = null;
    let parentheticalConc = false;
    if (metaMatch) {
      const rawLevel = metaMatch[1].toLowerCase();
      const rawSchool = metaMatch[2].toLowerCase();
      level = LEVEL_MAP[rawLevel] !== undefined ? LEVEL_MAP[rawLevel] : parseInt(rawLevel, 10);
      school = SCHOOL_MAP[rawSchool] || null;
      if (metaMatch[0] && /conc/i.test(metaMatch[0])) {
        parentheticalConc = true;
      }
    }
    
    // If essential metadata can't be parsed (non-standard wiki layouts), fall back
    // to the heuristic for those fields but KEEP the real fetched description.
    if (!castingTime || !rawRange || !rawDuration || level === null || school === null) {
      const heuristic = getHeuristicSpell(spellName, level ?? 1, school ?? 'Abjuration');
      if (!castingTime) castingTime = heuristic.castingTime;
      if (!rawRange) rawRange = `${heuristic.range}m`;
      if (!rawDuration) rawDuration = heuristic.duration;
      if (level === null) level = heuristic.level;
      if (school === null) school = heuristic.school;
      if (!parentheticalConc) parentheticalConc = heuristic.concentration;
    }
    
    // Concentration
    let concentration = parentheticalConc;
    let duration = rawDuration;
    if (/concentration/i.test(rawDuration) || /conc/i.test(rawDuration)) {
      concentration = true;
      let cleanDuration = rawDuration.replace(/concentration[.,\s]*/i, '').replace(/conc[.,\s]*/i, '');
      cleanDuration = cleanDuration.replace(/^[\s,.]+|[\s,.]+$/g, '').trim();
      duration = cleanDuration.charAt(0).toUpperCase() + cleanDuration.slice(1);
    }
    
    // Parse range and rangeLabel
    let range = 18; // default
    let rangeLabel = rawRange;
    if (/self/i.test(rawRange)) {
      range = 0;
      rangeLabel = 'Self';
    } else if (/touch/i.test(rawRange)) {
      range = 0;
      rangeLabel = 'Touch';
    } else {
      const numMatch = rawRange.match(/(\d+)\s*(?:m|meter)/i);
      if (numMatch) {
        range = parseInt(numMatch[1], 10);
        rangeLabel = range >= 36 ? '36m+' : `${range}m`;
      }
    }
    
    // Extract description text from paragraphs, list items, and minor headers (h4/h5/h6) where some description text is formatted
    const pMatches = [...html.matchAll(/<(?:p|h4|h5|h6|li)>([\s\S]*?)<\/(?:p|h4|h5|h6|li)>/gi)].map(m => m[1]);
    const descParagraphs = [];
    for (const p of pMatches) {
      const text = p.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ').trim();
      if (!text) continue;
      
      // Filter out metadata paragraphs
      if (
        /casting\s+time:/i.test(text) ||
        /duration:/i.test(text) ||
        /components:/i.test(text) ||
        /attack\/save:/i.test(text) ||
        /range\/area:/i.test(text) ||
        /range:/i.test(text) ||
        /effect:/i.test(text) ||
        new RegExp('^' + escapeRegex(spellName) + '\\s*\\(', 'i').test(text)
      ) {
        continue;
      }
      
      descParagraphs.push(text);
    }
    
    const desc = descParagraphs.join(' ');
    
    // Scan damage types
    const DAMAGE_TYPES_LIST = [
      'acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison',
      'psychic', 'radiant', 'thunder', 'bludgeoning', 'piercing', 'slashing'
    ];
    const damageTypes = [];
    const fullTextToScan = (html + ' ' + desc).toLowerCase();
    for (const dt of DAMAGE_TYPES_LIST) {
      if (fullTextToScan.includes(dt)) {
        damageTypes.push(dt);
      }
    }
    
    return {
      school,
      level,
      castingTime,
      range,
      rangeLabel,
      damageTypes: [...new Set(damageTypes)],
      duration,
      concentration,
      desc
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  const existingSpellsMap = smolToml.parse(fs.readFileSync(SPELLS_TOML_PATH, 'utf8'));
  const spellNames = Object.keys(existingSpellsMap);
  
  let fallbackSchoolLevelMap = {};
  
  // Try to parse from spells.js if it contains SPELLS_BY_SCHOOL
  try {
    const originalSpellsJsContent = fs.readFileSync(SPELLS_JS_PATH, 'utf8');
    const spellsBySchoolMatch = originalSpellsJsContent.match(/const SPELLS_BY_SCHOOL = (\{[\s\S]*?\n\});/);
    if (spellsBySchoolMatch) {
      const SPELLS_BY_SCHOOL = Function(`return ${spellsBySchoolMatch[1]}`)();
      for (const [school, levels] of Object.entries(SPELLS_BY_SCHOOL)) {
        for (const [levelStr, names] of Object.entries(levels)) {
          const level = parseInt(levelStr, 10);
          for (const name of names) {
            fallbackSchoolLevelMap[name] = { school, level };
          }
        }
      }
    }
  } catch (err) {
    // Ignore, spells.js might already have been cleaned
  }
  
  console.log(`Found ${spellNames.length} spells in spells.toml.`);
  
  const newSpellDetailsMap = {};
  let scrapedCount = 0;
  let fallbackCount = 0;
  
  for (const spellName of spellNames) {
    console.log(`Processing spell: ${spellName}...`);
    let details = await fetchSpellDetails(spellName);
    
    const existingSpell = existingSpellsMap[spellName];
    const fallbackInfo = fallbackSchoolLevelMap[spellName] || {};
    const fallbackSchool = existingSpell?.school || fallbackInfo.school || 'Abjuration';
    const fallbackLevel = existingSpell?.level !== undefined ? existingSpell.level : (fallbackInfo.level !== undefined ? fallbackInfo.level : 1);
    
    if (details) {
      newSpellDetailsMap[spellName] = details;
      scrapedCount++;
      await new Promise(resolve => setTimeout(resolve, 150));
    } else {
      newSpellDetailsMap[spellName] = {
        school: fallbackSchool,
        level: fallbackLevel,
        ...getHeuristicSpell(spellName, fallbackLevel, fallbackSchool)
      };
      fallbackCount++;
    }
  }
  
  const tomlContent = smolToml.stringify(newSpellDetailsMap);
  fs.writeFileSync(SPELLS_TOML_PATH, tomlContent, 'utf8');
  
  console.log('\n--- Script Statistics ---');
  console.log(`Total number of spells: ${spellNames.length}`);
  console.log(`Number of spells successfully scraped: ${scrapedCount}`);
  console.log(`Number of spells failed/missing (fell back to heuristics): ${fallbackCount}`);
  console.log('Spells details map has been successfully updated in js/data/spells.toml');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error in enrichment script:', err);
    process.exit(1);
  });
}
