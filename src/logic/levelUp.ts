import {
  getProficiencyBonus,
  hasDwarvenToughness,
  getFinalCharacteristics,
  calculateTotalHP,
  getMaxSkillRank,
  calculatePotentialGained,
  hasSpellbookAbility,
  getSpellbookStartingFreeSpells,
} from './state';
import { OriginData } from '../data/origins';
import { CharacterState } from '../types/Character';

const DEFAULT_STARTING_AP = 16;

function profBonusIncreased(newLevel: number): boolean {
  return newLevel === 5 || newLevel === 9 || newLevel === 13 || newLevel === 17;
}

function resolveHitDieAndModifiers(
  state: CharacterState,
  targetLevel: number,
  originsData: OriginData[],
  racesData: any[]
) {
  const currentPrimaryAO =
    (state as any).levelSelections?.[1]?.primaryAO ?? (state as any).primaryAO ?? state.ao?.primaryAO ?? 'Devotion';

  const origin = (state as any).levelSelections?.[targetLevel]?.primaryAO
    ? (originsData.find(o => o.name === (state as any).levelSelections[targetLevel].primaryAO) ??
       (state as any).customAOs?.find((o: any) => o.name === (state as any).levelSelections[targetLevel].primaryAO) ??
       (state as any).customPrimaryAO)
    : (originsData.find(o => o.name === currentPrimaryAO) ?? (state as any).customPrimaryAO);

  const hd = origin?.hd ?? 8;
  const finalStats = getFinalCharacteristics(state, racesData);
  const vit = finalStats?.Vitality ?? state.baseCharacteristics?.Vitality ?? 10;
  const vitMod = Math.floor((vit - 10) / 2);

  const toughnessBonus = hasDwarvenToughness(state, racesData) ? 1 : 0;
  const averageHpGain = Math.max(1, Math.ceil(hd / 2) + vitMod) + toughnessBonus;

  return {
    origin,
    hd,
    finalStats,
    vitMod,
    toughnessBonus,
    averageHpGain,
  };
}

export interface LevelUpPreviewOptions {
  racesData?: any[];
}

export function computeLevelUpPreview(
  state: CharacterState,
  originsData: OriginData[],
  options: LevelUpPreviewOptions = {}
) {
  const currentLevel = state.identity?.level ?? state.level ?? 1;
  const targetLevel = currentLevel + 1;
  const racesData = options.racesData ?? [];

  const { hd, finalStats, vitMod, toughnessBonus, averageHpGain } =
    resolveHitDieAndModifiers(state, targetLevel, originsData, racesData);

  const minRollGain = Math.max(1, 1 + vitMod) + toughnessBonus;
  const maxRollGain = Math.max(1, hd + vitMod) + toughnessBonus;

  const currentMaxHP = state.maxHP ?? calculateTotalHP(state, originsData, finalStats, racesData);
  const nextMaxHP = currentMaxHP + averageHpGain;

  const apGain = profBonusIncreased(targetLevel) ? 2 : 0;
  const potentialGain = getPotentialGain(state, targetLevel, originsData);
  const maxSkillRank = getMaxSkillRank(targetLevel);
  const profBonus = getProficiencyBonus(targetLevel);

  return {
    currentLevel,
    targetLevel,
    nextLevel: targetLevel,
    hd,
    vitMod,
    hpDelta: averageHpGain,
    hpGain: averageHpGain,
    averageHpGain,
    minRollGain,
    maxRollGain,
    currentMaxHP,
    previewMaxHP: nextMaxHP,
    nextMaxHP,
    apGain,
    potentialGain,
    maxSkillRank,
    proficiencyBonus: profBonus,
    toughnessBonus,
  };
}

export interface LevelUpOptions {
  hpChoice?: 'average' | 'roll';
  rolledHp?: number;
  chosenAbilities?: { primaryAbility?: string; secondaryAbility?: string };
  racesData?: any[];
}

