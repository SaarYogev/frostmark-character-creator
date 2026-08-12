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

function parseTableToMarkdown($, tableEl) {
  const rows = $(tableEl).find('tr').toArray();
  if (rows.length === 0) return $(tableEl).text().trim();

  const rawMatrix = [];
  let maxCols = 0;
  for (const row of rows) {
    const cells = $(row).find('th, td').toArray().map(c => $(c).text().trim().replace(/\s+/g, ' '));
    if (cells.length > 0) {
      rawMatrix.push(cells);
      if (cells.length > maxCols) maxCols = cells.length;
    }
  }

  if (rawMatrix.length === 0) return '';
  
  // Normalize row cell counts to maxCols
  const matrix = rawMatrix.map(row => {
    const r = [...row];
    while (r.length < maxCols) r.push('');
    return r;
  });

  const header = matrix[0];
  let md = '\n\n' + header.join(' | ') + '\n';
  md += header.map(() => '---').join(' | ') + '\n';
  for (let r = 1; r < matrix.length; r++) {
    md += matrix[r].join(' | ') + '\n';
  }
  return md.trim() + '\n\n';
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
      
      let tx2 = '';
      if (t2 === 'table') {
        tx2 = parseTableToMarkdown($, el2);
      } else {
        tx2 = $(el2).text().trim();
      }

      const info2 = classify(tx2, t2);
      if (info2.type === 'level' || info2.type === 'selection' || info2.type === 'ability') break;

      if (['p', 'ul', 'ol', 'h5', 'h6', 'table', 'div'].includes(t2) && tx2) {
        if (t2 === 'table') {
          if (subEntries.length > 0) {
            const last = subEntries[subEntries.length - 1];
            if (typeof last === 'string') subEntries[subEntries.length - 1] += '\n' + tx2;
            else last.subDesc += '\n' + tx2;
          } else {
            baseDesc += (baseDesc ? '\n\n' : '') + tx2;
          }
        } else {
          const bullet = tx2.match(/^[◘•▪]\s*(.+)/);
          if (bullet) {
            subEntries.push(bullet[1]);
          } else {
            // Split by newlines in case paragraph contains multiple sub-options like "School - SubName: ..."
            const lines = tx2.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              // Sub-option lines usually look like "SubName - ...", "School - SubName: ...", etc.
              // Restrict title prefix matching to concise strings (< 40 chars) to prevent matching long parenthetical rules text
              const subMatch = line.match(/^([A-Za-z0-9\s’'\/]{2,40})\s*[-–—:]\s*(.+)/s);
              if (subMatch && !subMatch[1].toLowerCase().includes('both the unarmed')) {
                subEntries.push({ subName: subMatch[1].trim(), subDesc: subMatch[2].trim() });
              } else if (subEntries.length > 0) {
                const last = subEntries[subEntries.length - 1];
                if (typeof last === 'string') {
                  subEntries[subEntries.length - 1] += '\n' + line;
                } else {
                  last.subDesc += '\n' + line;
                }
              } else {
                baseDesc += (baseDesc ? '\n' : '') + line;
              }
            }
          }
        }
      }
      j++;
    }

    if (subEntries.length > 0) {
      const cleanBase = baseDesc.replace(/\[\]\s*/g, '').trim();
      for (const sub of subEntries) {
        let subName = name.replace(/\[\]\s*/g, '').trim();
        let subDesc = '';
        if (typeof sub === 'string') {
          const cleanedSub = sub.replace(/\[\]\s*/g, '').trim();
          const separatorMatch = cleanedSub.match(/^([^:-]{2,40})\s*[-–—:]\s*(.+)/s);
          if (separatorMatch) {
            subName = `${subName} (${separatorMatch[1].trim()})`;
            subDesc = separatorMatch[2].trim();
          } else {
            subDesc = cleanedSub;
          }
        } else {
          subName = `${subName} (${sub.subName})`;
          subDesc = sub.subDesc.replace(/\[\]\s*/g, '').trim();
        }

        const finalDesc = cleanBase ? `${cleanBase}\n${subDesc}` : subDesc;
        if (finalDesc.trim().length > 0) {
          abilities.push({
            origin: originName,
            level: currentLevel,
            selection: currentSelection,
            name: subName,
            desc: finalDesc.trim()
          });
        }
      }
    } else {
      const cleanName = name.replace(/\[\]\s*/g, '').trim();
      const cleanDesc = baseDesc.replace(/\[\]\s*/g, '').trim();
      if (cleanDesc.length > 0) {
        abilities.push({
          origin: originName,
          level: currentLevel,
          selection: currentSelection,
          name: cleanName,
          desc: cleanDesc
        });
      }
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
  const header = '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!\n# Generated by scripts/ingest_abilities.js\n\n';
  const tomlStr = header + stringify(tomlObj);
  const outPath = path.resolve('src/data/toml/abilities.toml');
  fs.writeFileSync(outPath, tomlStr, 'utf-8');
  console.log(`Successfully wrote ${allAbilities.length} abilities to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
