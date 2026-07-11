import tomlData from './spells.toml';
import tomlOverrides from './spells_override.toml';

// Merge overrides into base data (runtime-only; spells.toml stays untouched)
const merged = { ...tomlData };
for (const [name, override] of Object.entries(tomlOverrides)) {
  if (merged[name]) {
    merged[name] = { ...merged[name], ...override };
  }
}

// Export sorted list of cantrips (level 0)
export const CANTRIPS = Object.entries(merged)
  .map(([name, data]) => ({ name, ...data }))
  .filter(spell => spell.level === 0)
  .sort((a, b) => a.name.localeCompare(b.name));

// Export list of active spells (level 1-9)
export const SPELLS = Object.entries(merged)
  .map(([name, data]) => ({ name, ...data }))
  .filter(spell => spell.level > 0);

// Export spell limit rules matching slot types
export const SPELLCASTING_POTENTIAL_LIMITS = {
  1: { Minor: 20, Moderate: 40, Major: 60 },
  2: { Minor: 20, Moderate: 40, Major: 60 },
  3: { Minor: 20, Moderate: 40, Major: 60 },
  4: { Minor: 20, Moderate: 40, Major: 60 },
  5: { Minor: 20, Moderate: 40, Major: 60 },
  6: { Minor: 20, Moderate: 40, Major: 60 },
  7: { Minor: 20, Moderate: 40, Major: 60 },
  8: { Minor: 20, Moderate: 40, Major: 60 },
  9: { Minor: 20, Moderate: 40, Major: 60 }
};