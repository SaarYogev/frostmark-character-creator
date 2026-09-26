import { describe, it, expect } from 'vitest';
import { SPELLS, CANTRIPS, type SpellData } from '../data/spells';

describe('Spells Resilience & Ingestion Verifier (Seam D)', () => {
  const CANONICAL_SCHOOLS = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Transmutation',
    'Vismancy'
  ];

  const allSpells: SpellData[] = [...CANTRIPS, ...SPELLS];

  it('ensures catalog contains at least 350 spells covering all 8 schools and levels 0-9', () => {
    expect(allSpells.length).toBeGreaterThanOrEqual(350);

    const observedSchools = new Set(allSpells.map((s) => s.school));
    for (const school of CANONICAL_SCHOOLS) {
      expect(observedSchools.has(school)).toBe(true);
    }

    const observedLevels = new Set(allSpells.map((s) => s.level));
    for (let lvl = 0; lvl <= 9; lvl++) {
      expect(observedLevels.has(lvl)).toBe(true);
    }
  });

  it('ensures all spells adhere to the mandatory schema definition', () => {
    for (const spell of allSpells) {
      expect(typeof spell.name).toBe('string');
      expect(spell.name.trim().length).toBeGreaterThan(0);

      expect(typeof spell.level).toBe('number');
      expect(spell.level).toBeGreaterThanOrEqual(0);
      expect(spell.level).toBeLessThanOrEqual(9);

      expect(typeof spell.school).toBe('string');
      expect(CANONICAL_SCHOOLS).toContain(spell.school);

      expect(typeof spell.castingTime).toBe('string');
      expect(spell.castingTime.trim().length).toBeGreaterThan(0);

      expect(typeof spell.range).toBe('number');
      expect(spell.range).toBeGreaterThanOrEqual(0);

      expect(typeof spell.duration).toBe('string');
      expect(spell.duration.trim().length).toBeGreaterThan(0);

      expect(typeof spell.concentration).toBe('boolean');
      expect(typeof spell.ritual).toBe('boolean');

      expect(typeof spell.desc).toBe('string');
      expect(spell.desc.trim().length).toBeGreaterThan(0);
    }
  });

  it('ensures zero spells have unstripped wiki artifacts like trailing "[]"', () => {
    const trailingBracketsDesc = allSpells.filter(
      (s) => s.desc && s.desc.trim().endsWith('[]')
    );
    expect(trailingBracketsDesc.map((s) => s.name)).toEqual([]);

    const trailingBracketsName = allSpells.filter(
      (s) => s.name.endsWith('[]') || s.name.endsWith('()')
    );
    expect(trailingBracketsName.map((s) => s.name)).toEqual([]);
  });

  it('validates canonical integrity of reference spells', () => {
    const spellMap = new Map(allSpells.map((s) => [s.name, s]));

    const bladeWard = spellMap.get('Blade Ward');
    expect(bladeWard).toBeDefined();
    expect(bladeWard?.level).toBe(0);
    expect(bladeWard?.school).toBe('Abjuration');

    const shield = spellMap.get('Shield');
    expect(shield).toBeDefined();
    expect(shield?.level).toBe(1);
    expect(shield?.school).toBe('Abjuration');

    const fireball = spellMap.get('Fireball');
    expect(fireball).toBeDefined();
    expect(fireball?.level).toBe(4);
    expect(fireball?.school).toBe('Evocation');

    const alarm = spellMap.get('Alarm');
    expect(alarm).toBeDefined();
    expect(alarm?.level).toBe(1);
    expect(alarm?.school).toBe('Abjuration');
    expect(alarm?.ritual).toBe(true);

    const identify = spellMap.get('Identify');
    expect(identify).toBeDefined();
    expect(identify?.level).toBe(1);
    expect(identify?.school).toBe('Divination');
    expect(identify?.ritual).toBe(true);

    const detectMagic = spellMap.get('Detect Magic');
    expect(detectMagic).toBeDefined();
    expect(detectMagic?.level).toBe(1);
    expect(detectMagic?.concentration).toBe(true);

    const guidance = spellMap.get('Guidance');
    expect(guidance).toBeDefined();
    expect(guidance?.level).toBe(0);
    expect(guidance?.concentration).toBe(true);
  });
});
