import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';

describe('Feats TOML Ingestion Integrity', () => {
  const tomlPath = path.resolve(__dirname, '../data/toml/feats.toml');

  it('ensures feats.toml exists and starts with the auto-generated warning header', () => {
    expect(fs.existsSync(tomlPath)).toBe(true);
    const content = fs.readFileSync(tomlPath, 'utf-8');
    expect(content.startsWith('# AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY!')).toBe(true);
  });

  it('contains exactly 66 feats across the 5 categories', () => {
    const content = fs.readFileSync(tomlPath, 'utf-8');
    const data: any = parse(content);
    expect(Array.isArray(data.feats)).toBe(true);
    expect(data.feats.length).toBe(66);

    const categories = data.feats.reduce((acc: Record<string, number>, f: any) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {});

    expect(categories['General Feats']).toBe(31);
    expect(categories['Weapon Feats']).toBe(9);
    expect(categories['Armor Feats']).toBe(6);
    expect(categories['Skill Feats']).toBe(17);
    expect(categories['Tool Feats']).toBe(3);
  });

  it('validates mandatory fields on all feats', () => {
    const content = fs.readFileSync(tomlPath, 'utf-8');
    const data: any = parse(content);
    for (const feat of data.feats) {
      expect(typeof feat.name).toBe('string');
      expect(feat.name.trim().length).toBeGreaterThan(0);
      expect(typeof feat.category).toBe('string');
      expect(typeof feat.desc).toBe('string');
      expect(feat.desc.trim().length).toBeGreaterThan(0);
      expect(typeof feat.prerequisite).toBe('string');
    }
  });

  it('verifies selected reference feats from each category match wiki specifications', () => {
    const content = fs.readFileSync(tomlPath, 'utf-8');
    const data: any = parse(content);
    const featsMap = new Map(data.feats.map((f: any) => [f.name, f]));

    // General Feats
    const actor: any = featsMap.get('Actor');
    expect(actor).toBeDefined();
    expect(actor.ability_score_increase).toEqual({ choices: ['Manipulation'], value: 1 });
    expect(actor.prerequisite).toBe('');

    const defensiveDuelist: any = featsMap.get('Defensive Duelist');
    expect(defensiveDuelist).toBeDefined();
    expect(defensiveDuelist.prerequisite).toMatch(/Dexterity 13 or higher/i);
    expect(defensiveDuelist.ability_score_increase).toEqual({ choices: ['Dexterity'], value: 1 });

    const alertFeat: any = featsMap.get('Alert');
    expect(alertFeat).toBeDefined();
    expect(alertFeat.ability_score_increase).toBeUndefined();
    expect(alertFeat.prerequisite).toBe('');

    const elementalAdept: any = featsMap.get('Elemental Adept');
    expect(elementalAdept).toBeDefined();
    expect(elementalAdept.prerequisite).toMatch(/ability to cast at least one spell/i);

    // Weapon Feats
    const bladedMastery: any = featsMap.get('Bladed Mastery');
    expect(bladedMastery).toBeDefined();
    expect(bladedMastery.prerequisite).toBe('');

    const brawler: any = featsMap.get('Brawler');
    expect(brawler).toBeDefined();
    expect(brawler.ability_score_increase).toEqual({ choices: ['Brawn', 'Vitality'], value: 1 });
    expect(brawler.weapon_proficiencies).toContain('Improvised Weapons');

    const weaponMaster: any = featsMap.get('Weapon Master');
    expect(weaponMaster).toBeDefined();
    expect(weaponMaster.ability_score_increase).toEqual({ choices: ['Brawn', 'Dexterity'], value: 1 });
    expect(weaponMaster.weapon_proficiencies).toContain('Simple Weapons');
    expect(weaponMaster.weapon_proficiencies).toContain('Martial Weapons');

    // Armor Feats
    const lightlyArmored: any = featsMap.get('Lightly Armored');
    expect(lightlyArmored).toBeDefined();
    expect(lightlyArmored.ability_score_increase).toEqual({ choices: ['Brawn', 'Dexterity'], value: 1 });
    expect(lightlyArmored.armor_proficiencies).toContain('Light');
    expect(lightlyArmored.armor_proficiencies).toContain('Shields');

    const lightArmorMaster: any = featsMap.get('Light Armor Master');
    expect(lightArmorMaster).toBeDefined();
    expect(lightArmorMaster.prerequisite).toMatch(/Light Armor Proficiency/i);
    expect(lightArmorMaster.ability_score_increase).toEqual({ choices: ['Dexterity'], value: 1 });
    expect(lightArmorMaster.ac_bonus).toBe(1);

    const moderatelyArmored: any = featsMap.get('Moderately Armored');
    expect(moderatelyArmored).toBeDefined();
    expect(moderatelyArmored.prerequisite).toMatch(/Light Armor Proficiency/i);
    expect(moderatelyArmored.ability_score_increase).toEqual({ choices: ['Brawn', 'Dexterity'], value: 1 });
    expect(moderatelyArmored.armor_proficiencies).toContain('Medium');
    expect(moderatelyArmored.armor_proficiencies).toContain('Shields');

    const heavilyArmored: any = featsMap.get('Heavily Armored');
    expect(heavilyArmored).toBeDefined();
    expect(heavilyArmored.prerequisite).toMatch(/Medium armor proficiency/i);
    expect(heavilyArmored.ability_score_increase).toEqual({ choices: ['Brawn'], value: 1 });
    expect(heavilyArmored.armor_proficiencies).toContain('Heavy');
    expect(heavilyArmored.armor_proficiencies).toContain('Shields');

    // Skill Feats
    const acrobat: any = featsMap.get('Acrobat');
    expect(acrobat).toBeDefined();
    expect(acrobat.ability_score_increase).toEqual({ choices: ['Brawn', 'Dexterity'], value: 1 });
    expect(acrobat.skill_ranks).toEqual([{ skill: 'Athletics', rank: 1, allow_rank_5: true }]);

    const animalHandling: any = featsMap.get('Animal Handling');
    expect(animalHandling).toBeDefined();
    expect(animalHandling.ability_score_increase).toEqual({ choices: ['Cunning'], value: 1 });
    expect(animalHandling.skill_ranks).toEqual([{ skill: 'Animal Handling', rank: 1, allow_rank_5: true }]);

    const diplomat: any = featsMap.get('Diplomat');
    expect(diplomat).toBeDefined();
    expect(diplomat.ability_score_increase).toEqual({ choices: ['Manipulation'], value: 1 });
    expect(diplomat.skill_ranks).toEqual([{ skill: 'Persuasion', rank: 1, allow_rank_5: true }]);

    const historian: any = featsMap.get('Historian');
    expect(historian).toBeDefined();
    expect(historian.ability_score_increase).toEqual({ choices: ['Intelligence'], value: 1 });
    expect(historian.skill_ranks).toEqual([{ skill: 'Academics: History', rank: 1, allow_rank_5: true }]);

    // Tool Feats
    const alchemist: any = featsMap.get('Alchemist');
    expect(alchemist).toBeDefined();
    expect(alchemist.ability_score_increase).toEqual({ choices: ['Intelligence'], value: 1 });
    expect(alchemist.skill_ranks).toEqual([{ skill: 'Academics: Alchemy', rank: 1, allow_rank_5: true }]);

    const gourmand: any = featsMap.get('Gourmand');
    expect(gourmand).toBeDefined();
    expect(gourmand.ability_score_increase).toEqual({ choices: ['Vitality'], value: 1 });
    expect(gourmand.skill_ranks).toEqual([{ skill: 'Arts & Craft: Cooking', rank: 1, allow_rank_5: true }]);

    const masterOfDisguise: any = featsMap.get('Master of Disguise');
    expect(masterOfDisguise).toBeDefined();
    expect(masterOfDisguise.ability_score_increase).toEqual({ choices: ['Manipulation', 'Presence'], value: 1 });
    expect(masterOfDisguise.skill_ranks).toEqual([{ skill: 'Subterfuge', rank: 1, allow_rank_5: true }]);
  });
});
