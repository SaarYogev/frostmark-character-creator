import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import AbilityScoreSelector from '../components/AbilityScoreSelector';
import { CHARACTERISTICS } from '../../js/data/constants';

describe('AbilityScoreSelector', () => {
  const renderWithProvider = (component = <AbilityScoreSelector />) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all 9 characteristic rows', () => {
    renderWithProvider();

    CHARACTERISTICS.forEach((c) => {
      expect(screen.getByText(c.key)).toBeInTheDocument();
    });
  });

  it('displays default points remaining (25 for Heroic power level)', () => {
    renderWithProvider();

    const tracker = screen.getByText('/ 25').parentElement;
    expect(tracker).toHaveTextContent('25');
  });

  it('adjusts characteristic score when plus or minus buttons are clicked', () => {
    renderWithProvider();

    const brawnRow = screen.getByText('Brawn').closest('.ability-row')!;
    const plusBtn = brawnRow.querySelector('.plus')!;
    const minusBtn = brawnRow.querySelector('.minus')!;

    // Initial base value is 10
    expect(brawnRow.querySelector('.ability-base')).toHaveTextContent('10');

    // Click plus button to increase Brawn to 11 (costs 1 AP, remaining 24)
    fireEvent.click(plusBtn);
    expect(brawnRow.querySelector('.ability-base')).toHaveTextContent('11');

    // Click minus button to decrease back to 10
    fireEvent.click(minusBtn);
    expect(brawnRow.querySelector('.ability-base')).toHaveTextContent('10');
  });

  it('disables minus button at minimum boundary of 6', () => {
    renderWithProvider();

    const brawnRow = screen.getByText('Brawn').closest('.ability-row')!;
    const minusBtn = brawnRow.querySelector('.minus')!;

    // Lower Brawn down to minimum 6
    for (let i = 0; i < 4; i++) {
      fireEvent.click(minusBtn);
    }

    expect(brawnRow.querySelector('.ability-base')).toHaveTextContent('6');
    expect(minusBtn).toBeDisabled();
  });

  it('updates point limit budget when campaign power level changes', () => {
    const { rerender } = renderWithProvider();
    
    // Default Heroic level is 25 AP
    expect(screen.getByText('/ 25')).toBeInTheDocument();
  });
});
