import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import EquipmentSelector from '../components/EquipmentSelector';

describe('EquipmentSelector', () => {
  const renderWithProvider = () => {
    return render(
      <CharacterProvider>
        <EquipmentSelector />
      </CharacterProvider>
    );
  };

  it('renders section headers correctly', () => {
    renderWithProvider();

    expect(screen.getByText('Weapons')).toBeInTheDocument();
    expect(screen.getByText('Armor')).toBeInTheDocument();
    expect(screen.getByText('Other Items')).toBeInTheDocument();
  });

  it('renders weapons list and allows clicking a weapon', () => {
    renderWithProvider();

    const weaponEntry = screen.getByText('Longsword');
    expect(weaponEntry).toBeInTheDocument();

    fireEvent.click(weaponEntry);
  });

  it('allows adding custom item', () => {
    renderWithProvider();

    const addBtn = screen.getByText('+ Add Item');
    fireEvent.click(addBtn);

    const nameInput = screen.getByPlaceholderText('Item Name *');
    fireEvent.change(nameInput, { target: { value: 'Test Backpack' } });

    const submitBtn = screen.getByText('Add Item');
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Test Backpack/)).toBeInTheDocument();
  });
});
