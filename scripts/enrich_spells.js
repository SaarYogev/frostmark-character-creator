import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as smolToml from 'smol-toml';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SPELLS_TOML_PATH = path.join(__dirname, '../src/data/toml/spells.toml');

// Generic neutral default fallback used only when a spell field is entirely absent from wiki page and master index
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

function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

let cachedSpellIndex = null;

export async function fetchSpellIndex() {
  if (cachedSpellIndex) return cachedSpellIndex;
  const indexUrl = 'https://frostmark-rpg.fandom.com/api.php?action=parse&page=Spell_List&format=json';
  try {
    const res = await fetch(indexUrl);
    if (!res.ok) return {};
    const data = await res.json();
    const html = data?.parse?.text?.['*'] || '';
    const schools = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Transmutation', 'Vismancy'];
    const spellMap = {};
    const schoolSections = html.split(/<h2[^>]*>/i);

    for (const sSec of schoolSections) {
      const schoolName = schools.find(s => sSec.includes(`id="${s}"`));
      if (!schoolName) continue;

      const levelSections = sSec.split(/<h3[^>]*>/i);
      for (const lSec of levelSections) {
        let level = null;
        if (/Cantrips/i.test(lSec.slice(0, 100))) {
          level = 0;
        } else {
          const lvlMatch = lSec.slice(0, 100).match(/Level\s*(\d+)/i);
          if (lvlMatch) level = parseInt(lvlMatch[1], 10);
        }
        if (level === null) continue;

        const linkRegex = /<a\s+[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = linkRegex.exec(lSec)) !== null) {
          const title = m[1].replace(/ \(page does not exist\)/g, '').trim();
          const text = m[2].replace(/<[^>]+>/g, '').trim();
          spellMap[title.toLowerCase()] = { school: schoolName, level };
          spellMap[text.toLowerCase()] = { school: schoolName, level };
        }
      }
    }
    cachedSpellIndex = spellMap;
    return spellMap;
  } catch (err) {
    return {};
  }
}

