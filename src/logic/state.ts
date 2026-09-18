import { POINT_BUY_COSTS, SAVE_PROFICIENCY_COSTS, ARMOR_PROFICIENCY_COSTS, WEAPON_PROFICIENCY_COSTS, SKILL_RANK_CUMULATIVE_COSTS } from '../data/constants';
import { ORIGINS, OriginData } from '../data/origins';
import { deduplicateEquipmentList } from './equipmentUtils';

export function getInitialState() {
  return {
    campaignPowerLevel: 'Heroic',
    characterName: '',
    playerName: '',
    
    race: '',
    subrace: '',
    background: '',
    primaryAO: '',
    secondaryAO: '',
    level: 1,

    selectedAOs: [] as string[],
    customAOs: [] as any[],
    levelSelections: {} as Record<string, any>,

    customRace: { name: '', stats: {}, speed: 6, size: 'Medium', traits: [] },
    customBackground: { name: '', skills: [], gold: 10, equipment: '', trait: '', desc: '' },
    customPrimaryAO: { name: '', hd: 8, extraSkills: 0, spellcasting: 'Minor', desc: '' },
    customSecondaryAO: { name: '', hd: 8, extraSkills: 0, spellcasting: 'Minor', desc: '' },

    baseCharacteristics: {
      Brawn: 10,
      Dexterity: 10,
      Vitality: 10,
      Intelligence: 10,
      Cunning: 10,
      Resolve: 10,
      Presence: 10,
      Manipulation: 10,
      Composure: 10
    },
    
    halfElfChoice1: '',
    halfElfChoice2: '',
    woodElfChoice: '',

    skillRanks: {} as Record<string, number>,
    academicsFields: [] as string[],
    academicsRanks: {} as Record<string, number>,
    academicsEntries: [] as { name: string; rank: number }[],
    artsCraftEntries: [] as { name: string; rank: number }[],

    savingThrowsProficient: {
      Brawn: false,
      Dexterity: false,
      Vitality: false,
      Intelligence: false,
      Cunning: false,
      Resolve: false,
      Presence: false,
      Manipulation: false,
      Composure: false
    },

    armorProficiencies: {
      Light: false,
      Medium: false,
      Heavy: false,
      Shields: false
    },

    weaponProficiencies: [] as string[],

    spellcasting: {
      cantrips: [] as string[],
      spells: [] as { name: string; level: number }[],
      slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } as Record<number, number>
    },

    equipmentList: [] as any[],
    goldAmount: 10,
    languages: [] as string[],

    personalityBackstory: '',
    customFeatures: [] as any[],

    manualSkills: false,
    manualProficiencies: false,
    manualRaces: false,
    manualSpells: false,
    manualEquipment: false,
    racialStatOverrides: {
      Brawn: 0,
      Dexterity: 0,
      Vitality: 0,
      Intelligence: 0,
      Cunning: 0,
      Resolve: 0,
      Presence: 0,
      Manipulation: 0,
      Composure: 0
    }
  };
}

export function getAbilityPointLimit(powerLevel: string): number {
  if (powerLevel === 'Mundane') return 20;
  if (powerLevel === 'Champion') return 30;
  return 25;
}

export function getBaseAccomplishmentPoints(powerLevel: string): number {
  if (powerLevel === 'Mundane') return 14;
  if (powerLevel === 'Champion') return 18;
  return 16;
}

export function getTotalAccomplishmentPointsLimit(state: any): number {
  const base = getBaseAccomplishmentPoints(state.campaignPowerLevel ?? state.identity?.campaignPowerLevel);
  const lvl = state.level ?? state.identity?.level ?? 1;
  const levelsOverThreshold = Math.floor((lvl - 1) / 4);
  return base + (levelsOverThreshold * 2);
}

export function getAttributePointCost(score: number): number {
  return POINT_BUY_COSTS[score] ?? 0;
}

export function calculateSpentAbilityPoints(state: any): number {
  let total = 0;
  const chars = state.baseCharacteristics ?? {};
  for (const char in chars) {
    total += getAttributePointCost(chars[char]);
  }
  return total;
}

export function getProficiencyBonus(level: number): number {
  return 2 + Math.floor(((level ?? 1) - 1) / 4);
}

