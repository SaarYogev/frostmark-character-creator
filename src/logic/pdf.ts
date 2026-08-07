import { PDFDocument } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants';
import { getAbilityById } from '../data/abilities';
import { getFinalCharacteristics, getCharacteristicModifier, getProficiencyBonus, calculateSpentAccomplishmentPoints } from './state';

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
    // Field may not exist in all sheet versions; skip silently
  }
}

function safeCheck(form: any, fieldName: string, checked: boolean) {
  try {
    const field = form.getCheckBox(fieldName);
    if (checked) field.check(); else field.uncheck();
  } catch {
    // Same rationale as safeSetText
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

export async function exportToPDF(state: any, racesData: any[], backgroundsData: any[]) {
  const pdfDoc = await loadTemplate();
  const form = pdfDoc.getForm();
  const finalStats = getFinalCharacteristics(state, racesData);
  const profBonus = getProficiencyBonus(state.identity?.level ?? state.level ?? 1);

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

function fillIdentity(form: any, state: any, finalStats: Record<string, number>) {
  const charName = state.characterName ?? state.identity?.characterName ?? '';
  const playerName = state.playerName ?? state.identity?.playerName ?? '';

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

  const appearance = state.appearance ?? state.identity?.appearance ?? {};
  safeSetText(form, 'Appearance Age', appearance.age ?? '');
  safeSetText(form, 'Appearance Height', appearance.height ?? '');
  safeSetText(form, 'Appearance Weight', appearance.weight ?? '');
  safeSetText(form, 'Appearance Additional', appearance.notes ?? '');
  safeSetText(form, 'Personality and Backstory', state.personalityBackstory ?? state.identity?.personalityBackstory ?? '');

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
  safeSetText(form, 'Other Proficiencies & Languages', profsList.join('\n'));
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
    safeSetText(form, `${c.key} Save Mod`, formatModifier(saveBonus));
    safeCheck(form, `${c.key} Save Checkbox`, isProf);
  });
}

function fillSkills(form: any, finalStats: Record<string, number>, profBonus: number, state: any) {
  const skillRanks = state.skills?.skillRanks ?? state.skillRanks ?? {};
  SKILLS.forEach(sk => {
    const primaryStat = sk.stats[0];
    const secondaryStat = sk.stats[1];

    const mod1 = getCharacteristicModifier(finalStats[primaryStat] ?? 10);
    const mod2 = getCharacteristicModifier(finalStats[secondaryStat] ?? 10);

    const rank = skillRanks[sk.name] ?? 0;
    fillRankCheckboxes(form, sk.name, rank);

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
  });
}

function fillCombat(form: any, state: any, finalStats: Record<string, number>) {
  const dexMod = getCharacteristicModifier(finalStats.Dexterity ?? 10);
  const vitMod = getCharacteristicModifier(finalStats.Vitality ?? 10);
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  safeSetText(form, 'Initiative Mod', formatModifier(dexMod));
  safeSetText(form, 'Speed', String(state.customRace?.speed ?? 6));

  const totalHP = (state.hpBonus ?? 0) + (vitMod * currentLevel);
  safeSetText(form, 'HP Max', String(Math.max(1, totalHP)));
  safeSetText(form, 'Current HP', String(Math.max(1, totalHP)));

  fillWeaponsAndDefenses(form, state, finalStats);
}

function fillWeaponsAndDefenses(form: any, state: any, finalStats: Record<string, number>) {
  const equipmentList = state.equipment?.equipmentList ?? state.equipmentList ?? [];
  const weapons = equipmentList.filter((i: any) => i.isWeapon || i.damage);
  const armors = equipmentList.filter((i: any) => i.isArmor || i.av != null || i.category);

  weapons.slice(0, 5).forEach((w: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Weapon ${n}`, w.name ?? '');
    safeSetText(form, `Weapon ${n} Hit`, w.hit ?? w.atkMod ?? '+0');
    safeSetText(form, `Weapon ${n} Range`, w.range ?? w.properties ?? '');
    safeSetText(form, `Weapon ${n} Damage`, w.damage ?? '');
  });

  armors.slice(0, 3).forEach((a: any, idx: number) => {
    const n = idx + 1;
    safeSetText(form, `Defenses ${n}`, a.name ?? '');
    safeSetText(form, `Defense ${n} AV`, a.av != null ? String(a.av) : '');
    safeSetText(form, `Defense ${n} Type`, a.category ?? a.type ?? '');
  });
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
  safeSetText(form, 'Spell Save DC', String(spellDC));
  safeSetText(form, 'Spell Attack Bonus', formatModifier(spellAtkMod));

  const cantrips = spellcastingState.cantrips ?? [];
  cantrips.slice(0, 6).forEach((name: string, i: number) => {
    safeSetText(form, `Cantrip ${i + 1}`, name);
  });

  const spells = spellcastingState.spells ?? [];
  const slots = spellcastingState.slots ?? {};

  for (let lvl = 1; lvl <= 9; lvl++) {
    const maxSlots = slots[lvl] ?? getSpellSlotsForLevel(lvl);
    safeSetText(form, `Level ${lvl} Slots Total`, String(maxSlots));

    const spellsOfLvl = spells.filter((s: any) => s.level === lvl);
    spellsOfLvl.slice(0, 4).forEach((s: any, i: number) => {
      safeSetText(form, `Level ${lvl} Spell ${i + 1}`, s.name);
    });
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
  safeSetText(form, 'Gold Pieces', String(goldAmount));
  safeSetText(form, 'Silver Pieces', '0');
  safeSetText(form, 'Copper Pieces', '0');
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

  const additionalFeatures = features.slice(2).join('\n');
  safeSetText(form, 'Additional Abilities column 1', additionalFeatures);
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
