import tomlData from './toml/feats.toml';

export interface FeatAbilityScoreIncrease {
  choices: string[];
  value: number;
}

export interface FeatSkillRank {
  skill: string;
  rank: number;
  allow_rank_5?: boolean;
}

export interface FeatSavingThrow {
  stat: string;
  bonus: number;
}

export interface FeatItem {
  id: string;
  name: string;
  category: 'General Feats' | 'Weapon Feats' | 'Armor Feats' | 'Skill Feats' | 'Tool Feats' | string;
  prerequisite: string;
  desc: string;
  ability_score_increase?: FeatAbilityScoreIncrease;
  skill_ranks?: FeatSkillRank[];
  armor_proficiencies?: string[];
  weapon_proficiencies?: string[];
  saving_throws?: FeatSavingThrow[];
  ac_bonus?: number;
}

const rawFeats = Array.isArray(tomlData) ? tomlData : ((tomlData as any).feats ?? []);

export const FEATS: FeatItem[] = (rawFeats as any[])
  .map((f: any) => ({
    id: `${f.category}-${f.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: f.name,
    category: f.category,
    prerequisite: f.prerequisite ?? '',
    desc: f.desc ?? '',
    ability_score_increase: f.ability_score_increase,
    skill_ranks: f.skill_ranks,
    armor_proficiencies: f.armor_proficiencies,
    weapon_proficiencies: f.weapon_proficiencies,
    saving_throws: f.saving_throws,
    ac_bonus: f.ac_bonus
  }))
  .sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

export function getFeats(): FeatItem[] {
  return FEATS;
}

export function getFeatByName(name: string): FeatItem | undefined {
  if (!name) return undefined;
  const cleanName = name.trim().toLowerCase();
  return FEATS.find(f => f.name.toLowerCase() === cleanName);
}

export function getFeatById(id: string): FeatItem | undefined {
  return FEATS.find(f => f.id === id);
}

export function getFeatsByCategory(category: string): FeatItem[] {
  return FEATS.filter(f => f.category === category);
}

export function parseFeatChoice(choiceString: string): { featName: string; chosenStat?: string } | null {
  if (!choiceString) return null;
  const trimmed = choiceString.trim();

  // If choiceString is "+2 Brawn" or similar ASI, it's not a feat
  if (/^\+[12]\s+/i.test(trimmed)) return null;

  // Format: "Feat: FeatName [Stat]" or "Feat: FeatName (Stat)" or "Feat: FeatName"
  const featPrefixMatch = trimmed.match(/^Feat:\s*([^\[\(]+)(?:[\[\(]([^\]\)]+)[\]\)])?/i);
  if (featPrefixMatch) {
    const featName = featPrefixMatch[1].trim();
    const chosenStat = featPrefixMatch[2]?.trim();
    return { featName, ...(chosenStat ? { chosenStat } : {}) };
  }

  // Format directly: "FeatName [Stat]" or "FeatName"
  const bracketMatch = trimmed.match(/^([^\[\(]+)(?:[\[\(]([^\]\)]+)[\]\)])?$/);
  if (bracketMatch) {
    const candidateName = bracketMatch[1].trim();
    const candidateStat = bracketMatch[2]?.trim();
    const feat = getFeatByName(candidateName);
    if (feat) {
      return { featName: feat.name, ...(candidateStat ? { chosenStat: candidateStat } : {}) };
    }
  }

  return null;
}

export function getSelectedFeats(state: any): { feat: FeatItem; chosenStat?: string; level: number }[] {
  const levelSelections = state?.ao?.levelSelections ?? state?.levelSelections ?? {};
  const currentLevel = state?.identity?.level ?? state?.level ?? 1;
  const results: { feat: FeatItem; chosenStat?: string; level: number }[] = [];

  for (let l = 1; l <= currentLevel; l++) {
    const sel = levelSelections[l];
    if (!sel?.upgradeChoices) continue;
    for (const choiceStr of Object.values(sel.upgradeChoices as Record<string, string>)) {
      if (!choiceStr) continue;
      const parsed = parseFeatChoice(choiceStr);
      if (parsed) {
        const feat = getFeatByName(parsed.featName);
        if (feat) {
          results.push({ feat, chosenStat: parsed.chosenStat, level: l });
        }
      }
    }
  }
  return results;
}

export function checkFeatPrerequisites(
  feat: FeatItem,
  state: any,
  providedFinalStats?: Record<string, number>
): { met: boolean; reason?: string } {
  const prereq = (feat.prerequisite ?? '').trim();
  if (!prereq) {
    return { met: true };
  }

  const finalStats = providedFinalStats ?? state?.finalCharacteristics ?? state?.baseCharacteristics ?? {
    Brawn: 10, Dexterity: 10, Vitality: 10, Intelligence: 10,
    Cunning: 10, Resolve: 10, Presence: 10, Manipulation: 10, Composure: 10
  };
  const armorProfs = state?.proficiencies?.armorProficiencies ?? state?.armorProficiencies ?? {};

  // 1. Ability Score check: e.g. "Dexterity 13 or higher", "Presence or Manipulation 13 or higher"
  const scoreMatch = prereq.match(/([A-Za-z\s]+?)\s+(\d+)\s+or\s+higher/i);
  if (scoreMatch) {
    const rawStatsPart = scoreMatch[1];
    const threshold = parseInt(scoreMatch[2], 10);
    const statCandidates = rawStatsPart
      .split(/\bor\b/i)
      .map(s => s.trim())
      .filter(Boolean);

    const meetsAny = statCandidates.some(stat => (finalStats[stat] ?? 10) >= threshold);
    if (!meetsAny) {
      const statsDetail = statCandidates
        .map(stat => `${stat} ${finalStats[stat] ?? 10}`)
        .join(', ');
      return {
        met: false,
        reason: `Requires ${rawStatsPart} ${threshold} or higher (Current: ${statsDetail})`
      };
    }
  }

  // 2. Armor Proficiency check (Hierarchical: Heavy includes Medium and Light; Medium includes Light)
  const effectiveArmorProfs = { ...armorProfs };
  const selectedFeats = getSelectedFeats(state);
  for (const { feat: f } of selectedFeats) {
    if (f.armor_proficiencies) {
      for (const p of f.armor_proficiencies) {
        effectiveArmorProfs[p] = true;
      }
    }
  }

  const hasHeavyArmor = Boolean(effectiveArmorProfs.Heavy);
  const hasMediumArmor = Boolean(hasHeavyArmor || effectiveArmorProfs.Medium);
  const hasLightArmor = Boolean(hasMediumArmor || effectiveArmorProfs.Light);

  if (/Light Armor Proficiency/i.test(prereq)) {
    if (!hasLightArmor) {
      return { met: false, reason: 'Requires Light Armor Proficiency' };
    }
  }
  if (/Medium armor proficiency/i.test(prereq)) {
    if (!hasMediumArmor) {
      return { met: false, reason: 'Requires Medium Armor Proficiency' };
    }
  }
  if (/Heavy armor proficiency/i.test(prereq)) {
    if (!hasHeavyArmor) {
      return { met: false, reason: 'Requires Heavy Armor Proficiency' };
    }
  }

  // 3. Spellcasting check: e.g. "The ability to cast at least one spell"
  if (/ability to cast at least one spell/i.test(prereq)) {
    const spellList = state?.spellcasting?.spells ?? [];
    const cantripList = state?.spellcasting?.cantrips ?? [];
    const hasSpells = spellList.length > 0 || cantripList.length > 0;
    const tier = state?.ao?.primaryAOSpellcasting ?? '';
    const hasCastingAO = tier && tier !== 'None';
    if (!hasSpells && !hasCastingAO) {
      return { met: false, reason: 'Requires the ability to cast at least one spell' };
    }
  }

  return { met: true };
}
