import { describe, it, expect } from 'vitest';
import { ORIGINS } from '../data/origins';
import { ABILITIES } from '../data/abilities';
import fs from 'fs';
import path from 'path';

describe('Origins & Abilities 1-to-1 Regression Tests', () => {
  it('has a 100% 1-to-1 match between ORIGINS defined in origins.ts and abilities in abilities.toml', () => {
    const originNamesFromTs = ORIGINS.map((o) => o.name).sort();

    // Extract unique origin names present in ABILITIES
    const uniqueOriginsInToml = Array.from(new Set(ABILITIES.map((a) => a.origin))).sort();

    expect(originNamesFromTs).toEqual(uniqueOriginsInToml);
  });

  it('ensures every origin in ORIGINS has at least one ability in abilities.toml', () => {
    ORIGINS.forEach((origin) => {
      const abilitiesForOrigin = ABILITIES.filter((a) => a.origin === origin.name);
      expect(abilitiesForOrigin.length).toBeGreaterThan(0);
    });
  });

  it('ensures no ability names contain trailing bracket artifacts []', () => {
    ABILITIES.forEach((ability) => {
      expect(ability.name).not.toMatch(/\[\]$/);
    });
  });

  it('ensures every ability has a non-empty desc', () => {
    ABILITIES.forEach((ability) => {
      expect(ability.desc).toBeTruthy();
      expect(ability.desc.trim().length).toBeGreaterThan(0);
    });
  });

  it('ensures abilities.toml starts with the auto-generated warning header', () => {
    const tomlPath = path.resolve(__dirname, '../data/toml/abilities.toml');
    const content = fs.readFileSync(tomlPath, 'utf-8');
    expect(content.startsWith('# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!')).toBe(true);
  });
});

