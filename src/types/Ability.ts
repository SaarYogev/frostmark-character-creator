export type CharacteristicName =
  | 'Brawn'
  | 'Dexterity'
  | 'Vitality'
  | 'Intelligence'
  | 'Cunning'
  | 'Resolve'
  | 'Presence'
  | 'Manipulation'
  | 'Composure';

export interface BaseCharacteristics {
  Brawn: number;
  Dexterity: number;
  Vitality: number;
  Intelligence: number;
  Cunning: number;
  Resolve: number;
  Presence: number;
  Manipulation: number;
  Composure: number;
}

export const MIN_BASE_SCORE = 6;
export const MAX_BASE_SCORE = 17;
export const DEFAULT_BASE_SCORE = 10;

export const DEFAULT_BASE_CHARACTERISTICS: BaseCharacteristics = {
  Brawn: DEFAULT_BASE_SCORE,
  Dexterity: DEFAULT_BASE_SCORE,
  Vitality: DEFAULT_BASE_SCORE,
  Intelligence: DEFAULT_BASE_SCORE,
  Cunning: DEFAULT_BASE_SCORE,
  Resolve: DEFAULT_BASE_SCORE,
  Presence: DEFAULT_BASE_SCORE,
  Manipulation: DEFAULT_BASE_SCORE,
  Composure: DEFAULT_BASE_SCORE,
};