export function levelUp(
  state: CharacterState,
  originsData: OriginData[],
  optionsOrChoice: LevelUpOptions | 'average' | 'roll' = 'average'
) {
  const options: LevelUpOptions =
    typeof optionsOrChoice === 'string'
      ? { hpChoice: optionsOrChoice }
      : (optionsOrChoice ?? { hpChoice: 'average' });

  const currentLevel = state.identity?.level ?? state.level ?? 1;
  const newLevel = currentLevel + 1;
  const racesData = options.racesData ?? [];

  const currentPrimaryAO =
    (state as any).levelSelections?.[1]?.primaryAO ?? (state as any).primaryAO ?? state.ao?.primaryAO ?? 'Devotion';
  const currentSecondaryAO =
    (state as any).levelSelections?.[1]?.secondaryAO ?? (state as any).secondaryAO ?? state.ao?.secondaryAO ?? '';

  const { hd, finalStats, vitMod, toughnessBonus } =
    resolveHitDieAndModifiers(state, newLevel, originsData, racesData);

  const rawHpGain =
    options.hpChoice === 'roll'
      ? (options.rolledHp != null ? options.rolledHp : rollHitDie(hd)) + vitMod
      : Math.ceil(hd / 2) + vitMod;

  const deltaHP = Math.max(1, rawHpGain) + toughnessBonus;

  const currentMaxHP = state.maxHP ?? calculateTotalHP(state, originsData, finalStats, racesData);
  const currentHP = state.currentHP ?? currentMaxHP;

  const newMaxHP = currentMaxHP + deltaHP;
  const newCurrentHP = currentHP + deltaHP;

  const prevLevelSelections = {
    ...((state as any).levelSelections ?? {}),
    ...(state.ao?.levelSelections ?? {}),
  };
  const existingLevelSel = prevLevelSelections[newLevel] ?? {
    primaryAO: currentPrimaryAO,
    secondaryAO: currentSecondaryAO,
    primaryAbility: '',
    secondaryAbility: '',
  };

  const updatedLevelSel = {
    ...existingLevelSel,
    ...(options.chosenAbilities ?? {}),
  };

  const nextLevelSelections = {
    ...prevLevelSelections,
    [newLevel]: updatedLevelSel,
  };

  /*
   * Calculate cumulative potential across all levels up to newLevel rather than adding
   * a single level's delta to an uninitialized potentialGained field.
   */
  const intermediateState = {
    ...state,
    level: newLevel,
    identity: {
      ...(state.identity ?? {}),
      level: newLevel,
    },
    levelSelections: nextLevelSelections,
    ao: {
      ...(state.ao ?? {}),
      levelSelections: nextLevelSelections,
    },
  };
  const totalPotentialGained = calculatePotentialGained(intermediateState, originsData);
  const apGain = profBonusIncreased(newLevel) ? 2 : 0;

  const spellcasting = (state as any).spellcasting;
  let nextSpellcasting = spellcasting;
  if (spellcasting && hasSpellbookAbility(state)) {
    /*
     * When leveling up from Level 1, lock in the chosen Level 1 free spell allowance
     * into freeSpells so their zero-cost is preserved permanently in higher levels.
     */
    const existingFreeSpells = Array.isArray(spellcasting.freeSpells)
      ? spellcasting.freeSpells
      : Array.isArray(spellcasting.startingFreeSpells)
      ? spellcasting.startingFreeSpells
      : null;

    if (!existingFreeSpells && currentLevel === 1) {
      const computedFree = Array.from(
        getSpellbookStartingFreeSpells(
          spellcasting.spells ?? [],
          spellcasting.spellbookSpells ?? []
        )
      );
      nextSpellcasting = {
        ...spellcasting,
        freeSpells: computedFree,
      };
    }
  }

  const prevLocked = state.lockedChoices ?? {};
  const currentSkills = state.skills?.skillRanks ?? (state as any).skillRanks ?? {};
  const currentAcademics = state.skills?.academicsEntries ?? (state as any).academicsEntries ?? [];
  const currentArts = state.skills?.artsCraftEntries ?? (state as any).artsCraftEntries ?? [];
  const currentCantrips = (state as any).spellcasting?.cantrips ?? [];
  const currentSpells = (state as any).spellcasting?.spells ?? [];
  const currentSlots = (state as any).spellcasting?.slots ?? {};
  const currentSaves = (state as any).proficiencies?.savingThrowsProficient ?? (state as any).savingThrowsProficient ?? {};
  const currentArmor = (state as any).proficiencies?.armorProficiencies ?? (state as any).armorProficiencies ?? {};
  const currentWeapons = (state as any).proficiencies?.weaponProficiencies ?? (state as any).weaponProficiencies ?? [];
  const currentPoolAOs = state.ao?.selectedAOs ?? (state as any).selectedAOs ?? [];

  const nextLockedChoices = {
    ...prevLocked,
    skillRanks: { ...(prevLocked.skillRanks ?? {}), ...currentSkills },
    academicsEntries: [...(prevLocked.academicsEntries ?? currentAcademics)],
    artsCraftEntries: [...(prevLocked.artsCraftEntries ?? currentArts)],
    cantrips: Array.from(new Set([...(prevLocked.cantrips ?? []), ...currentCantrips])),
    spells: (() => {
      const existing = prevLocked.spells ?? [];
      const map = new Map(existing.map((s: any) => [s.name, s]));
      currentSpells.forEach((s: any) => map.set(s.name, s));
      return Array.from(map.values());
    })(),
    spellSlots: { ...(prevLocked.spellSlots ?? {}), ...currentSlots },
    savingThrowsProficient: { ...(prevLocked.savingThrowsProficient ?? {}), ...currentSaves },
    armorProficiencies: { ...(prevLocked.armorProficiencies ?? {}), ...currentArmor },
    weaponProficiencies: Array.from(new Set([...(prevLocked.weaponProficiencies ?? []), ...currentWeapons])),
    poolAOs: Array.from(new Set([...(prevLocked.poolAOs ?? []), ...currentPoolAOs])),
    levelSelections: {
      ...(prevLocked.levelSelections ?? {}),
      ...(prevLevelSelections ?? {}),
    },
  };

  return {
    ...state,
    level: newLevel,
    maxHP: newMaxHP,
    currentHP: newCurrentHP,
    hpBonus: (state.hpBonus ?? 0) + deltaHP,
    potentialGained: totalPotentialGained,
    accomplishmentPointsTotal: (state.accomplishmentPointsTotal ?? DEFAULT_STARTING_AP) + apGain,
    levelSelections: nextLevelSelections,
    ao: {
      ...(state.ao ?? {}),
      levelSelections: nextLevelSelections,
    },
    identity: {
      ...(state.identity ?? {}),
      level: newLevel,
    },
    lockedChoices: nextLockedChoices,
    ...(nextSpellcasting ? { spellcasting: nextSpellcasting } : {}),
  };
}

function rollHitDie(hd: number): number {
  return Math.floor(Math.random() * hd) + 1;
}

function getPotentialGain(state: any, level: number, originsData: OriginData[]): number {
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections ?? {};
  const levelPrimaryAO =
    levelSelections[level]?.primaryAO ||
    levelSelections[1]?.primaryAO ||
    state.ao?.primaryAO ||
    state.primaryAO ||
    state.ao?.selectedAOs?.[0] ||
    state.selectedAOs?.[0] ||
    '';
  const origin = levelPrimaryAO === 'Custom'
    ? (state.ao?.customPrimaryAO ?? state.customPrimaryAO)
    : (originsData.find(o => o.name === levelPrimaryAO) ??
       state.ao?.customAOs?.find((o: any) => o.name === levelPrimaryAO) ??
       state.customAOs?.find((o: any) => o.name === levelPrimaryAO));

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
