import { expect, test, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exportToPDF } from '../src/logic/pdf';
import { getInitialState } from '../src/logic/state';
import { RACES } from '../src/data/races';
import { BACKGROUNDS } from '../src/data/backgrounds';


test('exportToPDF fills fields without throwing runtime errors', async () => {
  const pdfPath = path.resolve(__dirname, '../public/Frostmark_Character_Sheet_v2.4-2.pdf');
  expect(fs.existsSync(pdfPath)).toBe(true);
  const pdfBuffer = fs.readFileSync(pdfPath);

  /*
   * Workaround: Vitest runs in a Node.js environment without a running Vite dev server.
   * To prevent exportToPDF from failing on the HTTP fetch request for the template PDF,
   * we stub globalThis.fetch to return the local template file content directly.
   */
  const originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn().mockImplementation(async (url) => {
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        const u8 = new Uint8Array(pdfBuffer);
        return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      }
    };
  });

  try {
    const state = getInitialState();
    state.characterName = 'Test Character';
    state.playerName = 'Test Player';
    state.race = 'Dwarf';
    state.subrace = 'Mountain Dwarf';
    state.background = 'Artist/Crafter';
    state.primaryAO = 'Devotion';
    state.level = 3;

    state.baseCharacteristics = {
      Brawn: 14,
      Dexterity: 12,
      Vitality: 15,
      Intelligence: 10,
      Cunning: 10,
      Resolve: 13,
      Presence: 11,
      Manipulation: 10,
      Composure: 10
    };

    state.skillRanks = {
      'Perception': 2,
      'Athletics': 1,
      'Persuasion': 3
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
      Composure: false
    };

    state.equipmentList = [
      { name: 'Longsword', isWeapon: true, hit: '+5', range: 'Melee', damage: '1d8+3', equipped: true },
      { name: 'Chain Mail', isArmor: true, baseAC: 16, addsDexMod: false, equipped: true },
      { name: 'Shield', isArmor: true, baseAC: 2, addsDexMod: false, equipped: true }
    ];

    state.spellcasting = {
      cantrips: ['Light', 'Guidance'],
      spells: [
        { name: 'Cure Wounds', level: 1 },
        { name: 'Shield of Faith', level: 1 }
      ]
    };

    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('exportToPDF exports levelSelections chosen abilities into essential abilities fields', async () => {
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

  try {
    const { PDFDocument } = await import('pdf-lib');
    const state = getInitialState();
    state.level = 2;
    state.levelSelections = {
      1: { primaryAbility: 'artistry-1-primary-inspiration', secondaryAbility: 'artistry-1-secondary-jack-of-all-trades' },
      2: { primaryAbility: 'divine-oath-1-primary-divine-sense' }
    };


    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const field1 = form.getTextField('Essential Abilities 1').getText() || '';
    const field2 = form.getTextField('Essential Abilities 2').getText() || '';

    expect(field1).toContain('Inspiration');
    expect(field2).toContain('Jack Of All Trades');
  } finally {
    globalThis.fetch = originalFetch;
  }
});





test('exportToPDF sets spellcasting ability correctly according to level 1 primary AO', async () => {
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

  try {
    const { PDFDocument } = await import('pdf-lib');
    const state = getInitialState();
    state.level = 1;
    state.levelSelections = {
      1: { primaryAO: 'Devotion' }
    };
    state.spellcasting = {
      cantrips: ['Guidance'],
      spells: [{ name: 'Cure Wounds', level: 1 }]
    };

    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const spellAbility = form.getTextField('Spellcasting ability').getText();
    expect(spellAbility).toBe('Res');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('exportToPDF exports weapon and defense list entries properly', async () => {
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

  try {
    const { PDFDocument } = await import('pdf-lib');
    const state = getInitialState();
    state.equipmentList = [
      { name: 'Warhammer', isWeapon: true, hit: '+4', range: 'Melee', damage: '1d8+2', equipped: true },
      { name: 'Plate Armor', isArmor: true, baseAC: 18, addsDexMod: false, equipped: true }
    ];

    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    expect(form.getTextField('Weapon 1').getText()).toBe('Warhammer');
    expect(form.getTextField('Weapon 1 Hit').getText()).toBe('+4');
    expect(form.getTextField('Weapon 1 Range').getText()).toBe('Melee');
    expect(form.getTextField('Weapon 1 Damage').getText()).toBe('1d8+2');
    expect(form.getTextField('Defenses 1').getText()).toBe('Plate Armor');
  } finally {
    globalThis.fetch = originalFetch;
  }
});


