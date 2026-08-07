import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import AOSelector from '../components/AOSelector';
import { ORIGINS } from '../data/origins';

describe('AOSelector', () => {
  const renderWithProvider = (component = <AOSelector />) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
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
    expect(screen.getByText('Primary Ability Choices')).toBeInTheDocument();
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
});