export function getRacialStatBonuses(state: any, raceData: any[]): Record<string, number> {
  const bonuses: Record<string, number> = {};
  const raceState = state?.race ?? {};
  const raceName = typeof state?.race === 'string' ? state.race : raceState.race;
  const subraceName = typeof state?.subrace === 'string' ? state.subrace : raceState.subrace;

  if (!raceName) return bonuses;

  const manualRaces = raceState.manualRaces ?? state?.manualRaces;
  if (manualRaces) {
    const overrides = raceState.racialStatOverrides ?? state?.racialStatOverrides ?? {};
    for (const stat in overrides) {
      bonuses[stat] = (bonuses[stat] ?? 0) + (overrides[stat] ?? 0);
    }
    return bonuses;
  }

  if (raceName === 'Custom') {
    const customStats = raceState.customRace?.stats ?? state?.customRace?.stats ?? {};
    for (const stat in customStats) {
      bonuses[stat] = (bonuses[stat] ?? 0) + (customStats[stat] ?? 0);
    }
    return bonuses;
  }

  const race = raceData?.find((r: any) => r.name === raceName);
  if (!race) return bonuses;

  if (race.stats) {
    for (const stat in race.stats) {
      if (stat !== 'choice' && stat !== 'flexiblePoints') {
        bonuses[stat] = (bonuses[stat] ?? 0) + (race.stats[stat] ?? 0);
      }
    }
  }

  const woodElfChoice = raceState.woodElfChoice ?? state?.woodElfChoice;
  if (raceName === 'Elf' && subraceName === 'Wood' && woodElfChoice) {
    bonuses[woodElfChoice] = (bonuses[woodElfChoice] ?? 0) + 1;
  }

  if (raceName === 'Half-elf') {
    const choice1 = raceState.halfElfChoice1 ?? state?.halfElfChoice1;
    const choice2 = raceState.halfElfChoice2 ?? state?.halfElfChoice2;
    if (choice1) {
      bonuses[choice1] = (bonuses[choice1] ?? 0) + 1;
    }
    if (choice2) {
      bonuses[choice2] = (bonuses[choice2] ?? 0) + 1;
    }
  }

  if (subraceName && race.subraces) {
    const sub = race.subraces.find((s: any) => s.name === subraceName);
    if (sub && sub.stats) {
      for (const stat in sub.stats) {
        if (stat !== 'choice') {
          bonuses[stat] = (bonuses[stat] ?? 0) + (sub.stats[stat] ?? 0);
        }
      }
    }
  }

  return bonuses;
}

export function getFinalCharacteristics(state: any, raceData: any[]): Record<string, number> {
  const baseChars = state?.baseCharacteristics ?? {
    Brawn: 10, Dexterity: 10, Vitality: 10, Intelligence: 10,
    Cunning: 10, Resolve: 10, Presence: 10, Manipulation: 10, Composure: 10
  };
  const bonuses = getRacialStatBonuses(state, raceData);
  const final: Record<string, number> = { ...baseChars };
  for (const stat in bonuses) {
    if (final[stat] !== undefined) {
      final[stat] += bonuses[stat];
    }
  }
  return final;
}

