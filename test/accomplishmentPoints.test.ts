import { describe, it, expect } from 'vitest';
import {
  computeFreeSkillPools,
  getTotalAccomplishmentPointsLimit,
  calculateSpentAccomplishmentPoints,
} from '../src/logic/state';
import { getGlobalAPSummary } from '../src/utils/stateSanitizer';
import { DEFAULT_BACKGROUND } from '../src/types/Background';
import { characterReducer, DEFAULT_CHARACTER } from '../src/types/Character';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { ORIGINS } from '../src/data/origins';

describe('Accomplishment Points (AP) TDD Suite', () => {
  describe('1. computeFreeSkillPools fallback with hasLevelSelections = true', () => {
    it('grants aoFree = 4 when levelSelections[1] omits primaryAO but state has primaryAO Tactics (extraSkills: 1)', () => {
      const state = {
        identity: { level: 1 },
        background: 'Urchin',
        ao: {
          primaryAO: 'Tactics',
          // levelSelections exists and is non-empty, but level 1 does not explicitly specify primaryAO
          levelSelections: {
            1: { secondaryAO: 'Artistry' } as any,
          },
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.aoFree).toBe(4);
    });

    it('grants aoFree = 4 when levelSelections[1] is an empty object but state.primaryAO is Occult Student (extraSkills: 1)', () => {
      const state = {
        level: 1,
        background: 'Scholar',
        primaryAO: 'Occult Student',
        levelSelections: {
          1: {} as any,
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.aoFree).toBe(4);
    });

    it('grants aoFree = 0 when primaryAO has no extra skills (Discipline) even with fallback', () => {
      const state = {
        level: 1,
        background: 'Urchin',
        ao: {
          primaryAO: 'Discipline',
          levelSelections: {
            1: {} as any,
          },
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.aoFree).toBe(0);
    });
  });

  describe('2. getTotalAccomplishmentPointsLimit with bonus AP from features/abilities/AO choices', () => {
    it('includes +4 AP for Street Smart via levelSelections upgradeChoices', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 6,
        ao: {
          levelSelections: {
            6: {
              primaryAO: 'Devotion',
              primaryAbility: 'devotion-6-primary-divine-domain-community',
              upgradeChoices: {
                'devotion-6-primary-divine-domain-community': 'Street Smart',
              },
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(22);
    });

    it('does not include bonus AP from level selections above the character current level', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 1,
        ao: {
          levelSelections: {
            5: {
              primaryAbility: 'Street Smart',
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(16);
    });

    it('includes +2 AP for Accomplishment Points upgrade choice', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 5,
        ao: {
          levelSelections: {
            5: {
              primaryAO: 'Devotion',
              primaryAbility: 'Improved Magical Upgrade',
              upgradeChoices: {
                'Improved Magical Upgrade': 'Accomplishment Points',
              },
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(20);
    });

    it('includes +4 AP for Street Smart when selected directly as an ability name or in features', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 1,
        ao: {
          levelSelections: {
            1: {
              primaryAbility: 'Street Smart',
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(20);
    });

    it('includes +3 AP for Bonus Accomplishment (Divine Domain) via upgradeChoices', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 1,
        ao: {
          levelSelections: {
            1: {
              secondaryAO: 'Devotion',
              secondaryAbility: 'devotion-1-secondary-divine-domain',
              upgradeChoices: {
                'devotion-1-secondary-divine-domain': 'Bonus Accomplishment',
              },
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(19);
    });

    it('stacks multiple AP bonuses (e.g. Street Smart + Bonus Accomplishment)', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 6,
        features: ['Street Smart', 'Bonus Accomplishment'],
        ao: {
          levelSelections: {
            1: {
              upgradeChoices: {
                'domain-1': 'Bonus Accomplishment',
              },
            },
            6: {
              upgradeChoices: {
                'domain-6': 'Street Smart',
              },
            },
          },
        },
      };

      const limit = getTotalAccomplishmentPointsLimit(state);
      expect(limit).toBe(25);
    });
  });

  describe('3. DEFAULT_BACKGROUND and characterReducer SET_BACKGROUND defaults', () => {
    it('DEFAULT_BACKGROUND has freeSkillPoints set to 4', () => {
      expect(DEFAULT_BACKGROUND.freeSkillPoints).toBe(4);
    });

    it('characterReducer SET_BACKGROUND defaults freeSkillPoints to 4 for background without explicit points', () => {
      const bgWithoutPoints = { ...BACKGROUNDS[0], freeSkillPoints: undefined };

      const nextState = characterReducer(DEFAULT_CHARACTER, {
        type: 'SET_BACKGROUND',
        payload: bgWithoutPoints as any,
      });

      expect(nextState.background.freeSkillPoints).toBe(4);
    });

    it('computeFreeSkillPools grants 4 free background skill points for Cultist', () => {
      const cultistBg = BACKGROUNDS.find((b) => b.name === 'Cultist')!;
      const state = characterReducer(DEFAULT_CHARACTER, {
        type: 'SET_BACKGROUND',
        payload: cultistBg,
      });

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.bgFree).toBe(4);
    });
  });

  describe('4. calculateSpentAccomplishmentPoints for Handpicked 2 Weapons', () => {
    it("incurs 1 AP cost for 'Handpicked 2 Weapons' weapon proficiency", () => {
      const state = {
        background: 'Cultist',
        skills: { skillRanks: {} },
        proficiencies: {
          weaponProficiencies: ['Handpicked 2 Weapons'],
        },
      };

      const result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(result.otherSpent).toBe(1);
      expect(result.totalSpent).toBe(1);
    });

    it("correctly combines 'Handpicked 2 Weapons' with standard weapon groups", () => {
      const state = {
        background: 'Cultist',
        skills: { skillRanks: {} },
        proficiencies: {
          weaponProficiencies: ['Handpicked 2 Weapons', 'Axes', 'Blades'],
        },
      };

      const result = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(result.otherSpent).toBe(5);
      expect(result.totalSpent).toBe(5);
    });
  });

  describe('5. getGlobalAPSummary returns expected positive/zero AP remaining', () => {
    it('returns positive AP remaining with bonus AP from Street Smart and Handpicked 2 Weapons', () => {
      const cultistBg = BACKGROUNDS.find((b) => b.name === 'Cultist')!;
      let charState = characterReducer(DEFAULT_CHARACTER, {
        type: 'SET_BACKGROUND',
        payload: cultistBg,
      });

      charState = {
        ...charState,
        campaignPowerLevel: 'Heroic',
        ao: {
          ...charState.ao,
          primaryAO: 'Tactics',
          levelSelections: {
            1: {
              secondaryAO: 'Artistry',
              upgradeChoices: {
                'choice-1': 'Street Smart',
              },
            } as any,
          },
        },
        proficiencies: {
          ...charState.proficiencies,
          weaponProficiencies: ['Handpicked 2 Weapons'],
        },
        skills: {
          ...charState.skills,
          skillRanks: {
            Occult: 2,
            Athletics: 2,
          },
        },
      };

      const summary = getGlobalAPSummary(charState);

      expect(summary.apLimit).toBe(20);
      expect(summary.totalSpent).toBe(1);
      expect(summary.apRemaining).toBe(19);
      expect(summary.apRemaining).toBeGreaterThan(0);
    });

    it('returns exactly 0 AP remaining when entire AP limit (including bonus AP) is spent', () => {
      const state = {
        campaignPowerLevel: 'Heroic',
        level: 1,
        ao: {
          levelSelections: {
            1: {
              primaryAbility: 'Street Smart',
            },
          },
        },
        proficiencies: {
          savingThrowsProficient: {
            Brawn: true,
            Dexterity: true,
            Vitality: true,
            Intelligence: true,
            Cunning: true,
            Composure: true,
            Resolve: true,
          },
          armorProficiencies: {
            Heavy: true,
            Shields: true,
          },
          weaponProficiencies: ['Blades', 'Handpicked 2 Weapons', 'Axes'],
        },
        skills: {
          skillRanks: {},
        },
      };

      const summary = getGlobalAPSummary(state);
      expect(summary.apLimit).toBe(20);
      expect(summary.totalSpent).toBe(20);
      expect(summary.apRemaining).toBe(0);
    });
  });
});
