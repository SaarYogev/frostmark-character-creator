import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import ProficienciesSelector from '../components/ProficienciesSelector';

describe('ProficienciesSelector', () => {
  const renderWithProvider = (component = <ProficienciesSelector />) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all section titles correctly', () => {
    renderWithProvider();

    expect(screen.getByText(/Saving Throw Proficiencies/)).toBeInTheDocument();
    expect(screen.getByText('Armor Proficiencies')).toBeInTheDocument();
    expect(screen.getByText('Weapon Proficiencies')).toBeInTheDocument();
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByText(/Extra Gold/)).toBeInTheDocument();
  });

  it('allows toggling saving throw proficiencies up to limit of 3', () => {
    renderWithProvider();

    const braInput = screen.getByLabelText(/Brawn/);
    const dexInput = screen.getByLabelText(/Dexterity/);
    const vitInput = screen.getByLabelText(/Vitality/);
    const intInput = screen.getByLabelText(/Intelligence/);

    fireEvent.click(braInput);
    fireEvent.click(dexInput);
    fireEvent.click(vitInput);

    expect(braInput).toBeChecked();
    expect(dexInput).toBeChecked();
    expect(vitInput).toBeChecked();

    // 4th save should be disabled without manual override
    expect(intInput).toBeDisabled();
  });

  it('allows toggling armor proficiencies', () => {
    renderWithProvider();

    const lightArmorInput = screen.getByLabelText('Light');
    fireEvent.click(lightArmorInput);

    expect(lightArmorInput).toBeChecked();
  });

  it('allows toggling weapon proficiencies', () => {
    renderWithProvider();

    const weaponGroupInput = screen.getByLabelText(/Handpicked 2 Weapons/);
    fireEvent.click(weaponGroupInput);

    expect(weaponGroupInput).toBeChecked();
  });

  it('bypasses save limits when manual override is checked', () => {
    renderWithProvider();

    const manualCheckbox = screen.getByLabelText(/Manual Proficiencies Override/);
    fireEvent.click(manualCheckbox);

    const intCheckbox = screen.getByLabelText(/Intelligence/);
    expect(intCheckbox).not.toBeDisabled();
  });
});
