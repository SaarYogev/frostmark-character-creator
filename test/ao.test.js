import { expect, test, describe } from 'vitest';
import {
  getInitialState,
  calculatePotentialGained,
  calculateHPBonus,
  calculateSpentAccomplishmentPoints
} from '../src/logic/state';
import { ORIGINS } from '../src/data/origins';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { getAbilitiesForLevel } from '../src/data/abilities';

describe('Level-by-Level Ability Origins Logic', () => {
  test('calculatePotentialGained sums potential level-by-level', () => {
    const state = getInitialState();
    state.level = 3;
    state.selectedAOs = ['Artistry', 'Devotion'];
    state.levelSelections = {
      1: { primaryAO: 'Artistry', secondaryAO: 'Devotion' }, // Moderate (40)
      2: { primaryAO: 'Devotion', secondaryAO: '' },         // Major (60)
      3: { primaryAO: 'Artistry', secondaryAO: '' }          // Moderate (40)
    };

    // Expected potential: Moderate level 1 (40) + Major level 2 (60) + Moderate level 3 (40) = 140
    const potential = calculatePotentialGained(state, ORIGINS);
    expect(potential).toBe(140);
  });

  test('calculateHPBonus sums HP level-by-level', () => {
    const state = getInitialState();
    state.level = 3;
    state.baseCharacteristics.Vitality = 14; // Vit mod = +2
    state.selectedAOs = ['Discipline', 'Occult Student'];
    state.levelSelections = {
      1: { primaryAO: 'Discipline', secondaryAO: 'Occult Student' }, // HD 12 (not counted in HP bonus loop)
      2: { primaryAO: 'Discipline', secondaryAO: '' },               // HD 12 -> ceil(12/2) + 2 = 8
      3: { primaryAO: 'Occult Student', secondaryAO: '' }            // HD 6  -> ceil(6/2) + 2 = 5
    };

    // Expected bonus: Level 2 (8) + Level 3 (5) = 13
    const hpBonus = calculateHPBonus(state, ORIGINS, { Vitality: 14 });
    expect(hpBonus).toBe(13);
  });

  test('calculateSpentAccomplishmentPoints calculates extra skill points level-by-level', () => {
    const state = getInitialState();
    state.background = 'Urchin'; // Urchin grants 4 free skill points
    state.level = 5;
    state.selectedAOs = ['Tactics', 'Artistry'];
    state.levelSelections = {
      1: { primaryAO: 'Tactics', secondaryAO: 'Artistry' }, // Tactics: Extra
      2: { primaryAO: 'Artistry', secondaryAO: '' },         // Artistry: Extra
      3: { primaryAO: 'Tactics', secondaryAO: '' },          // Tactics: Extra
      4: { primaryAO: 'Tactics', secondaryAO: '' },          // Tactics: Extra
      5: { primaryAO: 'Artistry', secondaryAO: '' }          // Artistry: Extra
    };

    // All 5 levels have Primary AOs with "Extra" tag.
    // N = 5 levels with Extra.
    // Gained = 4 (first) + floor((5-1)/4)*2 = 4 + 2 = 6 free skill points.
    // Total free skill points = 4 (Urchin) + 6 (AOs) = 10.
    
    // Let's buy skill ranks with total cost 10:
    // Stealth Rank 3 (cost 4) + Perception Rank 3 (cost 4) + Athletics Rank 2 (cost 2) = 10.
    state.skillRanks = {
      Stealth: 3,
      Perception: 3,
      Athletics: 2
    };

    const spentAP = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
    expect(spentAP.totalSpent).toBe(0);
  });

  test('getAbilitiesForLevel returns accurate level abilities without level mismatches', () => {

    const level1Primary = getAbilitiesForLevel(1, 'Primary', 'Occult Student');
    const level14Primary = getAbilitiesForLevel(14, 'Primary', 'Occult Student');

    const lvl1Names = level1Primary.map(a => a.name);
    const lvl14Names = level14Primary.map(a => a.name);

    expect(lvl1Names).toContain('Arcane Tradition (Abjuration)');
    expect(lvl1Names).not.toContain('Prismatic Ward');
  });
});

