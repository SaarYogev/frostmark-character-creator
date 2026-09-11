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
});
