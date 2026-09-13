import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { exportToPDF } from '../src/logic/pdf';
import { getInitialState, getFinalCharacteristics } from '../src/logic/state';
import { RACES } from '../src/data/races';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { handleExportJSON } from '../src/utils/exportHelpers';
import { characterReducer, DEFAULT_CHARACTER } from '../src/types/Character';

function setupFetchMock() {
  const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn().mockImplementation(async () => {
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        const u8 = new Uint8Array(pdfBuffer);
        return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      }
    };
  });

  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe('PDF Export and JSON Synchronization', () => {
  describe('1. Spells in PDF', () => {
    it('populates non-cantrip spell slots, slot totals, spell save DC, and spellcasting mod', async () => {
      const teardown = setupFetchMock();
      try {
        const state = getInitialState();
        state.level = 1;
        state.primaryAO = 'Devotion';
        state.baseCharacteristics = {
          Brawn: 10,
          Dexterity: 10,
          Vitality: 10,
          Intelligence: 10,
          Cunning: 10,
          Resolve: 16, // +3 mod, profBonus is 2 -> DC: 8+2+3=13, mod: +5
          Presence: 10,
          Manipulation: 10,
          Composure: 10,
        };
        state.spellcasting = {
          cantrips: ['Guidance'],
          spells: [
            { name: 'Cure Wounds', level: 1 },
            { name: 'Shield of Faith', level: 1 },
            { name: 'Lesser Restoration', level: 2 },
          ],
          slots: { 1: 10, 2: 9, 3: 8, 4: 11, 5: 7, 6: 5, 7: 6, 8: 6, 9: 6 }
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // Check non-cantrip spells in Level ${lvl} Slot ${i}
        expect(form.getTextField('Level 1 Slot 1').getText()).toBe('Cure Wounds');
        expect(form.getTextField('Level 1 Slot 2').getText()).toBe('Shield of Faith');
        expect(form.getTextField('Level 2 Slot 1').getText()).toBe('Lesser Restoration');

        // Check total spell slots
        expect(form.getTextField('Level 1 slot total').getText()).toBe('10');
        expect(form.getTextField('Level 2 slot total').getText()).toBe('9');

        // Check spell save DC and attack mod fields
        expect(form.getTextField('Spell save').getText()).toBe('13');
        expect(form.getTextField('Spellcasting mod').getText()).toBe('+5');
      } finally {
        teardown();
      }
    });
  });

  describe('2. Final ability scores and modifiers in PDF', () => {
    it('populates final ability scores, ability modifiers, saving throws, combat fields, and proficiencies', async () => {
      const teardown = setupFetchMock();
      try {
        const state = getInitialState();
        state.characterName = 'Thorin';
        state.level = 1;
        state.race = 'Dwarf';
        state.subrace = 'Mountain Dwarf'; // Dwarf stats: +2 Vit, Mountain Dwarf stats: +2 Brawn
        state.baseCharacteristics = {
          Brawn: 14, // final 16 (+3)
          Dexterity: 12, // final 12 (+1)
          Vitality: 13, // final 15 (+2)
          Intelligence: 8, // final 8 (-1)
          Cunning: 10, // final 10 (+0)
          Resolve: 10, // final 10 (+0)
          Presence: 10, // final 10 (+0)
          Manipulation: 10, // final 10 (+0)
          Composure: 10, // final 10 (+0)
        };

        state.savingThrowsProficient = {
          Brawn: true,
          Dexterity: false,
          Vitality: true,
          Intelligence: false,
          Cunning: false,
          Resolve: false,
          Presence: false,
          Manipulation: false,
          Composure: false,
        };

        state.skillRanks = {
          Perception: 2
        };

        state.languages = ['Common', 'Dwarvish'];
        state.armorProficiencies = { Light: true, Medium: true, Heavy: false, Shields: true };
        state.weaponProficiencies = ['Axes', 'Hammers'];
        state.equipmentList = [
          { name: 'Chain Shirt', isArmor: true, baseAC: 13, addsDexMod: true, equipped: true },
          { name: 'Shield', isArmor: true, baseAC: 2, addsDexMod: false, equipped: true }
        ];

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // Final ability scores in "${c.key} Ability Score"
        expect(form.getTextField('Brawn Ability Score').getText()).toBe('16');
        expect(form.getTextField('Dexterity Ability Score').getText()).toBe('12');
        expect(form.getTextField('Vitality Ability Score').getText()).toBe('15');
        expect(form.getTextField('Intelligence Ability Score').getText()).toBe('8');
        expect(form.getTextField('Composure Ability Score').getText()).toBe('10');

        // Ability modifiers in "${c.key} Ability Modifier" (and "Dex Ability Modifier" for Dexterity)
        expect(form.getTextField('Brawn Ability Modifier').getText()).toBe('+3');
        expect(form.getTextField('Dex Ability Modifier').getText()).toBe('+1');
        expect(form.getTextField('Vitality Ability Modifier').getText()).toBe('+2');
        expect(form.getTextField('Intelligence Ability Modifier').getText()).toBe('-1');
        expect(form.getTextField('Composure Ability Modifier').getText()).toBe('+0');

        // Saving throws text & check fields
        // Prof bonus is 2 at level 1.
        // Brawn save: +3 mod + 2 prof = +5
        // Dex save: +1 mod + 0 prof = +1
        // Vita save: +2 mod + 2 prof = +4
        expect(form.getTextField('Brawn Save').getText()).toBe('+5');
        expect(form.getCheckBox('Brawn Save Check').isChecked()).toBe(true);

        expect(form.getTextField('Dex Save').getText()).toBe('+1');
        expect(form.getCheckBox('Dex Save Check').isChecked()).toBe(false);

        expect(form.getTextField('Vita Save').getText()).toBe('+4');
        expect(form.getCheckBox('Vit Save Check').isChecked()).toBe(true);

        // Combat fields
        expect(form.getTextField('Max HP').getText()).toBeDefined();
        expect(form.getTextField('Initiative').getText()).toBe('+1');
        expect(form.getTextField('Speed').getText()).toBe('6');
        expect(form.getTextField('Proficiency Bonus').getText()).toBe('+2');
        expect(form.getTextField('Armor Class').getText()).toBeDefined();

        // Skill checkboxes ('Perc 1'..'Perc 5') and stat modifiers ('Perc Int', 'Perc Com')
        expect(form.getCheckBox('Perc 1').isChecked()).toBe(true);
        expect(form.getCheckBox('Perc 2').isChecked()).toBe(true);
        expect(form.getCheckBox('Perc 3').isChecked()).toBe(false);
        expect(form.getTextField('Perc Int').getText()).toBeDefined();
        expect(form.getTextField('Perc Com').getText()).toBeDefined();

        // Proficiencies column
        expect(form.getTextField('Lang/profs column').getText()).toContain('Common');
        expect(form.getTextField('Lang/profs column').getText()).toContain('Dwarvish');
      } finally {
        teardown();
      }
    });
  });

  describe('3. JSON export and import', () => {
    it('exports final ability scores and imports without double-adding racial bonuses', () => {
      // Mock document for handleExportJSON
      let exportedJson = '';
      const originalCreateElement = document.createElement;
      const fakeAnchor: any = {
        setAttribute: vi.fn((attr, val) => {
          if (attr === 'href' && val.startsWith('data:text/json;charset=utf-8,')) {
            exportedJson = decodeURIComponent(val.replace('data:text/json;charset=utf-8,', ''));
          }
        }),
        click: vi.fn(),
        remove: vi.fn(),
      };
      document.createElement = vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') return fakeAnchor;
        return originalCreateElement.call(document, tag);
      });
      document.body.appendChild = vi.fn();

      try {
        const initialState = getInitialState();
        initialState.race = 'Dwarf';
        initialState.subrace = 'Mountain Dwarf'; // +2 Vit, +2 Brawn
        initialState.baseCharacteristics = {
          Brawn: 14, // Final will be 16
          Dexterity: 10,
          Vitality: 12, // Final will be 14
          Intelligence: 10,
          Cunning: 10,
          Resolve: 10,
          Presence: 10,
          Manipulation: 10,
          Composure: 10,
        };

        handleExportJSON(initialState as any);
        expect(exportedJson).toBeTruthy();
        const parsed = JSON.parse(exportedJson);

        // When exporting character JSON, final ability scores must be saved as the ability scores in the JSON
        // (e.g. characteristics / finalCharacteristics / baseCharacteristics with final scores)
        const exportedFinalScores = parsed.finalCharacteristics || parsed.characteristics || parsed.baseCharacteristics;
        expect(exportedFinalScores).toBeDefined();
        expect(exportedFinalScores.Brawn).toBe(16);
        expect(exportedFinalScores.Vitality).toBe(14);

        // When importing character JSON with final scores, it must correctly restore the character state
        // without double-adding racial bonuses to the final scores.
        const restoredState = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: parsed,
        });

        const recomputedFinal = getFinalCharacteristics(restoredState, RACES);
        expect(recomputedFinal.Brawn).toBe(16);
        expect(recomputedFinal.Vitality).toBe(14);
      } finally {
        document.createElement = originalCreateElement;
      }
    });
  });
});
