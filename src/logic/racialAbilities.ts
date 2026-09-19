import { RACES } from '../data/races';

export interface RacialSkillBenefits {
  builtInRanks: Record<string, number>;
  builtInAcademics: Record<string, number>;
  racialFree: number;
  racialRestrictSkills: string[] | null;
}

export interface RacialSpell {
  name: string;
  level: number;
  isCantrip: boolean;
  source: string;
  castingFrequency: string;
  minLevel: number;
  available: boolean;
}

export interface RacialSpellBenefits {
  spells: RacialSpell[];
  hasRacialFreeCantrip: boolean;
}

function resolveRaceAndSubrace(state: any): { raceName: string; subraceName: string } {
  if (!state) return { raceName: '', subraceName: '' };
  const raceObjOrString = state.race ?? state.raceState?.race ?? '';
  const raceName = (typeof raceObjOrString === 'string' && raceObjOrString.trim() !== '')
    ? raceObjOrString
    : (raceObjOrString?.race || state.raceState?.race || '');
  const subraceName = (typeof state.subrace === 'string' && state.subrace.trim() !== '')
    ? state.subrace
    : (state.raceState?.subrace || raceObjOrString?.subrace || '');
  return { raceName, subraceName };
}

export interface StartingSkillSlot {
  id: string;
  defaultSkill: string;
  rank: number;
  source: string;
}

export function getRacialStartingSkillSlots(raceName: string, subraceName: string): StartingSkillSlot[] {
  const slots: StartingSkillSlot[] = [];
  if (raceName === 'Elf') {
    slots.push({ id: 'Perception', defaultSkill: 'Perception', rank: 2, source: 'Elf: Keen Senses' });
    if (subraceName === 'Wood') {
      slots.push({ id: 'Athletics', defaultSkill: 'Athletics', rank: 1, source: 'Wood Elf: Woodland Athleticism' });
    }
  } else if (raceName === 'Goliath') {
    slots.push({ id: 'Athletics', defaultSkill: 'Athletics', rank: 2, source: 'Goliath: Natural Athlete' });
  } else if (raceName === 'Dwarf') {
    slots.push({ id: 'Arts & Craft', defaultSkill: 'Arts & Craft', rank: 2, source: 'Dwarf: Crafty' });
  } else if (raceName === 'Gnome' && subraceName === 'Rock Gnome') {
    slots.push({ id: 'Academics', defaultSkill: 'Academics', rank: 2, source: 'Rock Gnome: Tinker' });
  }
  return slots;
}