export function getCharacteristicModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function computeFreeSkillPools(state: any, backgroundsData: any[]) {
  let bgFree = 0;
  let builtInRanks: Record<string, number> = {};
  let builtInAcademics: Record<string, number> = {};
  let restrictSkills: string[] | null = null;

  const bgName = typeof state.background === 'string' ? state.background : state.background?.name;

  if (bgName === 'Custom') {
    const customBg = state.customBackground ?? state.background?.customBackground;
    bgFree = customBg?.skills?.length ?? 4;
    restrictSkills = customBg?.skills ?? null;
  } else if (bgName) {
    const bg = backgroundsData.find(b => b.name === bgName);
    if (bg) {
      bgFree = bg.freeSkillPoints ?? 4;
      builtInRanks = bg.builtInRanks ?? {};
      builtInAcademics = bg.builtInAcademics ?? {};
      restrictSkills = bg.restrictSkills ?? null;
    }
  }

  let aoFree = 0;
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const hasLevelSelections = levelSelections && Object.keys(levelSelections).length > 0;
  const currentLevel = state.identity?.level ?? state.level ?? 1;

  if (hasLevelSelections) {
    let extraCount = 0;
    for (let i = 1; i <= currentLevel; i++) {
      const selection = levelSelections[i];
      if (selection && selection.primaryAO) {
        let origin = ORIGINS.find(o => o.name === selection.primaryAO);
        if (!origin && selection.primaryAO === 'Custom') {
          origin = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
        } else if (!origin && (state.ao?.customAOs || state.customAOs)) {
          const customList = state.ao?.customAOs ?? state.customAOs;
          origin = customList.find((o: any) => o.name === selection.primaryAO);
        }
        if ((origin?.extraSkills ?? 0) > 0) {
          extraCount++;
        }
      }
    }
    if (extraCount > 0) {
      aoFree = 4 + Math.floor((extraCount - 1) / 4) * 2;
    }
  } else {
    const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
    const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
    const primaryOrigin = ORIGINS.find(o => o.name === primaryAO);
    const primaryExtra = primaryAO === 'Custom' ? (customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
    if (primaryExtra > 0) {
      aoFree = 4;
    }
  }

  return {
    bgFree,
    aoFree,
    builtInRanks,
    builtInAcademics,
    restrictSkills
  };
}

export function calculateSpentAccomplishmentPoints(state: any, backgroundsData: any[]) {
  let spent = 0;

  const { bgFree, aoFree, builtInRanks, builtInAcademics, restrictSkills } = computeFreeSkillPools(state, backgroundsData);

  let restrictedSpent = 0;
  let unrestrictedSpent = 0;

  const skillRanks = state.skills?.skillRanks ?? state.skillRanks ?? {};
  for (const sk in skillRanks) {
    const rank = skillRanks[sk] ?? 0;
    const builtIn = builtInRanks[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes(sk)) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  const isAcaRestricted = restrictSkills && (restrictSkills.includes('Academics') || restrictSkills.includes('Academic'));
  const acaEntries = state.skills?.academicsEntries ?? state.academicsEntries ?? [];
  if (acaEntries.length > 0) {
    for (const entry of acaEntries) {
      const rank = entry.rank ?? 0;
      const builtIn = builtInAcademics[entry.name] ?? 0;
      const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
      if (isAcaRestricted || (restrictSkills && restrictSkills.includes(entry.name))) {
        restrictedSpent += cost;
      } else {
        unrestrictedSpent += cost;
      }
    }
  } else {
    const academicsRanks = state.skills?.academicsRanks ?? state.academicsRanks ?? {};
    for (const field in academicsRanks) {
      const rank = academicsRanks[field] ?? 0;
      const builtIn = builtInAcademics[field] ?? 0;
      const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
      if (isAcaRestricted || (restrictSkills && restrictSkills.includes(field))) {
        restrictedSpent += cost;
      } else {
        unrestrictedSpent += cost;
      }
    }
  }

  const artsEntries = state.skills?.artsCraftEntries ?? state.artsCraftEntries ?? [];
  for (const entry of artsEntries) {
    const rank = entry.rank ?? 0;
    const builtIn = builtInRanks['Arts & Craft'] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes('Arts & Craft')) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  let skillsSpent = 0;
  if (restrictSkills) {
    const restrictedDiscount = Math.min(bgFree, restrictedSpent);
    const excessRestricted = restrictedSpent - restrictedDiscount;
    const totalUnrestricted = excessRestricted + unrestrictedSpent;
    skillsSpent = Math.max(0, totalUnrestricted - aoFree);
  } else {
    const totalSpentPoints = restrictedSpent + unrestrictedSpent;
    const totalFreePoints = bgFree + aoFree;
    skillsSpent = Math.max(0, totalSpentPoints - totalFreePoints);
  }

  const savingThrows = state.proficiencies?.savingThrowsProficient ?? state.savingThrowsProficient ?? {};
  for (const save in savingThrows) {
    if (savingThrows[save]) {
      spent += SAVE_PROFICIENCY_COSTS[save] || 1;
    }
  }

  const armorProfs = state.proficiencies?.armorProficiencies ?? state.armorProficiencies ?? {};
  if (armorProfs.Heavy) {
    spent += 3;
  } else if (armorProfs.Medium) {
    spent += 2;
  } else if (armorProfs.Light) {
    spent += 1;
  }
  if (armorProfs.Shields) {
    spent += 1;
  }

  const weaponProfs = state.proficiencies?.weaponProficiencies ?? state.weaponProficiencies;
  if (weaponProfs && Array.isArray(weaponProfs)) {
    for (const group of weaponProfs) {
      if (WEAPON_PROFICIENCY_COSTS.Groups1pt.includes(group)) {
        spent += 1;
      } else if (WEAPON_PROFICIENCY_COSTS.Groups2pt.includes(group)) {
        spent += 2;
      } else if (WEAPON_PROFICIENCY_COSTS.Groups3pt.includes(group)) {
        spent += 3;
      }
    }
  }

  let bgGold = 10;
  const bgName = typeof state.background === 'string' ? state.background : state.background?.name;
  if (bgName === 'Custom') {
    const customBg = state.customBackground ?? state.background?.customBackground;
    bgGold = customBg?.gold ?? 10;
  } else if (bgName) {
    const bg = backgroundsData.find(b => b.name === bgName);
    if (bg) bgGold = bg.gold;
  }

  const goldAmount = state.proficiencies?.goldAmount ?? state.goldAmount ?? 10;
  if (goldAmount > bgGold) {
    const excess = goldAmount - bgGold;
    spent += Math.ceil(excess / 25);
  }

  return {
    skillsSpent,
    otherSpent: spent,
    totalSpent: skillsSpent + spent
  };
}

export function importCharacterJSON(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.level && !parsed.identity?.level && !parsed.baseCharacteristics && !parsed.characteristics && !parsed.finalCharacteristics) {
      throw new Error('Missing core character stats');
    }

    if (!parsed.academicsEntries || parsed.academicsEntries.length === 0) {
      const entries: { name: string; rank: number }[] = [];
      if (parsed.academicsRanks) {
        for (const [name, rank] of Object.entries(parsed.academicsRanks)) {
          if ((rank as number) > 0 || (parsed.academicsFields && parsed.academicsFields.includes(name))) {
            entries.push({ name, rank: (rank as number) || 1 });
          }
        }
      } else if (parsed.academicsFields) {
        for (const name of parsed.academicsFields) {
          entries.push({ name, rank: 1 });
        }
      }
      parsed.academicsEntries = entries;
    }

    if (!parsed.artsCraftEntries || parsed.artsCraftEntries.length === 0) {
      const legacyRank = parsed.skillRanks ? importSkillArtsCraftRank(parsed) : 0;
      if (legacyRank > 0) {
        parsed.artsCraftEntries = [{ name: 'General Crafting', rank: legacyRank }];
      } else {
        parsed.artsCraftEntries = [];
      }
    }

    return parsed;
  } catch (e: any) {
    throw new Error('Invalid JSON character sheet: ' + e.message);
  }
}

