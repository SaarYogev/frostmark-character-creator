export interface Background { 
  name: string; 
  skills: string[]; 
  gold: number; 
  equipment: string; 
  trait: string; 
  desc: string; 
  category?: 'General' | 'Kingdom';
  kingdom?: string;
  origin?: string;
  bond?: string;
  wikiTrait?: string;
  legacyTrait?: string;
  traitDesc?: string;
  freeSkillPoints?: number;
  builtInRanks?: Record<string, number>;
  builtInAcademics?: Record<string, number>;
  originRestriction?: string;
  restrictSkills?: string[];
  image?: string;
  isCustom?: boolean;
}

export const DEFAULT_BACKGROUND: Background = {
  name: '',
  skills: [],
  gold: 0,
  equipment: '',
  trait: '',
  desc: '',
  freeSkillPoints: 0,
  builtInRanks: {},
  builtInAcademics: {},
};