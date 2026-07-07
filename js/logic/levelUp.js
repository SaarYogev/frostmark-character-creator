import { getProficiencyBonus } from './state.js';

// Proficiency bonus increases at levels 5, 9, 13, and 17, granting +2 AP each time.
function profBonusIncreased(newLevel) {
  return newLevel === 5 || newLevel === 9 || newLevel === 13 || newLevel === 17;
}

export function levelUp(state, originData, hpChoice = 'average') {
  const newLevel = state.level + 1;
  const newProfBonus = getProficiencyBonus(newLevel);
  const origin = originData.find(o => o.name === state.primaryAO) ?? state.customPrimaryAO;
  
  const hd = origin?.hd ?? 8;
  const vitMod = Math.floor((computeFinalVit(state) - 10) / 2);
  
  const hpGain = hpChoice === 'average'
    ? Math.ceil(hd / 2) + vitMod
    : rollHitDie(hd) + vitMod;

  const potentialGain = getPotentialGain(state, newLevel);

  const apGain = profBonusIncreased(newLevel) ? 2 : 0;

  return {
    ...state,
    level: newLevel,
    hpBonus: (state.hpBonus ?? 0) + Math.max(1, hpGain),
    potentialGained: (state.potentialGained ?? 0) + potentialGain,
    accomplishmentPointsTotal: (state.accomplishmentPointsTotal ?? 0) + apGain
  };
}

function rollHitDie(hd) {
  return Math.floor(Math.random() * hd) + 1;
}

function computeFinalVit(state) {
  return (state.baseCharacteristics?.Vitality ?? 10) + (state.racialBonusVitality ?? 0);
}

// Spellcasting potential gained per level depends on the spellcasting tag of primary AO.
function getPotentialGain(state, level) {
  const origin = state.primaryAO === 'Custom'
    ? state.customPrimaryAO
    : { spellcasting: state.primaryAOSpellcasting };

  const tag = origin?.spellcasting ?? 'Minor';

  const table = {
    Minor:    [20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50],
    Moderate: [40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 40, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70],
    Major:    [60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 140, 140, 140, 140, 140, 180, 180, 180, 180, 180]
  };

  console.log(`{origin}, {spellcasting}`)

  return table[tag]?.[level] ?? 0;
}

export function buildLevelSummary(state, originData) {
  const profBonus = getProficiencyBonus(state.level);
  const apGainNote = profBonusIncreased(state.level)
    ? `Proficiency bonus increased to +${profBonus}. You gain +2 Accomplishment Points.`
    : `Proficiency bonus is +${profBonus}.`;

  return {
    level: state.level,
    proficiencyBonus: profBonus,
    hpBonus: state.hpBonus ?? 0,
    potentialGained: state.potentialGained ?? 0,
    apNote: apGainNote
  };
}
