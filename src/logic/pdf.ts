import { PDFDocument } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants';
import { getAbilityById } from '../data/abilities';
import { ORIGINS } from '../data/origins';
import { WEAPONS, ARMOR, findArmorData } from '../data/equipment';
import { base64ToUint8Array } from '../services/storage/pdfStorageService';
import {
  getFinalCharacteristics,
  getCharacteristicModifier,
  getProficiencyBonus,
  calculateHPBonus,
  calculateTotalHP,
  getHitDiceBreakdown,
  getPrimaryHDForLevel,
  calculatePotentialGained,
  calculatePotentialRemaining,
  computeSkillPointsSummary,
} from './state';
import { getCharacterSpeed, getRacialSpells } from './racialAbilities';
import { getGlobalAPSummary } from '../utils/stateSanitizer';
import { deduplicateEquipmentList } from './equipmentUtils';
import { resolveIdentityField } from '../types/Character';
export { importFromPDF } from './pdfImport';

const TEMPLATE_PDF_URL = `${import.meta.env.BASE_URL}Frostmark_Character_Sheet_v2.4-2.pdf`;

async function loadTemplate(basePdfBytes?: Uint8Array | ArrayBuffer | string | any) {
  if (basePdfBytes) {
    try {
      if (basePdfBytes instanceof Uint8Array || basePdfBytes instanceof ArrayBuffer) {
        return await PDFDocument.load(basePdfBytes);
      }
      if (typeof basePdfBytes === 'string') {
        const raw = basePdfBytes.startsWith('data:') ? basePdfBytes.split(',')[1] : basePdfBytes;
        return await PDFDocument.load(base64ToUint8Array(raw));
      }
      if (typeof basePdfBytes === 'object' && basePdfBytes !== null) {
        const vals = Object.values(basePdfBytes) as number[];
        return await PDFDocument.load(new Uint8Array(vals));
      }
    } catch {
      /* Fallback to default template if parsing stored bytes fails */
    }
  }
  const response = await fetch(TEMPLATE_PDF_URL);
  if (!response.ok) throw new Error(`Could not fetch PDF template: ${response.status}`);
  return PDFDocument.load(await response.arrayBuffer());
}

function safeSetText(form: any, fieldName: string, value: any, fontSize?: number) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(String(value ?? ''));
    if (fontSize != null && field.setFontSize) {
      field.setFontSize(fontSize);
    }
  } catch {
    /* Silent catch preserves compatibility with varying PDF template versions lacking specific optional fields */
  }
}

function safeCheck(form: any, fieldName: string, checked: boolean) {
  try {
    const field = form.getCheckBox(fieldName);
    if (checked) field.check(); else field.uncheck();
  } catch {
    /* Silent catch preserves compatibility with varying PDF template versions lacking specific checkboxes */
  }
}