function importSkillArtsCraftRank(parsed: any): number {
  return parsed.skillRanks?.['Arts & Craft'] ?? parsed.skillRanks?.['Arts'] ?? 0;
}

export function exportCharacterJSON(state: any, raceData?: any[]): string {
  const races = raceData ?? [];
  const finalStats = getFinalCharacteristics(state, races);

  // Strip redundant flat legacy fields so the exported JSON has a clean, single canonical nested format
  const {
    characteristics,
    finalCharacteristics,
    characterName,
    playerName,
    subrace,
    level,
    maxHP,
    currentHP,
    tempHP,
    speed,
    goldAmount,
    silverAmount,
    copperAmount,
    skillRanks,
    savingThrowsProficient,
    armorProficiencies,
    weaponProficiencies,
    languages,
    equipmentList,
    primaryAO,
    secondaryAO,
    selectedAOs,
    levelSelections,
    personalityBackstory,
    appearance,
    manualSkills,
    manualProficiencies,
    manualEquipment,
    manualRaces,
    manualHP,
    manualSpells,
    raceState,
    ...cleanState
  } = state;

  const calculatedMaxHP = calculateTotalHP(state, ORIGINS, finalStats, races);
  const exported = {
    ...cleanState,
    manualHP: false,
    combat: {
      ...(cleanState.combat ?? {}),
      maxHP: calculatedMaxHP,
      currentHP: state.combat?.currentHP ?? state.currentHP ?? calculatedMaxHP,
    },
    equipment: {
      ...(cleanState.equipment ?? {}),
      equipmentList: deduplicateEquipmentList(
        cleanState.equipment?.equipmentList ?? state.equipmentList ?? []
      ),
    },
    baseCharacteristics: finalStats,
    finalCharacteristics: finalStats,
  };
  return JSON.stringify(exported, null, 2);
}

