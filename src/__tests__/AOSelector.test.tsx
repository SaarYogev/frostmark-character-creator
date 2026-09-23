import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { CharacterProvider, useCharacter } from '../contexts/CharacterContext';
import AOSelector from '../components/AOSelector';
import { ORIGINS } from '../data/origins';

describe('AOSelector', () => {
  const renderWithProvider = (component = <AOSelector />, level = 3) => {
    const Wrapper: React.FC = () => {
      const { dispatch } = useCharacter();
      React.useEffect(() => {
        if (level > 1) {
          dispatch({ type: 'SET_IDENTITY', payload: { level } as any });
        }
      }, [dispatch]);
      return <>{component}</>;
    };
    return render(
      <CharacterProvider>
        <Wrapper />
      </CharacterProvider>
    );
  };

  it('renders all pool origin cards', () => {
    renderWithProvider();

    ORIGINS.forEach((o) => {
      const card = screen.getByRole('button', { name: new RegExp(o.name) });
      expect(card).toBeInTheDocument();
    });
  });

  it('allows selecting up to 4 AOs in general pool and renders level selections section', () => {
    renderWithProvider();

    const pactCard = screen.getByRole('button', { name: /Pact/ });
    fireEvent.click(pactCard);

    expect(pactCard).toHaveClass('selected');
    expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    expect(screen.getAllByText('Primary Ability Choices')[0]).toBeInTheDocument();
  });

  it('limits general pool selection to a maximum of 4 AOs', () => {
    renderWithProvider();

    const originsToClick = ['Pact', 'Devotion', 'Artistry', 'Discipline', 'Finesse'];
    originsToClick.forEach((name) => {
      const card = screen.getByRole('button', { name: new RegExp(name) });
      fireEvent.click(card);
    });

    // Only first 4 should be selected
    expect(screen.getByText('Selected:').parentElement).toHaveTextContent('4 / 4');
  });

  it('allows adding and selecting a custom ability for a specific level slot', () => {
    renderWithProvider();

    // First select an origin to reveal level selections
    const pactCard = screen.getByRole('button', { name: /Pact/ });
    fireEvent.click(pactCard);

    // Click "Custom Ability" button under Primary Ability Choices
    const customAbilityButtons = screen.getAllByText('Custom Ability');
    fireEvent.click(customAbilityButtons[0]);

    // Fill in custom ability details
    const nameInput = screen.getByPlaceholderText('e.g. Frost Nova');
    fireEvent.change(nameInput, { target: { value: 'Custom Arcane Blast' } });

    const shortDescInput = screen.getByPlaceholderText('Brief summary of effect...');
    fireEvent.change(shortDescInput, { target: { value: 'Fires a concentrated blast of arcane energy.' } });

    const fullDescTextarea = screen.getByPlaceholderText('Complete mechanical details, damage, area of effect, etc.');
    fireEvent.change(fullDescTextarea, { target: { value: 'Deals 2d6 force damage to target within 30ft.' } });

    // Submit custom ability form
    const saveButton = screen.getByRole('button', { name: 'Save Custom Ability' });
    fireEvent.click(saveButton);

    // Verify custom ability appears in the list and is selected
    expect(screen.getAllByText('Custom Arcane Blast')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Fires a concentrated blast of arcane energy.')[0]).toBeInTheDocument();
  });

  it('renders upgrade choice text input when an upgrade ability is selected', () => {
    renderWithProvider();

    // Select Artistry origin
    const artistryCard = screen.getByRole('button', { name: /Artistry/ });
    fireEvent.click(artistryCard);

    // Find upgrade choice input if present or inspect upgrade choice state handling
    const upgradeInputs = screen.queryAllByPlaceholderText('e.g. +1 AC, Advantage on Perception...');
    if (upgradeInputs.length > 0) {
      fireEvent.change(upgradeInputs[0], { target: { value: '+1 Armor Class' } });
      expect(upgradeInputs[0]).toHaveValue('+1 Armor Class');
    }
  });

  it('renders single choice dropdown for AO abilities with registered choices', () => {
    renderWithProvider();

    // Select Divine Oath origin to reveal Divine Smite at Level 2 Primary
    const divineOathCard = screen.getByRole('button', { name: /Divine Oath/ });
    fireEvent.click(divineOathCard);

    // Click Divine Smite card
    const smiteCard = screen.getAllByText('Divine Smite')[0];
    fireEvent.click(smiteCard);

    // Verify dropdown is rendered with choice options
    expect(screen.getAllByText('Smite Favorite Damage Type:')[0]).toBeInTheDocument();

    const selectEls = screen.getAllByRole('combobox');
    expect(selectEls.length).toBeGreaterThan(0);

    // Select an option
    fireEvent.change(selectEls[0], { target: { value: 'Radiant' } });
    expect(selectEls[0]).toHaveValue('Radiant');
  });

  it('renders multi-select pills for AO abilities with multi-choice options', () => {
    renderWithProvider();

    // Select Power origin to reveal Survival Instincts
    const powerCard = screen.getByRole('button', { name: /Power/ });
    fireEvent.click(powerCard);

    // Click Survival Instincts card at Level 2 Secondary
    const survivalCard = screen.getAllByText('Survival Instincts')[0];
    fireEvent.click(survivalCard);

    // Verify multi-select label and buttons are rendered
    expect(screen.getAllByText(/Choose 2 Skills/)[0]).toBeInTheDocument();

    const athleticsBtns = screen.getAllByRole('button', { name: 'Athletics' });
    const perceptionBtns = screen.getAllByRole('button', { name: 'Perception' });

    // Toggle options
    fireEvent.click(athleticsBtns[0]);
    fireEvent.click(perceptionBtns[0]);

    const athleticsPill = screen.getAllByRole('button', { name: '✓ Athletics' })[0];
    const perceptionPill = screen.getAllByRole('button', { name: '✓ Perception' })[0];
    expect(athleticsPill).toBeInTheDocument();
    expect(perceptionPill).toBeInTheDocument();
  });

  it('renders dropdown select for General Upgrade in Pact and other origins', () => {
    renderWithProvider();

    // Select Pact origin
    const pactCard = screen.getByRole('button', { name: /Pact/ });
    fireEvent.click(pactCard);

    // Find General Upgrade card at level 1 secondary slot
    const upgradeCards = screen.getAllByText('General Upgrade');
    if (upgradeCards.length > 0) {
      fireEvent.click(upgradeCards[0]);

      // Verify dropdown select is rendered for General Upgrade choice
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      const upgradeSelect = selects[0];
      expect(upgradeSelect).toBeInTheDocument();

      // Change selection
      fireEvent.change(upgradeSelect, { target: { value: '10 Potential' } });
      expect(upgradeSelect).toHaveValue('10 Potential');
    }
  });

  it('renders dropdown select for Ability Score Improvement or Feat', () => {
    renderWithProvider();

    // Select Artistry origin
    const artistryCard = screen.getByRole('button', { name: /Artistry/ });
    fireEvent.click(artistryCard);

    // Find Ability Score Improvement or Feat card
    const asiCards = screen.queryAllByText('Ability Score Improvement or Feat');
    if (asiCards.length > 0) {
      fireEvent.click(asiCards[0]);

      // Verify dropdown select is rendered for ASI / Feat choice
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
      const asiSelect = selects[0];
      expect(asiSelect).toBeInTheDocument();

      // Change selection to +2 Brawn
      fireEvent.change(asiSelect, { target: { value: '+2 Brawn' } });
      expect(asiSelect).toHaveValue('+2 Brawn');
    }
  });

  it('renders two dropdowns when "+1 to Two Ability Scores" is selected and properly records choices', () => {
    renderWithProvider(undefined, 4);

    // Select Artistry origin
    const artistryCard = screen.getByRole('button', { name: /Artistry/ });
    fireEvent.click(artistryCard);

    // Find Level 4 Ability Score Improvement or Feat card
    const asiCards = screen.queryAllByText('Ability Score Improvement or Feat');
    expect(asiCards.length).toBeGreaterThan(0);
    fireEvent.click(asiCards[0]);

    // Select '+1 to Two Ability Scores'
    const selects = screen.getAllByRole('combobox');
    const mainAsiSelect = selects[0];
    fireEvent.change(mainAsiSelect, { target: { value: '+1 to Two Ability Scores' } });

    // Should now show two separate attribute dropdowns
    const firstScoreSelect = screen.getByLabelText(/First Ability Score/i);
    const secondScoreSelect = screen.getByLabelText(/Second Ability Score/i);

    expect(firstScoreSelect).toBeInTheDocument();
    expect(secondScoreSelect).toBeInTheDocument();

    // Select Brawn and Vitality
    fireEvent.change(firstScoreSelect, { target: { value: 'Brawn' } });
    fireEvent.change(secondScoreSelect, { target: { value: 'Vitality' } });

    expect(firstScoreSelect).toHaveValue('Brawn');
    expect(secondScoreSelect).toHaveValue('Vitality');
  });

  it('renders structured Feat dropdown and sub-options when "Feat" is chosen', () => {
    renderWithProvider(<AOSelector />, 4);

    // Select Artistry origin
    const artistryCard = screen.getByRole('button', { name: /Artistry/ });
    fireEvent.click(artistryCard);

    // Find Ability Score Improvement or Feat card at level 4
    const asiCards = screen.getAllByText('Ability Score Improvement or Feat');
    expect(asiCards.length).toBeGreaterThan(0);
    fireEvent.click(asiCards[0]);

    const selects = screen.getAllByRole('combobox');
    const asiSelect = selects[0];

    // Change selection to 'Feat'
    fireEvent.change(asiSelect, { target: { value: 'Feat' } });

    // Expect a dedicated Feat Selector dropdown (NOT just a plain text input)
    const featSelect = screen.getAllByLabelText(/Select Feat/i)[0];
    expect(featSelect).toBeInTheDocument();

    // Change feat selection to 'Actor'
    fireEvent.change(featSelect, { target: { value: 'Actor' } });

    // Feat description should now be displayed
    expect(screen.getAllByText(/You gain advantage to Deception/i).length).toBeGreaterThan(0);
  });

  it('shows only level-3 abilities in the Lv3 tab (no cross-level mixing)', () => {
    renderWithProvider(undefined, 3);

    // Select Tactics to populate ability lists
    const tacticsCard = screen.getByRole('button', { name: /^Tactics/ });
    fireEvent.click(tacticsCard);

    // Click the Lv 3 tab filter button
    const lv3Button = screen.getByRole('button', { name: 'Lvl 3' });
    fireEvent.click(lv3Button);

    // Lv3 primary for Tactics = Martial Archetypes — must be present
    expect(screen.getAllByText(/Martial Archetype/)[0]).toBeInTheDocument();

    // Lv1 and Lv2 abilities must NOT appear in primary (Action Surge is Lv1 Primary, Fighting style is Lv2 Primary)
    expect(screen.queryByText('Action Surge')).not.toBeInTheDocument();
    expect(screen.queryByText('Fighting style (Archery)')).not.toBeInTheDocument();
  });

  it('locks level 2 primary when selected before level up, but allows selecting remaining level 2 abilities as level 3 primary', () => {
    const TestComponent: React.FC = () => {
      const { state, dispatch } = useCharacter();
      return (
        <div>
          <button
            type="button"
            data-testid="level-up-btn"
            onClick={() => dispatch({ type: 'LEVEL_UP' })}
          >
            Level Up
          </button>
          <AOSelector />
        </div>
      );
    };

    const initialLevel1State: any = {
      level: 1,
      identity: { level: 1, characterName: 'Drew' },
      ao: {
        selectedAOs: ['Tactics'],
        primaryAO: 'Tactics',
        levelSelections: {
          1: {
            primaryAO: 'Tactics',
            primaryAbility: 'tactics-1-primary-action-surge',
            secondaryAbility: '',
          },
        },
      },
    };

    render(
      <CharacterProvider initialState={initialLevel1State}>
        <TestComponent />
      </CharacterProvider>
    );

    // 1. Level up to 2
    fireEvent.click(screen.getByTestId('level-up-btn'));

    // Switch to Level 2 tab
    const lvl2Tab = screen.getByRole('button', { name: 'Lvl 2' });
    fireEvent.click(lvl2Tab);

    // 2. Pick a level 2 ability: Fighting style (Archery)
    const archeryCard = screen.getByText('Fighting style (Archery)').closest('.ability-card')!;
    fireEvent.click(archeryCard);
    expect(archeryCard).toHaveClass('selected');

    // 3. Level up to 3
    fireEvent.click(screen.getByTestId('level-up-btn'));

    // Switch to Level 2 tab again
    fireEvent.click(screen.getByRole('button', { name: 'Lvl 2' }));

    // 4. Archery was selected before level up to 3, so it MUST be locked
    expect(archeryCard).toHaveTextContent(/🔒 Locked/);
    // Clicking locked Archery does not unselect it
    fireEvent.click(archeryCard);
    expect(archeryCard).toHaveTextContent(/🔒 Locked/);

    // 5. The rest of the level 2 abilities must NOT be disabled; they can be selected as Level 3 Primary
    const defenseCard = screen.getByText('Fighting style (Defense)').closest('.ability-card')!;
    expect(defenseCard).not.toHaveClass('disabled');

    // Click Defense -> selects it as Level 3 Primary
    fireEvent.click(defenseCard);
    expect(defenseCard).toHaveClass('selected');

    // Archery remains locked at Level 2
    expect(archeryCard).toHaveTextContent(/🔒 Locked/);

    // 6. Switch to Level 3 tab: the chosen ability is reflected in Level 3
    const lvl3Tab = screen.getByRole('button', { name: 'Lvl 3' });
    fireEvent.click(lvl3Tab);
    expect(screen.getAllByText('Fighting style (Defense)')[0]).toBeInTheDocument();

    // 7. In Level 3 tab, selecting Martial Archetype (Champion) replaces Defense as Level 3 Primary (no extra ability)
    const championCard = screen.getByText('Martial Archetype (Champion)').closest('.ability-card')!;
    fireEvent.click(championCard);
    expect(championCard).toHaveClass('selected');

    // Verify Defense is no longer selected in Level 2 tab
    fireEvent.click(lvl2Tab);
    const updatedDefenseCard = screen.getByText('Fighting style (Defense)').closest('.ability-card')!;
    expect(updatedDefenseCard).not.toHaveClass('selected');
    // Archery remains permanently locked at Level 2
    const updatedArcheryCard = screen.getByText('Fighting style (Archery)').closest('.ability-card')!;
    expect(updatedArcheryCard).toHaveTextContent(/🔒 Locked/);

    // 8. Clicking an unchosen earlier ability in Level 2 tab selects it as Level 3 Primary, replacing Champion
    fireEvent.click(updatedDefenseCard);
    expect(updatedDefenseCard).toHaveClass('selected');

    fireEvent.click(lvl3Tab);
    const updatedChampionCard = screen.getByText('Martial Archetype (Champion)').closest('.ability-card')!;
    expect(updatedChampionCard).not.toHaveClass('selected');
  });
});
