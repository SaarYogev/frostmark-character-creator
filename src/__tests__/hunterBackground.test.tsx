import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BACKGROUNDS } from '../data/backgrounds';
import { CharacterProvider } from '../contexts/CharacterContext';
import BackgroundSelector from '../components/BackgroundSelector';
import { computeFreeSkillPools } from '../logic/state';
import { ORIGINS } from '../data/origins';
import { RACES } from '../data/races';

import { CharacterState } from '../types/Character';

const HUNTER_SKILLS = [
  'Animal Handling',
  'Arts & Craft',
  'Athletics',
  'Perception',
  'Stealth',
  'Survival'
];

describe('Hunter Background (Wiki Specification)', () => {
  it('includes Hunter in BACKGROUNDS with accurate wiki data', () => {
    const hunter = BACKGROUNDS.find(b => b.name === 'Hunter');
    expect(hunter).toBeDefined();
    expect(hunter?.name).toBe('Hunter');
    expect(hunter?.gold).toBe(10);
    expect(hunter?.trait).toBe('Expert Survivalist');
    expect(hunter?.freeSkillPoints).toBe(4);

    expect(hunter?.skills).toEqual(expect.arrayContaining(HUNTER_SKILLS));
    expect(hunter?.skills?.length).toBe(6);
    expect(hunter?.restrictSkills).toEqual(expect.arrayContaining(HUNTER_SKILLS));

    expect(hunter?.equipment).toContain("Leatherworker's Tools");
    expect(hunter?.equipment).toContain('10 gp');
    expect(hunter?.desc).toContain('You are a hunter.');
  });

  it('renders Hunter card and shows details when selected in BackgroundSelector', () => {
    render(
      <CharacterProvider>
        <BackgroundSelector />
      </CharacterProvider>
    );

    const hunterCard = screen.getByText('Hunter');
    expect(hunterCard).toBeInTheDocument();

    fireEvent.click(hunterCard);

    expect(screen.getByRole('heading', { level: 3, name: 'Hunter' })).toBeInTheDocument();
    const goldElem = screen.getByText(/Starting Gold:/).parentElement;
    expect(goldElem).toBeTruthy();
    expect(goldElem).toHaveTextContent('10gp');
    expect(screen.getByText(/Expert Survivalist/)).toBeInTheDocument();
    const freeElem = screen.getByText(/Free Skill Points:/).parentElement;
    expect(freeElem).toBeTruthy();
    expect(freeElem).toHaveTextContent('4');
    expect(screen.getByText(new RegExp(HUNTER_SKILLS.join(', ')))).toBeInTheDocument();
  });

  it('computes 4 free skill points restricted to Hunter allowed skills', () => {
    const mockState: Partial<CharacterState> = {
      background: 'Hunter',
      race: { race: 'Human' } as any,
      aoChoices: []
    };

    const pools = computeFreeSkillPools(mockState as CharacterState, BACKGROUNDS, ORIGINS, RACES);
    expect(pools.bgFree).toBe(4);
    expect(pools.restrictSkills).toEqual(expect.arrayContaining(HUNTER_SKILLS));
    expect(pools.restrictSkills?.length).toBe(6);
  });

  it('renders restricted skill badges on allowed Hunter skills in SkillsSelector', async () => {
    const { default: SkillsSelector } = await import('../components/SkillsSelector');
    const hunterBg = BACKGROUNDS.find(b => b.name === 'Hunter');

    render(
      <CharacterProvider
        initialState={{
          background: hunterBg as any,
        }}
      >
        <SkillsSelector />
      </CharacterProvider>
    );

    expect(screen.getByText(/Background Skill Restriction/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(HUNTER_SKILLS.join(', ')))).toBeInTheDocument();

    const survivalRow = screen.getByText('Survival').closest('.skill-row');
    expect(survivalRow).toBeTruthy();
    expect(survivalRow?.querySelector('.restricted-skill-badge')).toBeInTheDocument();

    const persuasionRow = screen.getByText('Persuasion').closest('.skill-row');
    expect(persuasionRow).toBeTruthy();
    expect(persuasionRow?.querySelector('.restricted-skill-badge')).not.toBeInTheDocument();
  });
});
