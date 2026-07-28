import { IdentityState, DEFAULT_IDENTITY } from './Identity';
import { RaceState, DEFAULT_RACE_STATE } from './Race';

export interface CharacterState {
  identity: IdentityState;
  race: RaceState;
}

export const DEFAULT_CHARACTER: CharacterState = {
  identity: DEFAULT_IDENTITY,
  race: DEFAULT_RACE_STATE,
};

export type CharacterAction =
  | { type: 'SET_IDENTITY'; payload: Partial<IdentityState> }
  | { type: 'SET_RACE'; payload: Partial<RaceState> }
  | { type: 'RESET' };

export function characterReducer(state: CharacterState, action: CharacterAction): CharacterState {
  switch (action.type) {
    case 'SET_IDENTITY':
      return {
        ...state,
        identity: {
          ...state.identity,
          ...action.payload,
        },
      };
    case 'SET_RACE':
      return {
        ...state,
        race: {
          ...state.race,
          ...action.payload,
        },
      };
    case 'RESET':
      return DEFAULT_CHARACTER;
    default:
      return state;
  }
}
