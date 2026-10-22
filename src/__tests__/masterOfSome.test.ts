import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { exportToPDF } from '../logic/pdf';
import { computeLevelUpPreview } from '../logic/levelUp';
import {
  getInitialState,
  computeFreeSkillPools,
  computeSkillPointsSummary,
  calculateSpentAccomplishmentPoints,
  getMaxSkillRank,
  calculateInitiativeBonus,
  hasMasterOfSome,
  hasJackOfAllTrades,
  validateMasterOfSome,
} from '../logic/state';
import { ORIGINS } from '../data/origins';
import { BACKGROUNDS } from '../data/backgrounds';
import { RACES } from '../data/races';

describe('Master of Some Ability Origin Features and Constraints', () => {
  function createStateWithMasterOfSome(level = 1) {
    const state = getInitialState();
    state.level = level;
    state.primaryAO = 'Artistry';
    state.secondaryAO = 'Artistry';
    state.selectedAOs = ['Artistry'];
    state.levelSelections = {
      1: {
        primaryAO: 'Artistry',
        secondaryAO: 'Artistry',
        primaryAbility: 'artistry-1-primary-inspiration',
        secondaryAbility: 'artistry-1-secondary-master-of-some',
      },
    };
    return state;
  }

  describe('1. Detection and Mutual Exclusivity', () => {
    it('detects Master of Some when selected as secondary ability', () => {
      const state = createStateWithMasterOfSome();
      expect(hasMasterOfSome(state)).toBe(true);
      expect(hasJackOfAllTrades(state)).toBe(false);
    });

    it('detects Jack of all Trades when selected as secondary ability', () => {
      const state = getInitialState();
      state.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          secondaryAO: 'Artistry',
          primaryAbility: 'artistry-1-primary-inspiration',
          secondaryAbility: 'artistry-1-secondary-jack-of-all-trades',
        },
      };
      expect(hasMasterOfSome(state)).toBe(false);
      expect(hasJackOfAllTrades(state)).toBe(true);
    });
  });

  describe('2. Free Skill Points (+5 AO points)', () => {
    it('grants 5 additional free skill points to AO pool', () => {
      const baselineState = getInitialState();
      baselineState.level = 1;
      baselineState.primaryAO = 'Artistry';
      baselineState.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          secondaryAO: 'Artistry',
          primaryAbility: 'artistry-1-primary-inspiration',
          secondaryAbility: 'artistry-1-secondary-unarmored-defense',
        },
      };

      const baselinePools = computeFreeSkillPools(baselineState, BACKGROUNDS, ORIGINS, RACES);
      expect(baselinePools.aoFree).toBe(4);

      const mosState = createStateWithMasterOfSome();
      const mosPools = computeFreeSkillPools(mosState, BACKGROUNDS, ORIGINS, RACES);
      // Artistry baseline (4) + Master of Some bonus (5) = 9
      expect(mosPools.aoFree).toBe(9);
    });

    it('grants 5 free skill points even if primary origin has no extra skills', () => {
      const state = getInitialState();
      state.level = 1;
      state.primaryAO = 'Discipline'; // Discipline extraSkills = 0
      state.levelSelections = {
        1: {
          primaryAO: 'Discipline',
          secondaryAO: 'Artistry',
          primaryAbility: 'discipline-1-primary-martial-discipline',
          secondaryAbility: 'artistry-1-secondary-master-of-some',
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS, RACES);
      expect(pools.aoFree).toBe(5);
    });

    it('free points from Master of Some cost 0 Accomplishment Points', () => {
      const state = createStateWithMasterOfSome();
      state.background = 'Urchin'; // Urchin grants 4 free points
      // Total free points: 4 (background) + 9 (Artistry 4 + Master of Some 5) = 13 free points.
      // Distribute 9 points across 6 skills (respecting max rank 2):
      // Academics 1, Arts & Craft 1, Stealth 2, Perception 2, Athletics 2, Animal Handling 1 (total cost 1+1+2+2+2+1 = 9)
      state.skills = {
        skillRanks: {
          Stealth: 2,
          Perception: 2,
          Athletics: 2,
          'Animal Handling': 1,
        },
        academicsEntries: [{ name: 'Folklore', rank: 1 }],
        artsCraftEntries: [{ name: 'Lute', rank: 1 }],
      };

      const apResult = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(apResult.totalSpent).toBe(0);

      const summary = computeSkillPointsSummary(state, BACKGROUNDS, ORIGINS, RACES);
      expect(summary.skillsSpent).toBe(0);
      expect(summary.aoSpent).toBeGreaterThanOrEqual(5);
    });
  });

  describe('3. Skill Rank Cap (Rank 2)', () => {
    it('restricts max skill rank to 2 across all levels', () => {
      const stateLvl1 = createStateWithMasterOfSome(1);
      expect(getMaxSkillRank(1, stateLvl1)).toBe(2);

      const stateLvl4 = createStateWithMasterOfSome(4);
      expect(getMaxSkillRank(4, stateLvl4)).toBe(2);

      const stateLvl8 = createStateWithMasterOfSome(8);
      expect(getMaxSkillRank(8, stateLvl8)).toBe(2);
    });

    it('normal character without Master of Some retains standard max ranks', () => {
      const standardState = getInitialState();
      expect(getMaxSkillRank(1, standardState)).toBe(3);
      expect(getMaxSkillRank(4, standardState)).toBe(4);
      expect(getMaxSkillRank(8, standardState)).toBe(5);
    });
  });

  describe('4. Initiative Bonus (+ half proficiency bonus rounded up)', () => {
    it('adds half proficiency bonus (rounded up) to initiative', () => {
      const state = createStateWithMasterOfSome(1);
      // Dexterity 14 -> mod = +2. Level 1 prof bonus = 2. ceil(2 / 2) = +1. Total = +3.
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14,
      };

      const initiativeBonus = calculateInitiativeBonus(state);
      expect(initiativeBonus).toBe(3);
    });

    it('scales correctly at higher levels (Level 5 with prof bonus 3)', () => {
      const state = createStateWithMasterOfSome(5);
      state.identity = { level: 5 };
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // mod = +2. Prof bonus = 3. ceil(3 / 2) = +2. Total = +4.
      };

      const initiativeBonus = calculateInitiativeBonus(state);
      expect(initiativeBonus).toBe(4);
    });

    it('also awards the initiative bonus to Jack of all Trades characters', () => {
      const state = getInitialState();
      state.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          secondaryAO: 'Artistry',
          primaryAbility: 'artistry-1-primary-inspiration',
          secondaryAbility: 'artistry-1-secondary-jack-of-all-trades',
        },
      };
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 10, // mod = 0. Prof bonus = 2. ceil(2/2) = +1. Total = +1.
      };

      const initiativeBonus = calculateInitiativeBonus(state);
      expect(initiativeBonus).toBe(1);
    });

    it('exports the enhanced initiative value into PDF fields', async () => {
      const pdfPath = path.resolve(__dirname, '../../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const pdfBuffer = fs.readFileSync(pdfPath);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => {
          const u8 = new Uint8Array(pdfBuffer);
          return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
        },
      })) as any;

      try {
        const state = createStateWithMasterOfSome(1);
        state.baseCharacteristics = {
          ...state.baseCharacteristics,
          Dexterity: 14, // Mod = +2. With Master of Some: +2 + ceil(2/2) = +3.
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        expect(form.getTextField('Initiative').getText()).toBe('+3');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('5. Constraints Validation', () => {
    it('validates a compliant allocation (Academics, Arts & Craft, 4+ skills, all rank <= 2)', () => {
      const state = createStateWithMasterOfSome();
      state.skills = {
        skillRanks: {
          Perception: 1,
          Stealth: 1,
        },
        academicsEntries: [{ name: 'History', rank: 1 }],
        artsCraftEntries: [{ name: 'Sculpting', rank: 1 }],
      };

      const validation = validateMasterOfSome(state);
      expect(validation.isActive).toBe(true);
      expect(validation.hasAcademics).toBe(true);
      expect(validation.hasArtsCraft).toBe(true);
      expect(validation.uniqueSkillsCount).toBe(4);
      expect(validation.hasAtLeast4Skills).toBe(true);
      expect(validation.maxRankValid).toBe(true);
      expect(validation.isValid).toBe(true);
    });

    it('fails validation when Academics is missing', () => {
      const state = createStateWithMasterOfSome();
      state.skills = {
        skillRanks: {
          Perception: 1,
          Stealth: 1,
          Athletics: 1,
        },
        academicsEntries: [],
        artsCraftEntries: [{ name: 'Sculpting', rank: 1 }],
      };

      const validation = validateMasterOfSome(state);
      expect(validation.hasAcademics).toBe(false);
      expect(validation.isValid).toBe(false);
    });

    it('fails validation when Arts & Craft is missing', () => {
      const state = createStateWithMasterOfSome();
      state.skills = {
        skillRanks: {
          Perception: 1,
          Stealth: 1,
          Athletics: 1,
        },
        academicsEntries: [{ name: 'History', rank: 1 }],
        artsCraftEntries: [],
      };

      const validation = validateMasterOfSome(state);
      expect(validation.hasArtsCraft).toBe(false);
      expect(validation.isValid).toBe(false);
    });

    it('fails validation when fewer than 4 different skills are invested', () => {
      const state = createStateWithMasterOfSome();
      // Only 3 skills total: Academics 2, Arts & Craft 2, Stealth 1
      state.skills = {
        skillRanks: {
          Stealth: 1,
        },
        academicsEntries: [{ name: 'History', rank: 2 }],
        artsCraftEntries: [{ name: 'Sculpting', rank: 2 }],
      };

      const validation = validateMasterOfSome(state);
      expect(validation.uniqueSkillsCount).toBe(3);
      expect(validation.hasAtLeast4Skills).toBe(false);
      expect(validation.isValid).toBe(false);
    });

    it('fails validation when any skill rank exceeds rank 2', () => {
      const state = createStateWithMasterOfSome();
      state.skills = {
        skillRanks: {
          Perception: 3,
          Stealth: 1,
        },
        academicsEntries: [{ name: 'History', rank: 1 }],
        artsCraftEntries: [{ name: 'Sculpting', rank: 1 }],
      };

      const validation = validateMasterOfSome(state);
      expect(validation.maxRankValid).toBe(false);
      expect(validation.details.exceededSkills).toContain('Perception');
      expect(validation.isValid).toBe(false);
    });
  });

  describe('6. Level Up Preview Integration', () => {
    it('restricts preview max skill rank to 2 when Master of Some is active', () => {
      const state = createStateWithMasterOfSome(3);
      const preview = computeLevelUpPreview(state, ORIGINS, { racesData: RACES });
      expect(preview.targetLevel).toBe(4);
      expect(preview.maxSkillRank).toBe(2);
    });

    it('returns normal preview max skill rank 4 when Master of Some is not active', () => {
      const state = getInitialState();
      state.level = 3;
      state.primaryAO = 'Artistry';
      state.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          secondaryAO: 'Artistry',
          primaryAbility: 'artistry-1-primary-inspiration',
          secondaryAbility: 'artistry-1-secondary-unarmored-defense',
        },
      };
      const preview = computeLevelUpPreview(state, ORIGINS, { racesData: RACES });
      expect(preview.targetLevel).toBe(4);
      expect(preview.maxSkillRank).toBe(4);
    });
  });
});
