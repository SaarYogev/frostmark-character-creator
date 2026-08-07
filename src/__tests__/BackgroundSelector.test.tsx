import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import BackgroundSelector from '../components/BackgroundSelector';
import { BACKGROUNDS } from '../data/backgrounds';

describe('BackgroundSelector', () => {
  const renderWithProvider = (component = <BackgroundSelector />) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all background cards', () => {
    renderWithProvider();
    
    BACKGROUNDS.forEach(background => {
      expect(screen.getByText(background.name)).toBeInTheDocument();
    });
  });

  it('selects a background when clicked', () => {
    renderWithProvider();

    const charlatanCard = screen.getByText('Charlatan');
    fireEvent.click(charlatanCard);

    // After selection, the background card should have 'selected' class
    expect(charlatanCard.parentElement).toHaveClass('selected');
  });

  it('shows background details when a background is selected', () => {
    renderWithProvider();

    const bountyHunterCard = screen.getByText('Bounty Hunter');
    fireEvent.click(bountyHunterCard);

    // Should show background details matching exact legacy buildBGDetails text
    expect(screen.getByRole('heading', { level: 3, name: 'Bounty Hunter' })).toBeInTheDocument();
    expect(screen.getByText(/Starting Gold:/)).toBeInTheDocument();
    expect(screen.getByText(/Ear to the Ground/)).toBeInTheDocument();
    expect(screen.getByText(/Free Skill Points:/)).toBeInTheDocument();
  });

  it('renders and handles custom background option', () => {
    renderWithProvider();

    const customCard = screen.getByText('Custom / Enter Manually...');
    expect(customCard).toBeInTheDocument();

    fireEvent.click(customCard);

    expect(screen.getByText('Custom Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Background Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Gold (gp)')).toBeInTheDocument();
  });

  it('does not render Next button', () => {
    renderWithProvider();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });
});