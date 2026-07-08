import { expect, test, describe } from 'vitest';
import {
  getInitialState,
  getTotalAccomplishmentPointsLimit,
  calculateSpentAccomplishmentPoints,
  getFinalCharacteristics,
  getMaxSkillRank
} from '../js/logic/state.js';
import { BACKGROUNDS } from '../js/data/backgrounds.js';
import { RACES } from '../js/data/races.js';

function calculateSpellPotentialCost(state) {
  const cantripsCost = (state.spellcasting?.cantrips ?? []).length * 10;
  const spellsCost = (state.spellcasting?.spells ?? []).reduce((acc, spell) => {
    return acc + (spell.level ?? 1) * 10;
  }, 0);
  return cantripsCost + spellsCost;
}

function isSpellPotentialExceeded(state) {
  if (state.manualSpells) return false;
  const cost = calculateSpellPotentialCost(state);
  const limit = state.potentialGained ?? 0;
  return cost > limit;
}

function parseGoldCost(costStr) {
  if (!costStr) return 0;
  const match = costStr.match(/([\d.]+)\s*gp/i);
  return match ? parseFloat(match[1]) : 0;
}

function calculateEquipmentGoldCost(equipmentList) {
  return (equipmentList ?? []).reduce((acc, item) => {
    const cost = parseGoldCost(item.cost);
    return acc + cost * (item.quantity ?? 1);
  }, 0);
}

function isEquipmentBudgetExceeded(state, backgroundsData) {
  if (state.manualEquipment) return false;

  let bgGold = 10;
  if (state.background === 'Custom') {
    bgGold = state.customBackground?.gold ?? 10;
  } else if (state.background) {
    const bg = backgroundsData.find(b => b.name === state.background);
    if (bg) bgGold = bg.gold;
  }

  const availableGold = Math.max(bgGold, state.goldAmount ?? 0);
  const totalCost = calculateEquipmentGoldCost(state.equipmentList);

  return totalCost > availableGold;
}

describe('Accomplishment Points (AP) Math', () => {
  test('AP limit is calculated correctly based on Level and Campaign Power Level', () => {
    const stateMundaneL1 = { campaignPowerLevel: 'Mundane', level: 1 };
    expect(getTotalAccomplishmentPointsLimit(stateMundaneL1)).toBe(14);
    const stateMundaneL5 = { campaignPowerLevel: 'Mundane', level: 5 };
    expect(getTotalAccomplishmentPointsLimit(stateMundaneL5)).toBe(16);
    const stateMundaneL17 = { campaignPowerLevel: 'Mundane', level: 17 };
    expect(getTotalAccomplishmentPointsLimit(stateMundaneL17)).toBe(22);

    const stateHeroicL1 = { campaignPowerLevel: 'Heroic', level: 1 };
    expect(getTotalAccomplishmentPointsLimit(stateHeroicL1)).toBe(16);
    const stateHeroicL9 = { campaignPowerLevel: 'Heroic', level: 9 };
    expect(getTotalAccomplishmentPointsLimit(stateHeroicL9)).toBe(20);

    const stateChampionL1 = { campaignPowerLevel: 'Champion', level: 1 };
    expect(getTotalAccomplishmentPointsLimit(stateChampionL1)).toBe(18);
    const stateChampionL13 = { campaignPowerLevel: 'Champion', level: 13 };
    expect(getTotalAccomplishmentPointsLimit(stateChampionL13)).toBe(24);
  });

  test('Saving throw proficiency AP cost calculation is correct', () => {
    const state = getInitialState();
    state.savingThrowsProficient = {
      Brawn: true,
      Dexterity: true,
      Vitality: true,
      Intelligence: false,
      Cunning: false,
      Resolve: false,
      Presence: false,
      Manipulation: false,
      Composure: false
    };

    const { otherSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(otherSpent).toBe(5);
  });

  test('Armor proficiency AP cost calculation is correct', () => {
    const state = getInitialState();
    
    state.armorProficiencies = {
      Light: false,
      Medium: true,
      Heavy: false,
      Shields: true
    };
    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.otherSpent).toBe(3);

    state.armorProficiencies = {
      Light: false,
      Medium: false,
      Heavy: true,
      Shields: false
    };
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.otherSpent).toBe(3);
  });

  test('AP spent on purchasing extra starting gold is correct', () => {
    const state = getInitialState();
    state.background = 'Bounty Hunter';
    
    state.goldAmount = 10;
    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.otherSpent).toBe(0);

    state.goldAmount = 35;
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.otherSpent).toBe(1);

    state.goldAmount = 40;
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.otherSpent).toBe(2);
  });
});

