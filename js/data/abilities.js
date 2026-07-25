import tomlData from './abilities.toml';

// Vite's TOML loader wraps array-of-tables ([[abilities]]) as { abilities: [...] }
const rawAbilities = Array.isArray(tomlData) ? tomlData : (tomlData.abilities ?? []);

// Export sorted list of abilities with unique IDs
export const ABILITIES = rawAbilities
  .map((ability, idx) => ({
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

// Export helper functions
export function getAbilitiesByOrigin(origin) {
  return ABILITIES.filter(a => a.origin === origin);
}

export function getAbilitiesByLevel(level) {
  return ABILITIES.filter(a => a.level === level);
}

export function getAbilitiesByOriginAndLevel(origin, level) {
  return ABILITIES.filter(a => a.origin === origin && a.level === level);
}

export function getAbilitiesBySelection(level, selectionType) {
  return ABILITIES.filter(a => a.level === level && a.selection === selectionType);
}

export function getAbilityByName(name) {
  return ABILITIES.find(a => a.name === name);
}

export function getAbilityById(id) {
  return ABILITIES.find(a => a.id === id);
}

export function getAbilitiesForLevel(level, selectionType, origin) {
  return ABILITIES.filter(a => 
    a.level === level && 
    a.selection === selectionType && 
    a.origin === origin
  );
}
