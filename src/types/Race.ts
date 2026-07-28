// Import races from the JavaScript file which handles TOML import at build time
// This is a type-only import for TypeScript compilation
// The actual import will be handled by Vite at runtime

export interface Trait {
  name: string;
  desc: string;
}

export interface StatBonuses {
  Brawn?: number;
  Dexterity?: number;
  Vitality?: number;
  Intelligence?: number;
  Cunning?: number;
  Resolve?: number;
  Presence?: number;
  Manipulation?: number;
  Composure?: number;
  choice?: string[];
  value?: number;
  flexiblePoints?: number;
}

export interface Subrace {
  name: string;
  stats: StatBonuses;
  traits?: Trait[];
  speed?: number;
  size?: string;
  languages?: string[];
}

export interface RaceData {
  name: string;
  stats: StatBonuses;
  speed: number;
  size: string;
  languages: string[];
  traits: Trait[];
  subraces?: Subrace[];
}

export interface CustomRace {
  name: string;
  stats: StatBonuses;
  speed: number;
  languages: string[];
  traits: Trait[];
}

export interface RaceState {
  race: string;
  subrace: string;
  customRace?: CustomRace;
  manualRaces: boolean;
  racialStatOverrides: Record<string, number>;
  woodElfChoice: string;
  halfElfChoice1: string;
  halfElfChoice2: string;
}

export const DEFAULT_RACE_STATE: RaceState = {
  race: '',
  subrace: '',
  customRace: {
    name: '',
    stats: {},
    speed: 6,
    languages: [],
    traits: [],
  },
  manualRaces: false,
  racialStatOverrides: {},
  woodElfChoice: '',
  halfElfChoice1: '',
  halfElfChoice2: '',
};

export type Size = 'Small' | 'Medium' | 'Large';

export const CHARACTERISTICS = [
  'Brawn', 'Dexterity', 'Vitality', 'Intelligence', 'Cunning', 
  'Resolve', 'Presence', 'Manipulation', 'Composure'
] as const;

export type Characteristic = typeof CHARACTERISTICS[number];

// Race enum for type safety
export enum Race {
  Dwarf = 'Dwarf',
  Elf = 'Elf',
  Genasi = 'Genasi',
  Gnome = 'Gnome',
  Goliath = 'Goliath',
  HalfElf = 'Half-elf',
  Halfling = 'Halfling',
  HalfOrc = 'Half-Orc',
  Malakhim = 'Malakhim',
  Tiefling = 'Tiefling',
  Dragonborn = 'Dragonborn',
  Human = 'Human',
  Custom = 'Custom'
}
