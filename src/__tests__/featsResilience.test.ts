import { describe, it, expect } from 'vitest';
import {
  FEATS,
  getFeats,
  getFeatByName,
  getFeatsByCategory,
  type FeatItem
} from '../data/feats';

describe('Feats Resilience & Ingestion Verifier (Seam C)', () => {
  const EXPECTED_CATEGORY_COUNTS: Record<string, number> = {
    'General Feats': 31,
    'Weapon Feats': 9,
    'Armor Feats': 6,
    'Skill Feats': 17,
    'Tool Feats': 3
  };

  it('ensures exactly 66 feats exist across all categories', () => {
    expect(FEATS).toHaveLength(66);
    expect(getFeats()).toHaveLength(66);
  });

  it('ensures correct feat partition across the 5 canonical categories', () => {
    for (const [category, expectedCount] of Object.entries(EXPECTED_CATEGORY_COUNTS)) {
      const featsInCat = getFeatsByCategory(category);
      expect(featsInCat).toHaveLength(expectedCount);
    }
  });

  it('ensures all feats contain mandatory fields with non-empty values', () => {
    for (const feat of FEATS) {
      expect(typeof feat.name).toBe('string');
      expect(feat.name.trim().length).toBeGreaterThan(0);

      expect(typeof feat.category).toBe('string');
      expect(Object.keys(EXPECTED_CATEGORY_COUNTS)).toContain(feat.category);

      expect(typeof feat.desc).toBe('string');
      expect(feat.desc.trim().length).toBeGreaterThan(0);

      expect(typeof feat.prerequisite).toBe('string');
    }
  });

  it('ensures zero feats contain unrendered trailing parentheses or brackets in names', () => {
    const corrupted = FEATS.filter(
      (f) => f.name.endsWith('()') || f.name.endsWith('[]')
    );
    expect(corrupted.map((f) => f.name)).toEqual([]);
  });

  it('validates canonical integrity of reference feats', () => {
    const actor = getFeatByName('Actor');
    expect(actor).toBeDefined();
    expect(actor?.category).toBe('General Feats');
    expect(actor?.desc.length).toBeGreaterThan(0);

    const alert = getFeatByName('Alert');
    expect(alert).toBeDefined();
    expect(alert?.category).toBe('General Feats');
    expect(alert?.desc.length).toBeGreaterThan(0);

    const defensiveDuelist = getFeatByName('Defensive Duelist');
    expect(defensiveDuelist).toBeDefined();
    expect(defensiveDuelist?.category).toBe('General Feats');
    expect(defensiveDuelist?.desc.length).toBeGreaterThan(0);

    const heavilyArmored = getFeatByName('Heavily Armored');
    expect(heavilyArmored).toBeDefined();
    expect(heavilyArmored?.category).toBe('Armor Feats');
    expect(heavilyArmored?.desc.length).toBeGreaterThan(0);

    const medic = getFeatByName('Medic');
    expect(medic).toBeDefined();
    expect(medic?.category).toBe('Skill Feats');
    expect(medic?.desc.length).toBeGreaterThan(0);
  });
});
