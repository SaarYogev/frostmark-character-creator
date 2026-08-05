export interface Background { 
  name: string; 
  skills: string[]; 
  gold: number; 
  equipment: string; 
  trait: string; 
  desc: string; 
  freeSkillPoints?: number; 
  builtInRanks?: Record<string, number>; 
  builtInAcademics?: Record<string, number>; 
  originRestriction?: string; 
  restrictSkills?: string[]; 
  image?: string; 
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