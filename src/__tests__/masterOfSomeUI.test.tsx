import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { CharacterProvider, useCharacter } from '../contexts/CharacterContext';
import AOSelector from '../components/AOSelector';
import SkillsSelector from '../components/SkillsSelector';

describe('Master of Some UI Component Integration', () => {
  it('enforces mutual exclusivity between Master of Some and Jack of all Trades in AOSelector', () => {
    const ComponentWrapper: React.FC = () => {
      const { dispatch } = useCharacter();
      React.useEffect(() => {
        dispatch({
          type: 'SET_AO',
          payload: {
            selectedAOs: ['Artistry'],
            primaryAO: 'Artistry',
            secondaryAO: 'Artistry',
            levelSelections: {
              1: {
                primaryAO: 'Artistry',
                secondaryAO: 'Artistry',
                primaryAbility: 'artistry-1-primary-inspiration',
                secondaryAbility: 'artistry-1-secondary-master-of-some',
              },
            },
          },
        });
      }, [dispatch]);

      return <AOSelector />;
    };

    render(
      <CharacterProvider>
        <ComponentWrapper />
      </CharacterProvider>
    );

    // Look for the "Jack Of All Trades" card
    const jackCards = screen.getAllByText('Jack Of All Trades');
    expect(jackCards.length).toBeGreaterThan(0);

    const jackCard = jackCards[0].closest('.ability-card');
    expect(jackCard).toHaveClass('disabled');
    expect(jackCard).toHaveAttribute(
      'title',
      'Cannot pick Jack of all Trades: Master of Some is already selected.'
    );
  });

  it('renders the Master of Some banner and checklist in SkillsSelector', () => {
    const ComponentWrapper: React.FC = () => {
      const { dispatch } = useCharacter();
      React.useEffect(() => {
        dispatch({
          type: 'SET_AO',
          payload: {
            selectedAOs: ['Artistry'],
            primaryAO: 'Artistry',
            secondaryAO: 'Artistry',
            levelSelections: {
              1: {
                primaryAO: 'Artistry',
                secondaryAO: 'Artistry',
                primaryAbility: 'artistry-1-primary-inspiration',
                secondaryAbility: 'artistry-1-secondary-master-of-some',
              },
            },
          },
        });
        dispatch({
          type: 'SET_SKILLS',
          payload: {
            skillRanks: { Stealth: 1, Perception: 1 },
            academicsEntries: [{ name: 'Arcana', rank: 1 }],
            artsCraftEntries: [{ name: 'Weaving', rank: 1 }],
          },
        });
      }, [dispatch]);

      return <SkillsSelector />;
    };

    render(
      <CharacterProvider>
        <ComponentWrapper />
      </CharacterProvider>
    );

    expect(screen.getByText('Master of Some Active')).toBeInTheDocument();
    expect(screen.getByText('+5 Free Skill Points Granted')).toBeInTheDocument();
    expect(screen.getByText(/1\+ Point in Academics \(Satisfied\)/)).toBeInTheDocument();
    expect(screen.getByText(/1\+ Point in Arts & Craft \(Satisfied\)/)).toBeInTheDocument();
    expect(screen.getByText(/At least 4 different skills \(4 \/ 4\)/)).toBeInTheDocument();
  });

  it('disables skill plus button at rank 2 when Master of Some is active', () => {
    const ComponentWrapper: React.FC = () => {
      const { dispatch } = useCharacter();
      React.useEffect(() => {
        dispatch({
          type: 'SET_AO',
          payload: {
            selectedAOs: ['Artistry'],
            primaryAO: 'Artistry',
            secondaryAO: 'Artistry',
            levelSelections: {
              1: {
                primaryAO: 'Artistry',
                secondaryAO: 'Artistry',
                primaryAbility: 'artistry-1-primary-inspiration',
                secondaryAbility: 'artistry-1-secondary-master-of-some',
              },
            },
          },
        });
        dispatch({
          type: 'SET_SKILLS',
          payload: {
            skillRanks: { Athletics: 2 },
          },
        });
      }, [dispatch]);

      return <SkillsSelector />;
    };

    render(
      <CharacterProvider>
        <ComponentWrapper />
      </CharacterProvider>
    );

    const athleticsRow = document.getElementById('skill-row-Ath');
    expect(athleticsRow).toBeInTheDocument();

    const plusBtn = athleticsRow?.querySelector('.rank-btn.plus') as HTMLButtonElement;
    expect(plusBtn).toBeDisabled();
    expect(plusBtn).toHaveAttribute(
      'title',
      'Master of Some restricts all skill ranks to a maximum of 2.'
    );
  });
});
