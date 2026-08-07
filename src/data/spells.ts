import tomlData from './toml/spells.toml';
import tomlOverrides from './toml/spells_override.toml';

export interface SpellData {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: number;
  rangeLabel?: string;
  duration: string;
  concentration: boolean;
  damageTypes?: string[];
  desc: string;
}

// Merge overrides into base data (runtime-only; spells.toml stays untouched)
const merged: Record<string, any> = { ...(tomlData as any) };
for (const [name, override] of Object.entries(tomlOverrides as any)) {
  if (merged[name]) {
    merged[name] = { ...merged[name], ...(override as any) };
  }
}

// Export sorted list of cantrips (level 0)
export const CANTRIPS: SpellData[] = Object.entries(merged)
  .map(([name, data]) => ({ name, ...data }))
  .filter(spell => spell.level === 0)
  .sort((a, b) => a.name.localeCompare(b.name));

// Export list of active spells (level 1-9)
export const SPELLS: SpellData[] = Object.entries(merged)
  .map(([name, data]) => ({ name, ...data }))
  .filter(spell => spell.level > 0);

// Export spell limit rules matching slot types
export const SPELLCASTING_POTENTIAL_LIMITS: Record<number, Record<'Minor' | 'Moderate' | 'Major', number>> = {
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
