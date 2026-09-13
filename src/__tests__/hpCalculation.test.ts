import { describe, it, expect } from 'vitest';
import {
  calculateTotalHP,
  calculateHPBonus,
  getHitDiceBreakdown,
  getPrimaryHDForLevel,
  hasDwarvenToughness,
  getInitialState,
} from '../logic/state';
import { ORIGINS } from '../data/origins';
import { RACES } from '../data/races';

describe('HP Calculation Rules based on Frostmark Wiki', () => {
  describe('Level 1 HP rules', () => {
    it('calculates max HD + vitality modifier for level 1 character', () => {
      const state = getInitialState();
      state.level = 1;
      state.primaryAO = 'Discipline'; // HD 12
      const finalStats = { Vitality: 14 }; // vitMod = +2

      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      // 12 (HD) + 2 (vitMod) = 14
      expect(totalHP).toBe(14);
    });

    it('handles negative vitality modifier without falling below minimum 1 HP', () => {
      const state = getInitialState();
      state.level = 1;
      state.primaryAO = 'Occult Student'; // HD 6
      const finalStats = { Vitality: 1 }; // vitMod = -5

      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      // 6 - 5 = 1
      expect(totalHP).toBe(1);

      // Extreme negative
      const extremeStats = { Vitality: -10 }; // vitMod = -10
      const extremeHP = calculateTotalHP(state, ORIGINS, extremeStats, RACES);
      expect(extremeHP).toBe(1);
    });

    it('applies Hill Dwarf Dwarven Toughness bonus (+1 per level)', () => {
      const state = getInitialState();
      state.level = 1;
      state.race = 'Dwarf';
      state.subrace = 'Hill Dwarf';
      state.primaryAO = 'Devotion'; // HD 8
      const finalStats = { Vitality: 12 }; // vitMod = +1

      expect(hasDwarvenToughness(state, RACES)).toBe(true);

      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      // 8 (HD) + 1 (vitMod) + 1 (Dwarven Toughness) = 10
      expect(totalHP).toBe(10);
    });
  });

  describe('Multi-level HP progression', () => {
    it('calculates level 2+ gain using ceil(HD / 2) + vitMod', () => {
      const state = getInitialState();
      state.level = 3;
      state.baseCharacteristics.Vitality = 14; // vitMod = +2
      state.selectedAOs = ['Discipline', 'Occult Student'];
      state.levelSelections = {
        1: { primaryAO: 'Discipline', secondaryAO: 'Occult Student' }, // Level 1 HD 12 -> 12 + 2 = 14
        2: { primaryAO: 'Discipline', secondaryAO: '' },               // Level 2 HD 12 -> ceil(12/2) + 2 = 8
        3: { primaryAO: 'Occult Student', secondaryAO: '' }            // Level 3 HD 6  -> ceil(6/2) + 2 = 5
      };

      const finalStats = { Vitality: 14 };
      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      // Level 1: 12 + 2 = 14
      // Level 2: 6 + 2 = 8
      // Level 3: 3 + 2 = 5
      // Total = 14 + 8 + 5 = 27
      expect(totalHP).toBe(27);

      const bonus = calculateHPBonus(state, ORIGINS, finalStats);
      expect(bonus).toBe(13);
    });

    it('scales Dwarven Toughness across higher levels (+1 per level)', () => {
      const state = getInitialState();
      state.level = 4;
      state.race = 'Dwarf';
      state.subrace = 'Hill Dwarf';
      state.primaryAO = 'Divine Oath'; // HD 10
      const finalStats = { Vitality: 10 }; // vitMod = 0

      // Level 1: 10 + 0 = 10
      // Level 2..4 (3 levels): 3 * (ceil(10/2) + 0) = 3 * 5 = 15
      // Base HP = 25
      // Dwarven Toughness = 4 (1 * level)
      // Total HP = 29
      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      expect(totalHP).toBe(29);
    });

    it('respects manual hpBonus override if present in state', () => {
      const state = getInitialState();
      state.level = 3;
      state.primaryAO = 'Power'; // HD 12
      (state as any).hpBonus = 16; // Custom rolled / manual bonus
      const finalStats = { Vitality: 12 }; // vitMod = +1

      // Level 1 HD (12) + vitMod (1) + hpBonus (16) = 29
      const totalHP = calculateTotalHP(state, ORIGINS, finalStats, RACES);
      expect(totalHP).toBe(29);
    });
  });

  describe('Hit Dice Breakdown', () => {
    it('generates single HD string when all levels share the same origin', () => {
      const state = getInitialState();
      state.level = 5;
      state.primaryAO = 'Finesse'; // HD 10

      const hdBreakdown = getHitDiceBreakdown(state, ORIGINS);
      expect(hdBreakdown).toBe('5d10');
    });

    it('groups different hit dice in descending order for multiclass / multi-origin picks', () => {
      const state = getInitialState();
      state.level = 4;
      state.levelSelections = {
        1: { primaryAO: 'Discipline' },    // HD 12
        2: { primaryAO: 'Artistry' },      // HD 8
        3: { primaryAO: 'Discipline' },    // HD 12
        4: { primaryAO: 'Occult Student' } // HD 6
      };

      const hdBreakdown = getHitDiceBreakdown(state, ORIGINS);
      // 2d12, 1d8, 1d6
      expect(hdBreakdown).toBe('2d12, 1d8, 1d6');
    });
  });
});
