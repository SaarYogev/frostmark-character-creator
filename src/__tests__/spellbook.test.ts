import { describe, it, expect } from 'vitest';
import {
  getInitialState,
  calculatePotentialSpent,
  hasSpellbookAbility,
  calculatePotentialRemaining,
  calculatePotentialGained,
} from '../logic/state';
import { levelUp } from '../logic/levelUp';
import { ORIGINS } from '../data/origins';

describe('Occult Student Spellbook Ability', () => {
  describe('hasSpellbookAbility', () => {
    it('returns true when occult-student-1-secondary-spellbook is primaryAbility in state.ao.levelSelections', () => {
      const state = getInitialState();
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: 'occult-student-1-secondary-spellbook',
            secondaryAbility: '',
          },
        },
      };

      expect(hasSpellbookAbility(state)).toBe(true);
    });

    it('returns true when occult-student-1-secondary-spellbook is secondaryAbility in state.ao.levelSelections', () => {
      const state = getInitialState();
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Discipline',
            secondaryAO: 'Occult Student',
            primaryAbility: 'discipline-1-primary-some-ability',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };

      expect(hasSpellbookAbility(state)).toBe(true);
    });

    it('returns true when occult-student-1-secondary-spellbook is present in flat state.levelSelections', () => {
      const state = getInitialState();
      state.levelSelections = {
        1: {
          primaryAO: 'Occult Student',
          secondaryAO: '',
          primaryAbility: '',
          secondaryAbility: 'occult-student-1-secondary-spellbook',
        },
      };

      expect(hasSpellbookAbility(state)).toBe(true);
    });

    it('returns true when occult-student-1-secondary-spellbook is chosen at a higher level selection (e.g. level 2)', () => {
      const state = getInitialState();
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Discipline',
            secondaryAO: '',
            primaryAbility: 'discipline-1-primary-ability',
            secondaryAbility: '',
          },
          2: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: 'occult-student-1-secondary-spellbook',
            secondaryAbility: '',
          },
        },
      };

      expect(hasSpellbookAbility(state)).toBe(true);
    });

    it('returns false when character does not have the ability', () => {
      const state = getInitialState();
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: 'occult-student-1-secondary-other',
            secondaryAbility: '',
          },
        },
      };

      expect(hasSpellbookAbility(state)).toBe(false);
    });

    it('returns false when levelSelections is empty or missing', () => {
      const state = getInitialState();
      expect(hasSpellbookAbility(state)).toBe(false);
    });
  });

  describe('Level 1 Spellbook Free Spells and Costs', () => {
    it('grants 3 level 1 spellbook spells for free (0 Potential)', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Magic Missile', level: 1 },
          { name: 'Shield', level: 1 },
          { name: 'Mage Armor', level: 1 },
        ],
        spellbookSpells: ['Magic Missile', 'Shield', 'Mage Armor'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('grants one 1st-level and one 2nd-level spellbook spell for free (0 Potential)', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 },
          { name: 'Misty Step', level: 2 },
        ],
        spellbookSpells: ['Shield', 'Misty Step'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('grants one 3rd-level spellbook spell for free (0 Potential)', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Fireball', level: 3 },
        ],
        spellbookSpells: ['Fireball'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('charges standard cost for spells beyond free allowance', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      // 4 level 1 spells in spellbook: 3 free, 1 additional costs standard 10
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Magic Missile', level: 1 },
          { name: 'Shield', level: 1 },
          { name: 'Mage Armor', level: 1 },
          { name: 'Sleep', level: 1 },
        ],
        spellbookSpells: ['Magic Missile', 'Shield', 'Mage Armor', 'Sleep'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(10);
    });

    it('charges standard cost (10 * level) for non-spellbook spells at Level 1', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      // 3 free level 1 spellbook spells + 1 non-spellbook level 1 spell (cost 10)
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Magic Missile', level: 1 },
          { name: 'Shield', level: 1 },
          { name: 'Mage Armor', level: 1 },
          { name: 'Sleep', level: 1 },
        ],
        spellbookSpells: ['Magic Missile', 'Shield', 'Mage Armor'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(10);
    });

    it('always charges 10 Potential per cantrip even at Level 1 with Spellbook', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: ['Fire Bolt', 'Light'],
        spells: [
          { name: 'Fireball', level: 3 },
        ],
        spellbookSpells: ['Fireball'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // Fireball is free (0), 2 cantrips cost 20
      expect(calculatePotentialSpent(state)).toBe(20);
    });
  });

  describe('Level 2+ Spellbook Discounts', () => {
    it('applies discounts to spellbook spells at Level 2+: 5 for Lv 1, 10 for Lv 2 (cost 10), 20 for Lv 3 (cost 20)', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 2 };
      state.level = 2;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 },      // 10 - 5 = 5
          { name: 'Misty Step', level: 2 },  // 20 - 10 = 10
          { name: 'Fireball', level: 3 },    // 30 - 10 = 20
        ],
        spellbookSpells: ['Shield', 'Misty Step', 'Fireball'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // 5 + 10 + 20 = 35
      expect(calculatePotentialSpent(state)).toBe(35);
    });

    it('charges standard cost (10 * level) for spells not in spellbook at Level 2+', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 2 };
      state.level = 2;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 },      // spellbook: 5
          { name: 'Misty Step', level: 2 },  // not in spellbook: 20
        ],
        spellbookSpells: ['Shield'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // 5 + 20 = 25
      expect(calculatePotentialSpent(state)).toBe(25);
    });
  });

  describe('calculatePotentialSpent comprehensive scenarios', () => {
    it('case a: Level 1 character with Spellbook choosing 3 Lv 1 spells in spellbook -> spent = 0 for spells', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Detect Magic', level: 1 },
          { name: 'Identify', level: 1 },
          { name: 'Unseen Servant', level: 1 },
        ],
        spellbookSpells: ['Detect Magic', 'Identify', 'Unseen Servant'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('case b: Level 1 character with Spellbook choosing 1 Lv 1 and 1 Lv 2 spell in spellbook -> spent = 0 for spells', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 },
          { name: 'Invisibility', level: 2 },
        ],
        spellbookSpells: ['Shield', 'Invisibility'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('case c: Level 1 character with Spellbook choosing 1 Lv 3 spell in spellbook -> spent = 0 for spells', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Counterspell', level: 3 },
        ],
        spellbookSpells: ['Counterspell'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      expect(calculatePotentialSpent(state)).toBe(0);
    });

    it('case d: Level 2 character with Spellbook having 1 Lv 1 spell (cost 5), 1 Lv 2 spell (cost 10), and 1 non-spellbook Lv 1 spell (cost 10) + 1 cantrip (cost 10) -> spent = 35', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 2 };
      state.level = 2;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: ['Light'],
        spells: [
          { name: 'Shield', level: 1 },      // spellbook: 5
          { name: 'Misty Step', level: 2 },  // spellbook: 10
          { name: 'Sleep', level: 1 },       // non-spellbook: 10
        ],
        spellbookSpells: ['Shield', 'Misty Step'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // 10 (cantrip) + 5 + 10 + 10 = 35
      expect(calculatePotentialSpent(state)).toBe(35);
    });

    it('case e: Character WITHOUT Spellbook ability -> spells always cost standard 10 * level', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Discipline',
            secondaryAO: '',
            primaryAbility: 'discipline-1-primary-test',
            secondaryAbility: '',
          },
        },
      };
      state.spellcasting = {
        cantrips: ['Light'],
        spells: [
          { name: 'Shield', level: 1 },
          { name: 'Misty Step', level: 2 },
        ],
        // Even if spellbookSpells were populated, without ability it should not discount
        spellbookSpells: ['Shield', 'Misty Step'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // 10 (cantrip) + 10 (Shield) + 20 (Misty Step) = 40
      expect(calculatePotentialSpent(state)).toBe(40);
    });

    it('correctly adds spell slot costs along with spellbook spell costs', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 2 };
      state.level = 2;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 }, // 5 (discounted from 10)
        ],
        spellbookSpells: ['Shield'],
        // 2 first level slots: 2 * 10 * 1 = 20
        slots: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // 5 (Shield) + 20 (slots) = 25
      expect(calculatePotentialSpent(state)).toBe(25);
    });

    it('locks Level 1 free spells during levelUp so they stay 0 cost while new spells get discounted', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Shield', level: 1 },
          { name: 'Misty Step', level: 2 },
        ],
        spellbookSpells: ['Shield', 'Misty Step'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // At Level 1, Shield and Misty Step match package B and cost 0
      expect(calculatePotentialSpent(state)).toBe(0);

      // Now level up the character to Level 2
      const leveledState = levelUp(state, ORIGINS);
      expect(leveledState.level).toBe(2);
      expect(leveledState.spellcasting.freeSpells).toEqual(expect.arrayContaining(['Shield', 'Misty Step']));

      // At Level 2, the locked Level 1 free spells still cost 0
      expect(calculatePotentialSpent(leveledState)).toBe(0);

      // Now add a new transcribed spell at Level 2 (e.g. Fireball, level 3 -> discounted cost 20)
      leveledState.spellcasting.spells.push({ name: 'Fireball', level: 3 });
      leveledState.spellcasting.spellbookSpells.push('Fireball');

      // Total spent = 0 (Shield) + 0 (Misty Step) + 20 (Fireball) = 20
      expect(calculatePotentialSpent(leveledState)).toBe(20);
    });

    it('preserves potentialRemaining on imported characters', () => {
      const state = getInitialState();
      state.isImported = true;
      state.potentialRemaining = 42;
      expect(calculatePotentialRemaining(state, ORIGINS)).toBe(42);

      const stateWithMeta = getInitialState();
      stateWithMeta.isImported = true;
      delete stateWithMeta.potentialRemaining;
      stateWithMeta.importedMetadata = { potentialRemaining: 37 };
      expect(calculatePotentialRemaining(stateWithMeta, ORIGINS)).toBe(37);
    });

    it('correctly calculates cumulative potential (120) and remaining (60) when leveling up to level 2 with Occult Student and 60 potential spent on slots', () => {
      const state = getInitialState();
      state.identity = { ...state.identity, level: 1 };
      state.level = 1;
      state.ao = {
        ...state.ao,
        primaryAO: 'Occult Student',
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      };
      state.spellcasting = {
        cantrips: [],
        spells: [
          { name: 'Absorb Elements', level: 1 },
          { name: 'Acid Arrow', level: 2 },
        ],
        spellbookSpells: ['Absorb Elements', 'Acid Arrow'],
        // 2 Lv1 slots (20) + 2 Lv2 slots (40) = 60 spent on slots
        slots: { 1: 2, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      };

      // At level 1, potentialLimit = 60, spent = 60, remaining = 0
      const lv1Limit = calculatePotentialGained(state, ORIGINS);
      const lv1Spent = calculatePotentialSpent(state);
      expect(lv1Limit).toBe(60);
      expect(lv1Spent).toBe(60);
      expect(calculatePotentialRemaining(state, ORIGINS)).toBe(0);

      // Level up to Level 2
      const leveled = levelUp(state, ORIGINS);
      expect(leveled.level).toBe(2);
      expect(leveled.potentialGained).toBe(120);

      const lv2Limit = calculatePotentialGained(leveled, ORIGINS);
      const lv2Spent = calculatePotentialSpent(leveled);
      expect(lv2Limit).toBe(120);
      expect(lv2Spent).toBe(60);
      expect(calculatePotentialRemaining(leveled, ORIGINS)).toBe(60);
    });
  });
});