export function getRacialSkillBenefits(state: any, raceData: any[] = RACES): RacialSkillBenefits {
  const builtInRanks: Record<string, number> = {};
  const builtInAcademics: Record<string, number> = {};
  let racialFree = 0;
  let racialRestrictSkills: string[] | null = null;

  const { raceName, subraceName } = resolveRaceAndSubrace(state);
  if (!raceName) {
    return { builtInRanks, builtInAcademics, racialFree, racialRestrictSkills };
  }

  const raceState = state?.race ?? state?.raceState ?? {};
  const manualRaces = raceState.manualRaces ?? state?.manualRaces ?? false;
  const skillOverrides: Record<string, string> = raceState.racialSkillOverrides ?? state?.racialSkillOverrides ?? {};

  const resolveSkill = (defaultSkill: string): string => {
    if (manualRaces && skillOverrides[defaultSkill]) {
      return skillOverrides[defaultSkill];
    }
    return defaultSkill;
  };

  /*
   * Racial skill points and built-in ranks derived from races.toml:
   * - Dwarf: "Crafty" grants 2 skill points in Arts & Craft (Rank 2).
   * - Elf: "Keen Senses" grants 2 skill points in Perception (Rank 2).
   * - Garden Elf: "Mental Acumen" grants 4 skill points restricted to Academics, Arts & Craft, Medicine, Occult.
   * - Wood Elf: "Woodland Athleticism" grants 1 skill point in Athletics (Rank 1).
   * - Rock Gnome: "Tinker" grants 2 skill points in Academics (Tinkering) (Rank 2).
   * - Goliath: "Natural Athlete" grants 2 skill points in Athletics (Rank 2).
   * - Half-Elf: "Skill Versatility" grants 4 free skill points unconstrained.
   */
  if (raceName === 'Dwarf') {
    const chosenSkill = resolveSkill('Arts & Craft');
    builtInRanks[chosenSkill] = (builtInRanks[chosenSkill] ?? 0) + 2;
  } else if (raceName === 'Elf') {
    const chosenPerception = resolveSkill('Perception');
    builtInRanks[chosenPerception] = (builtInRanks[chosenPerception] ?? 0) + 2;
    if (subraceName === 'Garden') {
      racialFree += 4;
      racialRestrictSkills = ['Academics', 'Arts & Craft', 'Medicine', 'Occult'];
    } else if (subraceName === 'Wood') {
      const chosenAthletics = resolveSkill('Athletics');
      builtInRanks[chosenAthletics] = (builtInRanks[chosenAthletics] ?? 0) + 1;
    }
  } else if (raceName === 'Gnome') {
    if (subraceName === 'Rock Gnome') {
      const chosenSkill = resolveSkill('Academics');
      if (chosenSkill === 'Academics') {
        builtInAcademics['Tinkering'] = 2;
      } else {
        builtInRanks[chosenSkill] = (builtInRanks[chosenSkill] ?? 0) + 2;
      }
    }
  } else if (raceName === 'Goliath') {
    const chosenAthletics = resolveSkill('Athletics');
    builtInRanks[chosenAthletics] = (builtInRanks[chosenAthletics] ?? 0) + 2;
  } else if (raceName.toLowerCase() === 'half-elf') {
    racialFree += 4;
  }

  return {
    builtInRanks,
    builtInAcademics,
    racialFree,
    racialRestrictSkills,
  };
}

export function hasRacialFreeCantrip(state: any, raceData: any[] = RACES): boolean {
  const { raceName, subraceName } = resolveRaceAndSubrace(state);
  return raceName === 'Elf' && subraceName === 'Garden';
}