describe('Background Starting Skill Point Calculations', () => {
  test('Standard background grants 4 free skill points and calculates cumulative costs correctly', () => {
    const state = getInitialState();
    state.background = 'Urchin';
    
    state.skillRanks = {
      Stealth: 1,
      Perception: 2
    };

    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(0);

    state.skillRanks = {
      Stealth: 3,
      Perception: 2
    };

    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(2);
  });

  test('Artist/Crafter background starts with free ranks and has 3 free skill points', () => {
    const state = getInitialState();
    state.background = 'Artist/Crafter';

    state.skillRanks = {
      'Arts & Craft': 2,
      'Empathy': 1,
      'Persuasion': 1
    };
    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(0);

    state.skillRanks = {
      'Arts & Craft': 3,
      'Empathy': 2,
      'Persuasion': 1
    };
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(0);

    state.skillRanks = {
      'Arts & Craft': 3,
      'Empathy': 2,
      'Persuasion': 1,
      'Athletics': 1
    };
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(1);
  });

  test('Criminal background enforces restricted skill points allocation', () => {
    const state = getInitialState();
    state.background = 'Criminal';

    state.skillRanks = {
      Stealth: 2,
      Athletics: 2
    };
    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(0);

    state.skillRanks = {
      Stealth: 2
    };
    state.academicsRanks = {
      History: 2
    };
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(2);
  });

  test('Military Engineer background handles free starting ranks and academic engineering ranks', () => {
    const state = getInitialState();
    state.background = 'Military Engineer';

    state.skillRanks = {
      'Arts & Craft': 2
    };
    state.academicsRanks = {
      'Engineering': 2
    };
    let result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(0);

    state.skillRanks = {
      'Arts & Craft': 3
    };
    state.academicsRanks = {
      'Engineering': 2
    };
    result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(1);
  });
});

describe('Racial Manual Overrides', () => {
  test('Applies standard racial modifiers when manual override is disabled', () => {
    const state = getInitialState();
    state.race = 'Dwarf';
    state.subrace = 'Mountain Dwarf';
    state.manualRaces = false;

    const finalStats = getFinalCharacteristics(state, RACES);
    expect(finalStats.Vitality).toBe(12);
    expect(finalStats.Brawn).toBe(12);
    expect(finalStats.Dexterity).toBe(10);
  });

  test('Applies manual racial overrides when manual mode is enabled', () => {
    const state = getInitialState();
    state.race = 'Dwarf';
    state.subrace = 'Mountain Dwarf';
    state.manualRaces = true;
    state.racialStatOverrides = {
      Brawn: 1,
      Dexterity: 2,
      Vitality: 3,
      Intelligence: 0,
      Cunning: 0,
      Resolve: 0,
      Presence: 0,
      Manipulation: 0,
      Composure: 0
    };

    const finalStats = getFinalCharacteristics(state, RACES);
    expect(finalStats.Brawn).toBe(11);
    expect(finalStats.Dexterity).toBe(12);
    expect(finalStats.Vitality).toBe(13);
  });
});

