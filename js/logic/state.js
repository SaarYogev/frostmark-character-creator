import { POINT_BUY_COSTS, SAVE_PROFICIENCY_COSTS, ARMOR_PROFICIENCY_COSTS, SKILL_RANK_CUMULATIVE_COSTS } from '../data/constants.js';
import { ORIGINS } from '../data/origins.js';

export function getInitialState() {
  return {
    campaignPowerLevel: 'Heroic', // Heroic = default (25 Ability points, 16 Accomplishment points)
    characterName: '',
    playerName: '',
    
    race: '',
    subrace: '',
    background: '',
    primaryAO: '',
    secondaryAO: '',
    level: 1,

    selectedAOs: [],
    customAOs: [],
    levelSelections: {},

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
    
    // Half-elf flexible point choices (+1 to two other scores)
    halfElfChoice1: '',
    halfElfChoice2: '',
    
    // Wood-elf choice (Cunning or Composure +1)
    woodElfChoice: '',

    // Skill ranks chosen (keys matching constants.SKILLS keys, rank values 0-5)
    skillRanks: {},
    academicsFields: [], // list of chosen academics custom fields
    academicsRanks: {}, // e.g. { "History": 1 }
    academicsEntries: [], // e.g. [{ name: "History", rank: 1 }]
    artsCraftEntries: [], // e.g. [{ name: "Blacksmithing", rank: 2 }]

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

    weaponProficiencies: [], // e.g. ["Axes", "Bows"]

    spellcasting: {
      cantrips: [], // names
      spells: [], // e.g. [{ name: "Shield", level: 1 }]
      slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
    },

    equipmentList: [], // list of item objects: { name: "...", weight: X, quantity: Y }
    goldAmount: 10, // starting gold, either from background or converted from AP
    languages: [],

    personalityBackstory: '',
    customFeatures: [],

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

export function getAbilityPointLimit(powerLevel) {
  if (powerLevel === 'Mundane') return 20;
  if (powerLevel === 'Champion') return 30;
  return 25; // Heroic
}

export function getBaseAccomplishmentPoints(powerLevel) {
  if (powerLevel === 'Mundane') return 14;
  if (powerLevel === 'Champion') return 18;
  return 16; // Heroic
}

export function getTotalAccomplishmentPointsLimit(state) {
  const base = getBaseAccomplishmentPoints(state.campaignPowerLevel);
  // Leveling up increments: players get +2 AP at levels 5, 9, 13, 17.
  const levelsOverThreshold = Math.floor((state.level - 1) / 4);
  return base + (levelsOverThreshold * 2);
}

export function getAttributePointCost(score) {
  return POINT_BUY_COSTS[score] ?? 0;
}

export function calculateSpentAbilityPoints(state) {
  let total = 0;
  for (const char in state.baseCharacteristics) {
    total += getAttributePointCost(state.baseCharacteristics[char]);
  }
  return total;
}

export function getProficiencyBonus(level) {
  return 2 + Math.floor((level - 1) / 4);
}

export function getFinalCharacteristics(state, raceData) {
  const final = { ...state.baseCharacteristics };
  
  if (!state.race) return final;

  if (state.manualRaces) {
    for (const stat in state.racialStatOverrides) {
      if (final[stat] !== undefined) {
        final[stat] += (state.racialStatOverrides[stat] ?? 0);
      }
    }
    return final;
  }

  if (state.race === 'Custom') {
    for (const stat in state.customRace.stats) {
      if (final[stat] !== undefined) {
        final[stat] += state.customRace.stats[stat];
      }
    }
    return final;
  }

  const race = raceData.find(r => r.name === state.race);
  if (!race) return final;

  if (race.stats) {
    for (const stat in race.stats) {
      if (stat !== 'choice' && stat !== 'flexiblePoints') {
        final[stat] += race.stats[stat];
      }
    }
  }

  if (state.race === 'Elf' && state.subrace === 'Wood' && state.woodElfChoice) {
    final[state.woodElfChoice] += 1;
  }

  if (state.race === 'Half-elf') {
    if (state.halfElfChoice1 && final[state.halfElfChoice1] !== undefined) {
      final[state.halfElfChoice1] += 1;
    }
    if (state.halfElfChoice2 && final[state.halfElfChoice2] !== undefined) {
      final[state.halfElfChoice2] += 1;
    }
  }

  if (state.subrace && race.subraces) {
    const sub = race.subraces.find(s => s.name === state.subrace);
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

export function getCharacteristicModifier(score) {
  return Math.floor((score - 10) / 2);
}

export function computeFreeSkillPools(state, backgroundsData) {
  let bgFree = 0;
  let builtInRanks = {};
  let builtInAcademics = {};
  let restrictSkills = null;

  if (state.background === 'Custom') {
    bgFree = state.customBackground?.skills?.length ?? 4;
  } else if (state.background) {
    const bg = backgroundsData.find(b => b.name === state.background);
    if (bg) {
      bgFree = bg.freeSkillPoints ?? 4;
      builtInRanks = bg.builtInRanks ?? {};
      builtInAcademics = bg.builtInAcademics ?? {};
      restrictSkills = bg.restrictSkills ?? null;
    }
  }

  let aoFree = 0;
  const hasLevelSelections = state.levelSelections && Object.keys(state.levelSelections).length > 0;
  if (hasLevelSelections) {
    let extraCount = 0;
    const currentLevel = state.level ?? 1;
    for (let i = 1; i <= currentLevel; i++) {
      const selection = state.levelSelections[i];
      if (selection && selection.primaryAO) {
        let origin = ORIGINS.find(o => o.name === selection.primaryAO);
        if (!origin && selection.primaryAO === 'Custom') {
          origin = state.customPrimaryAO;
        } else if (!origin && state.customAOs) {
          origin = state.customAOs.find(o => o.name === selection.primaryAO);
        }
        const extraSkills = origin?.extraSkills ?? 0;
        if (extraSkills > 0) {
          extraCount++;
        }
      }
    }
    if (extraCount > 0) {
      aoFree = 4 + Math.floor((extraCount - 1) / 4) * 2;
    }
  } else {
    const primaryOrigin = ORIGINS.find(o => o.name === state.primaryAO);
    const primaryExtra = state.primaryAO === 'Custom' ? (state.customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
    aoFree = primaryExtra * 4;
  }

  return {
    bgFree,
    aoFree,
    builtInRanks,
    builtInAcademics,
    restrictSkills
  };
}

export function calculateSpentAccomplishmentPoints(state, backgroundsData) {
  let spent = 0;

  const { bgFree, aoFree, builtInRanks, builtInAcademics, restrictSkills } = computeFreeSkillPools(state, backgroundsData);

  let restrictedSpent = 0;
  let unrestrictedSpent = 0;

  // Calculate skill rank points spent above built-in ranks
  for (const sk in state.skillRanks) {
    const rank = state.skillRanks[sk] ?? 0;
    const builtIn = builtInRanks[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes(sk)) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  // Legacy academicsRanks or academicsEntries
  const isAcaRestricted = restrictSkills && (restrictSkills.includes('Academics') || restrictSkills.includes('Academic'));
  const acaEntries = state.academicsEntries ?? [];
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
    for (const field in state.academicsRanks) {
      const rank = state.academicsRanks[field] ?? 0;
      const builtIn = builtInAcademics[field] ?? 0;
      const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
      if (isAcaRestricted || (restrictSkills && restrictSkills.includes(field))) {
        restrictedSpent += cost;
      } else {
        unrestrictedSpent += cost;
      }
    }
  }

  // Custom Arts & Craft entries
  const artsEntries = state.artsCraftEntries ?? [];
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

  // 2. Saving Throw Proficiencies
  for (const save in state.savingThrowsProficient) {
    if (state.savingThrowsProficient[save]) {
      spent += SAVE_PROFICIENCY_COSTS[save] || 1;
    }
  }

  // 3. Armor Proficiencies
  if (state.armorProficiencies.Heavy) {
    spent += 3;
  } else if (state.armorProficiencies.Medium) {
    spent += 2;
  } else if (state.armorProficiencies.Light) {
    spent += 1;
  }
  if (state.armorProficiencies.Shields) {
    spent += 1;
  }

  // 4. Money purchases (1 AP = 25 gp)
  let bgGold = 10;
  if (state.background === 'Custom') {
    bgGold = state.customBackground.gold;
  } else if (state.background) {
    const bg = backgroundsData.find(b => b.name === state.background);
    if (bg) bgGold = bg.gold;
  }

  if (state.goldAmount > bgGold) {
    const excess = state.goldAmount - bgGold;
    spent += Math.ceil(excess / 25);
  }

  return {
    skillsSpent,
    otherSpent: spent,
    totalSpent: skillsSpent + spent
  };
}

export function importCharacterJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.level || !parsed.baseCharacteristics) {
      throw new Error('Missing core character stats');
    }

    // Migration: Convert legacy academicsRanks into academicsEntries
    if (!parsed.academicsEntries || parsed.academicsEntries.length === 0) {
      const entries = [];
      if (parsed.academicsRanks) {
        for (const [name, rank] of Object.entries(parsed.academicsRanks)) {
          if (rank > 0 || (parsed.academicsFields && parsed.academicsFields.includes(name))) {
            entries.push({ name, rank: rank || 1 });
          }
        }
      } else if (parsed.academicsFields) {
        for (const name of parsed.academicsFields) {
          entries.push({ name, rank: 1 });
        }
      }
      parsed.academicsEntries = entries;
    }

    // Migration: Convert legacy skillRanks['Arts & Craft'] into artsCraftEntries
    if (!parsed.artsCraftEntries || parsed.artsCraftEntries.length === 0) {
      const legacyRank = parsed.skillRanks? importSkillArtsCraftRank(parsed) : 0;
      if (legacyRank > 0) {
        parsed.artsCraftEntries = [{ name: 'General Crafting', rank: legacyRank }];
      } else {
        parsed.artsCraftEntries = [];
      }
    }

    return parsed;
  } catch (e) {
    throw new Error('Invalid JSON character sheet: ' + e.message);
  }
}

function importSkillArtsCraftRank(parsed) {
  return parsed.skillRanks?.['Arts & Craft'] ?? parsed.skillRanks?.['Arts'] ?? 0;
}

export function exportCharacterJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function calculatePotentialGained(state, originsData) {
  const table = {
    Minor:    [20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50],
    Moderate: [40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70],
    Major:    [60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 140, 140, 140, 140, 140, 180, 180, 180, 180, 180]
  };

  const level = state.level ?? 1;
  let total = 0;
  const hasLevelSelections = state.levelSelections && Object.keys(state.levelSelections).length > 0;

  for (let i = 1; i <= level; i++) {
    let tag = 'Minor';
    if (hasLevelSelections) {
      const selection = state.levelSelections[i];
      if (selection && selection.primaryAO) {
        let origin = originsData.find(o => o.name === selection.primaryAO);
        if (!origin && selection.primaryAO === 'Custom') {
          origin = state.customPrimaryAO;
        } else if (!origin && state.customAOs) {
          origin = state.customAOs.find(o => o.name === selection.primaryAO);
        }
        tag = origin?.spellcasting ?? 'Minor';
      } else {
        const origin = state.primaryAO === 'Custom'
          ? state.customPrimaryAO
          : originsData.find(o => o.name === state.primaryAO);
        tag = origin?.spellcasting ?? state.primaryAOSpellcasting ?? 'Minor';
      }
    } else {
      const origin = state.primaryAO === 'Custom'
        ? state.customPrimaryAO
        : originsData.find(o => o.name === state.primaryAO);
      tag = origin?.spellcasting ?? state.primaryAOSpellcasting ?? 'Minor';
    }

    const gain = table[tag]?.[i - 1] ?? 0;
    total += gain;
  }
  return total;
}

export function calculateHPBonus(state, originsData, finalStats) {
  const vit = finalStats?.Vitality ?? 10;
  const vitMod = Math.floor((vit - 10) / 2);
  
  const level = state.level ?? 1;
  let total = 0;
  const hasLevelSelections = state.levelSelections && Object.keys(state.levelSelections).length > 0;

  for (let i = 2; i <= level; i++) {
    let hd = 8;
    if (hasLevelSelections) {
      const selection = state.levelSelections[i];
      if (selection && selection.primaryAO) {
        let origin = originsData.find(o => o.name === selection.primaryAO);
        if (!origin && selection.primaryAO === 'Custom') {
          origin = state.customPrimaryAO;
        } else if (!origin && state.customAOs) {
          origin = state.customAOs.find(o => o.name === selection.primaryAO);
        }
        hd = origin?.hd ?? 8;
      } else {
        const origin = state.primaryAO === 'Custom'
          ? state.customPrimaryAO
          : originsData.find(o => o.name === state.primaryAO);
        hd = origin?.hd ?? 8;
      }
    } else {
      const origin = state.primaryAO === 'Custom'
        ? state.customPrimaryAO
        : originsData.find(o => o.name === state.primaryAO);
      hd = origin?.hd ?? 8;
    }
    total += Math.max(1, Math.ceil(hd / 2) + vitMod);
  }
  return total;
}

export function getMaxSkillRank(level) {
  // Frostmark character creation limits skill ranks based on character level to prevent premature specialization.
  if (level < 4) return 3;
  if (level < 8) return 4;
  return 5;
}