function fillRankCheckboxes(form: any, prefix: string, rank: number) {
  for (let i = 1; i <= 5; i++) {
    safeCheck(form, `${prefix} ${i}`, i <= rank);
  }
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const SAVE_FIELD_MAP: Record<string, { text: string; check: string }> = {
  Brawn: { text: 'Brawn Save', check: 'Brawn Save Check' },
  Dexterity: { text: 'Dex Save', check: 'Dex Save Check' },
  Vitality: { text: 'Vita Save', check: 'Vit Save Check' },
  Intelligence: { text: 'Int Save', check: 'Int Save Check' },
  Cunning: { text: 'Cun Save', check: 'Cun Save Check' },
  Resolve: { text: 'Reso Save', check: 'Reso Save Check' },
  Presence: { text: 'Presence Save', check: 'Presc Save Check' },
  Manipulation: { text: 'Mani Save', check: 'Mani Save Check' },
  Composure: { text: 'Comp Save', check: 'Comp Save Check' },
};

const SKILL_STAT_FIELD_MAP: Record<string, string[]> = {
  AH: ['AH Cun', 'AH Pre'],
  Perc: ['Perc Int', 'Perc Com'],
  Ath: ['Ath Br', 'Ath Dex'],
  // The original fillable form field IDs in the sheet are 'Persu Int' and 'Persu Com'
  Persu: ['Persu Int', 'Persu Com'],
  Decep: ['Decep Pre', 'Decep Man'],
  Sub: ['Sub Dex', 'Sub Cun'],
  Emp: ['Emp Man', 'Emp Com'],
  Stealth: ['Stealth Dex', 'Stealth Cun'],
  Inv: ['Inv Cun'],
  Surv: ['Surv Int', 'Surv Cun'],
  Lead: ['Lead Pre', 'Lead Man'],
  Med: ['Med Int', 'Med Cun'],
  Occ: ['Occ Int', 'Occ Cun'],
};

export async function exportToPDF(state: any, racesData: any[], backgroundsData: any[]) {
  const pdfDoc = await loadTemplate(state.importedPdfBytes);
  const form = pdfDoc.getForm();
  const finalStats = getFinalCharacteristics(state, racesData);
  const profBonus = getProficiencyBonus(state.identity?.level ?? state.level ?? 1);

  fillIdentity(form, state, finalStats, racesData);
  fillAbilityScores(form, finalStats, profBonus, state);
  fillSavingThrows(form, finalStats, profBonus, state);
  fillSkills(form, finalStats, profBonus, state);
  fillCombat(form, state, finalStats, racesData, profBonus);
  fillSpellcasting(form, state, finalStats, profBonus, racesData);
  fillEquipment(form, state, backgroundsData);
  fillMisc(form, state, racesData);

  /*
   * Embed character creation metadata (Accomplishment Points and free skill point pools)
   * into PDF document metadata (Subject and Keywords). These properties are completely invisible
   * on rendered and printed character sheets, preserving the authoring state losslessly across PDF round-trips.
   */
  const apSummary = getGlobalAPSummary(state);
  const skillSummary = computeSkillPointsSummary(state, backgroundsData);
  const frostmarkMeta = {
    version: 1,
    accomplishmentPointsRemaining: apSummary.apRemaining,
    accomplishmentPointsLimit: apSummary.apLimit,
    bgFreeRemaining: skillSummary.bgFreeRemaining,
    aoFreeRemaining: skillSummary.aoFreeRemaining,
    freeSkillPointsRemaining: skillSummary.freeSkillPointsRemaining,
  };
  const metaString = `FrostmarkMetadata:${JSON.stringify(frostmarkMeta)}`;
  pdfDoc.setSubject(metaString);
  pdfDoc.setKeywords(['FrostmarkMetadata', metaString]);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function fillIdentity(form: any, state: any, finalStats: Record<string, number>, racesData: any[]) {
  /*
   * Prioritize user edits in state.identity while falling back to root-level properties
   * for backward compatibility with older saved state models and headless test states.
   */
  const charName = resolveIdentityField(state.identity?.characterName, state.characterName);
  const playerName = resolveIdentityField(state.identity?.playerName, state.playerName);

  let raceStr = '—';
  if (typeof state.race === 'string') {
    raceStr = state.race === 'Custom' ? (state.customRace?.name || 'Custom') : state.race;
  } else if (state.race?.race === 'Custom') {
    raceStr = state.customRace?.name || state.race?.customRace?.name || 'Custom';
  } else if (state.race?.race) {
    raceStr = state.race.race;
  }
  const subraceName = typeof state.race?.subrace === 'string' && state.race.subrace
    ? state.race.subrace
    : state.subrace;
  if (subraceName) {
    raceStr += ` (${subraceName})`;
  }

  let bgStr = '—';
  if (typeof state.background === 'string') {
    bgStr = state.background === 'Custom' ? (state.customBackground?.name || 'Custom') : state.background;
  } else if (state.background?.name === 'Custom') {
    bgStr = state.customBackground?.name || state.background?.customBackground?.name || 'Custom';
  } else if (state.background?.name) {
    bgStr = state.background.name;
  }

  safeSetText(form, 'CHARACTER NAME', charName);
  safeSetText(form, 'PLAYER NAME', playerName);
  safeSetText(form, 'RACE', raceStr);
  safeSetText(form, 'BACKGROUND', bgStr);
  safeSetText(form, 'AOs  LEVEL', buildAOLevelString(state));

  const appearance = state.identity?.appearance ?? state.appearance ?? {};
  safeSetText(form, 'Appearance Age', appearance.age ?? '');
  safeSetText(form, 'Appearance Height', appearance.height ?? '');
  safeSetText(form, 'Appearance Weight', appearance.weight ?? '');
  safeSetText(form, 'Appearance Additional', appearance.description ?? appearance.notes ?? '');
  safeSetText(form, 'Personality and Backstory', state.identity?.personalityBackstory ?? state.personalityBackstory ?? '');

  const profsList: string[] = [];
  if (state.languages && state.languages.length) {
    profsList.push(`Languages: ${state.languages.join(', ')}`);
  }
  if (state.armorProficiencies) {
    const activeArmors = Object.entries(state.armorProficiencies)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeArmors.length) profsList.push(`Armor: ${activeArmors.join(', ')}`);
  }
  if (state.weaponProficiencies && state.weaponProficiencies.length) {
    profsList.push(`Weapons: ${state.weaponProficiencies.join(', ')}`);
  }
  const profsText = profsList.join('\n');
  safeSetText(form, 'Lang/profs column', profsText, 7);
  safeSetText(form, 'Other Proficiencies & Languages', profsText, 7);
}

function buildAOLevelString(state: any): string {
  const currentLevel = state.identity?.level ?? state.level ?? 1;
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const activePrimaryAO = levelSelections?.[1]?.primaryAO ?? state.ao?.primaryAO ?? state.primaryAO;
  const secondaryAO = levelSelections?.[1]?.secondaryAO ?? state.ao?.secondaryAO ?? state.secondaryAO;

  let aoStr = activePrimaryAO || 'None';
  if (secondaryAO && secondaryAO !== activePrimaryAO) {
    aoStr += ` / ${secondaryAO}`;
  }
  return `${aoStr} (Level ${currentLevel})`;
}

function fillAbilityScores(form: any, finalStats: Record<string, number>, profBonus: number, state: any) {
  CHARACTERISTICS.forEach(c => {
    const score = finalStats[c.key] ?? 10;
    const mod = getCharacteristicModifier(score);

    safeSetText(form, `${c.key} Ability Score`, String(score));
    const modFieldName = c.key === 'Dexterity' ? 'Dex Ability Modifier' : `${c.key} Ability Modifier`;
    safeSetText(form, modFieldName, formatModifier(mod));

    safeSetText(form, c.key, String(score));
    safeSetText(form, `${c.key} Mod`, formatModifier(mod));
  });
}

function fillSavingThrows(form: any, finalStats: Record<string, number>, profBonus: number, state: any) {
  const savingThrows = state.proficiencies?.savingThrowsProficient ?? state.savingThrowsProficient ?? {};
  CHARACTERISTICS.forEach(c => {
    const score = finalStats[c.key] ?? 10;
    const statMod = getCharacteristicModifier(score);
    const isProf = Boolean(savingThrows[c.key]);
    const saveBonus = statMod + (isProf ? profBonus : 0);

    const mapping = SAVE_FIELD_MAP[c.key];
    if (mapping) {
      safeSetText(form, mapping.text, formatModifier(saveBonus));
      safeCheck(form, mapping.check, isProf);
    }
    safeSetText(form, `${c.key} Save Mod`, formatModifier(saveBonus));
    safeCheck(form, `${c.key} Save Checkbox`, isProf);
  });
}

function fillSkills(form: any, finalStats: Record<string, number>, profBonus: number, state: any) {
  const skillRanks = state.skills?.skillRanks ?? state.skillRanks ?? {};
  let perceptionTotalMod = 0;

  SKILLS.forEach(sk => {
    const primaryStat = sk.stats[0];
    const secondaryStat = sk.stats[1];

    const rawMod1 = getCharacteristicModifier(finalStats[primaryStat] ?? 10);
    const rawMod2 = getCharacteristicModifier(finalStats[secondaryStat] ?? 10);

    const rank = skillRanks[sk.name] ?? 0;
    fillRankCheckboxes(form, sk.key, rank);
    fillRankCheckboxes(form, sk.name, rank);

    const rankBonus = rank > 0 ? Math.ceil((rank * profBonus) / 2) : 0;
    const mod1WithProf = rawMod1 + rankBonus;
    const mod2WithProf = rawMod2 + rankBonus;

    const statFields = SKILL_STAT_FIELD_MAP[sk.key] ?? [];
    if (statFields[0]) safeSetText(form, statFields[0], formatModifier(mod1WithProf));
    if (statFields[1]) safeSetText(form, statFields[1], formatModifier(mod2WithProf));
    if (sk.key === 'Persu') {
      // Also support templates where fields might be named 'Persu Pre' and 'Persu Man'
      safeSetText(form, 'Persu Pre', formatModifier(mod1WithProf));
      safeSetText(form, 'Persu Man', formatModifier(mod2WithProf));
    }

    const baseBonus = rawMod1 + rawMod2;
    safeSetText(form, `${sk.name} Base Mod`, formatModifier(baseBonus));

    safeSetText(form, `${sk.name} Rank Bonus`, rankBonus > 0 ? `+${rankBonus}` : '0');
    safeSetText(form, `${sk.name} Total Mod`, formatModifier(baseBonus + rankBonus));

    if (sk.name === 'Perception') {
      perceptionTotalMod = baseBonus + rankBonus;
    }
  });

  safeSetText(form, 'Passive Perception', String(10 + perceptionTotalMod));

  const academics = state.skills?.academicsEntries ?? state.academicsEntries ?? [];
  const intMod = getCharacteristicModifier(finalStats.Intelligence ?? 10);
  const cunMod = getCharacteristicModifier(finalStats.Cunning ?? 10);

  /* Clear managed academic slots 1 through 3 to prevent leftover values */
  for (let n = 1; n <= 3; n++) {
    safeSetText(form, `Aca ${n} label`, '');
    fillRankCheckboxes(form, `Aca ${n}`, 0);
    safeSetText(form, `Aca ${n} Left Stat`, '');
    safeSetText(form, `Aca ${n} Left Score`, '');
    safeSetText(form, `Aca ${n} Right Stat`, '');
    safeSetText(form, `Aca ${n} Right Score`, '');
  }

  academics.slice(0, 3).forEach((entry: any, i: number) => {
    const n = i + 1;
    const aRank = entry.rank ?? 0;
    const aRankBonus = aRank > 0 ? Math.ceil((aRank * profBonus) / 2) : 0;
    safeSetText(form, `Aca ${n} label`, entry.name ?? '');
    fillRankCheckboxes(form, `Aca ${n}`, aRank);
    safeSetText(form, `Aca ${n} Left Stat`, 'Int');
    safeSetText(form, `Aca ${n} Left Score`, formatModifier(intMod + aRankBonus));
    safeSetText(form, `Aca ${n} Right Stat`, 'Cun');
    safeSetText(form, `Aca ${n} Right Score`, formatModifier(cunMod + aRankBonus));
  });
}

function fillCombat(form: any, state: any, finalStats: Record<string, number>, racesData: any[], profBonus: number) {
  const dexMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  const vitMod = getCharacteristicModifier(finalStats.Vitality ?? 10);
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  safeSetText(form, 'Initiative', formatModifier(dexMod));
  safeSetText(form, 'Initiative Mod', formatModifier(dexMod));

  const speed = getCharacterSpeed(state, racesData);
  safeSetText(form, 'Speed', String(speed));

  const totalHP = (state.manualHP === true && state.maxHP != null)
    ? state.maxHP
    : calculateTotalHP(state, ORIGINS, finalStats, racesData);
  const finalHPVal = String(totalHP);
  safeSetText(form, 'Max HP', finalHPVal);
  safeSetText(form, 'HP Max', finalHPVal);
  // Current HP in PDF export should always equal Max HP (assuming long rest)
  safeSetText(form, 'Current HP', finalHPVal);
  if (state.tempHP != null) {
    safeSetText(form, 'Temp HP', String(state.tempHP));
  }

  const totalHDStr = getHitDiceBreakdown(state, ORIGINS);
  safeSetText(form, 'Total HD', totalHDStr);

  const level1HD = getPrimaryHDForLevel(1, state, ORIGINS);
  safeSetText(form, 'HD', `1d${level1HD}`);
  safeSetText(form, 'Proficiency Bonus', formatModifier(profBonus));

  fillWeaponsAndDefenses(form, state, finalStats, dexMod, profBonus);
}

function extractWeaponRange(propertiesOrRange?: string): string {
  if (!propertiesOrRange) return '1m';
  if (/melee/i.test(propertiesOrRange)) return 'Melee';
  const rangeMatch = propertiesOrRange.match(/range\s+([0-9/]+m)/i);
  if (rangeMatch) return rangeMatch[1];
  const parenMatch = propertiesOrRange.match(/\(([0-9/]+m)\)/i);
  if (parenMatch) return parenMatch[1];
  const directMatch = propertiesOrRange.match(/([0-9/]+m)/i);
  if (directMatch) return directMatch[1];
  if (/reach/i.test(propertiesOrRange)) return '2m';
  return '1m';
}

function isProficientWithWeapon(weaponName: string, weaponProperties: string, proficienciesList: string[]): boolean {
  if (!proficienciesList || !proficienciesList.length) return false;
  const lowerName = weaponName.toLowerCase();
  const lowerProps = weaponProperties.toLowerCase();

  for (const prof of proficienciesList) {
    const p = prof.toLowerCase();
    if (p === 'handpicked 2 weapons' || p === 'all weapons' || p === 'simple weapons' || p === 'martial weapons') {
      return true;
    }
    if (lowerName.includes(p) || p.includes(lowerName)) {
      return true;
    }
    if (p === 'bows' && lowerName.includes('bow') && !lowerName.includes('crossbow')) {
      return true;
    }
    if (p === 'crossbows' && lowerName.includes('crossbow')) {
      return true;
    }
    if (p === 'finesse' && lowerProps.includes('finesse')) {
      return true;
    }
    if (p === 'light' && lowerProps.includes('light')) {
      return true;
    }
    if (p === 'heavy' && lowerProps.includes('heavy')) {
      return true;
    }
    if (p === 'blades' && (lowerName.includes('sword') || lowerName.includes('dagger') || lowerName.includes('rapier') || lowerName.includes('scimitar'))) {
      return true;
    }
    if (p === 'axes' && lowerName.includes('axe')) {
      return true;
    }
    if (p === 'spears' && (lowerName.includes('spear') || lowerName.includes('pike') || lowerName.includes('javelin') || lowerName.includes('halberd'))) {
      return true;
    }
    if (p === 'bludgeons' && (lowerName.includes('mace') || lowerName.includes('hammer') || lowerName.includes('club') || lowerName.includes('flail'))) {
      return true;
    }
  }
  return false;
}

function fillWeaponsAndDefenses(form: any, state: any, finalStats: Record<string, number>, dexMod: number, profBonus: number) {
  const equipmentList = state.equipment?.equipmentList ?? state.equipmentList ?? [];
  const weapons = equipmentList.filter((i: any) => i.isWeapon || i.damage);
  const armors = equipmentList.filter((i: any) => i.isArmor || i.av != null || i.category);

  /* Clear managed weapon slots 1 through 4 to prevent leftover values from base template */
  for (let n = 1; n <= 4; n++) {
    safeSetText(form, `Weapon ${n}`, '');
    safeSetText(form, `Weapon ${n} Hit`, '');
    safeSetText(form, `Weapon ${n} Range`, '');
    safeSetText(form, `Weapon ${n} Damage`, '');
  }

  const brawnMod = getCharacteristicModifier(finalStats.Brawn ?? 10);
  const weaponProfs = state.proficiencies?.weaponProficiencies ?? state.weaponProficiencies ?? [];

  weapons.slice(0, 4).forEach((w: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Weapon ${n}`, w.name ?? '');

    const propsStr = `${w.properties ?? ''} ${w.range ?? ''}`;
    const matchedWeaponData = WEAPONS.find((item) => item.name.toLowerCase() === (w.name ?? '').toLowerCase());
    const fullProps = `${propsStr} ${matchedWeaponData?.properties ?? ''}`.toLowerCase();

    const usesDex = fullProps.includes('finesse') || fullProps.includes('light') || fullProps.includes('ammunition') || fullProps.includes('ranged');
    const abilityMod = usesDex ? dexMod : brawnMod;
    const isProf = isProficientWithWeapon(w.name ?? '', fullProps, weaponProfs);
    const toHit = abilityMod + (isProf ? profBonus : 0);

    safeSetText(form, `Weapon ${n} Hit`, w.hit ?? formatModifier(toHit));
    safeSetText(form, `Weapon ${n} Range`, extractWeaponRange(w.range || matchedWeaponData?.properties || w.properties));
    safeSetText(form, `Weapon ${n} Damage`, w.damage ?? matchedWeaponData?.damage ?? '');
  });

  /* Clear managed defense slots 1 through 6 to prevent leftover values from base template */
  for (let n = 1; n <= 6; n++) {
    safeSetText(form, `Defenses ${n}`, '');
    safeSetText(form, `Defense ${n} AV`, '');
    safeSetText(form, `Defense ${n} Type`, '');
  }

  // Defenses slots 1-6 are for special defenses and resistances only (shields and body armor go to Items)
  const nonBodyDefenses = armors.filter((a: any) => {
    const cat = (a.category ?? a.type ?? '').toLowerCase();
    const name = (a.name ?? '').toLowerCase();
    const isShield = cat === 'shield' || name.includes('shield');
    if (isShield) return false;
    return cat === 'defense' || cat === 'resistance' || a.isDefenseOnly;
  });

  nonBodyDefenses.slice(0, 6).forEach((a: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Defenses ${n}`, a.name ?? '');
    safeSetText(form, `Defense ${n} AV`, a.av != null ? String(a.av) : '');
    safeSetText(form, `Defense ${n} Type`, a.category ?? a.type ?? '');
  });

  let calculatedAC = 10 + dexMod;
  let hasBodyArmor = false;
  let shieldBonus = 0;

  armors.forEach((a: any) => {
    const matchedArmorData = findArmorData(a.name ?? '');
    const category = a.category ?? matchedArmorData?.category ?? a.type ?? '';
    const isShield = a.name === 'Shield' || category === 'Shield' || (a.name ?? '').toLowerCase().includes('shield');

    if (isShield) {
      shieldBonus += Number(matchedArmorData?.av ?? a.av ?? a.baseAC ?? 2);
    } else if (!hasBodyArmor && (matchedArmorData?.av != null || a.av != null || a.baseAC != null)) {
      hasBodyArmor = true;
      const av = Number(matchedArmorData?.av ?? a.av ?? a.baseAC);
      if (category === 'Heavy' || a.addsDexMod === false) {
        calculatedAC = av;
      } else if (category === 'Medium') {
        calculatedAC = av + Math.min(2, Math.max(0, dexMod));
      } else {
        calculatedAC = av + dexMod;
      }
    }
  });

  const finalAC = calculatedAC + shieldBonus;
  safeSetText(form, 'Armor Class', String(finalAC));
}

