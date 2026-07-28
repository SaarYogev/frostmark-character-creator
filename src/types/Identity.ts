export type CampaignPowerLevel = 'Mundane' | 'Heroic' | 'Champion';

export interface Appearance {
  age?: string;
  height?: string;
  weight?: string;
}

export interface IdentityState {
  characterName: string;
  playerName: string;
  campaignPowerLevel: CampaignPowerLevel;
  level: number;
  personalityBackstory: string;
  appearance: Appearance;
}

export const DEFAULT_IDENTITY: IdentityState = {
  characterName: '',
  playerName: '',
  campaignPowerLevel: 'Heroic',
  level: 1,
  personalityBackstory: '',
  appearance: {},
};