export function getRacialSpells(state: any, raceData: any[] = RACES): RacialSpell[] {
  const spells: RacialSpell[] = [];
  const { raceName, subraceName } = resolveRaceAndSubrace(state);
  const currentLevel = state?.identity?.level ?? state?.level ?? 1;

  if (!raceName) return spells;

  /*
   * Genasi racial spells cast as Soul Mastery once per long rest (or at will for cantrips).
   */
  if (raceName === 'Genasi') {
    if (subraceName === 'Air Genasi') {
      spells.push({
        name: 'Levitate',
        level: 2,
        isCantrip: false,
        source: 'Air Genasi: Mingle with the Wind',
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 1,
        available: currentLevel >= 1,
      });
    } else if (subraceName === 'Earth Genasi') {
      spells.push({
        name: 'Pass Without Trace',
        level: 2,
        isCantrip: false,
        source: 'Earth Genasi: Merge with Stone',
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 1,
        available: currentLevel >= 1,
      });
    } else if (subraceName === 'Fire Genasi') {
      spells.push({
        name: 'Create Bonfire',
        level: 0,
        isCantrip: true,
        source: 'Fire Genasi: Reach to the Blaze',
        castingFrequency: 'At will (Soul Mastery)',
        minLevel: 1,
        available: currentLevel >= 1,
      });
      spells.push({
        name: 'Burning Hands',
        level: 1,
        isCantrip: false,
        source: 'Fire Genasi: Reach to the Blaze',
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 3,
        available: currentLevel >= 3,
      });
    } else if (subraceName === 'Water Genasi') {
      spells.push({
        name: 'Shape Water',
        level: 0,
        isCantrip: true,
        source: 'Water Genasi: Call to the Wave',
        castingFrequency: 'At will (Soul Mastery)',
        minLevel: 1,
        available: currentLevel >= 1,
      });
      spells.push({
        name: 'Create or Destroy Food and Water',
        level: 2,
        isCantrip: false,
        source: 'Water Genasi: Call to the Wave',
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 3,
        available: currentLevel >= 3,
      });
    }
  } else if (raceName === 'Gnome' && subraceName === 'Forest Gnome') {
    spells.push({
      name: 'Minor Illusion',
      level: 0,
      isCantrip: true,
      source: 'Forest Gnome: Natural Illusionist',
      castingFrequency: 'At will (Soul Mastery)',
      minLevel: 1,
      available: currentLevel >= 1,
    });
    spells.push({
      name: 'Animal Connection',
      level: 1,
      isCantrip: false,
      source: 'Forest Gnome: Beast Whisperer',
      castingFrequency: '1/long rest (Soul Mastery)',
      minLevel: 1,
      available: currentLevel >= 1,
    });
  } else if (raceName === 'Tiefling') {
    const tieflingSpellMap: Record<string, { cantrip: string; lvl3: string; lvl5: string }> = {
      Amaknuphis: { cantrip: 'Chill Touch', lvl3: 'Suggestion', lvl5: 'Ray of Enfeeblement' },
      Bazilius: { cantrip: 'Poison Spray', lvl3: 'Blur', lvl5: 'Invisibility' },
      Djosqet: { cantrip: 'Frostbite', lvl3: 'Armor of Life', lvl5: 'Enhance Ability' },
      Hori: { cantrip: 'Prestidigitation', lvl3: 'Enthrall', lvl5: 'Alter Self' },
      Melanthiosia: { cantrip: 'Thaumaturgy', lvl3: 'Hellish Rebuke', lvl5: 'Darkness' },
      Mennem: { cantrip: 'Guidance', lvl3: 'Augury', lvl5: 'Locate Object' },
    };

    const entry = tieflingSpellMap[subraceName];
    if (entry) {
      spells.push({
        name: entry.cantrip,
        level: 0,
        isCantrip: true,
        source: `Tiefling (${subraceName}): Infernal Legacy`,
        castingFrequency: 'At will (Soul Mastery)',
        minLevel: 1,
        available: currentLevel >= 1,
      });
      spells.push({
        name: entry.lvl3,
        level: 2,
        isCantrip: false,
        source: `Tiefling (${subraceName}): Infernal Legacy`,
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 3,
        available: currentLevel >= 3,
      });
      spells.push({
        name: entry.lvl5,
        level: 2,
        isCantrip: false,
        source: `Tiefling (${subraceName}): Infernal Legacy`,
        castingFrequency: '1/long rest (Soul Mastery)',
        minLevel: 5,
        available: currentLevel >= 5,
      });
    }
  } else if (raceName === 'Malakhim' && subraceName === 'Nemaneres') {
    spells.push({
      name: 'Zone of Truth',
      level: 2,
      isCantrip: false,
      source: 'Malakhim (Nemaneres): Radiant Soul',
      castingFrequency: '1/long rest during Radiant Soul (Soul Mastery)',
      minLevel: 3,
      available: currentLevel >= 3,
    });
  }

  return spells;
}

export function getCharacterSpeed(state: any, raceData: any[] = RACES): number {
  if (!state) return 6;
  if (state?.race === 'Custom' || state?.raceState?.race === 'Custom') {
    const customSpeed = state?.customRace?.speed ?? state?.raceState?.customRace?.speed;
    if (typeof customSpeed === 'number' && !isNaN(customSpeed)) {
      return customSpeed;
    }
  }

  const { raceName, subraceName } = resolveRaceAndSubrace(state);
  const dataList = Array.isArray(raceData) ? raceData : RACES;
  const raceObj = dataList.find((r: any) => r?.name === raceName);
  if (raceObj?.subraces && subraceName) {
    const sub = raceObj.subraces.find((s: any) => s?.name === subraceName);
    if (typeof sub?.speed === 'number') {
      return sub.speed;
    }
  }

  return raceObj?.speed ?? 6;
}
