import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { CharacterProvider } from '../contexts/CharacterContext';
import SpellsSelector from '../components/SpellsSelector';

describe('SpellsSelector', () => {
  const renderComponent = () => {
    return render(
      <CharacterProvider>
        <SpellsSelector />
      </CharacterProvider>
    );
  };

  it('renders spell selection step header and controls', () => {
    renderComponent();
    expect(screen.getByText(/Spell Selection/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search spells…/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Add filter/i)).toBeInTheDocument();
  });

  it('includes Ritual in the filter catalog dropdown', () => {
    renderComponent();
    const addFilterSelect = screen.getByDisplayValue(/\+ Add filter/i) as HTMLSelectElement;
    const options = Array.from(addFilterSelect.options).map(o => o.text);
    expect(options).toContain('Ritual');
    expect(options).toContain('Concentration');
    expect(options).toContain('Schools');
    expect(options).toContain('Levels');
  });

  it('allows adding the Ritual filter and toggling Yes/No', () => {
    renderComponent();
    const addFilterSelect = screen.getByDisplayValue(/\+ Add filter/i);

    // Add Ritual filter
    fireEvent.change(addFilterSelect, { target: { value: 'ritual' } });
    expect(screen.getAllByText('Ritual').length).toBeGreaterThan(0);

    // Check Yes and No filter buttons exist
    const yesBtn = screen.getByRole('button', { name: 'Yes' });
    const noBtn = screen.getByRole('button', { name: 'No' });
    expect(yesBtn).toBeInTheDocument();
    expect(noBtn).toBeInTheDocument();

    // Filter by Ritual: Yes
    fireEvent.click(yesBtn);
    expect(screen.getByText('Alarm')).toBeInTheDocument();
    expect(screen.getByText('Detect Magic')).toBeInTheDocument();
    expect(screen.queryByText('Fireball')).not.toBeInTheDocument();
    expect(screen.queryByText('Shield')).not.toBeInTheDocument();

    // Filter by Ritual: No
    fireEvent.click(noBtn);
    expect(screen.queryByText('Alarm')).not.toBeInTheDocument();
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
  });

  it('displays Ritual tag and stat in active spell detail card', () => {
    renderComponent();

    // Click on Alarm (which is a ritual spell)
    const alarmEntry = screen.getByText('Alarm').closest('.spell-entry')!;
    fireEvent.click(alarmEntry);

    // Detail card should display Ritual tag and stat
    const detailCard = document.querySelector('.spell-detail-card')!;
    expect(detailCard).toBeInTheDocument();
    expect(detailCard.querySelector('.ritual-tag')).toBeInTheDocument();
    expect(detailCard.querySelector('.ritual-tag')?.textContent).toBe('Ritual');

    // Stats section should show Ritual: Yes
    const statItems = Array.from(detailCard.querySelectorAll('.stat-item'));
    const ritualStat = statItems.find(item => item.querySelector('strong')?.textContent === 'Ritual');
    expect(ritualStat).toBeDefined();
    expect(ritualStat?.querySelector('span')?.textContent).toBe('Yes');

    // Click on Shield (which is not a ritual spell)
    const shieldEntry = screen.getByText('Shield').closest('.spell-entry')!;
    fireEvent.click(shieldEntry);

    const updatedDetailCard = document.querySelector('.spell-detail-card')!;
    expect(updatedDetailCard.querySelector('.ritual-tag')).toBeNull();
    const updatedStatItems = Array.from(updatedDetailCard.querySelectorAll('.stat-item'));
    const updatedRitualStat = updatedStatItems.find(item => item.querySelector('strong')?.textContent === 'Ritual');
    expect(updatedRitualStat?.querySelector('span')?.textContent).toBe('No');
  });

  it('renders ritual badge R on ritual spell entries in the grid', () => {
    renderComponent();

    const alarmEntry = screen.getByText('Alarm').closest('.spell-entry')!;
    const ritualBadge = alarmEntry.querySelector('.spell-tag-badge.ritual');
    expect(ritualBadge).toBeInTheDocument();
    expect(ritualBadge?.textContent).toBe('R');

    const shieldEntry = screen.getByText('Shield').closest('.spell-entry')!;
    expect(shieldEntry.querySelector('.spell-tag-badge.ritual')).toBeNull();
  });

  it('allows removing the Ritual filter', () => {
    renderComponent();
    const addFilterSelect = screen.getByDisplayValue(/\+ Add filter/i);

    fireEvent.change(addFilterSelect, { target: { value: 'ritual' } });
    expect(screen.getAllByText('Ritual').length).toBeGreaterThan(0);

    const removeBtn = screen.getByTitle('Remove filter');
    fireEvent.click(removeBtn);
    expect(document.querySelector('.filter-item strong')?.textContent).not.toBe('Ritual');
  });

  describe('Occult Student Spellbook Ability UI', () => {
    const spellbookStateLevel1 = {
      identity: { level: 1, characterName: 'Mage', playerName: 'Player', campaignPowerLevel: 'Heroic' as const, personalityBackstory: '', appearance: { age: '', height: '', weight: '' } },
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
        cantrips: [],
        spells: [],
        spellbookSpells: [],
        slots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      },
    };

    it('renders the spellbook banner when character has spellbook ability at level 1', () => {
      render(
        <CharacterProvider initialState={spellbookStateLevel1 as any}>
          <SpellsSelector />
        </CharacterProvider>
      );

      expect(screen.getByText(/Occult Student Spellbook/i)).toBeInTheDocument();
      expect(screen.getByText(/Level 1 Starting Free Spells/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Free Spells/i)).toBeInTheDocument();
    });

    it('allows learning a level 1 spell for free and displays [Free] badge in selected list', () => {
      render(
        <CharacterProvider initialState={spellbookStateLevel1 as any}>
          <SpellsSelector />
        </CharacterProvider>
      );

      const shieldEntry = screen.getByText('Shield').closest('.spell-entry')!;
      fireEvent.click(shieldEntry);

      const learnBtns = screen.getAllByRole('button', { name: /Learn Spell/i });
      fireEvent.click(learnBtns[0]);

      expect(screen.getByText(/\[Free\]/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Free Spells \(1\): Shield/i)).toBeInTheDocument();
    });

    it('renders Level 2 discounts in banner and displays discounted cost in detail pane', () => {
      const spellbookStateLevel2 = {
        ...spellbookStateLevel1,
        identity: { ...spellbookStateLevel1.identity, level: 2 },
        level: 2,
      };

      render(
        <CharacterProvider initialState={spellbookStateLevel2 as any}>
          <SpellsSelector />
        </CharacterProvider>
      );

      expect(screen.getByText(/Level 2 Discounts/i)).toBeInTheDocument();

      const shieldEntry = screen.getByText('Shield').closest('.spell-entry')!;
      fireEvent.click(shieldEntry);

      expect(screen.getAllByText(/Discounted: 5 Potential/i).length).toBeGreaterThan(0);
    });
  });
});
