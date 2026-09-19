import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PDFDocument } from 'pdf-lib';
import { importFromPDF } from '../src/logic/pdfImport';
import { exportToPDF } from '../src/logic/pdf';
import { getInitialState, getFinalCharacteristics, computeSkillPointsSummary, calculateSpentAccomplishmentPoints } from '../src/logic/state';
import { getGlobalAPSummary } from '../src/utils/stateSanitizer';
import { RACES } from '../src/data/races';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { CharacterProvider, useCharacter } from '../src/contexts/CharacterContext';
import RaceSelector from '../src/components/RaceSelector';
import BackgroundSelector from '../src/components/BackgroundSelector';
import { characterReducer, DEFAULT_CHARACTER } from '../src/types/Character';
import { DEFAULT_RACE_STATE } from '../src/types/Race';

function setupFetchMock() {
  const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);

  /*
   * Workaround: Vitest runs in Node.js without an active Vite HTTP server.
   * exportToPDF invokes global fetch to load the template PDF from the public directory.
   */
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

describe('PDF Import: importFromPDF', () => {
  it('parses an exported character PDF into a valid character state', async () => {
    const teardown = setupFetchMock();
    try {
      const state = getInitialState();
      state.characterName = 'Aeloria Silverleaf';
      state.playerName = 'Alice';
      state.race = 'Elf';
      state.subrace = 'High Elf';
      state.background = 'Scholar';
      state.primaryAO = 'Occult Student';
      state.level = 2;

      state.baseCharacteristics = {
        Brawn: 10,
        Dexterity: 14,
        Vitality: 12,
        Intelligence: 16,
        Cunning: 12,
        Resolve: 10,
        Presence: 10,
        Manipulation: 10,
        Composure: 10
      };

      state.savingThrowsProficient = {
        Brawn: false,
        Dexterity: false,
        Vitality: false,
        Intelligence: true,
        Cunning: false,
        Resolve: true,
        Presence: false,
        Manipulation: false,
        Composure: false
      };

      state.skillRanks = {
        Perception: 2,
        Athletics: 1
      };

      state.equipmentList = [
        { name: 'Dagger', isWeapon: true, hit: '+4', range: '20/60', damage: '1d4+2', equipped: true },
        { name: 'Leather Armor', isArmor: true, baseAC: 11, category: 'Light', addsDexMod: true, equipped: true },
        { name: 'Spellbook', weight: 3 }
      ];

      state.spellcasting = {
        cantrips: ['Light', 'Mage Hand'],
        spells: [
          { name: 'Magic Missile', level: 1 }
        ],
        slots: { 1: 10, 2: 9, 3: 8, 4: 11, 5: 7, 6: 5, 7: 6, 8: 6, 9: 6 }
      };

      state.goldAmount = 25;

      const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
      const imported = await importFromPDF(pdfBytes, RACES, BACKGROUNDS);

      expect(imported).toBeDefined();
      expect(imported.characterName).toBe('Aeloria Silverleaf');
      expect(imported.playerName).toBe('Alice');
      expect(imported.race.race).toBe('Elf');
      expect(imported.race.subrace).toBe('High Elf');
      expect(imported.raceState?.race).toBe('Elf');
      expect(imported.raceState?.subrace).toBe('High Elf');
      expect(imported.subrace).toBe('High Elf');
      expect(imported.background.name).toBe('Scholar');
      expect(imported.level).toBe(2);

      const intScore = imported.characteristics?.Intelligence ?? imported.baseCharacteristics?.Intelligence;
      expect(intScore).toBe(16);

      expect(imported.savingThrowsProficient?.Intelligence).toBe(true);
      expect(imported.savingThrowsProficient?.Resolve).toBe(true);
      expect(imported.savingThrowsProficient?.Brawn).toBe(false);

      expect(imported.skillRanks?.Perception).toBe(2);
      expect(imported.skillRanks?.Athletics).toBe(1);

      const weapon = (imported.equipmentList ?? imported.equipment?.equipmentList ?? []).find(
        (i: any) => i.name === 'Dagger'
      );
      expect(weapon).toBeDefined();
      expect(weapon.hit).toBe('+4');
      expect(weapon.damage).toBe('1d4+2');

      const armor = (imported.equipmentList ?? imported.equipment?.equipmentList ?? []).find(
        (i: any) => i.name === 'Leather Armor'
      );
      expect(armor).toBeDefined();

      const item = (imported.equipmentList ?? imported.equipment?.equipmentList ?? []).find(
        (i: any) => i.name === 'Spellbook'
      );
      expect(item).toBeDefined();

      expect(imported.goldAmount ?? imported.proficiencies?.goldAmount).toBe(25);

      expect(imported.spellcasting?.cantrips).toContain('Light');
      expect(imported.spellcasting?.cantrips).toContain('Mage Hand');
      expect(
        imported.spellcasting?.spells?.some((s: any) => s.name === 'Magic Missile' && s.level === 1)
      ).toBe(true);
    } finally {
      teardown();
    }
  });

  it('accepts and preserves actual-play modifications as current truth', async () => {
    const teardown = setupFetchMock();
    try {
      const state = getInitialState();
      state.characterName = 'Thorin';
      state.race = 'Dwarf';
      state.subrace = 'Mountain Dwarf';
      state.background = 'Scholar';
      state.primaryAO = 'Discipline';
      state.level = 3;

      const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);

      /*
       * Simulate manual PDF edits performed by a player or GM during a live session.
       * The parser must prioritize sheet form fields over defaults or recomputed constants.
       */
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      form.getTextField('Current HP').setText('7');
      form.getTextField('Max HP').setText('28');
      form.getTextField('Initiative').setText('+3');
      form.getTextField('Total HD').setText('3d8');
      form.getTextField('Potential').setText('80');
      form.getTextField('AOs  LEVEL').setText('Discipline / Devotion (Level 3)');

      form.getTextField('Defenses 1').setText('Reinforced Breastplate (AV 15, Medium)');
      form.getTextField('Defenses 2').setText('Shield of the North (AV 3, Shield)');

      form.getTextField('Attuned Item').setText('Ring of Protection');

      form.getTextField('Gold Pieces').setText('175');
      form.getTextField('Silver Pieces').setText('60');
      form.getTextField('Copper Pieces').setText('95');

      form.getTextField('Weapon 1').setText('Battleaxe');
      form.getTextField('Weapon 1 Hit').setText('+6');
      form.getTextField('Weapon 1 Range').setText('Melee');
      form.getTextField('Weapon 1 Damage').setText('1d8+4');

      form.getTextField('Weapon 2').setText('Heavy Crossbow');
      form.getTextField('Weapon 2 Hit').setText('+3');
      form.getTextField('Weapon 2 Range').setText('100/400');
      form.getTextField('Weapon 2 Damage').setText('1d10+1');

      form.getTextField('Cantrip 1').setText('Light');
      form.getTextField('Cantrip 2').setText('Guidance');
      form.getTextField('Level 1 Slot 1').setText('Cure Wounds');
      form.getTextField('Level 1 Slot 2').setText('Sanctuary');
      form.getTextField('Level 1 slot souls').setText('2');
      form.getTextField('Level 2 Slot 1').setText('Prayer of Healing');
      form.getTextField('Level 2 Slot 2').setText('Spiritual Weapon');

      form.getTextField('Essential Abilities 1').setText(
        '=== Frost Aegis (Custom · Lv.1) ===\nAbsorb 5 cold damage per turn.'
      );
      form.getTextField('Additional Abilities column 1').setText(
        'Runic Sight: Detect magical runes within 30 ft.'
      );

      form.getCheckBox('Ath 1').check();
      form.getCheckBox('Ath 2').check();
      form.getCheckBox('Ath 3').check();

      form.getCheckBox('Perc 1').check();
      form.getCheckBox('Perc 2').check();
      form.getCheckBox('Perc 3').check();
      form.getCheckBox('Perc 4').check();

      form.getCheckBox('Stealth 1').check();

      const modifiedPdfBytes = await pdfDoc.save();
      const imported = await importFromPDF(modifiedPdfBytes, RACES, BACKGROUNDS);

      const parsedCurrentHP = imported.currentHP ?? imported.hp?.current;
      const parsedMaxHP = imported.maxHP ?? imported.hp?.max;
      expect(parsedCurrentHP).toBe(7);
      expect(parsedMaxHP).toBe(28);

      const eqList = imported.equipmentList ?? imported.equipment?.equipmentList ?? [];
      const armor = eqList.find((e: any) => e.name === 'Reinforced Breastplate');
      expect(armor).toBeDefined();
      expect(Number(armor.av ?? armor.baseAC)).toBe(15);

      const shield = eqList.find((e: any) => e.name === 'Shield of the North');
      expect(shield).toBeDefined();
      expect(Number(shield.av ?? shield.baseAC)).toBe(3);

      expect(imported.goldAmount ?? imported.proficiencies?.goldAmount ?? imported.currency?.gold).toBe(175);
      expect(imported.silverAmount ?? imported.proficiencies?.silverAmount ?? imported.currency?.silver).toBe(60);
      expect(imported.copperAmount ?? imported.proficiencies?.copperAmount ?? imported.currency?.copper).toBe(95);

      const axe = eqList.find((e: any) => e.name === 'Battleaxe');
      expect(axe).toBeDefined();
      expect(axe.hit).toBe('+6');
      expect(axe.damage).toBe('1d8+4');

      const crossbow = eqList.find((e: any) => e.name === 'Heavy Crossbow');
      expect(crossbow).toBeDefined();
      expect(crossbow.hit).toBe('+3');
      expect(crossbow.range).toBe('100/400');
      expect(crossbow.damage).toBe('1d10+1');

      const ring = eqList.find((e: any) => e.name === 'Ring of Protection');
      expect(ring).toBeDefined();
      expect(ring.attuned).toBe(true);

      const spells = imported.spellcasting?.spells ?? [];
      expect(spells.some((s: any) => s.name === 'Cure Wounds' && s.level === 1)).toBe(true);
      expect(spells.some((s: any) => s.name === 'Sanctuary' && s.level === 1)).toBe(true);
      expect(spells.some((s: any) => s.name === 'Prayer of Healing' && s.level === 2)).toBe(true);
      expect(spells.some((s: any) => s.name === 'Spiritual Weapon' && s.level === 2)).toBe(true);

      expect(imported.spellcasting?.souls?.[1]).toBe(2);
      expect(imported.potentialGained).toBe(80);

      expect(imported.combat?.initiativeBonus).toBe(3);
      expect(imported.combat?.totalHD).toBe('3d8');

      expect(imported.ao?.selectedAOs).toContain('Discipline');
      expect(imported.ao?.selectedAOs).toContain('Devotion');

      const customAbilityDump = JSON.stringify(
        imported.ao?.customAbilities ?? imported.customAbilities ?? []
      );
      expect(customAbilityDump).toContain('Frost Aegis');
      expect(customAbilityDump).toContain('Runic Sight');

      expect(imported.skillRanks?.Athletics).toBe(3);
      expect(imported.skillRanks?.Perception).toBe(4);
      expect(imported.skillRanks?.Stealth).toBe(1);
    } finally {
      teardown();
    }
  });

  describe('1. Race and Subrace', () => {
    it('sets race object with DEFAULT_RACE_STATE and retains raceState on import', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();
      form.getTextField('RACE').setText('Dwarf (Mountain Dwarf)');
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      expect(imported.race).toEqual({
        ...DEFAULT_RACE_STATE,
        race: 'Dwarf',
        subrace: 'Mountain Dwarf',
      });
      expect(imported.raceState).toEqual({
        race: 'Dwarf',
        subrace: 'Mountain Dwarf',
      });
      expect(imported.subrace).toBe('Mountain Dwarf');
    });

    it('RaceSelector handles string or object race defensively', () => {
      render(
        React.createElement(
          CharacterProvider,
          { initialState: { race: 'Dwarf' as any, subrace: 'Hill Dwarf' as any } },
          React.createElement(RaceSelector)
        )
      );

      const dwarfCard = screen.getByText('Dwarf');
      expect(dwarfCard.parentElement).toHaveClass('selected');
      expect(screen.getByText('Hill Dwarf')).toBeInTheDocument();
    });

    it('CharacterProvider normalizes initialState via characterReducer LOAD_STATE', () => {
      const StateConsumer: React.FC = () => {
        const { state } = useCharacter();
        return React.createElement(
          'div',
          null,
          React.createElement('span', { 'data-testid': 'race-name' }, state.race.race),
          React.createElement('span', { 'data-testid': 'subrace-name' }, state.race.subrace)
        );
      };

      render(
        React.createElement(
          CharacterProvider,
          { initialState: { race: 'Elf' as any, subrace: 'High Elf' as any } },
          React.createElement(StateConsumer)
        )
      );

      expect(screen.getByTestId('race-name')).toHaveTextContent('Elf');
      expect(screen.getByTestId('subrace-name')).toHaveTextContent('High Elf');
    });
  });

  describe('2. Background Details', () => {
    it('resolves background against backgroundsData on import', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();
      form.getTextField('BACKGROUND').setText('Scholar');
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      expect(imported.background.name).toBe('Scholar');
      expect(imported.background.gold).toBe(10);
      expect(imported.background.trait).toBe('Researcher');
      expect(imported.background.freeSkillPoints).toBe(4);
    });

    it('BackgroundSelector renders details pane when state.background is a string', () => {
      render(
        React.createElement(
          CharacterProvider,
          { initialState: { background: 'Scholar' as any } },
          React.createElement(BackgroundSelector)
        )
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Scholar' })).toBeInTheDocument();
      expect(screen.getByText(/Researcher/)).toBeInTheDocument();
    });

    it('BackgroundSelector renders details pane when state.background is an object without name', () => {
      render(
        React.createElement(
          CharacterProvider,
          { initialState: { background: { trait: 'Ear to the Ground' } as any } },
          React.createElement(BackgroundSelector)
        )
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Bounty Hunter' })).toBeInTheDocument();
      expect(screen.getByText(/Ear to the Ground/)).toBeInTheDocument();
    });
  });

  describe('3. Vitality and Cunning (Ability Scores)', () => {
    it('subtracts racial bonuses so baseCharacteristics + racialBonuses = finalCharacteristics', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();

      /* Mountain Dwarf: +2 Vitality from base Dwarf, +2 Brawn from Mountain Dwarf subrace */
      form.getTextField('RACE').setText('Dwarf (Mountain Dwarf)');
      form.getTextField('Brawn Ability Score').setText('16');
      form.getTextField('Vitality Ability Score').setText('14');
      form.getTextField('Cunning Ability Score').setText('10');
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      expect(imported.baseCharacteristics.Brawn).toBe(14);
      expect(imported.baseCharacteristics.Vitality).toBe(12);
      expect(imported.baseCharacteristics.Cunning).toBe(10);

      expect(imported.characteristics.Brawn).toBe(16);
      expect(imported.characteristics.Vitality).toBe(14);
      expect(imported.finalCharacteristics.Brawn).toBe(16);
      expect(imported.finalCharacteristics.Vitality).toBe(14);

      const calculatedFinal = getFinalCharacteristics(imported, RACES);
      expect(calculatedFinal.Brawn).toBe(16);
      expect(calculatedFinal.Vitality).toBe(14);
      expect(calculatedFinal.Cunning).toBe(10);
    });
  });

  describe('4. Hit Points Maximum', () => {
    it('sets manualHP: true and preserves maxHP and currentHP when maxHPText is present', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();
      form.getTextField('Max HP').setText('34');
      form.getTextField('Current HP').setText('22');
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      expect(imported.manualHP).toBe(true);
      expect(imported.maxHP).toBe(34);
      expect(imported.currentHP).toBe(22);
      expect(imported.combat?.maxHP).toBe(34);
      expect(imported.combat?.currentHP).toBe(22);
    });

    it('characterReducer LOAD_STATE preserves manualHP from action payload', () => {
      const loaded = characterReducer(DEFAULT_CHARACTER, {
        type: 'LOAD_STATE',
        payload: {
          manualHP: true,
          maxHP: 34,
          currentHP: 22,
        } as any,
      });

      expect(loaded.manualHP).toBe(true);
      expect(loaded.maxHP).toBe(34);
      expect(loaded.currentHP).toBe(22);
    });
  });

  describe('5. AO Abilities parser', () => {
    it('matches premade abilities, assigns level selections, and sets primaryAO/secondaryAO', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();

      form.getTextField('Essential Abilities 1').setText(
        '=== Turn Undead (Devotion · Lv.1) ===\nChannel divinity to turn undead creatures.'
      );
      form.getTextField('Essential Abilities 2').setText(
        '=== Righteous Smite (Devotion · Lv.1) ===\nDeals extra radiant damage on hit.'
      );
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      expect(imported.primaryAO).toBe('Devotion');
      expect(imported.ao?.selectedAOs).toContain('Devotion');
      expect(imported.ao?.levelSelections?.[1]?.primaryAbility).toContain('turn-undead');
      expect(imported.ao?.levelSelections?.[1]?.secondaryAbility).toContain('righteous-smite');
    });

    it('creates custom ability matching available slot and registers in customAbilities', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();

      form.getTextField('Essential Abilities 1').setText(
        '=== Mystic Ward (Custom · Lv.1) ===\nAbsorbs 10 magical damage.'
      );
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      const customAb = imported.ao?.customAbilities?.find((a) => a.name === 'Mystic Ward');
      expect(customAb).toBeDefined();
      expect(customAb?.selection).toBe('Primary');
      expect(imported.ao?.levelSelections?.[1]?.primaryAbility).toBe(customAb?.id);
      expect(imported.ao?.selectedAOs).toContain('Custom');
    });
  });

  describe('6. Custom Features / Notes', () => {
    it('does NOT push race traits, background traits, or AO abilities to customFeatures', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();

      form.getTextField('Essential Abilities 1').setText(
        '=== Turn Undead (Devotion · Lv.1) ===\nChannel divinity.'
      );
      form.getTextField('Additional Abilities column 1').setText(
        '=== Darkvision ===\nYou see in the dark.\n\n=== Researcher ===\nYou possess academic knowledge.'
      );
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      const featuresDump = JSON.stringify(imported.customFeatures ?? []);
      expect(featuresDump).not.toContain('Darkvision');
      expect(featuresDump).not.toContain('Researcher');
      expect(featuresDump).not.toContain('Turn Undead');
    });

    it('pushes truly miscellaneous notes to customFeatures', async () => {
      const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const doc = await PDFDocument.load(new Uint8Array(fs.readFileSync(pdfPath)));
      const form = doc.getForm();

      form.getTextField('Additional Abilities column 2').setText(
        '=== Campaign Notes ===\nRecovered the sacred talisman from the cavern depths.'
      );
      const bytes = await doc.save();

      const imported = await importFromPDF(bytes, RACES, BACKGROUNDS);

      const featuresDump = JSON.stringify(imported.customFeatures ?? []);
      expect(featuresDump).toContain('Recovered the sacred talisman');
    });
  });

  describe('7. Hidden Metadata for Accomplishment Points & Free Skill Points', () => {
    it('embeds hidden metadata invisibly in PDF document properties during export and recovers on import', async () => {
      const teardown = setupFetchMock();
      try {
        const state = getInitialState();
        state.characterName = 'Hidden Meta Hero';
        state.race = 'Dwarf';
        state.subrace = 'Hill Dwarf';
        state.background = 'Cultist';
        state.primaryAO = 'Tactics';
        state.level = 1;
        state.skillRanks = {
          Occult: 1,
          Deception: 1,
          Religion: 1,
          Subterfuge: 2,
          Athletics: 2,
        };

        const exportedBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const doc = await PDFDocument.load(exportedBytes);

        /*
         * Verify metadata is embedded in document information dictionary (Subject & Keywords)
         * and invisible across form text fields.
         */
        const subject = doc.getSubject();
        expect(subject).toBeDefined();
        expect(subject).toContain('FrostmarkMetadata:');

        const form = doc.getForm();
        const allFieldTexts = form.getFields().map((f: any) => {
          try {
            return f.getText ? f.getText() : '';
          } catch {
            return '';
          }
        }).join(' ');
        expect(allFieldTexts).not.toContain('FrostmarkMetadata');

        /*
         * Import the PDF and verify accurate recovery of accomplishment points and skill pools.
         */
        const imported = await importFromPDF(exportedBytes, RACES, BACKGROUNDS);
        expect(imported.importedMetadata).toBeDefined();
        expect(typeof imported.accomplishmentPointsRemaining).toBe('number');
        expect(typeof imported.freeSkillPointsRemaining).toBe('number');

        /*
         * getGlobalAPSummary must match the preserved accomplishment points.
         */
        const apSummary = getGlobalAPSummary(imported);
        expect(apSummary.apRemaining).toBe(imported.accomplishmentPointsRemaining);
      } finally {
        teardown();
      }
    });

    it('calculates Option A skill allocation correctly: background absorbs restricted skills, AO absorbs next, remainder takes AP', () => {
      /*
       * Test Option A allocation:
       * Cultist has 4 free skill points restricted to Occult, Deception, Subterfuge, Religion.
       * 4 points spent on restricted skills (Occult rank 1, Deception rank 1, Subterfuge rank 1, Religion rank 1) absorbs 4 bgFree points.
       * 6 points spent on Subterfuge rank 3 (cumulative 6 points: 1 used by bg, 5 remaining) + Athletics rank 1 (1 point) = 6 points.
       * 4 AO free points absorb 4 points, leaving exactly 2 points paid by Accomplishment Points.
       */
      const state = {
        ...getInitialState(),
        background: 'Cultist',
        ao: {
          primaryAO: 'Tactics',
        },
        skillRanks: {
          Occult: 1,      // 1 point (Cultist restricted)
          Deception: 1,   // 1 point (Cultist restricted)
          Religion: 1,    // 1 point (Cultist restricted)
          Subterfuge: 4,  // 6 cumulative points (1 point Cultist restricted, 5 points unrestricted/AO/AP)
          Athletics: 1,   // 1 point (unrestricted/AO/AP)
        },
      };

      const summary = computeSkillPointsSummary(state, BACKGROUNDS);
      expect(summary.bgFree).toBe(4);
      expect(summary.aoFree).toBe(4);
      expect(summary.bgSpent).toBe(4);
      expect(summary.bgFreeRemaining).toBe(0);

      expect(summary.aoSpent).toBe(4);
      expect(summary.aoFreeRemaining).toBe(0);

      const apSpent = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
      expect(apSpent.skillsSpent).toBe(2);
      expect(apSpent.totalSpent).toBe(2);
    });
  });

  describe('8. Gold, Appearance, and Features export/import refinements', () => {
    it('exports remaining gold for fresh character and preserves stored gold for imported character', async () => {
      const teardown = setupFetchMock();
      try {
        const freshState = {
          ...getInitialState(),
          proficiencies: {
            ...getInitialState().proficiencies,
            goldAmount: 20,
          },
          equipmentList: [
            { name: 'Shortsword', cost: '10 gp', quantity: 1 },
            { name: 'Dagger', cost: '2 gp', quantity: 2 },
          ],
        };

        const freshPdfBytes = await exportToPDF(freshState, RACES, BACKGROUNDS);
        const freshDoc = await PDFDocument.load(freshPdfBytes);
        const freshForm = freshDoc.getForm();
        expect(freshForm.getTextField('Gold Pieces').getText()).toBe('6');

        const importedState = {
          ...freshState,
          isImported: true,
          proficiencies: {
            ...freshState.proficiencies,
            goldAmount: 14,
          },
        };

        const importedPdfBytes = await exportToPDF(importedState, RACES, BACKGROUNDS);
        const importedDoc = await PDFDocument.load(importedPdfBytes);
        const importedForm = importedDoc.getForm();
        expect(importedForm.getTextField('Gold Pieces').getText()).toBe('14');
      } finally {
        teardown();
      }
    });

    it('exports and roundtrips appearance description and notes accurately', async () => {
      const teardown = setupFetchMock();
      try {
        const state = {
          ...getInitialState(),
          identity: {
            ...getInitialState().identity,
            appearance: {
              age: '30',
              height: '180 cm',
              weight: '80 kg',
              description: 'Tall warrior with scarred cheek and silver braided hair.',
            },
          },
        };

        const exportedBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const doc = await PDFDocument.load(exportedBytes);
        const form = doc.getForm();
        expect(form.getTextField('Appearance Additional').getText()).toBe('Tall warrior with scarred cheek and silver braided hair.');

        const imported = await importFromPDF(exportedBytes, RACES, BACKGROUNDS);
        expect(imported.identity.appearance.description).toBe('Tall warrior with scarred cheek and silver braided hair.');
        expect(imported.identity.appearance.notes).toBe('Tall warrior with scarred cheek and silver braided hair.');
      } finally {
        teardown();
      }
    });

    it('does not include custom notes in PDF additional features', async () => {
      const teardown = setupFetchMock();
      try {
        const state = {
          ...getInitialState(),
          customFeatures: ['Hidden Secret Note: Carries strange amulet.'],
        };

        const exportedBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const doc = await PDFDocument.load(exportedBytes);
        const form = doc.getForm();
        const col1 = form.getTextField('Additional Abilities column 1').getText() || '';
        const col2 = form.getTextField('Additional Abilities column 2').getText() || '';
        expect(col1).not.toContain('Hidden Secret Note');
        expect(col2).not.toContain('Hidden Secret Note');
      } finally {
        teardown();
      }
    });
  });
});
