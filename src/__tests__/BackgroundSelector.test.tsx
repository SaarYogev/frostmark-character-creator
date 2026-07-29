import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import BackgroundSelector from '../components/BackgroundSelector';
import { BACKGROUNDS } from '../../js/data/backgrounds';


describe('BackgroundSelector', () => {
  const renderWithProvider = (component: React.ReactNode) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all background cards', () => {
    renderWithProvider(<BackgroundSelector onNext={() => {}} />);

    BACKGROUNDS.forEach(background => {
      expect(screen.getByText(background.name)).toBeInTheDocument();
    });
  });

  it('selects a background when clicked', () => {
    renderWithProvider(<BackgroundSelector onNext={() => {}} />);

    const artistCard = screen.getByText('Artist/Crafter');
    fireEvent.click(artistCard);

    expect(artistCard.parentElement).toHaveClass('selected');
  });

  it('shows background details when a background is selected', () => {
    renderWithProvider(<BackgroundSelector onNext={() => {}} />);

    const bountyHunterCard = screen.getByText('Bounty Hunter');
    fireEvent.click(bountyHunterCard);

    expect(screen.getByText('Bounty Hunter')).toBeInTheDocument();
    expect(screen.getByText(/Skills: Athletics, Investigation, Perception, Survival/)).toBeInTheDocument();
    expect(screen.getByText(/Gold: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Equipment: A set of manacles, a bounty ledger, outdoor clothes, 10 gp/)).toBeInTheDocument();
    expect(screen.getByText(/Trait: Ear to the Ground/)).toBeInTheDocument();
    expect(screen.getByText(/Description: You track down targets for coin./)).toBeInTheDocument();
  });

  it('calls onNext when Next button is clicked', () => {
    const mockOnNext = vi.fn();
    renderWithProvider(<BackgroundSelector onNext={mockOnNext} />);

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    expect(mockOnNext).toHaveBeenCalled();
  });
});