export function calculatePotentialGained(state: any, originsData: OriginData[]): number {
  if (typeof state.potentialGained === 'number' && state.potentialGained > 0) {
    return state.potentialGained;
  }

  const table: Record<'Minor' | 'Moderate' | 'Major', number[]> = {
    Minor:    [20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50],
    Moderate: [40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70],
    Major:    [60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 140, 140, 140, 140, 140, 180, 180, 180, 180, 180]
  };

  const level = state.identity?.level ?? state.level ?? 1;
  let total = 0;
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const hasLevelSelections = levelSelections && Object.keys(levelSelections).length > 0;

  for (let i = 1; i <= level; i++) {
    let tag: 'Minor' | 'Moderate' | 'Major' = 'Minor';
    if (hasLevelSelections) {
      const selection = levelSelections[i];
      if (selection && selection.primaryAO) {
        let origin = originsData.find(o => o.name === selection.primaryAO);
        if (!origin && selection.primaryAO === 'Custom') {
          origin = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
        } else if (!origin && (state.ao?.customAOs || state.customAOs)) {
          const customList = state.ao?.customAOs ?? state.customAOs;
          origin = customList.find((o: any) => o.name === selection.primaryAO);
        }
        tag = origin?.spellcasting ?? 'Minor';
      } else {
        const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
        const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
        const origin = primaryAO === 'Custom'
          ? customPrimaryAO
          : originsData.find(o => o.name === primaryAO);
        tag = origin?.spellcasting ?? state.primaryAOSpellcasting ?? 'Minor';
      }
    } else {
      const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
      const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
      const origin = primaryAO === 'Custom'
        ? customPrimaryAO
        : originsData.find(o => o.name === primaryAO);
      tag = origin?.spellcasting ?? state.primaryAOSpellcasting ?? 'Minor';
    }

    const gain = table[tag]?.[i - 1] ?? 0;
    total += gain;
  }
  return total;
}

export function calculatePotentialSpent(state: any): number {
  const spellcasting = state.spellcasting ?? {};
  const cantrips: string[] = spellcasting.cantrips ?? [];
  const spells: { name: string; level: number }[] = spellcasting.spells ?? [];
  const slots: Record<number, number> = spellcasting.slots ?? {};

  let spent = cantrips.length * 10;
  spells.forEach((s) => { spent += 10 * (s.level ?? 1); });
  for (let lvl = 1; lvl <= 9; lvl++) {
    spent += (slots[lvl] ?? 0) * 10 * lvl;
  }
  return spent;
}

export function calculatePotentialRemaining(state: any, originsData: OriginData[]): number {
  const total = calculatePotentialGained(state, originsData);
  const spent = calculatePotentialSpent(state);
  return total - spent;
}

export function getPrimaryHDForLevel(
  level: number,
  state: any,
  originsData: OriginData[]
): number {
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const hasLevelSelections = levelSelections && Object.keys(levelSelections).length > 0;

  if (hasLevelSelections && levelSelections[level]?.primaryAO) {
    const primaryName = levelSelections[level].primaryAO;
    let origin = originsData.find(o => o.name === primaryName);
    if (!origin && primaryName === 'Custom') {
      origin = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
    } else if (!origin && (state.ao?.customAOs || state.customAOs)) {
      const customList = state.ao?.customAOs ?? state.customAOs;
      origin = customList.find((o: any) => o.name === primaryName);
    }
    return origin?.hd ?? 8;
  }

  const fallbackPrimary = state.ao?.primaryAO ?? state.primaryAO;
  const customPrimary = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
  const origin = fallbackPrimary === 'Custom'
    ? customPrimary
    : originsData.find(o => o.name === fallbackPrimary);
  return origin?.hd ?? 8;
}

