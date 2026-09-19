import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CharacterState, DEFAULT_CHARACTER, CharacterAction, characterReducer } from '../types/Character';

interface CharacterContextType {
  state: CharacterState;
  dispatch: React.Dispatch<CharacterAction>;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export function CharacterProvider({ children, initialState }: { children: ReactNode; initialState?: Partial<CharacterState> }) {
  const resolvedInitialState = initialState
    ? characterReducer(DEFAULT_CHARACTER, { type: 'LOAD_STATE', payload: initialState as CharacterState })
    : DEFAULT_CHARACTER;
  const [state, dispatch] = useReducer(characterReducer, resolvedInitialState);

  return (
    <CharacterContext.Provider value={{ state, dispatch }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (context === undefined) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
}
