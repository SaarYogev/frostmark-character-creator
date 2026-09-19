import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import FinishingTouches from '../components/FinishingTouches';

describe('FinishingTouches', () => {
  const renderWithProvider = () => {
    return render(
      <CharacterProvider>
        <FinishingTouches />
      </CharacterProvider>
    );
  };

  it('renders section headers and buttons correctly', () => {
    renderWithProvider();

    expect(screen.getByRole('heading', { name: /Finishing Touches/i })).toBeInTheDocument();
    expect(screen.getByText('💾 Save Data')).toBeInTheDocument();
    expect(screen.getByText('📄 Save Character Sheet')).toBeInTheDocument();
  });

  it('renders Hit Points (HP) and Hit Dice in the character summary overview', () => {
    renderWithProvider();

    expect(screen.getByText('Hit Points (HP)')).toBeInTheDocument();
    expect(screen.getByText('Hit Dice')).toBeInTheDocument();
    expect(screen.getByText(/Max/)).toBeInTheDocument();
  });
});
