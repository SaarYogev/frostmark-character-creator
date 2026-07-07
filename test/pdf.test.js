import { expect, test, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exportToPDF } from '../js/logic/pdf.js';
import { getInitialState } from '../js/logic/state.js';
import { RACES } from '../js/data/races.js';
import { BACKGROUNDS } from '../js/data/backgrounds.js';


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
        return pdfBuffer.buffer.slice(
          pdfBuffer.byteOffset,
          pdfBuffer.byteOffset + pdfBuffer.byteLength
        );
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
