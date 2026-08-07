import { POINT_BUY_COSTS, SAVE_PROFICIENCY_COSTS, ARMOR_PROFICIENCY_COSTS, WEAPON_PROFICIENCY_COSTS, SKILL_RANK_CUMULATIVE_COSTS } from '../data/constants';
import { ORIGINS, OriginData } from '../data/origins';

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

export function getFinalCharacteristics(state: any, raceData: any[]): Record<string, number> {
  const baseChars = state.baseCharacteristics ?? {
    Brawn: 10, Dexterity: 10, Vitality: 10, Intelligence: 10,
    Cunning: 10, Resolve: 10, Presence: 10, Manipulation: 10, Composure: 10
  };
  const final: Record<string, number> = { ...baseChars };

  const raceState = state.race ?? {};
  const raceName = typeof state.race === 'string' ? state.race : raceState.race;
  const subraceName = typeof state.subrace === 'string' ? state.subrace : raceState.subrace;

  if (!raceName) return final;

  const manualRaces = raceState.manualRaces ?? state.manualRaces;
  if (manualRaces) {
    const overrides = raceState.racialStatOverrides ?? state.racialStatOverrides ?? {};
    for (const stat in overrides) {
      if (final[stat] !== undefined) {
        final[stat] += (overrides[stat] ?? 0);
      }
    }
    return final;
  }

  if (raceName === 'Custom') {
    const customStats = raceState.customRace?.stats ?? state.customRace?.stats ?? {};
    for (const stat in customStats) {
      if (final[stat] !== undefined) {
        final[stat] += customStats[stat];
      }
    }
    return final;
  }

  const race = raceData.find(r => r.name === raceName);
  if (!race) return final;

  if (race.stats) {
    for (const stat in race.stats) {
      if (stat !== 'choice' && stat !== 'flexiblePoints') {
        final[stat] += race.stats[stat];
      }
    }
  }

  const woodElfChoice = raceState.woodElfChoice ?? state.woodElfChoice;
  if (raceName === 'Elf' && subraceName === 'Wood' && woodElfChoice) {
    if (final[woodElfChoice] !== undefined) {
      final[woodElfChoice] += 1;
    }
  }

  if (raceName === 'Half-elf') {
    const choice1 = raceState.halfElfChoice1 ?? state.halfElfChoice1;
    const choice2 = raceState.halfElfChoice2 ?? state.halfElfChoice2;
    if (choice1 && final[choice1] !== undefined) {
      final[choice1] += 1;
    }
    if (choice2 && final[choice2] !== undefined) {
      final[choice2] += 1;
    }
  }

  if (subraceName && race.subraces) {
    const sub = race.subraces.find((s: any) => s.name === subraceName);
    if (sub && sub.stats) {
      for (const stat in sub.stats) {
        if (stat !== 'choice') {
          final[stat] += sub.stats[stat];
        }
      }
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
    if (!parsed.level && !parsed.identity?.level && !parsed.baseCharacteristics) {
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

export function exportCharacterJSON(state: any): string {
  return JSON.stringify(state, null, 2);
}

export function calculatePotentialGained(state: any, originsData: OriginData[]): number {
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

export function calculateHPBonus(state: any, originsData: OriginData[], finalStats: Record<string, number>): number {
  const vit = finalStats?.Vitality ?? 10;
  const vitMod = Math.floor((vit - 10) / 2);
  
  const level = state.identity?.level ?? state.level ?? 1;
  let total = 0;
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections;
  const hasLevelSelections = levelSelections && Object.keys(levelSelections).length > 0;

  for (let i = 2; i <= level; i++) {
    let hd = 8;
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
        hd = origin?.hd ?? 8;
      } else {
        const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
        const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
        const origin = primaryAO === 'Custom'
          ? customPrimaryAO
          : originsData.find(o => o.name === primaryAO);
        hd = origin?.hd ?? 8;
      }
    } else {
      const primaryAO = state.ao?.primaryAO ?? state.primaryAO;
      const customPrimaryAO = state.ao?.customPrimaryAO ?? state.customPrimaryAO;
      const origin = primaryAO === 'Custom'
        ? customPrimaryAO
        : originsData.find(o => o.name === primaryAO);
      hd = origin?.hd ?? 8;
    }
    total += Math.max(1, Math.ceil(hd / 2) + vitMod);
  }
  return total;
}

export function getMaxSkillRank(level: number): number {
  if (level < 4) return 3;
  if (level < 8) return 4;
  return 5;
}
