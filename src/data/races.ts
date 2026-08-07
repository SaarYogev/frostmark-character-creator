import raceTomlData from './toml/races.toml';

export interface Trait {
  name: string;
  desc: string;
}

export interface SubraceData {
  name: string;
  stats?: Record<string, number>;
  traits?: Trait[];
  speed?: number;
  size?: string;
  languages?: string[];
}

export interface RaceData {
  name: string;
  stats?: Record<string, number>;
  speed: number;
  size: string;
  languages?: string[];
  traits?: Trait[];
  subraces?: SubraceData[];
}

const rawRaces = Array.isArray(raceTomlData) ? raceTomlData : (raceTomlData.races ?? []);

export const RACES: RaceData[] = rawRaces.map((race: any) => ({
  name: race.name,
  stats: race.stats || {},
  speed: race.speed || 6,
  size: race.size || 'Medium',
  languages: race.languages || [],
  traits: race.traits ? race.traits.map((trait: any) => ({
    name: trait.name,
    desc: trait.desc
  })) : [],
  subraces: race.subraces ? race.subraces.map((subrace: any) => ({
    name: subrace.name,
    stats: subrace.stats || {},
    traits: subrace.traits ? subrace.traits.map((trait: any) => ({
      name: trait.name,
      desc: trait.desc
    })) : [],
    speed: subrace.speed,
    size: subrace.size,
    languages: subrace.languages
  })) : []
}));
