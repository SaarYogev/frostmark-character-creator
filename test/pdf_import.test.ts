import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { importFromPDF } from '../src/logic/pdfImport';
import { exportToPDF } from '../src/logic/pdf';
import { getInitialState } from '../src/logic/state';
import { RACES } from '../src/data/races';
import { BACKGROUNDS } from '../src/data/backgrounds';

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
      expect(imported.race).toBe('Elf');
      expect(imported.subrace).toBe('High Elf');
      expect(imported.background).toBe('Scholar');
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
        imported.customFeatures ?? imported.abilities ?? imported.additionalAbilities ?? []
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
});
