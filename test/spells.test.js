import { expect, test, describe } from 'vitest';
import { SPELLS, CANTRIPS } from '../js/data/spells.js';

describe('Spells and Cantrips Metadata verification', () => {
  test('Verify metadata structure and value types for all cantrips', () => {
    expect(CANTRIPS.length).toBeGreaterThan(0);
    CANTRIPS.forEach(cantrip => {
      expect(cantrip).toBeTypeOf('object');
      expect(cantrip.name).toBeTypeOf('string');
      expect(cantrip.level).toBe(0);
      expect(cantrip.school).toBeTypeOf('string');
      expect(cantrip.castingTime).toBeTypeOf('string');
      expect(cantrip.range).toBeTypeOf('number');
      expect(cantrip.rangeLabel).toBeTypeOf('string');
      expect(Array.isArray(cantrip.damageTypes)).toBe(true);
      cantrip.damageTypes.forEach(dt => expect(dt).toBeTypeOf('string'));
      expect(cantrip.duration).toBeTypeOf('string');
      expect(cantrip.concentration).toBeTypeOf('boolean');
      expect(cantrip.desc).toBeTypeOf('string');
    });
  });

  test('Verify metadata structure and value types for all spells', () => {
    expect(SPELLS.length).toBeGreaterThan(0);
    SPELLS.forEach(spell => {
      expect(spell).toBeTypeOf('object');
      expect(spell.name).toBeTypeOf('string');
      expect(spell.level).toBeGreaterThan(0);
      expect(spell.level).toBeLessThanOrEqual(9);
      expect(spell.school).toBeTypeOf('string');
      expect(spell.castingTime).toBeTypeOf('string');
      expect(spell.range).toBeTypeOf('number');
      expect(spell.rangeLabel).toBeTypeOf('string');
      expect(Array.isArray(spell.damageTypes)).toBe(true);
      spell.damageTypes.forEach(dt => expect(dt).toBeTypeOf('string'));
      expect(spell.duration).toBeTypeOf('string');
      expect(spell.concentration).toBeTypeOf('boolean');
      expect(spell.desc).toBeTypeOf('string');
    });
  });

  test('Verify specific known spells have correct and accurate details', () => {
    const shieldSpell = SPELLS.find(s => s.name === 'Shield');
    expect(shieldSpell).toBeDefined();
    expect(shieldSpell.level).toBe(1);
    expect(shieldSpell.school).toBe('Abjuration');
    expect(shieldSpell.range).toBe(0);
    expect(shieldSpell.rangeLabel).toBe('Self');
    expect(shieldSpell.castingTime).toBe('Reaction*');
    expect(shieldSpell.concentration).toBe(false);

    const guidanceCantrip = CANTRIPS.find(c => c.name === 'Guidance');
    expect(guidanceCantrip).toBeDefined();
    expect(guidanceCantrip.level).toBe(0);
    expect(guidanceCantrip.school).toBe('Divination');
    expect(guidanceCantrip.range).toBe(0);
    expect(guidanceCantrip.rangeLabel).toBe('Touch');
    expect(guidanceCantrip.castingTime).toBe('1 action');
    expect(guidanceCantrip.concentration).toBe(true);

    const fireballSpell = SPELLS.find(s => s.name === 'Fireball');
    expect(fireballSpell).toBeDefined();
    expect(fireballSpell.school).toBe('Evocation');
  });

  test('Verify expanded damage types in the parser and enricher', () => {
    const iceKnife = SPELLS.find(s => s.name === 'Ice Knife');
    expect(iceKnife).toBeDefined();
    expect(iceKnife.damageTypes).toContain('cold');
    expect(iceKnife.damageTypes).toContain('piercing');

    const vampTouch = SPELLS.find(s => s.name === 'Vampiric Touch');
    expect(vampTouch).toBeDefined();
    expect(vampTouch.damageTypes).toContain('necrotic');

    const eruptingEarth = SPELLS.find(s => s.name === 'Erupting Earth');
    expect(eruptingEarth).toBeDefined();
    expect(eruptingEarth.damageTypes).toContain('bludgeoning');

    // Ensure spells with explicit direct damage clauses (e.g. "deals X cold damage") have matching damageTypes array
    const VALID_DAMAGE_TYPES = [
      'bludgeoning', 'piercing', 'slashing',
      'acid', 'cold', 'fire', 'force', 'lightning',
      'necrotic', 'poison', 'psychic', 'radiant', 'thunder'
    ];

    SPELLS.concat(CANTRIPS).forEach(spell => {
      if (!spell.desc || spell.name === 'Elemental Armor' || spell.name === 'Resistance') return;
      VALID_DAMAGE_TYPES.forEach(dt => {
        const regex = new RegExp(`deals\\s+(?:[0-9d\\+\\s]+)?${dt}\\s+damage\\b`, 'i');
        if (regex.test(spell.desc)) {
          expect(spell.damageTypes).toContain(dt);
        }
      });
    });
  });
});
