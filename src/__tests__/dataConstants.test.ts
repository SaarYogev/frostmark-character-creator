import { expect, test } from 'vitest';
import {
  POINT_BUY_COSTS,
  CHARACTERISTICS,
  SKILL_RANK_BONUSES,
  SKILL_RANK_CUMULATIVE_COSTS,
  SAVE_PROFICIENCY_COSTS,
  ARMOR_PROFICIENCY_COSTS,
  WEAPON_PROFICIENCY_COSTS,
  MONEY_AP_COST,
  SKILLS
} from '../data/constants';

test('POINT_BUY_COSTS map has expected values', () => {
  expect(POINT_BUY_COSTS[10]).toBe(0);
  expect(POINT_BUY_COSTS[14]).toBe(4);
  expect(POINT_BUY_COSTS[6]).toBe(-5);
});

test('CHARACTERISTICS has 9 characteristics', () => {
  expect(CHARACTERISTICS).toHaveLength(9);
  expect(CHARACTERISTICS[0].key).toBe('Brawn');
});

test('SKILL_RANK_BONUSES computes proficiency fractions', () => {
  expect(SKILL_RANK_BONUSES[1](2)).toBe(1);
  expect(SKILL_RANK_BONUSES[2](2)).toBe(2);
  expect(SKILL_RANK_BONUSES[3](2)).toBe(3);
});

test('SKILLS array contains standard skills', () => {
  expect(SKILLS.find(s => s.name === 'Athletics')).toBeDefined();
  expect(SKILLS.find(s => s.name === 'Occult')).toBeDefined();
});
