import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { stringify } from 'smol-toml';

const FEAT_CATEGORIES = [
  { category: 'General Feats', page: 'General_Feats' },
  { category: 'Weapon Feats', page: 'Weapon_Feats' },
  { category: 'Armor Feats', page: 'Armor_Feats' },
  { category: 'Skill Feats', page: 'Skill_Feats' },
  { category: 'Tool Feats', page: 'Tool_Feats' }
];

const VALID_STATS = [
  'Brawn', 'Dexterity', 'Vitality', 'Intelligence',
  'Cunning', 'Resolve', 'Presence', 'Manipulation', 'Composure'
];

async function fetchPageViaAPI(pageName) {
  const apiUrl = `https://frostmark-rpg.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageName)}&prop=text&format=json`;
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

function normalizeSkillName(raw) {
  let s = raw.trim().replace(/[.,]$/, '');
  if (/academics\s*\(\s*history\s*\)/i.test(s)) return 'Academics: History';
  if (/academics\s*:\s*alchemy/i.test(s)) return 'Academics: Alchemy';
  if (/arts\s*&\s*craft\s*:\s*cooking/i.test(s)) return 'Arts & Craft: Cooking';
  if (/crafts?\s*&\s*art\s*:\s*acting/i.test(s)) return 'Arts & Craft: Acting';
  // Standard capitalization
  const known = [
    'Athletics', 'Acrobatics', 'Subterfuge', 'Stealth', 'Animal Handling',
    'Persuasion', 'Deception', 'Intimidation', 'Empathy', 'Leadership',
    'Insight', 'Perception', 'Survival', 'Medicine', 'Investigation',
    'Nature', 'Religion', 'Occult'
  ];
  const found = known.find(k => k.toLowerCase() === s.toLowerCase());
  return found || s;
}

function parseFeatBlock($, featName, category, $nodes) {
  const rawHtml = $nodes.map((_, el) => $(el).html()).get().join('\n');
  const text = $nodes.map((_, el) => $(el).text()).get().join(' ').replace(/\s+/g, ' ').trim();

  // 1. Prerequisite
  let prerequisite = '';
  const prereqMatch = rawHtml.match(/<p>[^<]*<i>\s*Prerequisite\s*<\/i>\s*:\s*([^<]+)<\/p>/i)
    || text.match(/Prerequisite\s*:\s*([^.]*?)(?=Ability score|Increase your|Gain a rank|You gain|$)/i);
  if (prereqMatch) {
    prerequisite = prereqMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  // 2. Ability Score Increase
  let abilityScoreIncrease;
  const asiMatch = text.match(/Ability score\s*:\s*Increase your ([^.\n]+?)(?:score)? by \+?(\d+)/i);
  if (asiMatch) {
    const rawStats = asiMatch[1];
    const value = parseInt(asiMatch[2], 10) || 1;
    const matchedStats = VALID_STATS
      .filter(stat => new RegExp(`\\b${stat}\\b`, 'i').test(rawStats))
      .sort((a, b) => rawStats.toLowerCase().indexOf(a.toLowerCase()) - rawStats.toLowerCase().indexOf(b.toLowerCase()));
    if (matchedStats.length > 0) {
      abilityScoreIncrease = {
        choices: matchedStats,
        value
      };
    }
  }

  // 3. Complete Skill Ranks
  const skillRanks = [];
  const rankMatches = text.matchAll(/(?:Gain|gain) a rank in ([A-Za-z0-9:&() ]+?)(?:\.|$)/g);
  for (const rm of rankMatches) {
    const rawSkill = rm[1];
    const normalized = normalizeSkillName(rawSkill);
    const allowRank5 = /may gain rank 5 in (?:the|this) skill/i.test(text);
    if (!skillRanks.some(sr => sr.skill === normalized)) {
      skillRanks.push({
        skill: normalized,
        rank: 1,
        ...(allowRank5 ? { allow_rank_5: true } : {})
      });
    }
  }

  // 4. Armor Proficiencies
  const armorProficiencies = [];
  if (/proficiency with light armor and shields/i.test(text)) {
    armorProficiencies.push('Light', 'Shields');
  } else if (/proficiency with medium armor and shields/i.test(text)) {
    armorProficiencies.push('Medium', 'Shields');
  } else if (/proficiency with heavy armor and shields/i.test(text)) {
    armorProficiencies.push('Heavy', 'Shields');
  } else if (/proficiency with shields/i.test(text)) {
    armorProficiencies.push('Shields');
  }

  // 5. Weapon Proficiencies
  const weaponProficiencies = [];
  if (/proficient with improvised weapons/i.test(text)) {
    weaponProficiencies.push('Improvised Weapons');
  }
  if (/proficiency with all simple and martial weapons/i.test(text)) {
    weaponProficiencies.push('Simple Weapons', 'Martial Weapons');
  }

  // 6. AC & Saving Throw bonuses
  let acBonus;
  if (/Increase your AC by \+(\d+)/i.test(text)) {
    acBonus = parseInt(text.match(/Increase your AC by \+(\d+)/i)[1], 10);
  }

  let savingThrows;
  const stMatch = text.match(/your (Brawn|Dexterity|Vitality|Intelligence|Cunning|Resolve|Presence|Manipulation|Composure) saving throw score by \+(\d+)/i);
  if (stMatch) {
    savingThrows = [{
      stat: stMatch[1],
      bonus: parseInt(stMatch[2], 10)
    }];
  }

  // Clean description
  let cleanDesc = text
    .replace(/^.*?\[\s*\]\s*/, '')
    .replace(new RegExp(`^${featName}\\s*`, 'i'), '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const feat = {
    name: featName,
    category,
    prerequisite,
    desc: cleanDesc
  };

  if (abilityScoreIncrease) feat.ability_score_increase = abilityScoreIncrease;
  if (skillRanks.length > 0) feat.skill_ranks = skillRanks;
  if (armorProficiencies.length > 0) feat.armor_proficiencies = armorProficiencies;
  if (weaponProficiencies.length > 0) feat.weapon_proficiencies = weaponProficiencies;
  if (acBonus !== undefined) feat.ac_bonus = acBonus;
  if (savingThrows) feat.saving_throws = savingThrows;

  return feat;
}

export async function ingestFeats() {
  const allFeats = [];

  for (const { category, page } of FEAT_CATEGORIES) {
    console.log(`Ingesting ${category} from ${page}...`);
    const html = await fetchPageViaAPI(page);
    const $ = cheerio.load(html);
    const root = $('.mw-parser-output');

    const headings = root.find('h2, h3, h4, h5').filter((_, el) => {
      const txt = $(el).text().replace(/\[\s*\]/g, '').trim();
      return txt.length > 0 && !['Contents', 'Navigation'].includes(txt);
    });

    headings.each((_, hEl) => {
      const featName = $(hEl).text().replace(/\[\s*\]/g, '').trim();
      let cur = $(hEl).next();
      const nodes = [];
      while (cur.length && !cur.is('h2, h3, h4, h5')) {
        nodes.push(cur[0]);
        cur = cur.next();
      }
      const feat = parseFeatBlock($, featName, category, $(nodes));
      allFeats.push(feat);
    });
  }

  console.log(`Total feats parsed: ${allFeats.length}`);
  const tomlObj = { feats: allFeats };
  const header = '# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!\n# Generated by scripts/ingest_feats.js\n\n';
  const tomlStr = header + stringify(tomlObj);
  const outPath = path.resolve('src/data/toml/feats.toml');
  fs.writeFileSync(outPath, tomlStr, 'utf-8');
  console.log(`Successfully written to ${outPath}`);
  return allFeats;
}

if (process.argv[1] && process.argv[1].endsWith('ingest_feats.js')) {
  ingestFeats().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
