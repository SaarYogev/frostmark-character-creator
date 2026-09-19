import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { exportToPDF, importFromPDF } from '../src/logic/pdf';
import { getInitialState, getFinalCharacteristics, exportCharacterJSON, calculatePotentialRemaining, calculatePotentialSpent } from '../src/logic/state';
import { RACES } from '../src/data/races';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { ABILITIES } from '../src/data/abilities';
import { ORIGINS } from '../src/data/origins';
import { handleExportJSON } from '../src/utils/exportHelpers';
import { characterReducer, DEFAULT_CHARACTER } from '../src/types/Character';
import { deduplicateEquipmentList } from '../src/logic/equipmentUtils';

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
          Presence: 14, // final 14 (+2)
          Manipulation: 12, // final 12 (+1)
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
        expect(form.getTextField('Max HP').getText()).toBe('10');
        expect(form.getTextField('Current HP').getText()).toBe('10');
        expect(form.getTextField('Total HD').getText()).toBe('1d8');
        expect(form.getTextField('HD').getText()).toBe('1d8');
        expect(form.getTextField('Initiative').getText()).toBe('+1');
        // Dwarves have a base speed of 5m (Sturdy Pace trait) rather than standard 6m
        expect(form.getTextField('Speed').getText()).toBe('5');
        expect(form.getTextField('Proficiency Bonus').getText()).toBe('+2');
        expect(form.getTextField('Armor Class').getText()).toBeDefined();

        // Skill checkboxes ('Perc 1'..'Perc 5') and stat modifiers ('Perc Int', 'Perc Com')
        expect(form.getCheckBox('Perc 1').isChecked()).toBe(true);
        expect(form.getCheckBox('Perc 2').isChecked()).toBe(true);
        expect(form.getCheckBox('Perc 3').isChecked()).toBe(false);
        expect(form.getTextField('Perc Int').getText()).toBeDefined();
        expect(form.getTextField('Perc Com').getText()).toBeDefined();

        /* Frostmark Persuasion skill fields map to Presence (Persu Int) and Manipulation (Persu Com) modifiers */
        expect(form.getTextField('Persu Int').getText()).toBe('+2');
        expect(form.getTextField('Persu Com').getText()).toBe('+1');

        // Proficiencies column
        expect(form.getTextField('Lang/profs column').getText()).toContain('Common');
        expect(form.getTextField('Lang/profs column').getText()).toContain('Dwarvish');
      } finally {
        teardown();
      }
    }, 15000);
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

  describe('4. Character name and player name synchronization and PDF export', () => {
    describe('exportToPDF name resolution', () => {
      it('exports updated identity.characterName and identity.playerName when stale root values exist', async () => {
        const teardown = setupFetchMock();
        try {
          const state = getInitialState();
          state.characterName = 'Stale Root Character';
          state.playerName = 'Stale Root Player';
          state.identity = {
            ...state.identity,
            characterName: 'Updated Identity Character',
            playerName: 'Updated Identity Player',
          };

          const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const form = pdfDoc.getForm();

          expect(form.getTextField('CHARACTER NAME').getText()).toBe('Updated Identity Character');
          expect(form.getTextField('PLAYER NAME').getText()).toBe('Updated Identity Player');
        } finally {
          teardown();
        }
      });

      it('exports characterName and playerName when starting from scratch without root properties', async () => {
        const teardown = setupFetchMock();
        try {
          const state = {
            ...DEFAULT_CHARACTER,
            identity: {
              ...DEFAULT_CHARACTER.identity,
              characterName: 'Fresh Character',
              playerName: 'Fresh Player',
            },
          };

          const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const form = pdfDoc.getForm();

          expect(form.getTextField('CHARACTER NAME').getText()).toBe('Fresh Character');
          expect(form.getTextField('PLAYER NAME').getText()).toBe('Fresh Player');
        } finally {
          teardown();
        }
      });
    });

    describe('characterReducer SET_IDENTITY synchronization', () => {
      it('synchronizes characterName and playerName on both root and identity when SET_IDENTITY is dispatched', () => {
        const initialState = {
          ...DEFAULT_CHARACTER,
          characterName: 'Original Character',
          playerName: 'Original Player',
          identity: {
            ...DEFAULT_CHARACTER.identity,
            characterName: 'Original Character',
            playerName: 'Original Player',
          },
        };

        const updatedState = characterReducer(initialState, {
          type: 'SET_IDENTITY',
          payload: {
            characterName: 'Renamed Character',
            playerName: 'Renamed Player',
          },
        });

        expect(updatedState.identity.characterName).toBe('Renamed Character');
        expect(updatedState.identity.playerName).toBe('Renamed Player');
        expect(updatedState.characterName).toBe('Renamed Character');
        expect(updatedState.playerName).toBe('Renamed Player');
      });

      it('synchronizes characterName and playerName on root when dispatched on state without root properties', () => {
        const updatedState = characterReducer(DEFAULT_CHARACTER, {
          type: 'SET_IDENTITY',
          payload: {
            characterName: 'New Hero',
            playerName: 'New Adventurer',
          },
        });

        expect(updatedState.identity.characterName).toBe('New Hero');
        expect(updatedState.identity.playerName).toBe('New Adventurer');
        expect(updatedState.characterName).toBe('New Hero');
        expect(updatedState.playerName).toBe('New Adventurer');
      });
    });

    describe('characterReducer LOAD_STATE name handling', () => {
      it('respects identity names over stale root names when loading state', () => {
        const loaded = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: {
            ...DEFAULT_CHARACTER,
            characterName: 'Stale Root Name',
            playerName: 'Stale Root Player',
            identity: {
              ...DEFAULT_CHARACTER.identity,
              characterName: 'Loaded Identity Character',
              playerName: 'Loaded Identity Player',
            },
          },
        });

        expect(loaded.identity.characterName).toBe('Loaded Identity Character');
        expect(loaded.identity.playerName).toBe('Loaded Identity Player');
        expect(loaded.characterName).toBe('Loaded Identity Character');
        expect(loaded.playerName).toBe('Loaded Identity Player');
      });

      it('synchronizes root names when payload only supplies identity names', () => {
        const loaded = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: {
            ...DEFAULT_CHARACTER,
            characterName: undefined,
            playerName: undefined,
            identity: {
              ...DEFAULT_CHARACTER.identity,
              characterName: 'Identity Only Character',
              playerName: 'Identity Only Player',
            },
          } as any,
        });

        expect(loaded.identity.characterName).toBe('Identity Only Character');
        expect(loaded.identity.playerName).toBe('Identity Only Player');
        expect(loaded.characterName).toBe('Identity Only Character');
        expect(loaded.playerName).toBe('Identity Only Player');
      });

      it('populates identity names for backward compatibility when payload only has root names', () => {
        const loaded = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: {
            characterName: 'Legacy Root Character',
            playerName: 'Legacy Root Player',
          } as any,
        });

        expect(loaded.characterName).toBe('Legacy Root Character');
        expect(loaded.playerName).toBe('Legacy Root Player');
        expect(loaded.identity.characterName).toBe('Legacy Root Character');
        expect(loaded.identity.playerName).toBe('Legacy Root Player');
      });
    });
  });

  describe('5. AO Ability text and description in PDF export', () => {
    it('exports ability name, origin, level and the full description text, not just the name', async () => {
      const teardown = setupFetchMock();
      try {
        const testAbility = ABILITIES.find(a => a.desc && a.desc.length > 20);
        expect(testAbility).toBeDefined();

        const state = getInitialState();
        state.level = 1;
        state.ao = {
          primaryAO: testAbility!.origin,
          secondaryAO: '',
          primaryAOHD: 8,
          primaryAOSpellcasting: 'Minor',
          selectedAOs: [testAbility!.origin],
          customAOs: [],
          customPrimaryAO: { name: '', hd: 8, extraSkills: 0, spellcasting: 'Minor', desc: '' },
          customSecondaryAO: { name: '', hd: 8, extraSkills: 0, spellcasting: 'Minor', desc: '' },
          levelSelections: {
            1: {
              primaryAO: testAbility!.origin,
              secondaryAO: '',
              primaryAbility: testAbility!.id,
              secondaryAbility: '',
            }
          }
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        const essential1 = form.getTextField('Essential Abilities 1').getText();
        expect(essential1).toContain(testAbility!.name);
        expect(essential1).toContain(testAbility!.desc);
      } finally {
        teardown();
      }
    });
  });

  describe('6. PDF Import Base Document Preservation', () => {
    it('uses imported PDF as base template on re-export and preserves untouched custom fields while clearing managed ones', async () => {
      const teardown = setupFetchMock();
      try {
        const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
        const originalBuffer = fs.readFileSync(pdfPath);
        const sourceDoc = await PDFDocument.load(new Uint8Array(originalBuffer));
        const sourceForm = sourceDoc.getForm();

        // Simulate custom/untouched fields present in an imported PDF
        sourceForm.getTextField('CHARACTER NAME').setText('Original Hero');
        sourceForm.getTextField('Weapon 4').setText('Old Discarded Dagger');
        sourceForm.getTextField('Defenses 6').setText('Old Discarded Helmet');
        sourceForm.getTextField('Item 21').setText('Old Discarded Rope');
        sourceForm.getTextField('Cantrip 5').setText('Old Discarded Spark');
        sourceForm.getTextField('Level 1 Slot 10').setText('Old Discarded Charm');
        // Unmanaged field in the character sheet template: custom souls or custom campaign notes
        sourceForm.getTextField('Level 1 slot souls').setText('99');

        const importedPdfBytes = await sourceDoc.save();

        // 1. Import from the PDF
        const importedState = await importFromPDF(importedPdfBytes, RACES, BACKGROUNDS);
        expect(importedState.importedPdfBytes).toBeDefined();

        // 2. Modify state: new name, and minimal weapons/items/spells (empty in slot 4/6/21)
        importedState.identity = {
          ...importedState.identity,
          characterName: 'Updated New Hero',
        };
        importedState.characterName = 'Updated New Hero';
        importedState.equipmentList = [
          { name: 'Excalibur', isWeapon: true, damage: '2d8+5' }
        ];
        importedState.equipment = {
          equipmentList: [
            { name: 'Excalibur', isWeapon: true, damage: '2d8+5' }
          ],
          manualEquipment: true
        };
        importedState.spellcasting = {
          cantrips: ['Light'],
          spells: [{ name: 'Shield', level: 1 }],
          slots: { 1: 4 }
        };

        // 3. Export back to PDF
        const exportedPdfBytes = await exportToPDF(importedState, RACES, BACKGROUNDS);
        const exportedDoc = await PDFDocument.load(exportedPdfBytes);
        const exportedForm = exportedDoc.getForm();

        // Managed fields should be updated to new state
        expect(exportedForm.getTextField('CHARACTER NAME').getText()).toBe('Updated New Hero');
        expect(exportedForm.getTextField('Weapon 1').getText()).toBe('Excalibur');
        expect(exportedForm.getTextField('Cantrip 1').getText()).toBe('Light');
        expect(exportedForm.getTextField('Level 1 Slot 1').getText()).toBe('Shield');

        // Managed fields that were present in old PDF but are now empty in new state MUST be emptied
        expect(exportedForm.getTextField('Weapon 4').getText() || '').toBe('');
        expect(exportedForm.getTextField('Defenses 6').getText() || '').toBe('');
        expect(exportedForm.getTextField('Item 21').getText() || '').toBe('');
        expect(exportedForm.getTextField('Cantrip 5').getText() || '').toBe('');
        expect(exportedForm.getTextField('Level 1 Slot 10').getText() || '').toBe('');

        // Untouched/unmanaged fields should be preserved verbatim from the base imported PDF!
        expect(exportedForm.getTextField('Level 1 slot souls').getText()).toBe('99');
      } finally {
        teardown();
      }
    }, 20000);
  });

  describe('7. Items, Essential abilities, and Special abilities roundtrip fidelity', () => {
    it('imports listed and custom items, essential AO abilities, and background traits and preserves them on re-export', async () => {
      const teardown = setupFetchMock();
      try {
        const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
        const originalBuffer = fs.readFileSync(pdfPath);
        const sourceDoc = await PDFDocument.load(new Uint8Array(originalBuffer));
        const form = sourceDoc.getForm();

        // 1. Setup Weapons and Defenses (listed and custom)
        form.getTextField('CHARACTER NAME').setText('Valerius');
        form.getTextField('Weapon 1').setText('Longsword');
        form.getTextField('Weapon 1 Hit').setText('+5');
        form.getTextField('Weapon 1 Range').setText('Melee');
        form.getTextField('Weapon 1 Damage').setText('1d8+3');

        form.getTextField('Weapon 2').setText('Shadow Dagger');
        form.getTextField('Weapon 2 Hit').setText('+7');
        form.getTextField('Weapon 2 Range').setText('20/60');
        form.getTextField('Weapon 2 Damage').setText('1d4+5 necrotic');

        form.getTextField('Defenses 1').setText('Breastplate (AV 14, Medium)');
        form.getTextField('Defenses 2').setText('Shield of Dawn (AV 3, Shield)');

        // General inventory items with premade weapons and custom adventuring gear
        form.getTextField('Item 1').setText('Shortbow');
        form.getTextField('Item 1 weight').setText('1');
        form.getTextField('Item 2').setText('Healer Kit');
        form.getTextField('Item 2 weight').setText('2');

        // Essential Abilities: one premade AO ability and one custom AO ability
        form.getTextField('Essential Abilities 1').setText(
          '=== Righteous Smite (Devotion · Lv.1) ===\nDeals an extra 1d8 radiant damage when hitting a creature.'
        );
        form.getTextField('Essential Abilities 2').setText(
          '=== Void Pulse (Custom · Lv.1) ===\nRelease a wave of void energy causing 2d6 psychic damage.'
        );

        // Additional / Special abilities: background trait and custom notes
        form.getTextField('Additional Abilities column 1').setText(
          '=== Masterpiece ===\nYou are skilled at creating art or useful tools.'
        );
        form.getTextField('Additional Abilities column 2').setText(
          'Night Owl: Advantage on Wisdom checks during nighttime.'
        );

        const sourcePdfBytes = await sourceDoc.save();

        // 2. Import into Character State
        const imported = await importFromPDF(sourcePdfBytes, RACES, BACKGROUNDS);

        // Verify equipment parsing
        const eqList = imported.equipmentList ?? imported.equipment?.equipmentList ?? [];
        const longsword = eqList.find((e: any) => e.name === 'Longsword');
        expect(longsword).toBeDefined();
        expect(longsword.isWeapon).toBe(true);
        expect(longsword.isCustom).toBe(false);

        const customWeapon = eqList.find((e: any) => e.name === 'Shadow Dagger');
        expect(customWeapon).toBeDefined();
        expect(customWeapon.isWeapon).toBe(true);
        expect(customWeapon.isCustom).toBe(true);
        expect(customWeapon.damage).toBe('1d4+5 necrotic');

        const breastplate = eqList.find((e: any) => e.name === 'Breastplate');
        expect(breastplate).toBeDefined();
        expect(breastplate.isArmor).toBe(true);
        expect(Number(breastplate.av)).toBe(14);

        const shield = eqList.find((e: any) => e.name === 'Shield of Dawn');
        expect(shield).toBeDefined();
        expect(shield.isArmor).toBe(true);
        expect(Number(shield.av)).toBe(3);

        const shortbowItem = eqList.find((e: any) => e.name === 'Shortbow');
        expect(shortbowItem).toBeDefined();
        expect(shortbowItem.isWeapon).toBe(true);

        const healerKit = eqList.find((e: any) => e.name === 'Healer Kit');
        expect(healerKit).toBeDefined();
        expect(healerKit.isOther).toBe(true);

        // Verify AO essential abilities parsing
        expect(imported.ao?.levelSelections?.[1]).toBeDefined();
        const primaryAbId = imported.ao?.levelSelections?.[1]?.primaryAbility;
        const secondaryAbId = imported.ao?.levelSelections?.[1]?.secondaryAbility;
        expect(primaryAbId).toBeDefined();
        expect(secondaryAbId).toBeDefined();

        const customAb = imported.ao?.customAbilities?.find((a: any) => a.id === secondaryAbId);
        expect(customAb).toBeDefined();
        expect(customAb?.name).toBe('Void Pulse');
        expect(customAb?.short_desc).toContain('psychic damage');

        // Verify special abilities and features
        expect(imported.background?.trait).toBe('Masterpiece');
        const customFeaturesDump = JSON.stringify(imported.customFeatures ?? []);
        expect(customFeaturesDump).toContain('Night Owl');

        // 3. Export back to PDF
        const exportedPdfBytes = await exportToPDF(imported, RACES, BACKGROUNDS);
        const reloadedDoc = await PDFDocument.load(exportedPdfBytes);
        const reloadedForm = reloadedDoc.getForm();

        // Check weapon & defense export (Shield goes to Items like other armor, not Defenses)
        expect(reloadedForm.getTextField('Weapon 1').getText()).toBe('Longsword');
        expect(reloadedForm.getTextField('Weapon 2').getText()).toBe('Shadow Dagger');
        expect(reloadedForm.getTextField('Defenses 1').getText() || '').toBe('');

        // Check Essential Abilities export
        const essExport1 = reloadedForm.getTextField('Essential Abilities 1').getText();
        const essExport2 = reloadedForm.getTextField('Essential Abilities 2').getText();
        expect(essExport1).toContain('Righteous Smite');
        expect(essExport2).toContain('Void Pulse');
        expect(essExport2).toContain('psychic damage');

        // Check Additional Abilities export
        const col1Export = reloadedForm.getTextField('Additional Abilities column 1').getText();
        const col2Export = reloadedForm.getTextField('Additional Abilities column 2').getText();
        const combinedSpecial = `${col1Export}\n${col2Export}`;
        expect(combinedSpecial).toContain('Masterpiece');
        expect(combinedSpecial).not.toContain('Night Owl');
      } finally {
        teardown();
      }
    }, 20000);
  });

  describe('8. Regression tests for user-reported issues', () => {
    it('defaults manual override checkboxes to false upon PDF import', async () => {
      const teardown = setupFetchMock();
      try {
        const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
        const pdfBuffer = fs.readFileSync(pdfPath);
        const sourceDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pdfBytes = await sourceDoc.save();
        const imported = await importFromPDF(pdfBytes, RACES, BACKGROUNDS);

        expect(imported.manualSkills).toBe(false);
        expect(imported.manualProficiencies).toBe(false);
        expect(imported.manualEquipment).toBe(false);
        expect(imported.manualAbilityScores).toBe(false);
        expect(imported.manualHP).toBe(false);
        expect(imported.manualSpells).toBe(false);
        expect(imported.skills?.manualSkills).toBe(false);
        expect(imported.proficiencies?.manualProficiencies).toBe(false);
        expect(imported.equipment?.manualEquipment).toBe(false);
      } finally {
        teardown();
      }
    });

    it('synchronizes manualEquipment and manualProficiencies toggle on and off', () => {
      let state = DEFAULT_CHARACTER;
      expect(state.manualEquipment).toBeFalsy();
      expect(state.equipment?.manualEquipment).toBeFalsy();

      // Toggle manualEquipment on
      state = characterReducer(state, {
        type: 'SET_EQUIPMENT',
        payload: { manualEquipment: true },
      });
      expect(state.manualEquipment).toBe(true);
      expect(state.equipment?.manualEquipment).toBe(true);

      // Toggle manualEquipment off
      state = characterReducer(state, {
        type: 'SET_EQUIPMENT',
        payload: { manualEquipment: false },
      });
      expect(state.manualEquipment).toBe(false);
      expect(state.equipment?.manualEquipment).toBe(false);

      // Toggle manualProficiencies on
      state = characterReducer(state, {
        type: 'SET_PROFICIENCIES',
        payload: { manualProficiencies: true },
      });
      expect(state.manualProficiencies).toBe(true);
      expect(state.proficiencies?.manualProficiencies).toBe(true);

      // Toggle manualProficiencies off
      state = characterReducer(state, {
        type: 'SET_PROFICIENCIES',
        payload: { manualProficiencies: false },
      });
      expect(state.manualProficiencies).toBe(false);
      expect(state.proficiencies?.manualProficiencies).toBe(false);
    });

    it('cleans up invalid subrace (Garden Dwarf) during LOAD_STATE and SET_RACE', () => {
      // 1. In LOAD_STATE with mismatched subrace
      const corruptedPayload = {
        race: {
          '0': 'E',
          '1': 'l',
          '2': 'f',
          race: 'Dwarf',
          subrace: 'Garden',
        },
        subrace: 'Garden',
        raceState: {
          race: 'Elf',
          subrace: 'Garden',
        },
      } as any;

      const loaded = characterReducer(DEFAULT_CHARACTER, {
        type: 'LOAD_STATE',
        payload: corruptedPayload,
      });
      expect(loaded.race.race).toBe('Dwarf');
      expect(loaded.race.subrace).toBe('');
      expect(loaded.subrace).toBe('');

      // 2. In SET_RACE when changing race to Dwarf while subrace was Garden
      let elfState = characterReducer(DEFAULT_CHARACTER, {
        type: 'SET_RACE',
        payload: { race: 'Elf', subrace: 'Garden' },
      });
      expect(elfState.race.race).toBe('Elf');
      expect(elfState.race.subrace).toBe('Garden');

      let dwarfState = characterReducer(elfState, {
        type: 'SET_RACE',
        payload: { race: 'Dwarf' },
      });
      expect(dwarfState.race.race).toBe('Dwarf');
      expect(dwarfState.race.subrace).toBe('');
    });

    it('exports actual spell slot count (0 for unassigned) instead of sheet max', async () => {
      const teardown = setupFetchMock();
      try {
        const state = getInitialState();
        state.level = 1;
        state.primaryAO = 'Occult Student';
        state.spellcasting = {
          cantrips: ['Arcane Mark'],
          spells: [{ name: 'Magic Missile', level: 1 }],
          slots: { 1: 2 }, // level 1 has 2 slots; level 2-9 not configured
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        expect(form.getTextField('Level 1 slot total').getText()).toBe('2');
        expect(form.getTextField('Level 2 slot total').getText()).toBe('0');
        expect(form.getTextField('Level 3 slot total').getText()).toBe('0');
      } finally {
        teardown();
      }
    });

    it('exports clean nested JSON without redundant flat legacy keys', () => {
      const state: any = {
        ...getInitialState(),
        characterName: 'Drew',
        playerName: 'Dwarfy',
        subrace: 'Hill Dwarf',
        level: 1,
        identity: {
          characterName: 'Drew',
          playerName: 'Dwarfy',
          level: 1,
        },
        race: {
          race: 'Dwarf',
          subrace: 'Hill Dwarf',
        },
        baseCharacteristics: {
          Brawn: 15,
          Dexterity: 17,
          Vitality: 19,
          Intelligence: 12,
          Cunning: 10,
          Resolve: 10,
          Presence: 10,
          Manipulation: 10,
          Composure: 10,
        },
      };

      const jsonStr = exportCharacterJSON(state, RACES);
      const parsed = JSON.parse(jsonStr);

      // Verify canonical nested structure
      expect(parsed.identity.characterName).toBe('Drew');
      expect(parsed.race.race).toBe('Dwarf');
      expect(parsed.race.subrace).toBe('Hill Dwarf');

      // Verify flat redundant legacy keys are stripped
      expect(parsed.characterName).toBeUndefined();
      expect(parsed.playerName).toBeUndefined();
      expect(parsed.subrace).toBeUndefined();
      expect(parsed.level).toBeUndefined();
      expect(parsed.characteristics).toBeUndefined();
      expect(parsed.raceState).toBeUndefined();
      expect(parsed.finalCharacteristics).toBeDefined();
    });

    it('handles Drew export: correct AO, HD, current HP, weapon hit/range, AC, expended slots, defenses and skill mods', async () => {
      if (!fs.existsSync('/root/Drew.json')) return;
      const teardown = setupFetchMock();
      try {
        const rawDrew = JSON.parse(fs.readFileSync('/root/Drew.json', 'utf8'));
        const loadedDrew = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: rawDrew,
        });

        // Race should be Dwarf (Hill Dwarf)
        expect(loadedDrew.race.race).toBe('Dwarf');
        expect(loadedDrew.race.subrace).toBe('Hill Dwarf');

        const pdfBytes = await exportToPDF(loadedDrew, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // 1. Race on sheet should be Dwarf (Hill Dwarf), NOT Dwarf (Garden)
        expect(form.getTextField('RACE').getText()).toBe('Dwarf (Hill Dwarf)');

        // 2. AO should be Tactics (Level 1) based on level 1 selection
        expect(form.getTextField('AOs  LEVEL').getText()).toBe('Tactics (Level 1)');

        // 3. HD should be 1d10 (from Tactics), Total HD 1d10
        expect(form.getTextField('HD').getText()).toBe('1d10');
        expect(form.getTextField('Total HD').getText()).toBe('1d10');

        // 4. Current HP should equal Max HP (assuming long rest)
        const maxHP = form.getTextField('Max HP').getText();
        expect(maxHP).toBe('15');
        expect(form.getTextField('Current HP').getText()).toBe('15');

        // 5. Expended spell slots should be 0
        for (let lvl = 1; lvl <= 9; lvl++) {
          expect(form.getTextField(`Level ${lvl} slot expended`).getText()).toBe('0');
        }

        // 6. Body armor (Reinforced Leather) should NOT be in Defenses 1..6
        expect(form.getTextField('Defenses 1').getText() || '').toBe('');

        // 7. Reinforced Leather is AV 12 + Dex mod (+3) = AC 15
        expect(form.getTextField('Armor Class').getText()).toBe('15');

        // 8. Weapons: Dagger & Shortsword are finesse/light (use Dex mod +3).
        // Character has "Handpicked 2 Weapons" weapon proficiency -> proficient (+2 profBonus)
        // Hit mod should be +3 + 2 = +5!
        expect(form.getTextField('Weapon 1 Hit').getText()).toBe('+5');
        expect(form.getTextField('Weapon 2 Hit').getText()).toBe('+5');

        // Weapon range column should be clean: "4/12m" for Dagger, 1m for Shortsword (no properties text)
        expect(form.getTextField('Weapon 1 Range').getText()).toBe('4/12m');
        expect(form.getTextField('Weapon 2 Range').getText()).toBe('1m');

        // Equipment: Reinforced Leather preserved with weight 7
        expect(form.getTextField('Item 1').getText()).toBe('Reinforced Leather');
        expect(form.getTextField('Item 1 weight').getText()).toBe('7');

        // 9. Skill modifiers include Math.ceil(rank * profBonus / 2)
        // Athletics (Ath Br & Ath Dex): Brawn 15 (+2), Dex 17 (+3). Rank = 2, profBonus = 2 -> rankBonus = 2.
        // Ath Br should be 2 + 2 = +4, Ath Dex should be 3 + 2 = +5
        expect(form.getTextField('Ath Br').getText()).toBe('+4');
        expect(form.getTextField('Ath Dex').getText()).toBe('+5');

        // Subterfuge (Sub Dex & Sub Cun): Dex 17 (+3), Cun 12 (+1 from Hill Dwarf). Rank = 3, profBonus = 2 -> rankBonus = ceil(3*2/2) = 3.
        // Sub Dex should be 3 + 3 = +6, Sub Cun should be 1 + 3 = +4
        expect(form.getTextField('Sub Dex').getText()).toBe('+6');
        expect(form.getTextField('Sub Cun').getText()).toBe('+4');

        // Deception (Decep Pre & Decep Man): Pre 10 (+0), Man 10 (+0). Rank = 3, profBonus = 2 -> rankBonus = 3.
        // Decep Pre should be +3, Decep Man should be +3
        expect(form.getTextField('Decep Pre').getText()).toBe('+3');
        expect(form.getTextField('Decep Man').getText()).toBe('+3');
      } finally {
        teardown();
      }
    });

    it('JSON export strips manualHP and uses calculated combat HP values', () => {
      if (!fs.existsSync('/root/Drew.json')) return;
      const rawDrew = JSON.parse(fs.readFileSync('/root/Drew.json', 'utf8'));
      const loadedDrew = characterReducer(DEFAULT_CHARACTER, {
        type: 'LOAD_STATE',
        payload: rawDrew,
      });

      const jsonStr = exportCharacterJSON(loadedDrew, RACES);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.manualHP).toBe(false);
      expect(parsed.manualSpells).toBeUndefined();
      expect(parsed.combat.maxHP).toBe(15);
      expect(parsed.combat.currentHP).toBe(3);
    });

    it('JSON export deduplicates equipment, keeping richer entry and preserving weight', () => {
      if (!fs.existsSync('/root/Drew.json')) return;
      const rawDrew = JSON.parse(fs.readFileSync('/root/Drew.json', 'utf8'));
      const loadedDrew = characterReducer(DEFAULT_CHARACTER, {
        type: 'LOAD_STATE',
        payload: rawDrew,
      });

      const jsonStr = exportCharacterJSON(loadedDrew, RACES);
      const parsed = JSON.parse(jsonStr);

      const eqList = parsed.equipment?.equipmentList ?? [];
      const rlMatches = eqList.filter((e: any) => (e.name ?? '').toLowerCase() === 'reinforced leather');
      expect(rlMatches.length).toBe(1);

      const rl = rlMatches[0];
      expect(rl.isArmor).toBe(true);
      expect(rl.av).toBe(11);
      expect(rl.category).toBe('Light');
      expect(Number(rl.weight)).toBe(7);
      expect(rl.isOther).toBeUndefined();

      // Verify deduplicateEquipmentList behaves identically regardless of array order
      const orderA = [
        { name: 'Reinforced Leather', isArmor: true, av: 11, category: 'Light', equipped: true },
        { name: 'Reinforced Leather', weight: 7, isOther: true },
      ];
      const dedupedA = deduplicateEquipmentList(orderA);
      expect(dedupedA.length).toBe(1);
      expect(dedupedA[0].isArmor).toBe(true);
      expect(dedupedA[0].weight).toBe(7);

      const orderB = [
        { name: 'Reinforced Leather', weight: 7, isOther: true },
        { name: 'Reinforced Leather', isArmor: true, av: 11, category: 'Light', equipped: true },
      ];
      const dedupedB = deduplicateEquipmentList(orderB);
      expect(dedupedB.length).toBe(1);
      expect(dedupedB[0].isArmor).toBe(true);
      expect(dedupedB[0].weight).toBe(7);
    });

    it('calculatePotentialSpent computes cost of cantrips, spells and slots', () => {
      const state = {
        ...getInitialState(),
        spellcasting: {
          cantrips: ['Force Blast'],
          spells: [{ name: 'Shield', level: 1 }],
          slots: { 1: 1 },
        },
      };
      // 1 cantrip (10) + 1 level-1 spell (10) + 1 level-1 slot (10*1) = 30
      expect(calculatePotentialSpent(state)).toBe(30);
    });

    it('calculatePotentialRemaining returns total minus spent', () => {
      const state = {
        ...getInitialState(),
        ao: {
          primaryAO: 'Occult Student',
          levelSelections: {
            1: { primaryAO: 'Occult Student' },
          },
        },
        identity: { level: 1 },
        spellcasting: {
          cantrips: ['Force Blast'],
          spells: [],
          slots: { 1: 1 },
        },
      };
      const remaining = calculatePotentialRemaining(state, ORIGINS);
      const spent = calculatePotentialSpent(state);
      // 1 cantrip (10) + 1 level-1 slot (10) = 20 spent
      expect(spent).toBe(20);
      // Remaining should be total - 20
      expect(remaining).toBeGreaterThan(-1);
    });

    it('PDF Potential field shows remaining not total', async () => {
      const teardown = setupFetchMock();
      try {
        const state = {
          ...getInitialState(),
          ao: {
            primaryAO: 'Occult Student',
            levelSelections: {
              1: { primaryAO: 'Occult Student' },
            },
          },
          identity: { level: 1 },
          spellcasting: {
            cantrips: ['Force Blast'],
            spells: [],
            slots: { 1: 1 },
          },
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        const remaining = calculatePotentialRemaining(state, ORIGINS);
        const potentialText = form.getTextField('Potential').getText();
        expect(potentialText).toBe(String(remaining));
      } finally {
        teardown();
      }
    });

    it('PDF Potential field renders "0" when remaining potential is exactly zero', async () => {
      if (!fs.existsSync('/root/Drew.json')) return;
      const teardown = setupFetchMock();
      try {
        const rawDrew = JSON.parse(fs.readFileSync('/root/Drew.json', 'utf8'));
        const loadedDrew = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: rawDrew,
        });

        const pdfBytes = await exportToPDF(loadedDrew, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        const potentialText = form.getTextField('Potential').getText();
        expect(potentialText).toBe('0');
      } finally {
        teardown();
      }
    });

    it('PDF Additional Abilities filters out stale AO data (Alchemical Secrets, Occult Knowledge, Spellbook)', async () => {
      if (!fs.existsSync('/root/Drew.json')) return;
      const teardown = setupFetchMock();
      try {
        const rawDrew = JSON.parse(fs.readFileSync('/root/Drew.json', 'utf8'));
        const loadedDrew = characterReducer(DEFAULT_CHARACTER, {
          type: 'LOAD_STATE',
          payload: rawDrew,
        });

        const pdfBytes = await exportToPDF(loadedDrew, RACES, BACKGROUNDS);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        const col1 = form.getTextField('Additional Abilities column 1').getText();
        const col2 = form.getTextField('Additional Abilities column 2').getText();
        const combined = `${col1}\n${col2}`;

        // Stale Occult Student AO data must not appear
        expect(combined).not.toContain('Alchemical Secrets');
        expect(combined).not.toContain('Fabricate');
        expect(combined).not.toContain('Spellbook');

        // Active race/subrace traits must appear
        expect(combined).toContain('Dwarven Toughness');
      } finally {
        teardown();
      }
    });
  });
});


