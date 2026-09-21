import { describe, it, expect } from 'vitest';
import { levelUp, computeLevelUpPreview } from '../src/logic/levelUp';
import { getInitialState, getFinalCharacteristics } from '../src/logic/state';
import { ORIGINS } from '../src/data/origins';
import { RACES } from '../src/data/races';

describe('Level Up System', () => {
  describe('computeLevelUpPreview', () => {
    it('previews level increment from L to L + 1', () => {
      const state = getInitialState();
      state.level = 1;
      state.primaryAO = 'Devotion';

      const preview = computeLevelUpPreview(state, ORIGINS);
      const nextLevel = preview.targetLevel ?? preview.nextLevel;
      expect(nextLevel).toBe(2);
    });

    it('calculates HP delta preview using average hit die + vitality modifier', () => {
      const state = getInitialState();
      state.level = 1;
      state.primaryAO = 'Devotion';
      state.baseCharacteristics.Vitality = 14;
      (state as any).maxHP = 10;
      (state as any).currentHP = 8;

      /*
       * Average HP gain rule: Math.ceil(HD / 2) + vitMod = 4 + 2 = 6
       * Resulting preview Max HP should be current Max HP (10) + delta (6) = 16.
       */
      const preview = computeLevelUpPreview(state, ORIGINS, { racesData: RACES });
      const hpGain = preview.hpDelta ?? preview.hpGain ?? preview.averageHpGain;
      expect(hpGain).toBe(6);

      const previewMax = preview.previewMaxHP ?? preview.nextMaxHP;
      expect(previewMax).toBe(16);
    });

    it('includes Dwarven Toughness (+1 HP per level) in HP delta preview for Hill Dwarf', () => {
      const state = getInitialState();
      state.level = 1;
      state.race = 'Dwarf';
      state.subrace = 'Hill Dwarf';
      state.primaryAO = 'Devotion';
      state.baseCharacteristics.Vitality = 12;
      (state as any).maxHP = 11;

      /*
       * Hill Dwarf gains Dwarven Toughness (+1 HP per level).
       * Base Vit 12 + Dwarf racial bonus (+2) = 14 Vitality (+2 mod).
       * Average HP gain: 4 (half HD) + 2 (vitMod) + 1 (Toughness) = 7.
       * Preview Max HP: 11 + 7 = 18.
       */
      const preview = computeLevelUpPreview(state, ORIGINS, { racesData: RACES });
      const hpGain = preview.hpDelta ?? preview.hpGain ?? preview.averageHpGain;
      expect(hpGain).toBe(7);

      const previewMax = preview.previewMaxHP ?? preview.nextMaxHP;
      expect(previewMax).toBe(18);
    });

    it('previews Accomplishment Points (AP) gain at proficiency increase levels (5, 9, 13, 17)', () => {
      const stateLv1 = getInitialState();
      stateLv1.level = 1;
      stateLv1.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv1, ORIGINS).apGain).toBe(0);

      const stateLv4 = getInitialState();
      stateLv4.level = 4;
      stateLv4.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv4, ORIGINS).apGain).toBe(2);

      const stateLv8 = getInitialState();
      stateLv8.level = 8;
      stateLv8.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv8, ORIGINS).apGain).toBe(2);

      const stateLv12 = getInitialState();
      stateLv12.level = 12;
      stateLv12.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv12, ORIGINS).apGain).toBe(2);

      const stateLv16 = getInitialState();
      stateLv16.level = 16;
      stateLv16.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv16, ORIGINS).apGain).toBe(2);

      const stateLv5 = getInitialState();
      stateLv5.level = 5;
      stateLv5.primaryAO = 'Discipline';
      expect(computeLevelUpPreview(stateLv5, ORIGINS).apGain).toBe(0);
    });
  });

  describe('levelUp', () => {
    it('increments character level from L to L + 1', () => {
      const state = getInitialState();
      state.level = 2;
      state.primaryAO = 'Devotion';

      const nextState = levelUp(state, ORIGINS);
      expect(nextState.level).toBe(3);
      if (nextState.identity) {
        expect(nextState.identity.level).toBe(3);
      }
    });

    it('adds average HP delta to current Max HP and Current HP', () => {
      const state = getInitialState();
      state.level = 2;
      state.primaryAO = 'Devotion';
      state.baseCharacteristics.Vitality = 14;
      (state as any).maxHP = 16;
      (state as any).currentHP = 11;

      /*
       * Average HP delta: 4 (half HD) + 2 (vitMod) = 6.
       * New Max HP: 16 + 6 = 22.
       * New Current HP: 11 + 6 = 17.
       */
      const nextState = levelUp(state, ORIGINS, { hpChoice: 'average', racesData: RACES });
      expect(nextState.maxHP).toBe(22);
      expect(nextState.currentHP).toBe(17);
    });

    it('adds rolled hit die HP delta to current Max HP and Current HP', () => {
      const state = getInitialState();
      state.level = 2;
      state.primaryAO = 'Devotion';
      state.baseCharacteristics.Vitality = 14;
      (state as any).maxHP = 16;
      (state as any).currentHP = 9;

      /*
       * Explicit roll result of 7 on hit die.
       * Rolled HP delta: 7 + 2 (vitMod) = 9.
       * New Max HP: 16 + 9 = 25.
       * New Current HP: 9 + 9 = 18.
       */
      const nextState = levelUp(state, ORIGINS, { hpChoice: 'roll', rolledHp: 7, racesData: RACES });
      expect(nextState.maxHP).toBe(25);
      expect(nextState.currentHP).toBe(18);
    });

    it('includes Dwarven Toughness (+1 HP per level) in HP delta for Hill Dwarf', () => {
      const state = getInitialState();
      state.level = 2;
      state.race = 'Dwarf';
      state.subrace = 'Hill Dwarf';
      state.primaryAO = 'Devotion';
      state.baseCharacteristics.Vitality = 12;
      (state as any).maxHP = 17;
      (state as any).currentHP = 12;

      /*
       * Base Vit 12 + Dwarf racial bonus (+2) = 14 Vitality (+2 mod).
       * Average HP delta: 4 + 2 (vitMod) + 1 (Dwarven Toughness) = 7.
       * New Max HP: 17 + 7 = 24.
       * New Current HP: 12 + 7 = 19.
       */
      const nextState = levelUp(state, ORIGINS, { hpChoice: 'average', racesData: RACES });
      expect(nextState.maxHP).toBe(24);
      expect(nextState.currentHP).toBe(19);
    });

    it('awards +2 Accomplishment Points at proficiency increase levels (5, 9, 13, 17)', () => {
      const state4 = getInitialState();
      state4.level = 4;
      state4.primaryAO = 'Discipline';
      (state4 as any).accomplishmentPointsTotal = 16;

      const state5 = levelUp(state4, ORIGINS);
      expect(state5.accomplishmentPointsTotal).toBe(18);

      const state8 = getInitialState();
      state8.level = 8;
      state8.primaryAO = 'Discipline';
      (state8 as any).accomplishmentPointsTotal = 18;

      const state9 = levelUp(state8, ORIGINS);
      expect(state9.accomplishmentPointsTotal).toBe(20);

      const state12 = getInitialState();
      state12.level = 12;
      state12.primaryAO = 'Discipline';
      (state12 as any).accomplishmentPointsTotal = 20;

      const state13 = levelUp(state12, ORIGINS);
      expect(state13.accomplishmentPointsTotal).toBe(22);

      const state16 = getInitialState();
      state16.level = 16;
      state16.primaryAO = 'Discipline';
      (state16 as any).accomplishmentPointsTotal = 22;

      const state17 = levelUp(state16, ORIGINS);
      expect(state17.accomplishmentPointsTotal).toBe(24);

      const state2 = getInitialState();
      state2.level = 2;
      state2.primaryAO = 'Discipline';
      (state2 as any).accomplishmentPointsTotal = 16;

      const state3 = levelUp(state2, ORIGINS);
      expect(state3.accomplishmentPointsTotal).toBe(16);
    });

    it('completely preserves existing skill ranks, items, spells, and features as current truth', () => {
      const state = getInitialState();
      state.level = 2;
      state.primaryAO = 'Devotion';

      state.skillRanks = {
        Perception: 3,
        Athletics: 2,
        Stealth: 1
      };

      state.equipmentList = [
        { name: 'Flametongue Longsword', isWeapon: true, hit: '+6', damage: '1d8+4 fire' },
        { name: 'Mithral Chain Shirt', isArmor: true, baseAC: 13 },
        { name: 'Healer Kit', quantity: 3 }
      ];

      (state as any).goldAmount = 320;
      (state as any).silverAmount = 45;
      (state as any).copperAmount = 12;

      state.spellcasting = {
        cantrips: ['Light', 'Guidance'],
        spells: [
          { name: 'Cure Wounds', level: 1 },
          { name: 'Spiritual Weapon', level: 2 }
        ],
        slots: { 1: 10, 2: 9, 3: 8, 4: 11, 5: 7, 6: 5, 7: 6, 8: 6, 9: 6 }
      };

      state.customFeatures = [
        { name: 'Boon of the Frozen Peak', desc: 'Resistance to cold damage' }
      ];

      const nextState = levelUp(state, ORIGINS);

      expect(nextState.skillRanks).toEqual({
        Perception: 3,
        Athletics: 2,
        Stealth: 1
      });

      const nextEq = nextState.equipmentList ?? nextState.equipment?.equipmentList;
      expect(nextEq).toHaveLength(3);
      expect(nextEq.find((i: any) => i.name === 'Flametongue Longsword')).toBeDefined();
      expect(nextEq.find((i: any) => i.name === 'Mithral Chain Shirt')).toBeDefined();
      expect(nextEq.find((i: any) => i.name === 'Healer Kit')).toBeDefined();

      expect(nextState.goldAmount).toBe(320);
      expect(nextState.silverAmount).toBe(45);
      expect(nextState.copperAmount).toBe(12);

      expect(nextState.spellcasting.cantrips).toEqual(['Light', 'Guidance']);
      expect(nextState.spellcasting.spells).toHaveLength(2);
      expect(nextState.customFeatures).toEqual([
        { name: 'Boon of the Frozen Peak', desc: 'Resistance to cold damage' }
      ]);
    });

    it('records new abilities chosen at the new level without overwriting previous abilities', () => {
      const state = getInitialState();
      state.level = 2;
      state.primaryAO = 'Artistry';

      state.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          primaryAbility: 'artistry-1-primary-inspiration',
          secondaryAbility: 'artistry-1-secondary-jack-of-all-trades'
        },
        2: {
          primaryAO: 'Artistry',
          primaryAbility: 'artistry-2-primary-song-of-rest'
        }
      };

      const newLevelChoices = {
        primaryAbility: 'artistry-3-primary-cutting-words',
        secondaryAbility: 'artistry-3-secondary-expertise'
      };

      const nextState = levelUp(state, ORIGINS, {
        chosenAbilities: newLevelChoices
      });

      expect(nextState.level).toBe(3);
      expect(nextState.levelSelections[1].primaryAbility).toBe('artistry-1-primary-inspiration');
      expect(nextState.levelSelections[1].secondaryAbility).toBe('artistry-1-secondary-jack-of-all-trades');
      expect(nextState.levelSelections[2].primaryAbility).toBe('artistry-2-primary-song-of-rest');
      expect(nextState.levelSelections[3].primaryAbility).toBe('artistry-3-primary-cutting-words');
      expect(nextState.levelSelections[3].secondaryAbility).toBe('artistry-3-secondary-expertise');
    });

    it('raises ability scores when +2 to an ability score is chosen at level 4', () => {
      const state = getInitialState();
      state.level = 4;
      state.identity = { ...state.identity, level: 4 };
      state.baseCharacteristics.Brawn = 12;

      state.levelSelections = {
        4: {
          primaryAO: 'Artistry',
          secondaryAO: '',
          primaryAbility: 'artistry-4-primary-ability-score-improvement-or-feat',
          secondaryAbility: '',
          upgradeChoices: {
            'artistry-4-primary-ability-score-improvement-or-feat': '+2 Brawn'
          }
        }
      };

      const finalStats = getFinalCharacteristics(state, RACES);
      expect(finalStats.Brawn).toBe(14);
    });

    it('raises both ability scores when +1 to two ability scores is chosen at level 4', () => {
      const state = getInitialState();
      state.level = 4;
      state.identity = { ...state.identity, level: 4 };
      state.baseCharacteristics.Brawn = 14;
      state.baseCharacteristics.Vitality = 12;

      state.levelSelections = {
        4: {
          primaryAO: 'Artistry',
          secondaryAO: '',
          primaryAbility: 'artistry-4-primary-ability-score-improvement-or-feat',
          secondaryAbility: '',
          upgradeChoices: {
            'artistry-4-primary-ability-score-improvement-or-feat': '+1 to Two Ability Scores: Brawn, Vitality'
          }
        }
      };

      const finalStats = getFinalCharacteristics(state, RACES);
      expect(finalStats.Brawn).toBe(15);
      expect(finalStats.Vitality).toBe(13);
    });
  });
});
