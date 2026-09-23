import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

import { getInitialState, calculateAV } from '../logic/state';
import { exportToPDF } from '../logic/pdf';
import { CharacterSummaryPanel } from '../components/CharacterSummaryPanel';
import { CharacterProvider } from '../contexts/CharacterContext';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';

describe('Unarmored Defense and Armor Value (AV) Calculations', () => {
  // 1. AV calculation for characters with no armor and no AO unarmored defense (base 10 + dexMod)
  describe('1. Unarmored base AV without AO unarmored defense', () => {
    it('calculates AV as 10 + dexMod when no armor and no AO ability is picked', () => {
      const state = getInitialState();
      state.level = 1;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2
      };
      state.equipmentList = [];

      // Base AV: 10 + 2 = 12
      expect(calculateAV(state)).toBe(12);
    });

    it('calculates AV correctly with neutral (10) and negative dexterity modifiers', () => {
      const stateNeutral = getInitialState();
      stateNeutral.level = 1;
      stateNeutral.baseCharacteristics = {
        ...stateNeutral.baseCharacteristics,
        Dexterity: 10, // dexMod = 0
      };
      expect(calculateAV(stateNeutral)).toBe(10);

      const stateNegative = getInitialState();
      stateNegative.level = 1;
      stateNegative.baseCharacteristics = {
        ...stateNegative.baseCharacteristics,
        Dexterity: 8, // dexMod = -1
      };
      expect(calculateAV(stateNegative)).toBe(9);

      const stateVeryNegative = getInitialState();
      stateVeryNegative.level = 1;
      stateVeryNegative.baseCharacteristics = {
        ...stateVeryNegative.baseCharacteristics,
        Dexterity: 6, // dexMod = -2
      };
      expect(calculateAV(stateVeryNegative)).toBe(8);
    });

    it('does not cap high dexterity modifier when unarmored without AO unarmored defense', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 18, // dexMod = +4
      };
      // Base calculation is 10 + dexMod = 14 (not capped by prof bonus)
      expect(calculateAV(state)).toBe(14);
    });
  });

  // 2. AV calculation for Artistry Unarmored Defense (10 + min(prof, dexMod) + min(prof, max(preMod, manMod)))
  describe('2. Artistry Unarmored Defense', () => {
    it('calculates 10 + min(prof, dexMod) + min(prof, max(preMod, manMod)) when Presence is higher', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14,    // dexMod = +2 -> min(2, 2) = 2
        Presence: 16,     // preMod = +3
        Manipulation: 12, // manMod = +1 -> max(3, 1) = 3 -> min(2, 3) = 2
      };
      state.levelSelections = {
        1: {
          primaryAO: 'Artistry',
          secondaryAO: 'Artistry',
          secondaryAbility: 'artistry-1-secondary-unarmored-defense',
        },
      };

      // 10 + 2 + 2 = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('calculates correctly when Manipulation is higher than Presence', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 12,    // dexMod = +1 -> min(2, 1) = 1
        Presence: 10,     // preMod = 0
        Manipulation: 14, // manMod = +2 -> max(0, 2) = 2 -> min(2, 2) = 2
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Artistry',
          secondaryAbility: 'Unarmored Defense',
        },
      };

      // 10 + 1 + 2 = 13
      expect(calculateAV(state)).toBe(13);
    });

    it('works when state.ao.levelSelections structure is used', () => {
      const state = getInitialState();
      state.level = 1;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14,
        Presence: 14,
        Manipulation: 10,
      };
      (state as any).ao = {
        levelSelections: {
          1: {
            secondaryAbility: 'artistry-1-secondary-unarmored-defense',
          },
        },
      };

      expect(calculateAV(state)).toBe(14);
    });
  });

  // 3. AV calculation for Devotion Divine Domain (Might) (10 + min(prof, vitMod) + min(prof, max(preMod, resMod)))
  describe('3. Devotion Divine Domain (Might)', () => {
    it('calculates 10 + min(prof, vitMod) + min(prof, max(preMod, resMod)) when Resolve is higher', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 14, // vitMod = +2 -> min(2, 2) = 2
        Presence: 12, // preMod = +1
        Resolve: 16,  // resMod = +3 -> max(1, 3) = 3 -> min(2, 3) = 2
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Devotion',
          secondaryAbility: 'devotion-1-secondary-divine-domain-might',
        },
      };

      // 10 + 2 + 2 = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('calculates correctly when Presence is higher than Resolve', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 12, // vitMod = +1 -> min(2, 1) = 1
        Presence: 14, // preMod = +2
        Resolve: 8,   // resMod = -1 -> max(2, -1) = 2 -> min(2, 2) = 2
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Devotion',
          secondaryAbility: 'Divine Domain (Might)',
        },
      };

      // 10 + 1 + 2 = 13
      expect(calculateAV(state)).toBe(13);
    });
  });

  // 4. AV calculation for Discipline Unarmored defense (10 + min(prof, dexMod) + min(prof, comMod))
  describe('4. Discipline Unarmored defense', () => {
    it('calculates 10 + min(prof, dexMod) + min(prof, comMod)', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2 -> min(2, 2) = 2
        Composure: 14, // comMod = +2 -> min(2, 2) = 2
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Discipline',
          secondaryAbility: 'discipline-1-secondary-unarmored-defense',
        },
      };

      // 10 + 2 + 2 = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('calculates correctly with lower Composure modifier', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 12, // dexMod = +1 -> min(2, 1) = 1
        Composure: 10, // comMod = 0 -> min(2, 0) = 0
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Discipline',
          secondaryAbility: 'Unarmored defense',
        },
      };

      // 10 + 1 + 0 = 11
      expect(calculateAV(state)).toBe(11);
    });
  });

  // 5. AV calculation for Finesse Unarmored Defense (10 + min(prof, dexMod) + min(prof, cunMod))
  describe('5. Finesse Unarmored Defense', () => {
    it('calculates 10 + min(prof, dexMod) + min(prof, cunMod)', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2 -> min(2, 2) = 2
        Cunning: 14,   // cunMod = +2 -> min(2, 2) = 2
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Finesse',
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };

      // 10 + 2 + 2 = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('calculates correctly when Cunning is +1 and Dex is 0', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 10, // dexMod = 0 -> min(2, 0) = 0
        Cunning: 12,   // cunMod = +1 -> min(2, 1) = 1
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Finesse',
          secondaryAbility: 'Unarmored Defense',
        },
      };

      // 10 + 0 + 1 = 11
      expect(calculateAV(state)).toBe(11);
    });
  });

  // 6. AV calculation for Power Unarmored Defense (10 + min(prof, vitMod) + min(prof, resMod))
  describe('6. Power Unarmored Defense', () => {
    it('calculates 10 + min(prof, vitMod) + min(prof, resMod)', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 14, // vitMod = +2 -> min(2, 2) = 2
        Resolve: 14,  // resMod = +2 -> min(2, 2) = 2
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Power',
          secondaryAbility: 'power-1-secondary-unarmored-defense',
        },
      };

      // 10 + 2 + 2 = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('calculates correctly with Vitality +1 and Resolve 0', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 12, // vitMod = +1 -> min(2, 1) = 1
        Resolve: 10,  // resMod = 0 -> min(2, 0) = 0
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAO: 'Power',
          secondaryAbility: 'Unarmored Defense',
        },
      };

      // 10 + 1 + 0 = 11
      expect(calculateAV(state)).toBe(11);
    });
  });

  // 7. Proficiency bonus cap: when stat modifier exceeds proficiency bonus, it is capped at proficiency bonus.
  // When stat modifier is below proficiency bonus (even negative), it is not capped.
  describe('7. Proficiency bonus cap behavior', () => {
    it('caps stat modifiers at proficiency bonus when they exceed it', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 20, // dexMod = +5 -> capped at +2
        Cunning: 18,   // cunMod = +4 -> capped at +2
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };

      // Must be 10 + 2 + 2 = 14, NOT 10 + 5 + 4 = 19
      expect(calculateAV(state)).toBe(14);
    });

    it('does not cap stat modifiers when below proficiency bonus (including negative modifiers)', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 8,  // dexMod = -1 -> min(2, -1) = -1 (not capped)
        Cunning: 12,  // cunMod = +1 -> min(2, 1) = 1 (not capped)
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };

      // 10 + (-1) + 1 = 10
      expect(calculateAV(state)).toBe(10);

      // Both negative
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 6, // dexMod = -2 -> min(2, -2) = -2
        Cunning: 8,   // cunMod = -1 -> min(2, -1) = -1
      };
      // 10 + (-2) + (-1) = 7
      expect(calculateAV(state)).toBe(7);
    });

    it('scales cap with higher character levels and proficiency bonuses', () => {
      const stateLevel5 = getInitialState();
      stateLevel5.level = 5; // prof = +3
      stateLevel5.baseCharacteristics = {
        ...stateLevel5.baseCharacteristics,
        Dexterity: 18, // dexMod = +4 -> capped at +3
        Cunning: 16,   // cunMod = +3 -> min(3, 3) = +3
      };
      stateLevel5.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };
      // 10 + 3 + 3 = 16
      expect(calculateAV(stateLevel5)).toBe(16);

      const stateLevel9 = getInitialState();
      stateLevel9.level = 9; // prof = +4
      stateLevel9.baseCharacteristics = {
        ...stateLevel9.baseCharacteristics,
        Dexterity: 20, // dexMod = +5 -> capped at +4
        Cunning: 18,   // cunMod = +4 -> min(4, 4) = +4
      };
      stateLevel9.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };
      // 10 + 4 + 4 = 18
      expect(calculateAV(stateLevel9)).toBe(18);
    });
  });

  // 8. Comparison logic: when unarmored defense calculation is higher than regular armor calculation, final AV is unarmored defense
  describe('8. Comparison logic: unarmored defense higher than regular armor', () => {
    it('returns unarmored defense AV when it exceeds regular light armor calculation', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2 -> min(2, 2) = 2
        Cunning: 14,   // cunMod = +2 -> min(2, 2) = 2
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };
      // Unarmored defense AV = 10 + 2 + 2 = 14

      // Character equips Padded Armor (Light, AV 11)
      // Regular calculation: 11 + 2 (dexMod) = 13
      state.equipmentList = [
        { name: 'Padded Armor', category: 'Light', av: 11, isArmor: true, equipped: true },
      ];

      // Max(14, 13) = 14
      expect(calculateAV(state)).toBe(14);
    });

    it('returns unarmored defense AV when character wears no armor and unarmored defense exceeds base 10 + dex', () => {
      const state = getInitialState();
      state.level = 1;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 14, // vitMod = +2
        Resolve: 14,  // resMod = +2
        Dexterity: 10, // dexMod = 0
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'power-1-secondary-unarmored-defense',
        },
      };
      state.equipmentList = [];

      // Base unarmored without ability: 10 + 0 = 10
      // Power unarmored defense: 10 + 2 + 2 = 14
      // Final: 14
      expect(calculateAV(state)).toBe(14);
    });
  });

  // 9. Comparison logic: when regular armor calculation (body armor + shield + dex mod) is higher than unarmored defense, final AV is regular calculation
  describe('9. Comparison logic: regular armor calculation higher than unarmored defense', () => {
    it('returns heavy armor + shield regular calculation when higher than unarmored defense', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 12, // vitMod = +1 -> min(2, 1) = 1
        Resolve: 12,  // resMod = +1 -> min(2, 1) = 1
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'power-1-secondary-unarmored-defense',
        },
      };
      // Power unarmored defense: 10 + 1 + 1 = 12

      // Heavy armor: Chain Mail (AV 16, no dexMod) + Shield (AV 2) = 18
      state.equipmentList = [
        { name: 'Chain Mail', category: 'Heavy', av: 16, addsDexMod: false, isArmor: true, equipped: true },
        { name: 'Shield', category: 'Shield', av: 2, isArmor: true, equipped: true },
      ];

      // Max(12, 18) = 18
      expect(calculateAV(state)).toBe(18);
    });

    it('returns body armor + shield + dex mod when higher than unarmored defense', () => {
      const state = getInitialState();
      state.level = 1; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2 -> min(2, 2) = 2
        Composure: 12, // comMod = +1 -> min(2, 1) = 1
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'discipline-1-secondary-unarmored-defense',
        },
      };
      // Discipline unarmored defense: 10 + 2 + 1 = 13

      // Studded Leather (Light, AV 12) + Dex (+2) + Shield (+2) = 16
      state.equipmentList = [
        { name: 'Studded Leather Armor', category: 'Light', av: 12, isArmor: true, equipped: true },
        { name: 'Shield', category: 'Shield', av: 2, isArmor: true, equipped: true },
      ];

      // Max(13, 16) = 16
      expect(calculateAV(state)).toBe(16);
    });
  });

  // 10. Fighting style (Defense): when character has Fighting style (Defense) and wears armor, regular calculation gets +1 bonus
  describe('10. Fighting style (Defense)', () => {
    it('adds +1 bonus to regular armor calculation when character has Fighting style (Defense) and wears armor', () => {
      const state = getInitialState();
      state.level = 2;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 10,
      };
      state.levelSelections = {
        1: { primaryAO: 'Tactics' },
        2: { primaryAbility: 'tactics-2-primary-fighting-style-defense' },
      };
      // Chain Mail (Heavy, AV 16) + Defense Fighting style (+1) = 17
      state.equipmentList = [
        { name: 'Chain Mail', category: 'Heavy', av: 16, addsDexMod: false, isArmor: true, equipped: true },
      ];

      expect(calculateAV(state)).toBe(17);

      // With Shield: 16 + 2 + 1 = 19
      state.equipmentList.push({ name: 'Shield', category: 'Shield', av: 2, isArmor: true, equipped: true });
      expect(calculateAV(state)).toBe(19);
    });

    it('does NOT add +1 bonus from Fighting style (Defense) when character is unarmored', () => {
      const state = getInitialState();
      state.level = 2;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2
      };
      state.levelSelections = {
        1: { primaryAO: 'Tactics' },
        2: { primaryAbility: 'tactics-2-primary-fighting-style-defense' },
      };
      state.equipmentList = [];

      // Unarmored without armor: 10 + 2 = 12 (Fighting style requires wearing armor)
      expect(calculateAV(state)).toBe(12);
    });

    it('does NOT add Fighting style bonus to unarmored defense calculation', () => {
      const state = getInitialState();
      state.level = 2; // prof = +2
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Vitality: 14, // vitMod = +2 -> min(2, 2) = 2
        Resolve: 14,  // resMod = +2 -> min(2, 2) = 2
        Dexterity: 10,
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'power-1-secondary-unarmored-defense',
        },
        2: {
          primaryAbility: 'tactics-2-primary-fighting-style-defense',
        },
      };
      state.equipmentList = [];

      // Power unarmored defense: 10 + 2 + 2 = 14 (Defense fighting style does NOT apply)
      expect(calculateAV(state)).toBe(14);
    });
  });

  // 11. UI and PDF integration: CharacterSummaryPanel displays Armor Value (AV) and updates when AO unarmored defense is selected;
  // PDF export sets 'Armor Class' to the calculated AV
  describe('11. UI and PDF integration', () => {
    it('CharacterSummaryPanel displays Armor Value (AV) and updates when AO unarmored defense is selected', () => {
      const state = getInitialState();
      state.level = 1;
      state.baseCharacteristics = {
        ...state.baseCharacteristics,
        Dexterity: 14, // dexMod = +2
        Cunning: 14,   // cunMod = +2
      };
      state.levelSelections = {
        1: {
          secondaryAbility: 'finesse-1-secondary-unarmored-defense',
        },
      };

      const { container } = render(
        React.createElement(
          CharacterProvider,
          { initialState: state as any },
          React.createElement(CharacterSummaryPanel)
        )
      );

      // Verify Armor Value (AV) label is present
      const avLabel = screen.getByText(/Armor Value/i);
      expect(avLabel).toBeInTheDocument();

      // Verify the value 14 is displayed in the summary row
      const summaryRow = avLabel.closest('.summary-row');
      expect(summaryRow).not.toBeNull();
      expect(summaryRow).toHaveTextContent('14');
    });

    it('PDF export sets "Armor Class" field to the calculated AV taking unarmored defense into account', async () => {
      const pdfPath = path.resolve(__dirname, '../../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      expect(fs.existsSync(pdfPath)).toBe(true);
      const pdfBuffer = fs.readFileSync(pdfPath);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => {
            const u8 = new Uint8Array(pdfBuffer);
            return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
          },
        };
      });

      try {
        const state = getInitialState();
        state.level = 1;
        state.baseCharacteristics = {
          ...state.baseCharacteristics,
          Dexterity: 14, // dexMod = +2
          Cunning: 14,   // cunMod = +2
        };
        state.levelSelections = {
          1: {
            secondaryAbility: 'finesse-1-secondary-unarmored-defense',
          },
        };
        state.equipmentList = [];

        // Finesse unarmored defense gives AV = 14
        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const acField = form.getTextField('Armor Class');

        expect(acField.getText()).toBe('14');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
