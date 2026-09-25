import tomlData from './toml/backgrounds.toml';

export interface BackgroundData {
  name: string;
  skills?: string[];
  gold: number;
  equipment?: string;
  trait?: string;
  wikiTrait?: string;
  legacyTrait?: string;
  traitDesc?: string;
  desc?: string;
  category?: 'General' | 'Kingdom';
  kingdom?: string;
  origin?: string;
  bond?: string;
  freeSkillPoints?: number;
  builtInRanks?: Record<string, number>;
  builtInAcademics?: Record<string, number>;
  originRestriction?: string;
  restrictSkills?: string[];
  image?: string;
}

const rawBackgrounds = Array.isArray(tomlData) ? tomlData : ((tomlData as any).backgrounds ?? []);

export const BACKGROUNDS: BackgroundData[] = (rawBackgrounds as any[]).map((bg) => ({
  name: bg.name,
  skills: Array.isArray(bg.skills) ? bg.skills : [],
  gold: typeof bg.gold === 'number' ? bg.gold : 0,
  equipment: bg.equipment ?? '',
  trait: bg.trait ?? '',
  wikiTrait: bg.wikiTrait,
  legacyTrait: bg.legacyTrait,
  traitDesc: bg.traitDesc,
  desc: bg.desc ?? '',
  category: bg.category,
  kingdom: bg.kingdom,
  origin: bg.origin,
  bond: bg.bond,
  freeSkillPoints: typeof bg.freeSkillPoints === 'number' ? bg.freeSkillPoints : 0,
  builtInRanks: bg.builtInRanks ?? {},
  builtInAcademics: bg.builtInAcademics ?? {},
  originRestriction: bg.originRestriction,
  restrictSkills: Array.isArray(bg.restrictSkills) ? bg.restrictSkills : undefined,
  image: bg.image,
}));

export function getBackgroundByName(name: string): BackgroundData | undefined {
  if (!name) return undefined;
  return BACKGROUNDS.find(bg => bg.name.toLowerCase() === name.toLowerCase());
}

export function getBackgroundsByCategory(category: 'General' | 'Kingdom'): BackgroundData[] {
  return BACKGROUNDS.filter(bg => bg.category === category);
}

export function getBackgroundsByKingdom(kingdom?: string): BackgroundData[] {
  if (!kingdom) return [];
  return BACKGROUNDS.filter(bg => bg.kingdom?.toLowerCase() === kingdom.toLowerCase());
}

export function getKingdoms(): string[] {
  const kingdoms = new Set<string>();
  BACKGROUNDS.forEach(bg => {
    if (bg.category === 'Kingdom' && bg.kingdom) {
      kingdoms.add(bg.kingdom);
    }
  });
  return Array.from(kingdoms).sort();
}
