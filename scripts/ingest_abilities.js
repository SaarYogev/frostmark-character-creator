import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { stringify } from 'smol-toml';

const ORIGINS = [
  { key: 'Artistry', urlName: 'Artistry' },
  { key: 'Devotion', urlName: 'Devotion' },
  { key: 'Discipline', urlName: 'Discipline' },
  { key: 'Divine Oath', urlName: 'Divine_Oath' },
  { key: 'Finesse', urlName: 'Finesse' },
  { key: 'Occult Student', urlName: 'Occult_Student' },
  { key: 'Pact', urlName: 'Pact' },
  { key: 'Power', urlName: 'Power' },
  { key: 'Predator', urlName: 'Predator' },
  { key: 'Soul Oath', urlName: 'Soul_Oath' },
  { key: 'Soul Weapon', urlName: 'Soul_Weapon' },
  { key: 'Tactics', urlName: 'Tactics' },
  { key: 'Unique Ancestry', urlName: 'Unique_Ancestry' },
  { key: 'World Magic', urlName: 'World_Magic' }
];

async function fetchWikitextViaAPI(pageName) {
  const apiUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName.replace(/ /g, '_'))}&format=json`;
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status} on ${apiUrl}`);
  const data = await res.json();
  if (data.error) throw new Error(`API Error: ${data.error.info || JSON.stringify(data.error)}`);
  return data.parse?.text?.['*'] || '';
}

function classify(text, tag) {
  text = text.replace(/(\[\]\s*)+$/, '').trim();
  const lvl = text.match(/^Level\s+(\d+)/i);
  if (lvl) return { type: 'level', level: parseInt(lvl[1], 10) };
  if (['h2', 'h3', 'h4', 'h5'].includes(tag)) {
    if (/secondary selection/i.test(text)) return { type: 'selection', selection: 'Secondary' };
    if (/primary selection/i.test(text)) return { type: 'selection', selection: 'Primary' };
  }
  const bracket = text.match(/\[([^\]]+)\]\s*$/);
  if (bracket && !['ul', 'ol', 'table', 'div'].includes(tag)) {
    return { type: 'ability', name: text.replace(/\[.*?\]\s*$/, '').replace(/★/g, '').trim() };
  }
  return { type: 'other' };
}

function parseOriginAbilities(originName, html) {
  const $ = cheerio.load(html);
  const root = $('.mw-parser-output');
  const abilities = [];
  let currentLevel = 0;
  let currentSelection = 'Primary';

  const kids = root.children().toArray();

  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim();
    const info = classify(text, tag);

    if (info.type === 'level') {
      currentLevel = info.level;
      currentSelection = 'Primary';
      continue;
    }
    if (info.type === 'selection') {
      currentSelection = info.selection;
      continue;
    }
    if (info.type !== 'ability' || currentLevel === 0) continue;

    const name = info.name;
    const subEntries = [];
    let baseDesc = '';

    let j = i + 1;
    while (j < kids.length) {
      const el2 = kids[j];
      const t2 = el2.tagName.toLowerCase();
      const tx2 = $(el2).text().trim();
      const info2 = classify(tx2, t2);
      if (info2.type === 'level' || info2.type === 'selection' || info2.type === 'ability') break;
      if (['p', 'ul', 'ol', 'h5', 'h6', 'table'].includes(t2) && tx2) {
        const bullet = tx2.match(/^[◘•▪]\s*(.+)/);
        if (bullet) subEntries.push(bullet[1]);
        else if (subEntries.length > 0) subEntries[subEntries.length - 1] += '\n' + tx2;
        else baseDesc += (baseDesc ? '\n' : '') + tx2;
      }
      j++;
    }

    if (subEntries.length > 0) {
      for (const sub of subEntries) {
        const dashIdx = sub.indexOf(' - ');
        const subName = dashIdx > -1 ? sub.slice(0, dashIdx).trim() : sub.trim();
        const subDesc = dashIdx > -1 ? sub.slice(dashIdx + 3).trim() : '';
        abilities.push({ origin: originName, level: currentLevel, selection: currentSelection, name: subName, desc: subDesc.replace(/\[\]\s*/g, '').trim() });
      }
    } else {
      abilities.push({ origin: originName, level: currentLevel, selection: currentSelection, name, desc: baseDesc.replace(/\[\]\s*/g, '').trim() });
    }
  }

  return abilities;
}

async function main() {
  const allAbilities = [];
  for (const org of ORIGINS) {
    console.log(`Fetching ${org.key}...`);
    try {
      const html = await fetchWikitextViaAPI(org.key);
      const list = parseOriginAbilities(org.key, html);
      console.log(`Parsed ${list.length} abilities for ${org.key}`);
      allAbilities.push(...list);
    } catch (err) {
      console.error(`Failed parsing ${org.key}:`, err.message);
    }
  }

  const tomlObj = { abilities: allAbilities };
  const tomlStr = stringify(tomlObj);
  const outPath = path.resolve('js/data/abilities.toml');
  fs.writeFileSync(outPath, tomlStr, 'utf-8');
  console.log(`Successfully wrote ${allAbilities.length} abilities to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
