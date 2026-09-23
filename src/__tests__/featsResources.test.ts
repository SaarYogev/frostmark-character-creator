import { describe, it, expect } from 'vitest';
import {
  getFinalCharacteristics,
  computeFreeSkillPools,
  calculateSpentAccomplishmentPoints
} from '../logic/state';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';

describe('Feats Resource Mechanics', () => {
  const baseState = {
    identity: { level: 4 },
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
    background: 'Laborer',
    skillRanks: {},
    proficiencies: {
      armorProficiencies: { Light: false, Medium: false, Heavy: false, Shields: false },
      weaponProficiencies: [],
      savingThrowsProficient: {}
    },
    ao: {
      primaryAO: 'Power',
      levelSelections: {
        4: {
          primaryAO: 'Power',
          secondaryAO: '',
          primaryAbility: 'power-4-primary-ability-score-improvement-or-feat',
          secondaryAbility: '',
          upgradeChoices: {}
        }
      }
    }
  };

  describe('Ability Score Increases', () => {
    it('applies ASI choices like "+2 Brawn" to getFinalCharacteristics', () => {
      const state = {
        ...baseState,
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': '+2 Brawn'
              }
            }
          }
        }
      };

      const finalStats = getFinalCharacteristics(state, RACES);
      expect(finalStats.Brawn).toBe(12);
      expect(finalStats.Dexterity).toBe(10);
    });

    it('applies fixed-stat feat bonuses like Actor (+1 Manipulation)', () => {
      const state = {
        ...baseState,
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Actor'
              }
            }
          }
        }
      };

      const finalStats = getFinalCharacteristics(state, RACES);
      expect(finalStats.Manipulation).toBe(11);
      expect(finalStats.Brawn).toBe(10);
    });

    it('applies chosen-stat feat bonuses like Athlete [Dexterity] (+1 Dexterity)', () => {
      const state = {
        ...baseState,
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Athlete [Dexterity]'
              }
            }
          }
        }
      };

      const finalStats = getFinalCharacteristics(state, RACES);
      expect(finalStats.Dexterity).toBe(11);
      expect(finalStats.Brawn).toBe(10);
    });
  });

  describe('Skill Ranks from Feats', () => {
    it('grants complete skill ranks as built-in without spending AP (e.g. Acrobat -> Athletics)', () => {
      const state = {
        ...baseState,
        skillRanks: { Athletics: 1 },
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Acrobat [Dexterity]'
              }
            }
          }
        }
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS, RACES);
      expect(pools.builtInRanks['Athletics']).toBeGreaterThanOrEqual(1);

      const apResult = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(apResult.skillsSpent).toBe(0);
    });

    it('grants academics skill ranks from tool feats (e.g. Alchemist -> Academics: Alchemy)', () => {
      const state = {
        ...baseState,
        academicsEntries: [{ name: 'Alchemy', rank: 1 }],
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Alchemist'
              }
            }
          }
        }
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS, RACES);
      expect(pools.builtInAcademics['Alchemy']).toBeGreaterThanOrEqual(1);

      const apResult = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(apResult.skillsSpent).toBe(0);
    });
  });

  describe('Armor and Weapon Proficiencies from Feats', () => {
    it('does not charge AP for armor proficiencies granted by feats (e.g. Lightly Armored)', () => {
      const state = {
        ...baseState,
        proficiencies: {
          ...baseState.proficiencies,
          armorProficiencies: { Light: true, Medium: false, Heavy: false, Shields: true }
        },
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Lightly Armored [Brawn]'
              }
            }
          }
        }
      };

      const apResult = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      // Light + Shields normally costs 2 AP. With Lightly Armored feat, it should cost 0 AP.
      expect(apResult.otherSpent).toBe(0);
    });

    it('does not charge AP for weapon proficiencies granted by feats (e.g. Brawler)', () => {
      const state = {
        ...baseState,
        proficiencies: {
          ...baseState.proficiencies,
          weaponProficiencies: ['Improvised Weapons']
        },
        ao: {
          ...baseState.ao,
          levelSelections: {
            4: {
              ...baseState.ao.levelSelections[4],
              upgradeChoices: {
                'power-4-primary-ability-score-improvement-or-feat': 'Feat: Brawler [Brawn]'
              }
            }
          }
        }
      };

      const apResult = calculateSpentAccomplishmentPoints(state, BACKGROUNDS, ORIGINS);
      expect(apResult.otherSpent).toBe(0);
    });
  });
});