function fillSpellcasting(form: any, state: any, finalStats: Record<string, number>, profBonus: number, racesData: any[] = []) {
  const spellcastingState = state.spellcasting ?? {};
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const primaryAO = levelSelections?.[1]?.primaryAO ?? state.ao?.primaryAO ?? state.primaryAO;

  const statName = getSpellcastingStat(primaryAO);
  const fullStatName = statName === 'Res' ? 'Resolve' : statName === 'Int' ? 'Intelligence' : 'Presence';
  const statMod = getCharacteristicModifier(finalStats[fullStatName] ?? 10);
  const spellDC = 8 + profBonus + statMod;
  const spellAtkMod = profBonus + statMod;

  safeSetText(form, 'Spellcasting ability', statName);
  safeSetText(form, 'Spell save', String(spellDC));
  safeSetText(form, 'Spell Save DC', String(spellDC));
  safeSetText(form, 'Spellcasting mod', formatModifier(spellAtkMod));
  safeSetText(form, 'Spell Attack Bonus', formatModifier(spellAtkMod));

  const racialSpells = getRacialSpells(state, racesData);
  const innateCantrips = racialSpells.filter((s) => s.isCantrip && s.available).map((s) => s.name);
  const innateSpells = racialSpells.filter((s) => !s.isCantrip && s.available);

  const cantrips: string[] = Array.from(new Set([...(spellcastingState.cantrips ?? []), ...innateCantrips]));
  /* Pre-wipe slot fields so re-exporting over an imported character template does not retain orphaned cantrips */
  for (let i = 1; i <= 5; i++) {
    safeSetText(form, `Cantrip ${i}`, '');
  }
  cantrips.slice(0, 5).forEach((name: string, i: number) => {
    safeSetText(form, `Cantrip ${i + 1}`, name);
  });

  const userSpells: { name: string; level: number }[] = spellcastingState.spells ?? [];
  const spells = [...userSpells];
  innateSpells.forEach((is) => {
    if (!spells.some((s: any) => s.name === is.name)) {
      spells.push({ name: is.name, level: is.level });
    }
  });
  const slots = spellcastingState.slots ?? {};
  const souls = spellcastingState.souls ?? {};

  for (let lvl = 1; lvl <= 9; lvl++) {
    const characterSlots = slots[lvl] !== undefined ? slots[lvl] : 0;
    safeSetText(form, `Level ${lvl} slot total`, String(characterSlots));
    safeSetText(form, `Level ${lvl} Slots Total`, String(characterSlots));
    safeSetText(form, `Level ${lvl} slot expended`, '0');
    safeSetText(form, `Level ${lvl} Slots Expended`, '0');

    if (souls[lvl] !== undefined) {
      safeSetText(form, `Level ${lvl} slot souls`, String(souls[lvl]));
    }

    /* Pre-wipe leveled slots to prevent template artifact leakage across re-exports */
    for (let slotIdx = 1; slotIdx <= 11; slotIdx++) {
      safeSetText(form, `Level ${lvl} Slot ${slotIdx}`, '');
      safeSetText(form, `Level ${lvl} Spell ${slotIdx}`, '');
    }

    const spellsOfLvl = spells.filter((s: any) => s.level === lvl);
    spellsOfLvl.forEach((s: any, i: number) => {
      safeSetText(form, `Level ${lvl} Slot ${i + 1}`, s.name);
      safeSetText(form, `Level ${lvl} Spell ${i + 1}`, s.name);
    });
  }

  const potentialRemaining = calculatePotentialRemaining(state, ORIGINS);
  if (typeof potentialRemaining === 'number' && !isNaN(potentialRemaining)) {
    safeSetText(form, 'Potential', String(potentialRemaining));
  }
}

