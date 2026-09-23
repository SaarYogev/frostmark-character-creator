import { describe, it, expect } from 'vitest';
import {
  FEATS,
  getFeats,
  getFeatByName,
  getFeatById,
  getFeatsByCategory,
  parseFeatChoice,
  checkFeatPrerequisites
} from '../data/feats';

describe('Feats Data Module', () => {
  it('exports all 66 feats with unique IDs', () => {
    const feats = getFeats();
    expect(feats.length).toBe(66);
    expect(FEATS.length).toBe(66);

    const ids = new Set(feats.map(f => f.id));
    expect(ids.size).toBe(66);
  });

  it('filters feats by category', () => {
    expect(getFeatsByCategory('General Feats').length).toBe(31);
    expect(getFeatsByCategory('Weapon Feats').length).toBe(9);
    expect(getFeatsByCategory('Armor Feats').length).toBe(6);
    expect(getFeatsByCategory('Skill Feats').length).toBe(17);
    expect(getFeatsByCategory('Tool Feats').length).toBe(3);
  });

  it('retrieves feats by name and by id', () => {
    const actor = getFeatByName('Actor');
    expect(actor).toBeDefined();
    expect(actor?.name).toBe('Actor');
    expect(actor?.category).toBe('General Feats');

    const actorById = getFeatById('general-feats-actor');
    expect(actorById).toBeDefined();
    expect(actorById?.name).toBe('Actor');
  });

  it('parses formatted feat choice strings correctly', () => {
    expect(parseFeatChoice('')).toBeNull();
    expect(parseFeatChoice('+2 Brawn')).toBeNull();

    expect(parseFeatChoice('Actor')).toEqual({ featName: 'Actor' });
    expect(parseFeatChoice('Feat: Actor')).toEqual({ featName: 'Actor' });
    expect(parseFeatChoice('Feat: Athlete [Dexterity]')).toEqual({
      featName: 'Athlete',
      chosenStat: 'Dexterity'
    });
    expect(parseFeatChoice('Feat: Lightly Armored [Brawn]')).toEqual({
      featName: 'Lightly Armored',
      chosenStat: 'Brawn'
    });
  });

  describe('checkFeatPrerequisites', () => {
    const baseCharacterState = {
      baseCharacteristics: {
        Brawn: 10,
        Dexterity: 10,
        Vitality: 10,
        Intelligence: 10,
        Cunning: 10,
        Resolve: 10,
        Presence: 10,
        Manipulation: 10,
        Composure: 10
      },
      race: { name: 'Human' },
      armorProficiencies: {
        Light: false,
        Medium: false,
        Heavy: false,
        Shields: false
      },
      weaponProficiencies: [],
      spellcasting: {
        spells: [],
        cantrips: []
      },
      ao: {
        levelSelections: {}
      }
    };

    it('returns met: true for feats with no prerequisites', () => {
      const actor = getFeatByName('Actor')!;
      const check = checkFeatPrerequisites(actor, baseCharacterState);
      expect(check.met).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it('validates single ability score requirements', () => {
      const defensiveDuelist = getFeatByName('Defensive Duelist')!; // Requires Dex 13+
      
      // Dex 10 (fails)
      const failCheck = checkFeatPrerequisites(defensiveDuelist, baseCharacterState);
      expect(failCheck.met).toBe(false);
      expect(failCheck.reason).toMatch(/Requires Dexterity 13 or higher/i);

      // Dex 14 (passes)
      const passState = {
        ...baseCharacterState,
        baseCharacteristics: {
          ...baseCharacterState.baseCharacteristics,
          Dexterity: 14
        }
      };
      const passCheck = checkFeatPrerequisites(defensiveDuelist, passState);
      expect(passCheck.met).toBe(true);
    });

    it('validates multi-choice ability score requirements ("or")', () => {
      const inspiringLeader = getFeatByName('Inspiring Leader')!; // Requires Presence or Manipulation 13+

      // Neither 13+ (fails)
      expect(checkFeatPrerequisites(inspiringLeader, baseCharacterState).met).toBe(false);

      // Presence 13 (passes)
      const presState = {
        ...baseCharacterState,
        baseCharacteristics: {
          ...baseCharacterState.baseCharacteristics,
          Presence: 13
        }
      };
      expect(checkFeatPrerequisites(inspiringLeader, presState).met).toBe(true);

      // Manipulation 14 (passes)
      const manState = {
        ...baseCharacterState,
        baseCharacteristics: {
          ...baseCharacterState.baseCharacteristics,
          Manipulation: 14
        }
      };
      expect(checkFeatPrerequisites(inspiringLeader, manState).met).toBe(true);
    });

    it('validates armor proficiency requirements hierarchically', () => {
      const lightArmorMaster = getFeatByName('Light Armor Master')!; // Requires Light Armor Proficiency
      const moderatelyArmored = getFeatByName('Moderately Armored')!; // Requires Light Armor Proficiency
      const heavilyArmored = getFeatByName('Heavily Armored')!; // Requires Medium armor proficiency
      const heavyArmorMaster = getFeatByName('Heavy Armored Master')!; // Requires Heavy armor proficiency

      // Without proficiency (fails)
      expect(checkFeatPrerequisites(lightArmorMaster, baseCharacterState).met).toBe(false);
      expect(checkFeatPrerequisites(moderatelyArmored, baseCharacterState).met).toBe(false);

      // With Light armor proficiency (passes Light, fails Medium and Heavy)
      const lightState = {
        ...baseCharacterState,
        armorProficiencies: {
          ...baseCharacterState.armorProficiencies,
          Light: true
        }
      };
      expect(checkFeatPrerequisites(lightArmorMaster, lightState).met).toBe(true);
      expect(checkFeatPrerequisites(moderatelyArmored, lightState).met).toBe(true);
      expect(checkFeatPrerequisites(heavilyArmored, lightState).met).toBe(false);
      expect(checkFeatPrerequisites(heavyArmorMaster, lightState).met).toBe(false);

      // With Medium armor proficiency only (hierarchically satisfies Light as well)
      const mediumState = {
        ...baseCharacterState,
        armorProficiencies: {
          ...baseCharacterState.armorProficiencies,
          Medium: true
        }
      };
      expect(checkFeatPrerequisites(lightArmorMaster, mediumState).met).toBe(true);
      expect(checkFeatPrerequisites(moderatelyArmored, mediumState).met).toBe(true);
      expect(checkFeatPrerequisites(heavilyArmored, mediumState).met).toBe(true);
      expect(checkFeatPrerequisites(heavyArmorMaster, mediumState).met).toBe(false);

      // With Heavy armor proficiency only (hierarchically satisfies both Light and Medium)
      const heavyState = {
        ...baseCharacterState,
        armorProficiencies: {
          ...baseCharacterState.armorProficiencies,
          Heavy: true
        }
      };
      expect(checkFeatPrerequisites(lightArmorMaster, heavyState).met).toBe(true);
      expect(checkFeatPrerequisites(moderatelyArmored, heavyState).met).toBe(true);
      expect(checkFeatPrerequisites(heavilyArmored, heavyState).met).toBe(true);
      expect(checkFeatPrerequisites(heavyArmorMaster, heavyState).met).toBe(true);
    });

    it('validates spellcasting requirements', () => {
      const elementalAdept = getFeatByName('Elemental Adept')!; // Requires ability to cast at least one spell

      // Non-caster (fails)
      expect(checkFeatPrerequisites(elementalAdept, baseCharacterState).met).toBe(false);

      // With a spell (passes)
      const casterState = {
        ...baseCharacterState,
        spellcasting: {
          spells: [{ name: 'Fireball', level: 3 }],
          cantrips: []
        }
      };
      expect(checkFeatPrerequisites(elementalAdept, casterState).met).toBe(true);
    });
  });
});
