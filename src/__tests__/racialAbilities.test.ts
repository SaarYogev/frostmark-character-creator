import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { exportToPDF } from '../logic/pdf';
import {
  getRacialSkillBenefits,
  getRacialSpells,
  hasRacialFreeCantrip,
  getCharacterSpeed,
  getRacialStartingSkillSlots,
} from '../logic/racialAbilities';
import { characterReducer } from '../types/Character';
import {
  computeFreeSkillPools,
  computeSkillPointsSummary,
  calculatePotentialSpent,
  calculatePotentialRemaining,
  getInitialState,
} from '../logic/state';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';

describe('Racial Extra Abilities Suite', () => {
  describe('1. getRacialSkillBenefits(state, raceData)', () => {
    it('Elf grants builtInRanks Perception: 2', () => {
      // Keen Senses trait reflects ancestral sensory sharpness, awarding rank 2 in Perception at no point cost.
      const state = { ...getInitialState(), race: 'Elf', subrace: '' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.builtInRanks['Perception']).toBe(2);
      expect(benefits.racialFree).toBe(0);
    });

    it('Goliath grants builtInRanks Athletics: 2', () => {
      // Natural Athlete trait reflects towering mountain physiology, giving 2 free ranks in Athletics.
      const state = { ...getInitialState(), race: 'Goliath' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.builtInRanks['Athletics']).toBe(2);
      expect(benefits.racialFree).toBe(0);
    });

    it('Wood Elf grants builtInRanks Athletics: 1 in addition to Elf Perception: 2', () => {
      // Woodland Athleticism complements Elf Keen Senses, giving 1 rank in Athletics alongside base Elf Perception.
      const state = { ...getInitialState(), race: 'Elf', subrace: 'Wood' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.builtInRanks['Athletics']).toBe(1);
      expect(benefits.builtInRanks['Perception']).toBe(2);
    });

    it('Dwarf grants builtInRanks for Arts & Craft: 2', () => {
      // Crafty trait provides dwarves with instinctive artisan proficiency equivalent to rank 2.
      const state = { ...getInitialState(), race: 'Dwarf' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.builtInRanks['Arts & Craft']).toBe(2);
    });

    it('Rock Gnome grants builtInAcademics Tinkering: 2', () => {
      // Tinker trait specifically advances the Tinkering field of Academics rather than general skill ranks.
      const state = { ...getInitialState(), race: 'Gnome', subrace: 'Rock Gnome' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.builtInAcademics['Tinkering']).toBe(2);
    });

    it('Garden Elf grants racialFree: 4 with racialRestrictSkills: Academics, Arts & Craft, Medicine, Occult', () => {
      // Mental Acumen models scholastic versatility limited strictly to traditional elven intellectual pursuits.
      const state = { ...getInitialState(), race: 'Elf', subrace: 'Garden' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.racialFree).toBe(4);
      expect(benefits.racialRestrictSkills).toEqual(
        expect.arrayContaining(['Academics', 'Arts & Craft', 'Medicine', 'Occult'])
      );
      expect(benefits.racialRestrictSkills?.length).toBe(4);
    });

    it('Half-Elf grants racialFree: 4 with no restrictions', () => {
      // Skill Versatility captures the adaptable nature of half-elves, permitting open point distribution.
      const state = { ...getInitialState(), race: 'Half-elf' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.racialFree).toBe(4);
      expect(benefits.racialRestrictSkills).toBeNull();
    });

    it('Other races return 0 racial free points and empty builtIn records', () => {
      // Baseline races without skill traits must not receive unearned skill points or ranks.
      const state = { ...getInitialState(), race: 'Human' };
      const benefits = getRacialSkillBenefits(state, RACES);

      expect(benefits.racialFree).toBe(0);
      expect(benefits.builtInRanks).toEqual({});
      expect(benefits.builtInAcademics).toEqual({});
      expect(benefits.racialRestrictSkills).toBeNull();
    });

    it('getRacialStartingSkillSlots returns configurable slots for races with starting skill ranks', () => {
      // Starting skill slots allow the user to retarget innate racial proficiencies when manual customization is enabled.
      const elfSlots = getRacialStartingSkillSlots('Elf', '');
      expect(elfSlots).toEqual([
        { id: 'Perception', defaultSkill: 'Perception', rank: 2, source: 'Elf: Keen Senses' },
      ]);

      const woodElfSlots = getRacialStartingSkillSlots('Elf', 'Wood');
      expect(woodElfSlots).toEqual([
        { id: 'Perception', defaultSkill: 'Perception', rank: 2, source: 'Elf: Keen Senses' },
        { id: 'Athletics', defaultSkill: 'Athletics', rank: 1, source: 'Wood Elf: Woodland Athleticism' },
      ]);

      const goliathSlots = getRacialStartingSkillSlots('Goliath', '');
      expect(goliathSlots).toEqual([
        { id: 'Athletics', defaultSkill: 'Athletics', rank: 2, source: 'Goliath: Natural Athlete' },
      ]);

      const dwarfSlots = getRacialStartingSkillSlots('Dwarf', '');
      expect(dwarfSlots).toEqual([
        { id: 'Arts & Craft', defaultSkill: 'Arts & Craft', rank: 2, source: 'Dwarf: Crafty' },
      ]);

      const gnomeSlots = getRacialStartingSkillSlots('Gnome', 'Rock Gnome');
      expect(gnomeSlots).toEqual([
        { id: 'Academics', defaultSkill: 'Academics', rank: 2, source: 'Rock Gnome: Tinker' },
      ]);
    });

    it('customizes racial starting skill ranks when manualRaces is enabled with racialSkillOverrides', () => {
      // Manual race overrides permit reallocating innate racial skill ranks to alternative proficiencies.
      const state = {
        ...getInitialState(),
        race: {
          race: 'Elf',
          subrace: 'Wood',
          manualRaces: true,
          racialSkillOverrides: {
            Perception: 'Stealth',
            Athletics: 'Survival',
          },
        },
      };

      const benefits = getRacialSkillBenefits(state, RACES);
      expect(benefits.builtInRanks['Stealth']).toBe(2);
      expect(benefits.builtInRanks['Survival']).toBe(1);
      expect(benefits.builtInRanks['Perception']).toBeUndefined();
      expect(benefits.builtInRanks['Athletics']).toBeUndefined();
    });
  });

  describe('1b. characterReducer SET_RACE starting skill reconciliation', () => {
    it('automatically populates starting skill ranks in skillRanks upon selecting a race', () => {
      // Characters must immediately receive their innate racial skill ranks upon race selection.
      const initial = getInitialState();
      const updated = characterReducer(initial, {
        type: 'SET_RACE',
        payload: { race: 'Elf', subrace: '' },
      });

      expect(updated.skills.skillRanks['Perception']).toBe(2);
      expect(updated.skillRanks?.['Perception']).toBe(2);
    });

    it('reassigns starting skill ranks when manualRaces overrides are supplied', () => {
      // Customizing starting skills must retarget the populated skill ranks to the user-selected skill.
      const initial = characterReducer(getInitialState(), {
        type: 'SET_RACE',
        payload: { race: 'Elf', subrace: '' },
      });
      expect(initial.skills.skillRanks['Perception']).toBe(2);

      const overridden = characterReducer(initial, {
        type: 'SET_RACE',
        payload: {
          race: 'Elf',
          subrace: '',
          manualRaces: true,
          racialSkillOverrides: { Perception: 'Stealth' },
        },
      });

      expect(overridden.skills.skillRanks['Stealth']).toBe(2);
      expect(overridden.skills.skillRanks['Perception']).toBeUndefined();
    });

    it('cleans up previous racial starting ranks when switching to a different race', () => {
      // Switching race must revoke the former race starting ranks without penalizing other skills.
      const elfState = characterReducer(getInitialState(), {
        type: 'SET_RACE',
        payload: { race: 'Elf', subrace: '' },
      });
      expect(elfState.skills.skillRanks['Perception']).toBe(2);

      const goliathState = characterReducer(elfState, {
        type: 'SET_RACE',
        payload: { race: 'Goliath', subrace: '' },
      });

      expect(goliathState.skills.skillRanks['Perception']).toBeUndefined();
      expect(goliathState.skills.skillRanks['Athletics']).toBe(2);
    });
  });

  describe('2. getRacialSpells(state, raceData)', () => {
    it('Fire Genasi grants Create Bonfire at Lv 1, and Burning Hands unlocked only at Lv 3', () => {
      // Reach to the Blaze scales innate elemental flame control with character tier.
      const stateLv1 = { ...getInitialState(), race: 'Genasi', subrace: 'Fire Genasi', level: 1 };
      const spellsLv1 = getRacialSpells(stateLv1, RACES);

      const bonfire = spellsLv1.find((s) => s.name === 'Create Bonfire');
      const burningHandsLv1 = spellsLv1.find((s) => s.name === 'Burning Hands');

      expect(bonfire).toBeDefined();
      expect(bonfire?.isCantrip).toBe(true);
      expect(bonfire?.available).toBe(true);

      expect(burningHandsLv1).toBeDefined();
      expect(burningHandsLv1?.isCantrip).toBe(false);
      expect(burningHandsLv1?.available).toBe(false);

      const stateLv3 = { ...getInitialState(), race: 'Genasi', subrace: 'Fire Genasi', level: 3 };
      const spellsLv3 = getRacialSpells(stateLv3, RACES);
      const burningHandsLv3 = spellsLv3.find((s) => s.name === 'Burning Hands');

      expect(burningHandsLv3?.available).toBe(true);
    });

    it('Air Genasi grants Levitate available at Lv 1', () => {
      // Mingle with the Wind unlocks Levitate immediately upon creation as an innate soul mastery gift.
      const state = { ...getInitialState(), race: 'Genasi', subrace: 'Air Genasi', level: 1 };
      const spells = getRacialSpells(state, RACES);

      const levitate = spells.find((s) => s.name === 'Levitate');
      expect(levitate).toBeDefined();
      expect(levitate?.available).toBe(true);
    });

    it('Earth Genasi grants Pass Without Trace available at Lv 1', () => {
      // Merge with Stone provides earthy stealth magic right from character inception.
      const state = { ...getInitialState(), race: 'Genasi', subrace: 'Earth Genasi', level: 1 };
      const spells = getRacialSpells(state, RACES);

      const passWithoutTrace = spells.find((s) => s.name === 'Pass Without Trace');
      expect(passWithoutTrace).toBeDefined();
      expect(passWithoutTrace?.available).toBe(true);
    });

    it('Water Genasi grants Shape Water cantrip at Lv 1 and Create or Destroy Food and Water at Lv 3', () => {
      // Call to the Wave provides water manipulation early, advancing to hydrological conjuration at level 3.
      const stateLv1 = { ...getInitialState(), race: 'Genasi', subrace: 'Water Genasi', level: 1 };
      const spellsLv1 = getRacialSpells(stateLv1, RACES);

      const shapeWater = spellsLv1.find((s) => s.name === 'Shape Water');
      const foodWaterLv1 = spellsLv1.find((s) => s.name === 'Create or Destroy Food and Water');

      expect(shapeWater?.available).toBe(true);
      expect(shapeWater?.isCantrip).toBe(true);
      expect(foodWaterLv1?.available).toBe(false);

      const stateLv3 = { ...getInitialState(), race: 'Genasi', subrace: 'Water Genasi', level: 3 };
      const spellsLv3 = getRacialSpells(stateLv3, RACES);
      const foodWaterLv3 = spellsLv3.find((s) => s.name === 'Create or Destroy Food and Water');

      expect(foodWaterLv3?.available).toBe(true);
    });

    it('Forest Gnome grants Minor Illusion (cantrip) and Animal Connection (Lv 1 spell) at Lv 1', () => {
      // Forest Gnomes combine natural illusion tricks with communicative beast empathy.
      const state = { ...getInitialState(), race: 'Gnome', subrace: 'Forest Gnome', level: 1 };
      const spells = getRacialSpells(state, RACES);

      const minorIllusion = spells.find((s) => s.name === 'Minor Illusion');
      const animalConnection = spells.find((s) => s.name === 'Animal Connection');

      expect(minorIllusion).toBeDefined();
      expect(minorIllusion?.isCantrip).toBe(true);
      expect(minorIllusion?.available).toBe(true);

      expect(animalConnection).toBeDefined();
      expect(animalConnection?.level).toBe(1);
      expect(animalConnection?.available).toBe(true);
    });

    it.each([
      { subrace: 'Amaknuphis', cantrip: 'Chill Touch', lvl3: 'Suggestion', lvl5: 'Ray of Enfeeblement' },
      { subrace: 'Bazilius', cantrip: 'Poison Spray', lvl3: 'Blur', lvl5: 'Invisibility' },
      { subrace: 'Djosqet', cantrip: 'Frostbite', lvl3: 'Armor of Life', lvl5: 'Enhance Ability' },
      { subrace: 'Hori', cantrip: 'Prestidigitation', lvl3: 'Enthrall', lvl5: 'Alter Self' },
      { subrace: 'Melanthiosia', cantrip: 'Thaumaturgy', lvl3: 'Hellish Rebuke', lvl5: 'Darkness' },
      { subrace: 'Mennem', cantrip: 'Guidance', lvl3: 'Augury', lvl5: 'Locate Object' },
    ])('Tiefling subrace $subrace unlocks cantrip at Lv 1, spell at Lv 3, and spell at Lv 5', ({ subrace, cantrip, lvl3, lvl5 }) => {
      // Infernal Legacy mirrors fiendish heritage progressions staggered across tier thresholds (1, 3, 5).
      const stateLv1 = { ...getInitialState(), race: 'Tiefling', subrace, level: 1 };
      const spellsLv1 = getRacialSpells(stateLv1, RACES);
      expect(spellsLv1.find((s) => s.name === cantrip)?.available).toBe(true);
      expect(spellsLv1.find((s) => s.name === lvl3)?.available).toBe(false);
      expect(spellsLv1.find((s) => s.name === lvl5)?.available).toBe(false);

      const stateLv3 = { ...getInitialState(), race: 'Tiefling', subrace, level: 3 };
      const spellsLv3 = getRacialSpells(stateLv3, RACES);
      expect(spellsLv3.find((s) => s.name === lvl3)?.available).toBe(true);
      expect(spellsLv3.find((s) => s.name === lvl5)?.available).toBe(false);

      const stateLv5 = { ...getInitialState(), race: 'Tiefling', subrace, level: 5 };
      const spellsLv5 = getRacialSpells(stateLv5, RACES);
      expect(spellsLv5.find((s) => s.name === lvl5)?.available).toBe(true);
    });

    it('Garden Elf has hasRacialFreeCantrip: true', () => {
      // Cantrip trait allows Garden Elves to select an unrestricted cantrip from the spell list.
      const state = { ...getInitialState(), race: 'Elf', subrace: 'Garden' };
      expect(hasRacialFreeCantrip(state, RACES)).toBe(true);

      const nonGardenState = { ...getInitialState(), race: 'Elf', subrace: 'Wood' };
      expect(hasRacialFreeCantrip(nonGardenState, RACES)).toBe(false);
    });
  });

  describe('3. getCharacterSpeed(state, raceData)', () => {
    it('Wood Elf returns 7', () => {
      // Fleet of Foot explicitly increases Wood Elf movement speed to 7 squares.
      const state = { ...getInitialState(), race: 'Elf', subrace: 'Wood' };
      expect(getCharacterSpeed(state, RACES)).toBe(7);
    });

    it('Standard Elf and Human return 6', () => {
      // Base humanoid speed across standard Medium humanoids defaults to 6 squares.
      const elfState = { ...getInitialState(), race: 'Elf', subrace: 'Garden' };
      expect(getCharacterSpeed(elfState, RACES)).toBe(6);

      const humanState = { ...getInitialState(), race: 'Human' };
      expect(getCharacterSpeed(humanState, RACES)).toBe(6);
    });

    it('Dwarf, Halfling, and Gnome return 5', () => {
      // Shorter stature and heavy sturdiness restrict base tactical mobility to 5 squares.
      expect(getCharacterSpeed({ ...getInitialState(), race: 'Dwarf' }, RACES)).toBe(5);
      expect(getCharacterSpeed({ ...getInitialState(), race: 'Halfling' }, RACES)).toBe(5);
      expect(getCharacterSpeed({ ...getInitialState(), race: 'Gnome' }, RACES)).toBe(5);
    });

    it('Custom race with speed 8 returns 8', () => {
      // Custom racial templates must permit user-defined movement speeds without clamping.
      const customState = {
        ...getInitialState(),
        race: 'Custom',
        customRace: { name: 'Sprinter', stats: {}, speed: 8, size: 'Medium', traits: [] },
      };
      expect(getCharacterSpeed(customState, RACES)).toBe(8);
    });
  });

  describe('4. Integration with computeFreeSkillPools and computeSkillPointsSummary in src/logic/state.ts', () => {
    it('When Elf is selected, Perception costs 0 points up to rank 2', () => {
      // Built-in racial ranks discount cumulative skill rank costs so players do not pay for innate senses.
      const state = {
        ...getInitialState(),
        race: 'Elf',
        background: '',
        skills: {
          skillRanks: { Perception: 2 },
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.builtInRanks['Perception']).toBe(2);

      const summary = computeSkillPointsSummary(state, BACKGROUNDS, ORIGINS);
      expect(summary.skillsSpent).toBe(0);
    });

    it('When Garden Elf is selected, spending 4 points across Academics/Occult is covered by free skill points', () => {
      // Mental Acumen points pool into restricted free points, absorbing rank expenditures up to 4 AP.
      const state = {
        ...getInitialState(),
        race: 'Elf',
        subrace: 'Garden',
        background: '',
        skills: {
          skillRanks: { Occult: 2, Medicine: 2 },
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.racialFree).toBe(4);

      const summary = computeSkillPointsSummary(state, BACKGROUNDS, ORIGINS);
      expect(summary.skillsSpent).toBe(0);
    });

    it('When Half-Elf is selected, 4 free skill points reduce total spent points', () => {
      // Half-Elf versatility subtracts directly from open skill investments across any selected domains.
      const state = {
        ...getInitialState(),
        race: 'Half-elf',
        background: '',
        skills: {
          skillRanks: { Athletics: 2, Stealth: 2 },
        },
      };

      const pools = computeFreeSkillPools(state, BACKGROUNDS, ORIGINS);
      expect(pools.racialFree).toBe(4);

      const summary = computeSkillPointsSummary(state, BACKGROUNDS, ORIGINS);
      expect(summary.skillsSpent).toBe(0);
    });

    it('Garden Elf potential spent is discounted by 10 for first cantrip', () => {
      // Garden Elf free cantrip choice avoids consuming the standard 10 Potential points.
      const stateWithGardenElf = {
        ...getInitialState(),
        race: 'Elf',
        subrace: 'Garden',
        spellcasting: { cantrips: ['Light'], spells: [] },
      };
      expect(calculatePotentialSpent(stateWithGardenElf, RACES)).toBe(0);

      const stateWithoutGardenElf = {
        ...getInitialState(),
        race: 'Elf',
        subrace: 'Wood',
        spellcasting: { cantrips: ['Light'], spells: [] },
      };
      expect(calculatePotentialSpent(stateWithoutGardenElf, RACES)).toBe(10);
    });

    it('When background restricted skills overlap with Garden Elf, surplus points flow smoothly into racial free points', () => {
      // Shared restricted pool routing prevents dual-eligible skill investments from prematurely depleting Accomplishment Points.
      const state = {
        ...getInitialState(),
        race: 'Elf',
        subrace: 'Garden',
        background: 'Scholar',
        skills: {
          skillRanks: { Medicine: 2 },
          academicsEntries: [
            { name: 'History', rank: 3 },
          ],
        },
      };

      const summary = computeSkillPointsSummary(state, BACKGROUNDS, ORIGINS, RACES);
      expect(summary.bgSpent).toBe(4);
      expect(summary.racialSpent).toBe(2);
      expect(summary.skillsSpent).toBe(0);
    });

    it('PDF export populates innate racial spells and cantrips alongside chosen spells', async () => {
      // Innate racial magic must be printed directly onto the physical character sheet slots for in-play reference.
      const pdfPath = path.resolve(__dirname, '../../public/Frostmark_Character_Sheet_v2.4-2.pdf');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => {
          const u8 = new Uint8Array(pdfBuffer);
          return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
        },
      } as any);

      try {
        const state = {
          ...getInitialState(),
          race: 'Genasi',
          subrace: 'Fire Genasi',
          level: 3,
          spellcasting: {
            cantrips: ['Fire Bolt'],
            spells: [{ name: 'Magic Missile', level: 1 }],
          },
        };

        const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
        const doc = await PDFDocument.load(pdfBytes);
        const form = doc.getForm();

        expect(form.getTextField('Cantrip 1').getText()).toBe('Fire Bolt');
        expect(form.getTextField('Cantrip 2').getText()).toBe('Create Bonfire');
        expect(form.getTextField('Level 1 Slot 1').getText()).toBe('Magic Missile');
        expect(form.getTextField('Level 1 Slot 2').getText()).toBe('Burning Hands');
      } finally {
        globalThis.fetch = originalFetch;
      }
    }, 20000);
  });
});
