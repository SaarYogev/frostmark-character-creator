import { getProficiencyBonus } from './state';
import { OriginData } from '../data/origins';

function profBonusIncreased(newLevel: number): boolean {
  return newLevel === 5 || newLevel === 9 || newLevel === 13 || newLevel === 17;
}

export function levelUp(state: any, originsData: OriginData[], hpChoice: 'average' | 'roll' = 'average') {
  const newLevel = (state.level ?? 1) + 1;
  const origin = state.levelSelections?.[newLevel]?.primaryAO
    ? (originsData.find(o => o.name === state.levelSelections[newLevel].primaryAO) ??
       state.customAOs?.find((o: any) => o.name === state.levelSelections[newLevel].primaryAO) ??
       state.customPrimaryAO)
    : (originsData.find(o => o.name === state.primaryAO) ?? state.customPrimaryAO);
  
  const hd = origin?.hd ?? 8;
  const vitMod = Math.floor((computeFinalVit(state) - 10) / 2);
  
  const hpGain = hpChoice === 'average'
    ? Math.ceil(hd / 2) + vitMod
    : rollHitDie(hd) + vitMod;

  const potentialGain = getPotentialGain(state, newLevel, originsData);

  const apGain = profBonusIncreased(newLevel) ? 2 : 0;

  return {
    ...state,
    level: newLevel,
    hpBonus: (state.hpBonus ?? 0) + Math.max(1, hpGain),
    potentialGained: (state.potentialGained ?? 0) + potentialGain,
    accomplishmentPointsTotal: (state.accomplishmentPointsTotal ?? 0) + apGain
  };
}

function rollHitDie(hd: number): number {
  return Math.floor(Math.random() * hd) + 1;
}

function computeFinalVit(state: any): number {
  return (state.baseCharacteristics?.Vitality ?? 10) + (state.racialBonusVitality ?? 0);
}

function getPotentialGain(state: any, level: number, originsData: OriginData[]): number {
  const levelPrimaryAO = state.levelSelections?.[level]?.primaryAO || state.primaryAO;
  const origin = levelPrimaryAO === 'Custom'
    ? state.customPrimaryAO
    : (originsData.find(o => o.name === levelPrimaryAO) ?? state.customAOs?.find((o: any) => o.name === levelPrimaryAO));

  const tag: 'Minor' | 'Moderate' | 'Major' = origin?.spellcasting ?? 'Minor';

  const table: Record<'Minor' | 'Moderate' | 'Major', number[]> = {
    Minor:    [20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40, 50, 50, 50, 50, 50],
    Moderate: [40, 40, 40, 40, 40, 50, 50, 50, 50, 50, 60, 60, 60, 60, 60, 70, 70, 70, 70, 70],
    Major:    [60, 60, 60, 60, 60, 100, 100, 100, 100, 100, 140, 140, 140, 140, 140, 180, 180, 180, 180, 180]
  };

  return table[tag]?.[level - 1] ?? 0;
}

export function buildLevelSummary(state: any, originData: OriginData[]) {
  const profBonus = getProficiencyBonus(state.level ?? 1);
  const apGainNote = profBonusIncreased(state.level ?? 1)
    ? `Proficiency bonus increased to +${profBonus}. You gain +2 Accomplishment Points.`
    : `Proficiency bonus is +${profBonus}.`;

  return {
    level: state.level ?? 1,
    proficiencyBonus: profBonus,
    hpBonus: state.hpBonus ?? 0,
    potentialGained: state.potentialGained ?? 0,
    apNote: apGainNote
  };
}
