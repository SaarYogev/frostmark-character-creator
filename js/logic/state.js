import { POINT_BUY_COSTS, SAVE_PROFICIENCY_COSTS, ARMOR_PROFICIENCY_COSTS } from '../data/constants.js';

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
      spells: [] // e.g. [{ name: "Shield", level: 1 }]
    },

    equipmentList: [], // list of item objects: { name: "...", weight: X, quantity: Y }
    goldAmount: 10, // starting gold, either from background or converted from AP
    languages: [],

    // Features and descriptions
    personalityBackstory: '',
    customFeatures: []
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

  // Apply base race modifiers
  if (race.stats) {
    for (const stat in race.stats) {
      if (stat !== 'choice' && stat !== 'flexiblePoints') {
        final[stat] += race.stats[stat];
      }
    }
  }

  // Wood Elf Cunning/Composure decision path
  if (state.race === 'Elf' && state.subrace === 'Wood' && state.woodElfChoice) {
    final[state.woodElfChoice] += 1;
  }

  // Half-Elf flexible +1 attributes path
  if (state.race === 'Half-elf') {
    if (state.halfElfChoice1 && final[state.halfElfChoice1] !== undefined) {
      final[state.halfElfChoice1] += 1;
    }
    if (state.halfElfChoice2 && final[state.halfElfChoice2] !== undefined) {
      final[state.halfElfChoice2] += 1;
    }
  }

  // Apply subrace modifier
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

export function calculateSpentAccomplishmentPoints(state, backgroundsData) {
  let spent = 0;

  // 1. Skill Ranks cost
  // Ranks cost points cumulatively (1: 1, 2: 2, 3: 4, 4: 6, 5: 9).
  // Background grants 4 free skill points. These are subtracted from total ranks cost.
  let totalSkillsBought = 0;
  for (const sk in state.skillRanks) {
    const rank = state.skillRanks[sk] || 0;
    if (rank === 1) totalSkillsBought += 1;
    else if (rank === 2) totalSkillsBought += 2;
    else if (rank === 3) totalSkillsBought += 4;
    else if (rank === 4) totalSkillsBought += 6;
    else if (rank === 5) totalSkillsBought += 9;
  }
  for (const sk in state.academicsRanks) {
    const rank = state.academicsRanks[sk] || 0;
    if (rank === 1) totalSkillsBought += 1;
    else if (rank === 2) totalSkillsBought += 2;
    else if (rank === 3) totalSkillsBought += 4;
    else if (rank === 4) totalSkillsBought += 6;
    else if (rank === 5) totalSkillsBought += 9;
  }

  // Deduct free points from background (4) and extra skills from primary/secondary AOs
  let freeSkills = 4;
  
  // Calculate extra skill points granted by primary/secondary Ability Origins
  // e.g. Artistry grants 2 extra skill points.
  // We handle both pre-defined AOs and manual custom AOs.
  let extraAO = 0;
  // (We will resolve the actual AO extraSkills in main logic)

  // 2. Saving Throw Proficiencies
  for (const save in state.savingThrowsProficient) {
    if (state.savingThrowsProficient[save]) {
      spent += SAVE_PROFICIENCY_COSTS[save] || 1;
    }
  }

  // 3. Armor Proficiencies
  // Light = 1 pt. Medium = 2 pts (or 1 if upgrading). Heavy = 3 pts (or 1 if upgrading). Shields = 1 pt.
  // The UI lets players toggle them directly. To remain rules-compliant, we calculate:
  // if Heavy is check: 3 pts. Else if Medium is checked: 2 pts. Else if Light is checked: 1 pt.
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

  // 4. Weapon Proficiencies
  // Handpicked 2 weapons = 1 pt.
  // Group proficiencies range from 1 to 3 pts.
  // (Weapon groups details will be resolved in AP calculator page)

  // 5. Money purchases (1 AP = 25 gp)
  // Determine if starting gold exceeds background default.
  // If starting gold exceeds background/custom default, excess is bought with AP.
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
    totalSkillsBought,
    freeSkills,
    skillsSpent: Math.max(0, totalSkillsBought - freeSkills),
    otherSpent: spent,
    totalSpent: Math.max(0, totalSkillsBought - freeSkills) + spent
  };
}

export function importCharacterJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    // basic structure check
    if (!parsed.level || !parsed.baseCharacteristics) {
      throw new Error('Missing core character stats');
    }
    return parsed;
  } catch (e) {
    throw new Error('Invalid JSON character sheet: ' + e.message);
  }
}

export function exportCharacterJSON(state) {
  return JSON.stringify(state, null, 2);
}