export async function fetchSpellDetails(spellName, fallbackLevel = null, fallbackSchool = null) {
  // Normalize typography: standard ASCII apostrophe to typographic right single quote
  let normalizedName = spellName.replace(/\u0027/g, '\u2019');

  const apiUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(normalizedName.replace(/\s+/g, '_'))}&format=json`;
  
  try {
    let res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    let data = await res.json();

    // If direct match failed, try lowercase for minor grammatical words ("of", "the", "and", etc.)
    if (data.error) {
      const titleCased = normalizedName.replace(/\b(Of|The|And|In|A|An|From|To)\b/g, m => m.toLowerCase());
      if (titleCased !== normalizedName) {
        const casedUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(titleCased.replace(/\s+/g, '_'))}&format=json`;
        const cres = await fetch(casedUrl);
        if (cres.ok) {
          const cdata = await cres.json();
          if (!cdata.error) data = cdata;
        }
      }
    }

    // If still not found, search the wiki for the closest matching page title
    if (data.error) {
      const searchUrl = `https://frostmark-rpg.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(normalizedName)}&format=json`;
      const sres = await fetch(searchUrl);
      if (!sres.ok) throw new Error(`Search HTTP error ${sres.status}`);
      const sdata = await sres.json();
      const pageTitle = sdata.query?.search?.[0]?.title;
      if (!pageTitle) throw new Error('No search result for title correction');
      const correctedUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}&format=json`;
      res = await fetch(correctedUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      data = await res.json();
      if (data.error) throw new Error(data.error.info || 'API Error');
    }

    const html = data?.parse?.text?.['*'];
    if (!html) throw new Error('Parsed HTML content missing from API response');
    const cleanHtml = html
      .replace(/<[^>]+>/g, '')
      .replace(/&#160;/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');
    
    const castingTimeMatch = cleanHtml.match(/Casting\s+Time\s*:\s*([^]+?)(?:Range(?:\/Area)?|Duration|Components|Attack|Effect|\[|$)/i);
    let rawCastingTime = castingTimeMatch ? castingTimeMatch[1].trim() : null;
    let castingTime = rawCastingTime;
    if (castingTime) {
      if (castingTime.includes('*')) {
        castingTime = 'Reaction*';
      } else {
        castingTime = castingTime.replace(/\s+or\s+ritual\b/i, '').trim();
        const match = castingTime.match(/^([a-zA-Z0-9\s]+?)(?:,|$)/);
        if (match) castingTime = match[1].trim();
        if (/^reaction$/i.test(castingTime)) {
          castingTime = 'Reaction*';
        }
      }
    }

    const rangeMatch = cleanHtml.match(/Range(?:\/Area)?\s*:\s*([^]+?)(?:Duration|Components|Attack|Effect|\[|$)/i);
    const rawRange = rangeMatch ? rangeMatch[1].trim() : null;
    
    const durationMatch = cleanHtml.match(/Duration\s*:\s*([^]+?)(?:Attack(?:\/Save)?|Components|Effect|Choose|\[|$)/i);
    let rawDuration = durationMatch ? durationMatch[1].trim() : null;
    if (rawDuration && rawDuration.length > 50) {
      const cut = rawDuration.match(/^([a-zA-Z0-9.,\s-]{1,50}?)(?:\s+[A-Z][a-z]+|\.|$)/);
      if (cut) rawDuration = cut[1].trim();
    }

    // Parse level, school, and concentration from parenthetical header metadata
    // (e.g. "(1st, div., conc., ritual)" — allow trailing text after school/conc)
    const metaMatch = cleanHtml.match(/\(\s*(\d+(?:st|nd|rd|th)?|cantrip)\s*,\s*(abj|conj|div|enc|evo|ill|trans|vis)[^)]*\)/i);
    
    const SCHOOL_MAP = {
      abj: 'Abjuration',
      conj: 'Conjuration',
      div: 'Divination',
      enc: 'Enchantment',
      ench: 'Enchantment',
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
    let parentheticalRitual = false;

    // Check header parenthetical for metadata (e.g. "(1st, div., conc., ritual)")
    const headerParenMatch = cleanHtml.slice(0, 500).match(/\(([^)]+)\)/);
    if (headerParenMatch) {
      const parenContent = headerParenMatch[1];
      if (/\bconc/i.test(parenContent)) {
        parentheticalConc = true;
      }
      if (/\britual\b/i.test(parenContent)) {
        parentheticalRitual = true;
      }
    }

    if (metaMatch) {
      const rawLevel = metaMatch[1].toLowerCase();
      const rawSchool = metaMatch[2].toLowerCase();
      level = LEVEL_MAP[rawLevel] !== undefined ? LEVEL_MAP[rawLevel] : parseInt(rawLevel, 10);
      school = SCHOOL_MAP[rawSchool] || null;
      if (metaMatch[0] && /conc/i.test(metaMatch[0])) {
        parentheticalConc = true;
      }
      if (metaMatch[0] && /ritual/i.test(metaMatch[0])) {
        parentheticalRitual = true;
      }
    }
    
    // Resolve missing school or level: first try wiki master spell index, then explicit fallbacks
    if (level === null || school === null) {
      const index = await fetchSpellIndex();
      const indexed = index[spellName.toLowerCase()] || index[normalizedName.toLowerCase()];
      if (indexed) {
        if (level === null) level = indexed.level;
        if (school === null) school = indexed.school;
      }
      if (level === null && fallbackLevel !== null && fallbackLevel !== undefined) {
        level = fallbackLevel;
      }
      if (school === null && fallbackSchool) {
        school = fallbackSchool;
      }
    }

    // Fallback to heuristic values for missing non-standard layout sections while retaining scraped description
    if (!castingTime || !rawRange || !rawDuration || level === null || school === null) {
      const heuristicLevel = level ?? (fallbackLevel !== null && fallbackLevel !== undefined ? fallbackLevel : 1);
      const heuristicSchool = school ?? fallbackSchool ?? 'Abjuration';
      const heuristic = getHeuristicSpell(spellName, heuristicLevel, heuristicSchool);
      if (!castingTime) castingTime = heuristic.castingTime;
      if (!rawRange) rawRange = `${heuristic.range}m`;
      if (!rawDuration) rawDuration = heuristic.duration;
      if (level === null) level = heuristicLevel;
      if (school === null) school = heuristicSchool;
      if (!parentheticalConc) parentheticalConc = heuristic.concentration;
      if (!parentheticalRitual) parentheticalRitual = heuristic.ritual;
    }
    
    let concentration = parentheticalConc;
    let duration = rawDuration;
    if (/concentration/i.test(rawDuration) || /conc/i.test(rawDuration)) {
      concentration = true;
      let cleanDuration = rawDuration.replace(/concentration[.,\s]*/i, '').replace(/conc[.,\s]*/i, '');
      cleanDuration = cleanDuration.replace(/^[\s,.]+|[\s,.]+$/g, '').trim();
      duration = cleanDuration.charAt(0).toUpperCase() + cleanDuration.slice(1);
    }

    let ritual = parentheticalRitual;
    if (!ritual && /\(\s*[^)]*\britual\b[^)]*\)/i.test(cleanHtml)) {
      ritual = true;
    }
    
    let range = 18;
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
      ritual,
      desc
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  const existingSpellsMap = smolToml.parse(fs.readFileSync(SPELLS_TOML_PATH, 'utf8'));
  const spellNames = Object.keys(existingSpellsMap);
  const fallbackSchoolLevelMap = {};
  
  console.log(`Found ${spellNames.length} spells in spells.toml.`);
  
  const newSpellDetailsMap = {};
  let scrapedCount = 0;
  let fallbackCount = 0;
  
  for (const spellName of spellNames) {
    console.log(`Processing spell: ${spellName}...`);
    const existingSpell = existingSpellsMap[spellName];
    const fallbackInfo = fallbackSchoolLevelMap[spellName] || {};
    const fallbackSchool = existingSpell?.school || fallbackInfo.school || 'Abjuration';
    const fallbackLevel = existingSpell?.level !== undefined ? existingSpell.level : (fallbackInfo.level !== undefined ? fallbackInfo.level : 1);

    let details = await fetchSpellDetails(spellName, fallbackLevel, fallbackSchool);

    if (details) {
      details.school = details.school || fallbackSchool;
      details.level = details.level !== undefined && details.level !== null ? details.level : fallbackLevel;
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
  
  const header = '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!\n# Generated by scripts/enrich_spells.js\n\n';
  const tomlContent = header + smolToml.stringify(newSpellDetailsMap);
  fs.writeFileSync(SPELLS_TOML_PATH, tomlContent, 'utf8');
  
  console.log('\n--- Script Statistics ---');
  console.log(`Total number of spells: ${spellNames.length}`);
  console.log(`Number of spells successfully scraped: ${scrapedCount}`);
  console.log(`Number of spells failed/missing (fell back to heuristics): ${fallbackCount}`);
  console.log('Spells details map has been successfully updated in src/data/toml/spells.toml');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Fatal error in enrichment script:', err);
    process.exit(1);
  });
}
