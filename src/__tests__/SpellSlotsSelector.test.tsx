import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { CharacterProvider } from '../contexts/CharacterContext';
import SpellSlotsSelector from '../components/SpellSlotsSelector';

describe('SpellSlotsSelector', () => {
  it('renders without throwing ReferenceError for cantrips', () => {
    render(
      <CharacterProvider>
        <SpellSlotsSelector />
      </CharacterProvider>
    );

    expect(screen.getByRole('heading', { level: 2, name: /Spell Slots/i })).toBeInTheDocument();
    expect(screen.getAllByText(/0\s*\/\s*5/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Potential Remaining:/i)).toBeInTheDocument();
  });

  it('correctly calculates potential remaining when character has spellbook ability and free spells', () => {
    const spellbookState = {
      identity: { level: 1, campaignPowerLevel: 'Heroic' as const },
      level: 1,
      ao: {
        pool: ['Occult Student'],
        levelSelections: {
          1: {
            primaryAO: 'Occult Student',
            secondaryAO: '',
            primaryAbility: '',
            secondaryAbility: 'occult-student-1-secondary-spellbook',
          },
        },
      },
      spellcasting: {
        cantrips: ['Light'],
        spells: [
          { name: 'Shield', level: 1 },
          { name: 'Misty Step', level: 2 },
        ],
        spellbookSpells: ['Shield', 'Misty Step'],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      },
    };

    render(
      <CharacterProvider initialState={spellbookState as any}>
        <SpellSlotsSelector />
      </CharacterProvider>
    );

    expect(screen.getByText(/1\s*\/\s*5/)).toBeInTheDocument();
  });

  it('allows incrementing and decrementing spell slots', () => {
    render(
      <CharacterProvider>
        <SpellSlotsSelector />
      </CharacterProvider>
    );

    const plusButtons = screen.getAllByRole('button', { name: '+' });
    fireEvent.click(plusButtons[0]);

    const minusButtons = screen.getAllByRole('button', { name: /−|-/ });
    fireEvent.click(minusButtons[0]);
  });
});