describe('Spellcasting Potential Budget Checks', () => {
  test('Correctly calculates spell potential costs', () => {
    const state = getInitialState();
    state.spellcasting = {
      cantrips: ['Light', 'Guidance'],
      spells: [
        { name: 'Cure Wounds', level: 1 },
        { name: 'Blur', level: 2 }
      ]
    };

    expect(calculateSpellPotentialCost(state)).toBe(50);
  });

  test('Correctly checks spell potential budget limit and respects manual override', () => {
    const state = getInitialState();
    state.potentialGained = 40;
    state.manualSpells = false;

    state.spellcasting = {
      cantrips: ['Light', 'Guidance'],
      spells: [{ name: 'Cure Wounds', level: 1 }]
    };
    expect(isSpellPotentialExceeded(state)).toBe(false);

    state.spellcasting = {
      cantrips: ['Light', 'Guidance'],
      spells: [
        { name: 'Cure Wounds', level: 1 },
        { name: 'Blur', level: 2 }
      ]
    };
    expect(isSpellPotentialExceeded(state)).toBe(true);

    state.manualSpells = true;
    expect(isSpellPotentialExceeded(state)).toBe(false);
  });
});

describe('Equipment Gold Budget Checks', () => {
  test('Correctly calculates equipment gold costs', () => {
    const equipmentList = [
      { name: 'Shortsword', cost: '10 gp', quantity: 2 },
      { name: 'Dagger', cost: '2 gp', quantity: 1 },
      { name: 'Padded Armor', cost: '5 gp', quantity: 1 }
    ];

    expect(calculateEquipmentGoldCost(equipmentList)).toBe(27);
  });

  test('Correctly checks equipment gold budget and respects manual override', () => {
    const state = getInitialState();
    state.background = 'Bounty Hunter';
    state.goldAmount = 10;
    state.manualEquipment = false;

    state.equipmentList = [{ name: 'Dagger', cost: '2 gp', quantity: 1 }];
    expect(isEquipmentBudgetExceeded(state, BACKGROUNDS)).toBe(false);

    state.equipmentList = [{ name: 'Rapier', cost: '25 gp', quantity: 1 }];
    expect(isEquipmentBudgetExceeded(state, BACKGROUNDS)).toBe(true);

    state.goldAmount = 50;
    expect(isEquipmentBudgetExceeded(state, BACKGROUNDS)).toBe(false);

    state.equipmentList = [
      { name: 'Greatsword', cost: '50 gp', quantity: 1 },
      { name: 'Shortsword', cost: '10 gp', quantity: 1 }
    ];
    expect(isEquipmentBudgetExceeded(state, BACKGROUNDS)).toBe(true);

    state.manualEquipment = true;
    expect(isEquipmentBudgetExceeded(state, BACKGROUNDS)).toBe(false);
  });
});

describe('Skill Point Correction and Level-Based Limitations', () => {
  test('AO extra skills add 4 points per skill', () => {
    const state = getInitialState();
    state.background = 'Urchin'; // Urchin grants 4 free skill points
    state.primaryAO = 'Custom';
    state.customPrimaryAO = { extraSkills: 1 }; // Should grant 1 * 4 = 4 extra skill points (total 8)

    // We buy Stealth Rank 3 (cost 4) and Perception Rank 3 (cost 4). Total cost = 8.
    state.skillRanks = {
      Stealth: 3,
      Perception: 3
    };

    const result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    // With correct logic (8 free points): skillsSpent should be 0.
    // With current logic (5 free points): skillsSpent is 3.
    expect(result.skillsSpent).toBe(0);
  });

  test('Level-based skill rank limitations are correct', () => {
    expect(getMaxSkillRank(1)).toBe(3);
    expect(getMaxSkillRank(3)).toBe(3);
    expect(getMaxSkillRank(4)).toBe(4);
    expect(getMaxSkillRank(7)).toBe(4);
    expect(getMaxSkillRank(8)).toBe(5);
    expect(getMaxSkillRank(20)).toBe(5);
  });

  test('No background results in 0 free background skill points', () => {
    const state = getInitialState();
    state.background = '';
    state.primaryAO = '';

    state.skillRanks = {
      Stealth: 1
    };

    const result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
    expect(result.skillsSpent).toBe(1);
  });
});