function getSpellcastingStat(aoName: string): string {
  const divineOrigins = ['Devotion', 'Divine Oath', 'Pact', 'Stewardship'];
  const arcaneOrigins = ['Occult Student', 'Unique Ancestry', 'World Magic'];
  if (divineOrigins.includes(aoName)) return 'Res';
  if (arcaneOrigins.includes(aoName)) return 'Int';
  return 'Pre';
}

export function getSpellSlotsForLevel(level: number): number {
  const slotCounts = [0, 10, 9, 8, 11, 7, 5, 6, 6, 6];
  return slotCounts[level] ?? 0;
}

function getItemGoldCost(item: any): number {
  if (!item || !item.cost) return 0;
  const match = String(item.cost).match(/(\d+)/);
  if (!match) return 0;
  const parsed = parseInt(match[1], 10);
  const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  return isNaN(parsed) ? 0 : parsed * qty;
}

function fillEquipment(form: any, state: any, backgroundsData: any[]) {
  const rawItems = state.equipment?.equipmentList ?? state.equipmentList ?? [];
  const items = deduplicateEquipmentList(rawItems);

  /* Clear managed equipment slots 1 through 21 to prevent leftover values from base template */
  for (let n = 1; n <= 21; n++) {
    safeSetText(form, `Item ${n}`, '');
    safeSetText(form, `Item ${n} weight`, '');
  }

  items.slice(0, 21).forEach((item: any, i: number) => {
    const n = i + 1;
    safeSetText(form, `Item ${n}`, item.name ?? '');
    safeSetText(form, `Item ${n} weight`, item.weight != null ? String(item.weight) : '');
  });

  const goldAmount = state.proficiencies?.goldAmount ?? state.goldAmount ?? 0;
  const isImportedCharacter = Boolean(state.isImported || state.importedPdfBytes || state.importedMetadata);

  let exportedGold = goldAmount;
  if (!isImportedCharacter) {
    let goldSpent = 0;
    items.forEach((item: any) => {
      goldSpent += getItemGoldCost(item);
    });
    exportedGold = Math.max(0, goldAmount - goldSpent);
  }

  const silverAmount = state.proficiencies?.silverAmount ?? state.silverAmount ?? 0;
  const copperAmount = state.proficiencies?.copperAmount ?? state.copperAmount ?? 0;
  safeSetText(form, 'Gold Pieces', String(exportedGold));
  safeSetText(form, 'Silver Pieces', String(silverAmount));
  safeSetText(form, 'Copper Pieces', String(copperAmount));
}

