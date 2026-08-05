export interface SkillDefinition {
  name: string;
  stats: [string, string?];
  key: string;
}

export interface CustomSkillEntry {
  name: string;
  rank: number;
}

export interface SkillsState {
  skillRanks: Record<string, number>;
  academicsEntries: CustomSkillEntry[];
  artsCraftEntries: CustomSkillEntry[];
  manualSkills: boolean;
}

export const DEFAULT_SKILLS_STATE: SkillsState = {
  skillRanks: {},
  academicsEntries: [],
  artsCraftEntries: [],
  manualSkills: false,
};
