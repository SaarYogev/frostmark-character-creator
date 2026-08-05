export type SpellcastingTier = 'Minor' | 'Moderate' | 'Major';

export interface OriginData {
  name: string;
  hd: number;
  extraSkills: number;
  spellcasting: SpellcastingTier;
  desc: string;
}

export interface CustomOrigin {
  name: string;
  hd: number;
  extraSkills: number;
  spellcasting: SpellcastingTier;
  desc: string;
}

export const DEFAULT_CUSTOM_ORIGIN: CustomOrigin = {
  name: '',
  hd: 8,
  extraSkills: 0,
  spellcasting: 'Minor',
  desc: '',
};

export interface AbilityItem {
  id: string;
  name: string;
  origin: string;
  level: number;
  selection: string;
  short_desc: string;
  full_desc?: string;
}

export interface LevelSelection {
  primaryAO: string;
  secondaryAO: string;
  primaryAbility: string;
  secondaryAbility: string;
  upgradeChoices?: Record<string, string>;
}

export interface AOState {
  primaryAO: string;
  secondaryAO: string;
  primaryAOHD: number;
  primaryAOSpellcasting: SpellcastingTier;
  selectedAOs: string[];
  customAOs: CustomOrigin[];
  customPrimaryAO: CustomOrigin;
  customSecondaryAO: CustomOrigin;
  levelSelections: Record<number, LevelSelection>;
}

export const DEFAULT_AO_STATE: AOState = {
  primaryAO: '',
  secondaryAO: '',
  primaryAOHD: 8,
  primaryAOSpellcasting: 'Minor',
  selectedAOs: [],
  customAOs: [],
  customPrimaryAO: DEFAULT_CUSTOM_ORIGIN,
  customSecondaryAO: DEFAULT_CUSTOM_ORIGIN,
  levelSelections: {},
};