function fillMisc(form: any, state: any, racesData?: any[]) {
  const selectedAbilityFeatures: string[] = [];
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  if (levelSelections) {
    for (let l = 1; l <= currentLevel; l++) {
      const sel = levelSelections[l];
      if (!sel) continue;
      if (sel.primaryAbility) {
        const ab = getAbilityById(sel.primaryAbility) ?? state.ao?.customAbilities?.find((a: any) => a.id === sel.primaryAbility);
        if (ab) {
          const descText = (ab.desc || ab.full_desc || ab.short_desc || '').trim();
          selectedAbilityFeatures.push(`=== ${ab.name} (${ab.origin} · Lv.${ab.level}) ===\n${descText}`);
        }
      }
      if (sel.secondaryAbility) {
        const ab = getAbilityById(sel.secondaryAbility) ?? state.ao?.customAbilities?.find((a: any) => a.id === sel.secondaryAbility);
        if (ab) {
          const descText = (ab.desc || ab.full_desc || ab.short_desc || '').trim();
          selectedAbilityFeatures.push(`=== ${ab.name} (${ab.origin} · Lv.${ab.level}) ===\n${descText}`);
        }
      }
    }
  }

  const bgTraitName = typeof state.background === 'object' ? state.background?.trait : undefined;
  const bgTraitDesc = typeof state.background === 'object' ? state.background?.desc : undefined;
  const backgroundFeatures: string[] = [];
  if (bgTraitName) {
    backgroundFeatures.push(bgTraitDesc ? `=== ${bgTraitName} ===\n${bgTraitDesc}` : `=== ${bgTraitName} ===`);
  }

  /* Gather race and subrace traits from data so they appear in Additional Abilities */
  const raceTraitFeatures: string[] = [];
  const raceName = typeof state.race === 'string' ? state.race : state.race?.race;
  const subraceName = typeof state.race?.subrace === 'string' ? state.race.subrace : state.subrace;
  if (raceName && racesData) {
    const raceObj = racesData.find((r: any) => r.name === raceName);
    if (raceObj?.traits) {
      raceObj.traits.forEach((t: any) => {
        raceTraitFeatures.push(t.desc ? `=== ${t.name} ===\n${t.desc}` : `=== ${t.name} ===`);
      });
    }
    if (subraceName && raceObj?.subraces) {
      const subraceObj = raceObj.subraces.find((s: any) => s.name === subraceName);
      if (subraceObj?.traits) {
        subraceObj.traits.forEach((t: any) => {
          raceTraitFeatures.push(t.desc ? `=== ${t.name} ===\n${t.desc}` : `=== ${t.name} ===`);
        });
      }
    }
  }

  /* Clear managed ability fields before populating to avoid phantom remnants from imported templates */
  safeSetText(form, 'Essential Abilities 1', '');
  safeSetText(form, 'Essential Abilities 2', '');
  safeSetText(form, 'Additional Abilities column 1', '');
  safeSetText(form, 'Additional Abilities column 2', '');

  /* Essential Abilities 1 & 2 strictly hold the primary/secondary AO abilities (e.g. Lv 1 selections) */
  if (selectedAbilityFeatures[0]) safeSetText(form, 'Essential Abilities 1', selectedAbilityFeatures[0]);
  if (selectedAbilityFeatures[1]) safeSetText(form, 'Essential Abilities 2', selectedAbilityFeatures[1]);

  const overflowAO = selectedAbilityFeatures.slice(2);

  const otherFeatures = [
    ...raceTraitFeatures,
    ...backgroundFeatures,
  ].filter((feat) => {
    if (typeof feat === 'string') {
      return !selectedAbilityFeatures.some((aoFeat) => aoFeat.trim() === feat.trim());
    }
    return true;
  });

  const additionalFeatures = [...overflowAO, ...otherFeatures];
  if (additionalFeatures.length > 0) {
    const mid = Math.ceil(additionalFeatures.length / 2);
    const col1Features = additionalFeatures.slice(0, mid).join('\n\n');
    const col2Features = additionalFeatures.slice(mid).join('\n\n');

    safeSetText(form, 'Additional Abilities column 1', col1Features, 7);
    if (col2Features) {
      safeSetText(form, 'Additional Abilities column 2', col2Features, 7);
    }
  }
}

export function downloadPDF(pdfBytes: Uint8Array, filename = 'frostmark-character.pdf') {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
