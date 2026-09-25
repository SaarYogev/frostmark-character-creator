import { describe, it, expect } from 'vitest';
import { ABILITIES, getAbilitiesForLevel } from '../data/abilities';

describe('AO Resilience & Parsing Ingest Verification (Seam A)', () => {
  it('ensures Discipline Level 2 Primary has exactly 1 feature named "Mastery"', () => {
    const disciplineLvl2 = getAbilitiesForLevel(2, 'Primary', 'Discipline');
    const names = disciplineLvl2.map((a) => a.name);
    expect(names).toEqual(['Mastery']);
  });

  it('ensures Occult Student Level 1 Primary has exactly 9 Arcane Tradition features', () => {
    const occultLvl1 = getAbilitiesForLevel(1, 'Primary', 'Occult Student');
    const names = occultLvl1.map((a) => a.name).sort();
    const expected = [
      'Arcane Tradition (Abjuration)',
      'Arcane Tradition (Conjuration)',
      'Arcane Tradition (Divination)',
      'Arcane Tradition (Enchantment)',
      'Arcane Tradition (Evocation)',
      'Arcane Tradition (Illusion)',
      'Arcane Tradition (Necromancy)',
      'Arcane Tradition (Transmutation)',
      'Arcane Tradition (War Magic)'
    ].sort();
    expect(names).toEqual(expected);
  });

  it('ensures Pact Level 3 Primary has exactly 4 Pact Boon features', () => {
    const pactLvl3 = getAbilitiesForLevel(3, 'Primary', 'Pact');
    const names = pactLvl3.map((a) => a.name).sort();
    const expected = [
      'Pact Boon (Blade)',
      'Pact Boon (Bond)',
      'Pact Boon (Stellar Bond)',
      'Pact Boon (Tome)'
    ].sort();
    expect(names).toEqual(expected);
  });

  it('ensures Predator Level 3 Primary has exactly 5 Conclaves with no leaked sub-options', () => {
    const predatorLvl3 = getAbilitiesForLevel(3, 'Primary', 'Predator');
    const names = predatorLvl3.map((a) => a.name).sort();
    const expected = [
      'Conclave (Butcher of Behemoths)',
      'Conclave (Exterminator of Woe)',
      'Conclave (Hunter)',
      'Conclave (Ranger)',
      'Conclave (Realm Marshal)'
    ].sort();
    expect(names).toEqual(expected);

    // Prevents hunter sub-features from leaking out of feature body text into selectable pool options
    const leakedSubOptions = names.filter((name) =>
      ['Colossus Slayer', 'Giant Killer', 'Horde Breaker'].some((sub) => name.includes(sub))
    );
    expect(leakedSubOptions).toEqual([]);
  });

  it('ensures Unique Ancestry Level 2 Primary has exactly 1 feature: "Font of Magic"', () => {
    const uniqueAncestryLvl2 = getAbilitiesForLevel(2, 'Primary', 'Unique Ancestry');
    const names = uniqueAncestryLvl2.map((a) => a.name);
    expect(names).toEqual(['Font of Magic']);
  });

  it('ensures Divine Oath Level 1 Primary has canonical features: Divine Sense and Proclaim Judgement', () => {
    const divineOathLvl1 = getAbilitiesForLevel(1, 'Primary', 'Divine Oath');
    const names = divineOathLvl1.map((a) => a.name).sort();
    expect(names).toEqual(['Divine Sense', 'Proclaim Judgement'].sort());
  });

  it('ensures zero abilities exist whose name begins with "Prerequisite:"', () => {
    const prereqAbilities = ABILITIES.filter((a) => a.name.startsWith('Prerequisite:'));
    expect(prereqAbilities.map((a) => `${a.origin} L${a.level}: ${a.name}`)).toEqual([]);
  });

  it('ensures zero abilities exist with corrupted repeated names like "Oaths (Threat)"', () => {
    const corruptedAbilities = ABILITIES.filter((a) => a.name.includes('Oaths (Threat)'));
    expect(corruptedAbilities.map((a) => `${a.origin} L${a.level}: ${a.name}`)).toEqual([]);
  });

  it('ensures every ability has a non-empty description', () => {
    const emptyDescAbilities = ABILITIES.filter((a) => !a.desc || a.desc.trim().length === 0);
    expect(emptyDescAbilities.map((a) => `${a.origin} L${a.level}: ${a.name}`)).toEqual([]);
  });

  it('ensures zero abilities have trailing empty parentheses or brackets', () => {
    const emptySuffixAbilities = ABILITIES.filter((a) => a.name.endsWith('()') || a.name.endsWith('[]'));
    expect(emptySuffixAbilities.map((a) => `${a.origin} L${a.level}: ${a.name}`)).toEqual([]);
  });
});
