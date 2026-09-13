import { PDFDocument } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants';
import { getAbilityById } from '../data/abilities';
import { ORIGINS } from '../data/origins';
import {
  getFinalCharacteristics,
  getCharacteristicModifier,
  getProficiencyBonus,
  calculateHPBonus,
  calculateTotalHP,
  getHitDiceBreakdown,
  calculatePotentialGained,
} from './state';
import { resolveIdentityField } from '../types/Character';
export { importFromPDF } from './pdfImport';

const TEMPLATE_PDF_URL = `${import.meta.env.BASE_URL}Frostmark_Character_Sheet_v2.4-2.pdf`;

async function loadTemplate() {
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
  const pdfDoc = await loadTemplate();
  const form = pdfDoc.getForm();
  const finalStats = getFinalCharacteristics(state, racesData);
  const profBonus = getProficiencyBonus(state.identity?.level ?? state.level ?? 1);

  fillIdentity(form, state, finalStats);
  fillAbilityScores(form, finalStats, profBonus, state);
  fillSavingThrows(form, finalStats, profBonus, state);
  fillSkills(form, finalStats, profBonus, state);
  fillCombat(form, state, finalStats, racesData, profBonus);
  fillSpellcasting(form, state, finalStats, profBonus);
  fillEquipment(form, state, backgroundsData);
  fillMisc(form, state);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function fillIdentity(form: any, state: any, finalStats: Record<string, number>) {
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
  const subraceName = typeof state.subrace === 'string' ? state.subrace : state.race?.subrace;
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
  safeSetText(form, 'Appearance Additional', appearance.notes ?? '');
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
  safeSetText(form, 'Lang/profs column', profsText);
  safeSetText(form, 'Other Proficiencies & Languages', profsText);
}

function buildAOLevelString(state: any): string {
  const currentLevel = state.identity?.level ?? state.level ?? 1;
  const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
  const secondaryAO = state.ao?.secondaryAO ?? state.secondaryAO;

  let aoStr = primaryAO || 'None';
  if (secondaryAO && secondaryAO !== primaryAO) {
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

    const mod1 = getCharacteristicModifier(finalStats[primaryStat] ?? 10);
    const mod2 = getCharacteristicModifier(finalStats[secondaryStat] ?? 10);

    const rank = skillRanks[sk.name] ?? 0;
    fillRankCheckboxes(form, sk.key, rank);
    fillRankCheckboxes(form, sk.name, rank);

    const statFields = SKILL_STAT_FIELD_MAP[sk.key] ?? [];
    if (statFields[0]) safeSetText(form, statFields[0], formatModifier(mod1));
    if (statFields[1]) safeSetText(form, statFields[1], formatModifier(mod2));
    if (sk.key === 'Persu') {
      // Also support templates where fields might be named 'Persu Pre' and 'Persu Man'
      safeSetText(form, 'Persu Pre', formatModifier(mod1));
      safeSetText(form, 'Persu Man', formatModifier(mod2));
    }

    const baseBonus = mod1 + mod2;
    safeSetText(form, `${sk.name} Base Mod`, formatModifier(baseBonus));

    let rankBonus = 0;
    if (rank === 1) rankBonus = Math.ceil(profBonus / 2);
    else if (rank === 2) rankBonus = profBonus;
    else if (rank === 3) rankBonus = Math.ceil(profBonus * 1.5);
    else if (rank === 4) rankBonus = profBonus * 2;
    else if (rank === 5) rankBonus = Math.ceil(profBonus * 2.5);

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
  academics.slice(0, 3).forEach((entry: any, i: number) => {
    const n = i + 1;
    safeSetText(form, `Aca ${n} label`, entry.name ?? '');
    fillRankCheckboxes(form, `Aca ${n}`, entry.rank ?? 0);
    safeSetText(form, `Aca ${n} Left Stat`, 'Int');
    safeSetText(form, `Aca ${n} Left Score`, formatModifier(intMod));
    safeSetText(form, `Aca ${n} Right Stat`, 'Cun');
    safeSetText(form, `Aca ${n} Right Score`, formatModifier(cunMod));
  });
}

function fillCombat(form: any, state: any, finalStats: Record<string, number>, racesData: any[], profBonus: number) {
  const dexMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  const vitMod = getCharacteristicModifier(finalStats.Vitality ?? 10);
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  safeSetText(form, 'Initiative', formatModifier(dexMod));
  safeSetText(form, 'Initiative Mod', formatModifier(dexMod));

  const raceName = typeof state.race === 'string' ? state.race : state.race?.race;
  const raceObj = racesData?.find((r: any) => r.name === raceName);
  const speed = state.customRace?.speed ?? raceObj?.speed ?? 6;
  safeSetText(form, 'Speed', String(speed));

  const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
  const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
  const origin = primaryAO === 'Custom' ? customPrimaryAO : ORIGINS.find(o => o.name === primaryAO);
  const primaryHD = origin?.hd ?? 8;

  const totalHP = state.maxHP ?? calculateTotalHP(state, ORIGINS, finalStats, racesData);
  const currentHP = state.currentHP ?? totalHP;
  const finalHPVal = String(totalHP);
  safeSetText(form, 'Max HP', finalHPVal);
  safeSetText(form, 'HP Max', finalHPVal);
  safeSetText(form, 'Current HP', String(currentHP));
  if (state.tempHP != null) {
    safeSetText(form, 'Temp HP', String(state.tempHP));
  }

  const totalHDStr = getHitDiceBreakdown(state, ORIGINS);
  safeSetText(form, 'Total HD', totalHDStr);
  safeSetText(form, 'HD', `d${primaryHD}`);
  safeSetText(form, 'Proficiency Bonus', formatModifier(profBonus));

  fillWeaponsAndDefenses(form, state, finalStats, dexMod);
}

function fillWeaponsAndDefenses(form: any, state: any, finalStats: Record<string, number>, dexMod: number) {
  const equipmentList = state.equipment?.equipmentList ?? state.equipmentList ?? [];
  const weapons = equipmentList.filter((i: any) => i.isWeapon || i.damage);
  const armors = equipmentList.filter((i: any) => i.isArmor || i.av != null || i.category);

  weapons.slice(0, 4).forEach((w: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Weapon ${n}`, w.name ?? '');
    safeSetText(form, `Weapon ${n} Hit`, w.hit ?? w.atkMod ?? '+0');
    safeSetText(form, `Weapon ${n} Range`, w.range ?? w.properties ?? '');
    safeSetText(form, `Weapon ${n} Damage`, w.damage ?? '');
  });

  let calculatedAC = 10 + dexMod;
  let hasBodyArmor = false;
  let shieldBonus = 0;

  armors.slice(0, 6).forEach((a: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Defenses ${n}`, a.name ?? '');
    safeSetText(form, `Defense ${n} AV`, a.av != null ? String(a.av) : '');
    safeSetText(form, `Defense ${n} Type`, a.category ?? a.type ?? '');

    if (a.name === 'Shield' || a.category === 'Shield') {
      shieldBonus += Number(a.av ?? a.baseAC ?? 2);
    } else if (!hasBodyArmor && (a.av != null || a.baseAC != null)) {
      hasBodyArmor = true;
      const av = Number(a.av ?? a.baseAC);
      if (a.category === 'Heavy' || a.addsDexMod === false) {
        calculatedAC = av;
      } else if (a.category === 'Medium') {
        calculatedAC = av + Math.min(2, Math.max(0, dexMod));
      } else {
        calculatedAC = av + dexMod;
      }
    }
  });

  safeSetText(form, 'Armor Class', String(state.armorClass ?? (calculatedAC + shieldBonus)));
}

function fillSpellcasting(form: any, state: any, finalStats: Record<string, number>, profBonus: number) {
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

  const cantrips = spellcastingState.cantrips ?? [];
  cantrips.slice(0, 5).forEach((name: string, i: number) => {
    safeSetText(form, `Cantrip ${i + 1}`, name);
  });

  const spells = spellcastingState.spells ?? [];
  const slots = spellcastingState.slots ?? {};
  const souls = spellcastingState.souls ?? {};

  for (let lvl = 1; lvl <= 9; lvl++) {
    const maxSlots = slots[lvl] ?? getSpellSlotsForLevel(lvl);
    safeSetText(form, `Level ${lvl} slot total`, String(maxSlots));
    safeSetText(form, `Level ${lvl} Slots Total`, String(maxSlots));

    if (souls[lvl] !== undefined) {
      safeSetText(form, `Level ${lvl} slot souls`, String(souls[lvl]));
    }

    const spellsOfLvl = spells.filter((s: any) => s.level === lvl);
    spellsOfLvl.forEach((s: any, i: number) => {
      safeSetText(form, `Level ${lvl} Slot ${i + 1}`, s.name);
      safeSetText(form, `Level ${lvl} Spell ${i + 1}`, s.name);
    });
  }

  const potentialLimit = calculatePotentialGained(state, ORIGINS);
  if (potentialLimit > 0) {
    safeSetText(form, 'Potential', String(potentialLimit));
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

function fillEquipment(form: any, state: any, backgroundsData: any[]) {
  const items = state.equipment?.equipmentList ?? state.equipmentList ?? [];
  items.slice(0, 21).forEach((item: any, i: number) => {
    const n = i + 1;
    safeSetText(form, `Item ${n}`, item.name ?? '');
    safeSetText(form, `Item ${n} weight`, item.weight != null ? String(item.weight) : '');
  });

  const goldAmount = state.proficiencies?.goldAmount ?? state.goldAmount ?? 0;
  const silverAmount = state.proficiencies?.silverAmount ?? state.silverAmount ?? 0;
  const copperAmount = state.proficiencies?.copperAmount ?? state.copperAmount ?? 0;
  safeSetText(form, 'Gold Pieces', String(goldAmount));
  safeSetText(form, 'Silver Pieces', String(silverAmount));
  safeSetText(form, 'Copper Pieces', String(copperAmount));
}

function fillMisc(form: any, state: any) {
  const selectedAbilityFeatures: string[] = [];
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  if (levelSelections) {
    for (let l = 1; l <= currentLevel; l++) {
      const sel = levelSelections[l];
      if (!sel) continue;
      if (sel.primaryAbility) {
        const ab = getAbilityById(sel.primaryAbility);
        if (ab) {
          const descText = (ab.full_desc || ab.short_desc || '').trim();
          selectedAbilityFeatures.push(`=== ${ab.name} (${ab.origin} · Lv.${ab.level}) ===\n${descText}`);
        }
      }
      if (sel.secondaryAbility) {
        const ab = getAbilityById(sel.secondaryAbility);
        if (ab) {
          const descText = (ab.full_desc || ab.short_desc || '').trim();
          selectedAbilityFeatures.push(`=== ${ab.name} (${ab.origin} · Lv.${ab.level}) ===\n${descText}`);
        }
      }
    }
  }

  const features = [
    ...selectedAbilityFeatures,
    ...(state.raceTraits ?? []),
    ...(state.customFeatures ?? [])
  ];
  if (features[0]) safeSetText(form, 'Essential Abilities 1', features[0]);
  if (features[1]) safeSetText(form, 'Essential Abilities 2', features[1]);

  const remainingFeatures = features.slice(2);
  const mid = Math.ceil(remainingFeatures.length / 2);
  const col1Features = remainingFeatures.slice(0, mid).join('\n\n');
  const col2Features = remainingFeatures.slice(mid).join('\n\n');

  safeSetText(form, 'Additional Abilities column 1', col1Features || remainingFeatures.join('\n\n'));
  if (col2Features) {
    safeSetText(form, 'Additional Abilities column 2', col2Features);
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
