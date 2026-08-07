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
    expect(screen.getByText('Custom Features / Notes')).toBeInTheDocument();
    expect(screen.getByText('💾 Save Data')).toBeInTheDocument();
    expect(screen.getByText('📄 Save Character Sheet')).toBeInTheDocument();
  });

  it('allows updating custom features text', () => {
    renderWithProvider();

    const textarea = screen.getByPlaceholderText('Any custom abilities, special rules, or DM notes...');
    fireEvent.change(textarea, { target: { value: 'Lucky feat\nDarkvision' } });

    expect(textarea).toHaveValue('Lucky feat\nDarkvision');
  });
});
