import { PDFDocument } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants.js';
import { getFinalCharacteristics, getCharacteristicModifier, getProficiencyBonus, calculateSpentAccomplishmentPoints } from './state.js';

const TEMPLATE_PDF_URL = `${import.meta.env.BASE_URL}Frostmark_Character_Sheet_v2.4-2.pdf`;

async function loadTemplate() {
  const response = await fetch(TEMPLATE_PDF_URL);
  if (!response.ok) throw new Error(`Could not fetch PDF template: ${response.status}`);
  return PDFDocument.load(await response.arrayBuffer());
}

function safeSetText(form, fieldName, value) {
  try {
    form.getTextField(fieldName).setText(String(value ?? ''));
  } catch {
    // Field may not exist in all sheet versions; skip silently
  }
}

function safeCheck(form, fieldName, checked) {
  try {
    const field = form.getCheckBox(fieldName);
    if (checked) field.check(); else field.uncheck();
  } catch {
    // Same rationale as safeSetText
  }
}

function fillRankCheckboxes(form, prefix, rank) {
  for (let i = 1; i <= 5; i++) {
    safeCheck(form, `${prefix} ${i}`, i <= rank);
  }
}

function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export async function exportToPDF(state, racesData, backgroundsData) {
  const pdfDoc = await loadTemplate();
  const form = pdfDoc.getForm();
  const finalStats = getFinalCharacteristics(state, racesData);
  const profBonus = getProficiencyBonus(state.level);

  fillIdentity(form, state, finalStats);
  fillAbilityScores(form, finalStats, profBonus, state);
  fillSavingThrows(form, finalStats, profBonus, state);
  fillSkills(form, finalStats, profBonus, state);
  fillCombat(form, state, finalStats);
  fillSpellcasting(form, state, finalStats, profBonus);
  fillEquipment(form, state, backgroundsData);
  fillMisc(form, state);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function fillIdentity(form, state, finalStats) {
  safeSetText(form, 'CHARACTER NAME', state.characterName);
  safeSetText(form, 'PLAYER NAME', state.playerName);
  safeSetText(form, 'RACE', state.race === 'Custom' ? state.customRace?.name : state.race);
  safeSetText(form, 'BACKGROUND', state.background === 'Custom' ? state.customBackground?.name : state.background);
  safeSetText(form, 'AOs  LEVEL', buildAOLevelString(state));
  safeSetText(form, 'Appearance Age', state.appearance?.age ?? '');
  safeSetText(form, 'Appearance Height', state.appearance?.height ?? '');
  safeSetText(form, 'Appearance Weight', state.appearance?.weight ?? '');
  safeSetText(form, 'Appearance Additional', state.appearance?.notes ?? '');
  safeSetText(form, 'Personality and Backstory', state.personalityBackstory);
  safeSetText(form, 'Lang/profs column', (state.languages ?? []).join(', '));
}

function buildAOLevelString(state) {
  const primary = state.primaryAO === 'Custom' ? state.customPrimaryAO?.name : state.primaryAO;
  const secondary = state.secondaryAO === 'Custom' ? state.customSecondaryAO?.name : state.secondaryAO;
  const level = state.level;
  let str = `${primary ?? ''} ${level}`;
  if (secondary) str += ` / ${secondary} ${level}`;
  return str;
}

function fillAbilityScores(form, finalStats, profBonus, state) {
  const keys = ['Brawn', 'Dexterity', 'Vitality', 'Intelligence', 'Cunning', 'Resolve', 'Presence', 'Manipulation', 'Composure'];
  const fieldMap = {
    Brawn: { score: 'Brawn Ability Score', mod: 'Brawn Ability Modifier' },
    Dexterity: { score: 'Dexterity Ability Score', mod: 'Dex Ability Modifier' },
    Vitality: { score: 'Vitality Ability Score', mod: 'Vitality Ability Modifier' },
    Intelligence: { score: 'Intelligence Ability Score', mod: 'Intelligence Ability Modifier' },
    Cunning: { score: 'Cunning Ability Score', mod: 'Cunning Ability Modifier' },
    Resolve: { score: 'Resolve Ability Score', mod: 'Resolve Ability Modifier' },
    Presence: { score: 'Presence Ability Score', mod: 'Presence Ability Modifier' },
    Manipulation: { score: 'Manipulation Ability Score', mod: 'Manipulation Ability Modifier' },
    Composure: { score: 'Composure Ability Score', mod: 'Composure Ability Modifier' }
  };

  for (const key of keys) {
    const score = finalStats[key] ?? 10;
    const mod = getCharacteristicModifier(score);
    safeSetText(form, fieldMap[key].score, score);
    safeSetText(form, fieldMap[key].mod, formatModifier(mod));
  }

  safeSetText(form, 'Proficiency Bonus', formatModifier(profBonus));

  const initMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  safeSetText(form, 'Initiative', formatModifier(initMod));
}

function fillSavingThrows(form, finalStats, profBonus, state) {
  const saveFieldMap = {
    Brawn: { check: 'Brawn Save Check', value: 'Brawn Save' },
    Dexterity: { check: 'Dex Save Check', value: 'Dex Save' },
    Vitality: { check: 'Vit Save Check', value: 'Vita Save' },
    Intelligence: { check: 'Int Save Check', value: 'Int Save' },
    Cunning: { check: 'Cun Save Check', value: 'Cun Save' },
    Resolve: { check: 'Reso Save Check', value: 'Reso Save' },
    Presence: { check: 'Presc Save Check', value: 'Presence Save' },
    Manipulation: { check: 'Mani Save Check', value: 'Mani Save' },
    Composure: { check: 'Comp Save Check', value: 'Comp Save' }
  };

  for (const stat in saveFieldMap) {
    const proficient = state.savingThrowsProficient?.[stat] ?? false;
    const base = getCharacteristicModifier(finalStats[stat] ?? 10);
    const total = base + (proficient ? profBonus : 0);
    safeCheck(form, saveFieldMap[stat].check, proficient);
    safeSetText(form, saveFieldMap[stat].value, formatModifier(total));
  }
}

const SKILL_PDF_MAP = {
  'Animal Handling': { prefix: 'AH', stat1field: 'AH Cun', stat2field: 'AH Pre' },
  'Perception':      { prefix: 'Perc', stat1field: 'Perc Int', stat2field: 'Perc Com' },
  'Athletics':       { prefix: 'Ath', stat1field: 'Ath Br', stat2field: 'Ath Dex' },
  'Persuasion':      { prefix: 'Persu', stat1field: 'Persu Int', stat2field: 'Persu Com' },
  'Deception':       { prefix: 'Decep', stat1field: 'Decep Pre', stat2field: 'Decep Man' },
  'Subtlety':        { prefix: 'Sub', stat1field: 'Sub Dex', stat2field: 'Sub Cun' },
  'Empathy':         { prefix: 'Emp', stat1field: 'Emp Man', stat2field: 'Emp Com' },
  'Stealth':         { prefix: 'Stealth', stat1field: 'Stealth Dex', stat2field: 'Stealth Cun' },
  'Investigation':   { prefix: 'Inv', stat1field: 'Inv Cun', stat2field: null },
  'Survival':        { prefix: 'Surv', stat1field: 'Surv Int', stat2field: 'Surv Cun' },
  'Leadership':      { prefix: 'Lead', stat1field: 'Lead Pre', stat2field: 'Lead Man' },
  'Medicine':        { prefix: 'Med', stat1field: 'Med Int', stat2field: 'Med Cun' },
  'Occult':          { prefix: 'Occ', stat1field: 'Occ Int', stat2field: 'Occ Cun' }
};

function calcPassivePerception(finalStats, profBonus, skillRanks) {
  const intMod = getCharacteristicModifier(finalStats.Intelligence ?? 10);
  const comMod = getCharacteristicModifier(finalStats.Composure ?? 10);
  const rank = skillRanks?.Perception ?? 0;
  const rankBonus = rank > 0 ? SKILL_RANK_BONUS_VALUE(profBonus, rank) : 0;
  return 10 + Math.max(intMod, comMod) + rankBonus;
}

function SKILL_RANK_BONUS_VALUE(profBonus, rank) {
  if (rank === 1) return Math.ceil(profBonus / 2);
  if (rank === 2) return profBonus;
  if (rank === 3) return Math.ceil(profBonus * 1.5);
  if (rank === 4) return profBonus * 2;
  if (rank === 5) return Math.ceil(profBonus * 2.5);
  return 0;
}

function fillSkills(form, finalStats, profBonus, state) {
  const skillDef = SKILLS;

  for (const skill of skillDef) {
    const map = SKILL_PDF_MAP[skill.name];
    if (!map) continue;

    const rank = state.skillRanks?.[skill.name] ?? 0;
    fillRankCheckboxes(form, map.prefix, rank);

    const [stat1key, stat2key] = skill.stats;
    const mod1 = getCharacteristicModifier(finalStats[stat1key] ?? 10);
    const mod2 = stat2key ? getCharacteristicModifier(finalStats[stat2key] ?? 10) : null;
    const rankBonus = SKILL_RANK_BONUS_VALUE(profBonus, rank);

    safeSetText(form, map.stat1field, formatModifier(mod1 + rankBonus));
    if (map.stat2field && mod2 !== null) {
      safeSetText(form, map.stat2field, formatModifier(mod2 + rankBonus));
    }
  }

  const acaFields = state.academicsFields ?? [];
  for (let i = 0; i < Math.min(acaFields.length, 3); i++) {
    const field = acaFields[i];
    const rank = state.academicsRanks?.[field] ?? 0;
    const n = i + 1;
    safeSetText(form, `Aca ${n} label`, field);
    fillRankCheckboxes(form, `Aca ${n}`, rank);
    // Academics uses Int for left stat, Cun for right stat
    const intMod = getCharacteristicModifier(finalStats.Intelligence ?? 10);
    const cunMod = getCharacteristicModifier(finalStats.Cunning ?? 10);
    const rankBonus = SKILL_RANK_BONUS_VALUE(profBonus, rank);
    safeSetText(form, `Aca ${n} Left Stat`, 'Int');
    safeSetText(form, `Aca ${n} Right Stat`, 'Cun');
    safeSetText(form, `Aca ${n} Left Score`, formatModifier(intMod + rankBonus));
    safeSetText(form, `Aca ${n} Right Score`, formatModifier(cunMod + rankBonus));
  }

  safeSetText(form, 'Passive Perception', calcPassivePerception(finalStats, profBonus, state.skillRanks));
}

function fillCombat(form, state, finalStats) {

  const race = state.race;
  const maxHP = computeMaxHP(state, finalStats);
  safeSetText(form, 'Max HP', maxHP);
  safeSetText(form, 'Current HP', maxHP);
  safeSetText(form, 'Temp HP', '');

  const primaryHD = state.primaryAOHD ?? 8;
  safeSetText(form, 'HD', `d${primaryHD}`);
  safeSetText(form, 'Total HD', state.level);

  safeSetText(form, 'Speed', state.raceSpeed ? `${state.raceSpeed * 5} ft` : '30 ft');

  const dexMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  const armorAC = computeArmorAC(state, finalStats);
  safeSetText(form, 'Armor Class', armorAC);

  const weapons = state.equipmentList?.filter(i => i.isWeapon) ?? [];
  weapons.slice(0, 4).forEach((w, idx) => {
    const n = idx + 1;
    safeSetText(form, `Weapon ${n}`, w.name);
    safeSetText(form, `Weapon ${n} Hit`, w.hit ?? '');
    safeSetText(form, `Weapon ${n} Range`, w.range ?? '');
    safeSetText(form, `Weapon ${n} Damage`, w.damage ?? '');
  });

  const armors = state.equipmentList?.filter(i => i.isArmor) ?? [];
  armors.slice(0, 3).forEach((a, idx) => {
    safeSetText(form, `Defenses ${idx + 1}`, a.name);
  });
}

function computeMaxHP(state, finalStats) {
  const hd = state.primaryAOHD ?? 8;
  const vitMod = getCharacteristicModifier(finalStats.Vitality ?? 10);
  const base = hd + vitMod;
  return Math.max(1, base) + (state.hpBonus ?? 0);
}

function computeArmorAC(state, finalStats) {
  const dexMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  const equipped = state.equipmentList?.find(i => i.isArmor && i.equipped);
  if (!equipped) return 10 + dexMod;
  return (equipped.baseAC ?? 10) + (equipped.addsDexMod ? Math.min(dexMod, equipped.maxDexBonus ?? 99) : 0);
}

function fillSpellcasting(form, state, finalStats, profBonus) {
  const spellcasting = state.spellcasting;
  if (!spellcasting || (!spellcasting.cantrips?.length && !spellcasting.spells?.length)) return;

  const castingAbility = resolveSpellcastingAbility(state);
  const castMod = getCharacteristicModifier(finalStats[castingAbility] ?? 10);
  const spellSaveDC = 8 + profBonus + castMod;
  const spellAttack = profBonus + castMod;

  safeSetText(form, 'Spellcasting ability', castingAbility.slice(0, 3));
  safeSetText(form, 'Spellcasting mod', formatModifier(spellAttack));
  safeSetText(form, 'Spell save', String(spellSaveDC));
  safeSetText(form, 'Potential', String(state.potentialGained ?? 0));

  spellcasting.cantrips?.slice(0, 5).forEach((c, i) => {
    safeSetText(form, `Cantrip ${i + 1}`, typeof c === 'string' ? c : c.name);
  });

  const byLevel = {};
  (spellcasting.spells ?? []).forEach(sp => {
    const lvl = sp.level ?? 1;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(sp.name ?? sp);
  });

  for (let level = 1; level <= 9; level++) {
    const spellsAtLevel = byLevel[level] ?? [];
    const maxSlots = getSpellSlotsForLevel(level);
    spellsAtLevel.slice(0, maxSlots).forEach((name, i) => {
      safeSetText(form, `Level ${level} Slot ${i + 1}`, name);
    });
  }
}

function resolveSpellcastingAbility(state) {
  const aoName = state.primaryAO !== 'Custom' ? state.primaryAO : state.customPrimaryAO?.name;
  const divineOrigins = ['Devotion', 'Divine Oath'];
  const arcaneOrigins = ['Occult Student', 'Unique Ancestry', 'World Magic'];
  if (divineOrigins.includes(aoName)) return 'Resolve';
  if (arcaneOrigins.includes(aoName)) return 'Intelligence';
  return 'Presence';
}

function getSpellSlotsForLevel(level) {
  const slotCounts = [0, 10, 9, 8, 11, 7, 5, 6, 6, 6];
  return slotCounts[level] ?? 0;
}

function fillEquipment(form, state, backgroundsData) {
  const items = state.equipmentList ?? [];
  items.slice(0, 21).forEach((item, i) => {
    const n = i + 1;
    safeSetText(form, `Item ${n}`, item.name ?? '');
    safeSetText(form, `Item ${n} weight`, item.weight != null ? String(item.weight) : '');
  });

  safeSetText(form, 'Gold Pieces', String(state.goldAmount ?? 0));
  safeSetText(form, 'Silver Pieces', '0');
  safeSetText(form, 'Copper Pieces', '0');
}

function fillMisc(form, state) {

  const features = [
    ...(state.raceTraits ?? []),
    ...(state.customFeatures ?? [])
  ];
  if (features[0]) safeSetText(form, 'Essential Abilities 1', features[0]);
  if (features[1]) safeSetText(form, 'Essential Abilities 2', features[1]);

  const additionalFeatures = features.slice(2).join('\n');
  safeSetText(form, 'Additional Abilities column 1', additionalFeatures);
}

export function downloadPDF(pdfBytes, filename = 'frostmark-character.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
