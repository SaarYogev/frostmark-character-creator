import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CharacterState, DEFAULT_CHARACTER, CharacterAction, characterReducer } from '../types/Character';

interface CharacterContextType {
  state: CharacterState;
  dispatch: React.Dispatch<CharacterAction>;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(characterReducer, DEFAULT_CHARACTER);

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
