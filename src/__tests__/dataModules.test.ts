import { expect, test } from 'vitest';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import { WEAPONS, ARMOR } from '../data/equipment';
import { CANTRIPS, SPELLS } from '../data/spells';
import { ABILITIES } from '../data/abilities';

test('RACES array is loaded from TOML', () => {
  expect(RACES.length).toBeGreaterThan(0);
  const elf = RACES.find(r => r.name === 'Elf');
  expect(elf).toBeDefined();
  expect(elf?.subraces?.length).toBeGreaterThan(0);
});

test('BACKGROUNDS array is loaded', () => {
  expect(BACKGROUNDS.length).toBeGreaterThan(0);
  const scholar = BACKGROUNDS.find(b => b.name === 'Scholar');
  expect(scholar).toBeDefined();
});

test('ORIGINS array is loaded', () => {
  expect(ORIGINS.length).toBeGreaterThan(0);
  const occult = ORIGINS.find(o => o.name === 'Occult Student');
  expect(occult).toBeDefined();
});

test('WEAPONS and ARMOR arrays are loaded', () => {
  expect(WEAPONS.length).toBeGreaterThan(0);
  expect(ARMOR.length).toBeGreaterThan(0);
});

test('CANTRIPS and SPELLS are parsed and filtered', () => {
  expect(CANTRIPS.length).toBeGreaterThan(0);
  expect(SPELLS.length).toBeGreaterThan(0);
  expect(CANTRIPS.every(c => c.level === 0)).toBe(true);
  expect(SPELLS.every(s => s.level > 0)).toBe(true);
});

test('ABILITIES are loaded and sorted', () => {
  expect(ABILITIES.length).toBeGreaterThan(0);
  expect(ABILITIES[0].id).toBeDefined();
});
