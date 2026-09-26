import { describe, it, expect } from 'vitest';
import {
  BACKGROUNDS,
  getBackgroundByName,
  getBackgroundsByCategory,
  getBackgroundsByKingdom,
  getKingdoms,
  type BackgroundData
} from '../data/backgrounds';

describe('Backgrounds Resilience & Ingestion Verifier (Seam B)', () => {
  const CANONICAL_KINGDOMS = [
    'Applegate',
    'Armathain',
    'Beornhelm',
    'Crowhill',
    'Eastcreek',
    'Greenfield',
    'Karthmere',
    'Malgrave',
    'Oldwood',
    'Sirendale',
    'Stormholme'
  ].sort();

  it('ensures exactly 59 backgrounds exist in the catalog (54 canonical + 5 legacy fallbacks)', () => {
    expect(BACKGROUNDS).toHaveLength(59);

    const legacyBackgrounds = BACKGROUNDS.filter((b) => (b as any).isLegacy === true);
    const canonicalBackgrounds = BACKGROUNDS.filter((b) => (b as any).isLegacy !== true);

    expect(legacyBackgrounds).toHaveLength(5);
    expect(canonicalBackgrounds).toHaveLength(54);

    const legacyNames = legacyBackgrounds.map((b) => b.name).sort();
    expect(legacyNames).toEqual(
      ['Gladiator', 'Knight / Order Member', 'Mercenary', 'Merchant', 'Scout'].sort()
    );
  });

  it('ensures canonical backgrounds are partitioned into 19 General and 35 Kingdom-specific backgrounds', () => {
    const canonical = BACKGROUNDS.filter((b) => (b as any).isLegacy !== true);
    const general = canonical.filter((b) => b.category === 'General');
    const kingdom = canonical.filter((b) => b.category === 'Kingdom');

    expect(general).toHaveLength(19);
    expect(kingdom).toHaveLength(35);
  });

  it('ensures kingdom-specific backgrounds span all 11 Frostmark kingdoms with complete coverage', () => {
    const kingdoms = getKingdoms();
    expect(kingdoms).toEqual(CANONICAL_KINGDOMS);

    for (const kingdom of CANONICAL_KINGDOMS) {
      const bgs = getBackgroundsByKingdom(kingdom);
      expect(bgs.length).toBeGreaterThan(0);
      for (const bg of bgs) {
        expect(bg.category).toBe('Kingdom');
        expect(bg.kingdom).toBe(kingdom);
      }
    }
  });

  it('ensures every background possesses valid core fields (name, desc, trait, gold >= 0, freeSkillPoints >= 0)', () => {
    for (const bg of BACKGROUNDS) {
      expect(typeof bg.name).toBe('string');
      expect(bg.name.trim().length).toBeGreaterThan(0);

      expect(typeof bg.desc).toBe('string');
      expect(bg.desc!.trim().length).toBeGreaterThan(0);

      expect(typeof bg.trait).toBe('string');
      expect(bg.trait!.trim().length).toBeGreaterThan(0);

      expect(typeof bg.gold).toBe('number');
      expect(bg.gold).toBeGreaterThanOrEqual(0);

      expect(typeof bg.freeSkillPoints).toBe('number');
      expect(bg.freeSkillPoints).toBeGreaterThanOrEqual(0);
    }
  });

  it('ensures zero backgrounds have trailing empty parentheses or brackets in their names', () => {
    const corrupted = BACKGROUNDS.filter(
      (b) => b.name.endsWith('()') || b.name.endsWith('[]')
    );
    expect(corrupted.map((b) => b.name)).toEqual([]);
  });

  it('validates canonical integrity of specific reference backgrounds', () => {
    const hunter = getBackgroundByName('Hunter');
    expect(hunter).toBeDefined();
    expect(hunter?.category).toBe('General');
    expect(hunter?.trait).toBe('Expert Survivalist');

    const hermit = getBackgroundByName('Hermit');
    expect(hermit).toBeDefined();
    expect(hermit?.category).toBe('General');
    expect(hermit?.builtInRanks).toEqual({ Medicine: 1, Survival: 1 });

    const peelerPriest = getBackgroundByName('Peeler Priest');
    expect(peelerPriest).toBeDefined();
    expect(peelerPriest?.category).toBe('Kingdom');
    expect(peelerPriest?.kingdom).toBe('Applegate');

    const charlatan = getBackgroundByName('Charlatan');
    expect(charlatan).toBeDefined();
    expect(charlatan?.trait).toBe('False Identity');

    const cultist = getBackgroundByName('Cultist');
    expect(cultist).toBeDefined();
    expect(cultist?.trait).toBe('Occult Knowledge');

    const scholar = getBackgroundByName('Scholar');
    expect(scholar).toBeDefined();
    expect(scholar?.trait).toBe('Researcher');
  });
});
