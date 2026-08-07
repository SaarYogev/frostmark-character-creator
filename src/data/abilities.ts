import tomlData from './toml/abilities.toml';

export interface AbilityItem {
  id: string;
  name: string;
  origin: string;
  level: number;
  selection: string;
  short_desc: string;
  full_desc: string;
}

// Vite's TOML loader wraps array-of-tables ([[abilities]]) as { abilities: [...] }
const rawAbilities = Array.isArray(tomlData) ? tomlData : ((tomlData as any).abilities ?? []);

// Export sorted list of abilities with unique IDs
export const ABILITIES: AbilityItem[] = (rawAbilities as any[])
  .map((ability) => ({
    id: `${ability.origin}-${ability.level}-${ability.selection}-${ability.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: ability.name,
    origin: ability.origin,
    level: ability.level,
    selection: ability.selection,
    short_desc: ability.short_desc,
    full_desc: ability.full_desc
  }))
  .sort((a, b) => {
    if (a.origin !== b.origin) return a.origin.localeCompare(b.origin);
    if (a.level !== b.level) return a.level - b.level;
    if (a.selection !== b.selection) return a.selection.localeCompare(b.selection);
    return a.name.localeCompare(b.name);
  });

export function getAbilitiesByOrigin(origin: string): AbilityItem[] {
  return ABILITIES.filter(a => a.origin === origin);
}

export function getAbilitiesByLevel(level: number): AbilityItem[] {
  return ABILITIES.filter(a => a.level === level);
}

export function getAbilitiesByOriginAndLevel(origin: string, level: number): AbilityItem[] {
  return ABILITIES.filter(a => a.origin === origin && a.level === level);
}

export function getAbilitiesBySelection(level: number, selectionType: string): AbilityItem[] {
  return ABILITIES.filter(a => a.level === level && a.selection === selectionType);
}

export function getAbilityByName(name: string): AbilityItem | undefined {
  return ABILITIES.find(a => a.name === name);
}

export function getAbilityById(id: string): AbilityItem | undefined {
  return ABILITIES.find(a => a.id === id);
}

export function getAbilitiesForLevel(level: number, selectionType: string, origin: string): AbilityItem[] {
  return ABILITIES.filter(a => 
    a.level === level && 
    a.selection === selectionType && 
    a.origin === origin
  );
}