export function hasDwarvenToughness(state: any, raceData?: any[]): boolean {
  const raceState = state?.race ?? {};
  const raceName = typeof state?.race === 'string' ? state.race : raceState.race;
  let subraceName = typeof raceState?.subrace === 'string' ? raceState.subrace : state?.subrace;

  if (raceData && raceName && subraceName) {
    const raceObj = raceData.find((r: any) => r.name === raceName);
    if (raceObj?.subraces && !raceObj.subraces.some((s: any) => s.name === subraceName)) {
      subraceName = '';
    }
  }

  if (raceName === 'Custom') {
    const customTraits = raceState.customRace?.traits ?? state?.customRace?.traits ?? [];
    return customTraits.some((t: any) => t.name === 'Dwarven Toughness');
  }

  if (raceName === 'Dwarf' && subraceName === 'Hill Dwarf') {
    return true;
  }

  if (raceData && raceName) {
    const raceObj = raceData.find((r: any) => r.name === raceName);
    if (raceObj?.subraces && subraceName) {
      const sub = raceObj.subraces.find((s: any) => s.name === subraceName);
      if (sub?.traits?.some((t: any) => t.name === 'Dwarven Toughness')) {
        return true;
      }
    }
    if (raceObj?.traits?.some((t: any) => t.name === 'Dwarven Toughness')) {
      return true;
    }
  }

  return false;
}

export function calculateHPBonus(state: any, originsData: OriginData[], finalStats: Record<string, number>): number {
  const vit = finalStats?.Vitality ?? 10;
  const vitMod = Math.floor((vit - 10) / 2);
  const level = state.identity?.level ?? state.level ?? 1;
  let total = 0;

  for (let i = 2; i <= level; i++) {
    const hd = getPrimaryHDForLevel(i, state, originsData);
    total += Math.max(1, Math.ceil(hd / 2) + vitMod);
  }
  return total;
}

export function calculateTotalHP(
  state: any,
  originsData: OriginData[],
  finalStats: Record<string, number>,
  raceData?: any[]
): number {
  const level = state.identity?.level ?? state.level ?? 1;
  const vit = finalStats?.Vitality ?? 10;
  const vitMod = Math.floor((vit - 10) / 2);
  const toughnessBonus = hasDwarvenToughness(state, raceData) ? level : 0;

  if (state?.manualHP === true && state?.maxHP != null && typeof state.maxHP === 'number') {
    return Math.max(1, state.maxHP);
  }

  /*
   * Custom hpBonus override: if explicitly set in state, respect it as the
   * level-up rolled HP bonus while adding the level 1 maximum HD, vitality modifier, and racial bonus.
   */
  if (state.hpBonus != null && typeof state.hpBonus === 'number') {
    const level1HD = getPrimaryHDForLevel(1, state, originsData);
    const total = level1HD + vitMod + state.hpBonus + toughnessBonus;
    return Math.max(1, total);
  }

  const level1HD = getPrimaryHDForLevel(1, state, originsData);
  let totalHP = level1HD + vitMod;

  for (let i = 2; i <= level; i++) {
    const hd = getPrimaryHDForLevel(i, state, originsData);
    totalHP += Math.max(1, Math.ceil(hd / 2) + vitMod);
  }

  totalHP += toughnessBonus;
  return Math.max(1, totalHP);
}

export function getHitDiceBreakdown(state: any, originsData: OriginData[]): string {
  const level = state.identity?.level ?? state.level ?? 1;
  const counts: Record<number, number> = {};

  for (let i = 1; i <= level; i++) {
    const hd = getPrimaryHDForLevel(i, state, originsData);
    counts[hd] = (counts[hd] ?? 0) + 1;
  }

  /*
   * Sort hit dice in descending order (e.g. 1d12, 2d8) for consistent display
   */
  return Object.entries(counts)
    .sort(([hdA], [hdB]) => Number(hdB) - Number(hdA))
    .map(([hd, count]) => `${count}d${hd}`)
    .join(', ');
}

export function getMaxSkillRank(level: number): number {
  if (level < 4) return 3;
  if (level < 8) return 4;
  return 5;
}
