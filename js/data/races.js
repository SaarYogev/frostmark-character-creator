import raceTomlData from './races.toml';

// Vite's TOML loader wraps array-of-tables ([[races]]) as { races: [...] }
const rawRaces = Array.isArray(raceTomlData) ? raceTomlData : (raceTomlData.races ?? []);

// Convert TOML race data to RaceData format
export const RACES = rawRaces.map((race) => ({
  name: race.name,
  stats: race.stats || {},
  speed: race.speed || 6,
  size: race.size || 'Medium',
  languages: race.languages || [],
  traits: race.traits ? race.traits.map((trait) => ({
    name: trait.name,
    desc: trait.desc
  })) : [],
  subraces: race.subraces ? race.subraces.map((subrace) => ({
    name: subrace.name,
    stats: subrace.stats || {},
    traits: subrace.traits ? subrace.traits.map((trait) => ({
      name: trait.name,
      desc: trait.desc
    })) : [],
    speed: subrace.speed,
    size: subrace.size,
    languages: subrace.languages
  })) : []
}));
