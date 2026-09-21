import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider, useCharacter } from '../contexts/CharacterContext';
import SkillsSelector from '../components/SkillsSelector';
import SpellsSelector from '../components/SpellsSelector';
import SpellSlotsSelector from '../components/SpellSlotsSelector';
import ProficienciesSelector from '../components/ProficienciesSelector';
import AOSelector from '../components/AOSelector';
import { CharacterState } from '../types/Character';

describe('Progression Lockout Enforcement', () => {
  const lockedState: Partial<CharacterState> = {
    identity: {
      characterName: 'Hero',
      playerName: '',
      campaignPowerLevel: 'Heroic',
      level: 2,
      personalityBackstory: '',
      appearance: {},
    },
    skills: {
      skillRanks: { Athletics: 2, Stealth: 1 },
      academicsEntries: [{ name: 'History', rank: 2 }],
      artsCraftEntries: [],
    },
    spellcasting: {
      cantrips: ['Light'],
      spells: [{ name: 'Magic Missile', level: 1 }],
      slots: { 1: 2 },
    } as any,
    proficiencies: {
      savingThrowsProficient: { Brawn: true },
      armorProficiencies: { Light: true },
      weaponProficiencies: ['Axes'],
      languages: [],
      goldAmount: 10,
    },
    ao: {
      selectedAOs: ['Devotion'],
      primaryAO: 'Devotion',
      secondaryAO: '',
      levelSelections: {
        1: {
          primaryAO: 'Devotion',
          secondaryAO: '',
          primaryAbility: 'devotion-1-primary-divine-domain-animation-',
          secondaryAbility: '',
          upgradeChoices: {
            'devotion-1-primary-divine-domain-animation-': '+1 AC',
          },
        },
      },
    } as any,
    lockedChoices: {
      skillRanks: { Athletics: 2 },
      academicsEntries: [{ name: 'History', rank: 2 }],
      artsCraftEntries: [],
      cantrips: ['Light'],
      spells: [{ name: 'Magic Missile', level: 1 }],
      spellSlots: { 1: 2 },
      savingThrowsProficient: { Brawn: true },
      armorProficiencies: { Light: true },
      weaponProficiencies: ['Axes'],
      poolAOs: ['Devotion'],
      levelSelections: {
        1: {
          primaryAbility: 'devotion-1-primary-divine-domain-animation-',
          primaryAO: 'Devotion',
          upgradeChoices: {
            'devotion-1-primary-divine-domain-animation-': '+1 AC',
          },
        },
      },
    },
  };

  it('disables lowering locked skill ranks below their locked count in standard progression mode', () => {
    render(
      <CharacterProvider initialState={lockedState as any}>
        <SkillsSelector />
      </CharacterProvider>
    );

    const athleticsRow = screen.getByText('Athletics').closest('.skill-row')!;
    const minusBtn = athleticsRow.querySelector('.minus')!;
    expect(minusBtn).toBeDisabled();
  });

  it('disables forgetting locked spells and cantrips in standard progression mode', () => {
    render(
      <CharacterProvider initialState={lockedState as any}>
        <SpellsSelector />
      </CharacterProvider>
    );

    // Verify that the remove button in the Selected list is disabled for locked cantrip/spell
    const selectedBox = screen.getByText(/All Selected Spells/i).closest('.selected-spells-box')!;
    const removeBtn = selectedBox.querySelector('button[title*="locked"]')!;
    expect(removeBtn).toBeDisabled();
  });

  it('disables reducing spell slots below locked counts in standard progression mode', () => {
    render(
      <CharacterProvider initialState={lockedState as any}>
        <SpellSlotsSelector />
      </CharacterProvider>
    );

    const row = screen.getByText('Level 1 Slot').closest('.slot-buy-row')!;
    const minusBtn = row.querySelector('.rank-btn')!;
    expect(minusBtn).toBeDisabled();
  });

  it('disables unchecking locked saving throw, armor, and weapon proficiencies in standard progression mode', () => {
    render(
      <CharacterProvider initialState={lockedState as any}>
        <ProficienciesSelector />
      </CharacterProvider>
    );

    const brawnToggle = screen.getByText(/Brawn \(1 AP\)/).closest('label')!;
    const brawnInput = brawnToggle.querySelector('input')!;
    expect(brawnInput).toBeDisabled();

    // With locked Light Armor, downgrading to 'No Armor' is disabled
    const noneToggle = screen.getByText(/No Armor/).closest('label')!;
    const noneInput = noneToggle.querySelector('input')!;
    expect(noneInput).toBeDisabled();

    // The Light Armor option itself is currently selected
    const lightToggle = screen.getByText(/Light Armor/).closest('label')!;
    const lightInput = lightToggle.querySelector('input')!;
    expect(lightInput).toBeChecked();

    const axesToggle = screen.getByText(/Axes \(1 AP\)/).closest('label')!;
    const axesInput = axesToggle.querySelector('input')!;
    expect(axesInput).toBeDisabled();
  });

  it('locks pool AOs from being deselected in standard progression mode', () => {
    render(
      <CharacterProvider initialState={lockedState as any}>
        <AOSelector />
      </CharacterProvider>
    );

    const devotionPoolCard = document.querySelector('[data-pool-ao="Devotion"]')!;
    expect(devotionPoolCard).toHaveClass('disabled');
  });

  it('guarantees strictly one primary and one secondary per level with past levels locked on import and level-ups', () => {
    const importedLvl1State: any = {
      isImported: true,
      level: 1,
      identity: { level: 1, characterName: 'Drew' },
      ao: {
        selectedAOs: ['Tactics'],
        primaryAO: 'Tactics',
        levelSelections: {
          1: {
            primaryAO: 'Tactics',
            primaryAbility: 'tactics-1-primary-action-surge',
            secondaryAbility: 'tactics-1-secondary-second-wind',
          },
        },
      },
    };

    const TestComponent: React.FC = () => {
      const { dispatch } = useCharacter();
      return (
        <div>
          <button type="button" data-testid="lvl-up" onClick={() => dispatch({ type: 'LEVEL_UP' })}>
            Lvl Up
          </button>
          <AOSelector />
        </div>
      );
    };

    render(
      <CharacterProvider initialState={importedLvl1State}>
        <TestComponent />
      </CharacterProvider>
    );

    // 1. Level up to Level 2
    fireEvent.click(screen.getByTestId('lvl-up'));

    // Switch to Level 2 tab and pick Fighting style (Archery)
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));
    const archery = screen.getByText('Fighting style (Archery)').closest('.ability-card')!;
    fireEvent.click(archery);

    // 2. Level up to Level 3
    fireEvent.click(screen.getByTestId('lvl-up'));

    // Switch to Level 2 tab
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));

    // Archery was chosen at Level 2, so it MUST be locked
    expect(archery).toHaveTextContent(/🔒 Locked/);

    // Defense is unchosen, so it can be selected as Level 3 Primary
    const defense = screen.getByText('Fighting style (Defense)').closest('.ability-card')!;
    fireEvent.click(defense);
    expect(defense).toHaveClass('selected');

    // Switch to Level 3 tab
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 3' }));

    // Now in Level 3, picking Martial Archetype replaces Defense for Level 3
    const champion = screen.getByText('Martial Archetype (Champion)').closest('.ability-card')!;
    fireEvent.click(champion);
    expect(champion).toHaveClass('selected');

    // Switch back to Level 2 tab: Defense is no longer selected; Archery remains locked
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));
    const updatedDefense = screen.getByText('Fighting style (Defense)').closest('.ability-card')!;
    const updatedArchery = screen.getByText('Fighting style (Archery)').closest('.ability-card')!;
    expect(updatedDefense).not.toHaveClass('selected');
    expect(updatedArchery).toHaveTextContent(/🔒 Locked/);
  });
});

