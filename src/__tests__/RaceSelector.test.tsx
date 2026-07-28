import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import RaceSelector from '../components/RaceSelector';
import { RACES } from '../../js/data/races';

describe('RaceSelector', () => {
  const renderWithProvider = (component: React.ReactNode) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all race cards', () => {
    renderWithProvider(<RaceSelector />);

    // Should render Custom option plus all races
    expect(screen.getByText('Custom / Enter Manually...')).toBeInTheDocument();
    RACES.forEach(race => {
      expect(screen.getByText(race.name)).toBeInTheDocument();
    });
  });

  it('renders step header', () => {
    renderWithProvider(<RaceSelector />);

    expect(screen.getByText('🌍 Race & Subrace')).toBeInTheDocument();
    expect(screen.getByText('Select your character\'s race. Each grants unique stat bonuses and traits.')).toBeInTheDocument();
  });

  it('selects a race when clicked', () => {
    renderWithProvider(<RaceSelector />);

    const dwarfCard = screen.getByText('Dwarf');
    fireEvent.click(dwarfCard);

    // After selection, the race card should have 'selected' class
    expect(dwarfCard.parentElement).toHaveClass('selected');
  });

  it('shows race details when a race is selected', () => {
    renderWithProvider(<RaceSelector />);

    const elfCard = screen.getByText('Elf');
    fireEvent.click(elfCard);

    // Should show race details
    expect(screen.getByText('Elf Traits')).toBeInTheDocument();
    expect(screen.getByText(/Speed: 6 squares/)).toBeInTheDocument();
    expect(screen.getByText(/Size: Medium/)).toBeInTheDocument();
  });

  it('shows subrace selection for races with subraces', () => {
    renderWithProvider(<RaceSelector />);

    // Select Elf which has subraces
    const elfCard = screen.getByText('Elf');
    fireEvent.click(elfCard);

    // Should show subrace selector
    expect(screen.getByText('Choose Subrace')).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
  });

  it('handles subrace selection', () => {
    renderWithProvider(<RaceSelector />);

    // Select Elf first
    const elfCard = screen.getByText('Elf');
    fireEvent.click(elfCard);

    // Then select Garden subrace
    const gardenCard = screen.getByText('Garden');
    fireEvent.click(gardenCard);

    expect(gardenCard.parentElement).toHaveClass('selected');
    expect(screen.getByText('Garden Features')).toBeInTheDocument();
  });

  it('shows custom race form when Custom is selected', () => {
    renderWithProvider(<RaceSelector />);

    const customCard = screen.getByText('Custom / Enter Manually...');
    fireEvent.click(customCard);

    expect(screen.getByText('Custom Race')).toBeInTheDocument();
    expect(screen.getByText('Race Name')).toBeInTheDocument();
    expect(screen.getByText('Speed (squares)')).toBeInTheDocument();
  });

  it('shows manual stat override section', () => {
    renderWithProvider(<RaceSelector />);

    expect(screen.getByText('Manual Stat Allocation Override')).toBeInTheDocument();
    expect(screen.getByText('Customize stat bonuses manually (+2 to one stat, +1 to another)')).toBeInTheDocument();
  });

  it('toggles manual stat override', () => {
    renderWithProvider(<RaceSelector />);

    const checkbox = screen.getByText('Customize stat bonuses manually (+2 to one stat, +1 to another)');
    fireEvent.click(checkbox);

    // After toggling, the select dropdowns should appear
    expect(screen.getByText('+2 Attribute')).toBeInTheDocument();
    expect(screen.getByText('+1 Attribute')).toBeInTheDocument();
  });

  it('handles manual stat override selection', () => {
    renderWithProvider(<RaceSelector />);

    // Toggle manual races first
    const checkbox = screen.getByText('Customize stat bonuses manually (+2 to one stat, +1 to another)');
    fireEvent.click(checkbox);

    // Select +2 attribute
    const plus2Select = screen.getByText('+2 Attribute').parentElement?.querySelector('select');
    if (plus2Select) {
      fireEvent.change(plus2Select, { target: { value: 'Brawn' } });
    }

    // Select +1 attribute
    const plus1Select = screen.getByText('+1 Attribute').parentElement?.querySelector('select');
    if (plus1Select) {
      fireEvent.change(plus1Select, { target: { value: 'Dexterity' } });
    }

    // Verify the selects have the values
    if (plus2Select && plus1Select) {
      expect(plus2Select).toHaveValue('Brawn');
      expect(plus1Select).toHaveValue('Dexterity');
    }
  });

  it('prevents same attribute for both +2 and +1', () => {
    renderWithProvider(<RaceSelector />);

    // Toggle manual races first
    const checkbox = screen.getByText('Customize stat bonuses manually (+2 to one stat, +1 to another)');
    fireEvent.click(checkbox);

    // Select +2 attribute
    const plus2Select = screen.getByText('+2 Attribute').parentElement?.querySelector('select');
    if (plus2Select) {
      fireEvent.change(plus2Select, { target: { value: 'Brawn' } });
    }

    // Try to select the same attribute for +1
    const plus1Select = screen.getByText('+1 Attribute').parentElement?.querySelector('select');
    
    // Mock alert to check if it's called
    const originalAlert = window.alert;
    window.alert = vi.fn();

    if (plus1Select) {
      fireEvent.change(plus1Select, { target: { value: 'Brawn' } });
    }

    expect(window.alert).toHaveBeenCalledWith('Cannot select the same attribute for both +2 and +1 bonuses.');

    // Restore alert
    window.alert = originalAlert;
  });

  it('shows Wood Elf choice when Elf and Wood subrace are selected', () => {
    renderWithProvider(<RaceSelector />);

    // Select Elf
    const elfCard = screen.getByText('Elf');
    fireEvent.click(elfCard);

    // Select Wood subrace
    const woodCard = screen.getByText('Wood');
    fireEvent.click(woodCard);

    expect(screen.getByText('Bonus +1 to:')).toBeInTheDocument();
    expect(screen.getByText('Cunning')).toBeInTheDocument();
    expect(screen.getByText('Composure')).toBeInTheDocument();
  });

  it('shows Half-Elf choices when Half-elf is selected', () => {
    renderWithProvider(<RaceSelector />);

    const halfElfCard = screen.getByText('Half-elf');
    fireEvent.click(halfElfCard);

    // Half-elf has subraces, so it should show subrace selection
    expect(screen.getByText('Choose Subrace')).toBeInTheDocument();
  });

  it('initializes with provided initialState', () => {
    const initialState = {
      race: 'Dwarf',
      subrace: 'Mountain Dwarf',
    };

    renderWithProvider(<RaceSelector initialState={initialState} />);

    // Dwarf should be selected
    const dwarfCard = screen.getByText('Dwarf');
    expect(dwarfCard.parentElement).toHaveClass('selected');
  });

  it('renders all race cards from RACES data', () => {
    renderWithProvider(<RaceSelector />);

    // Check that all races from the data are rendered
    RACES.forEach(race => {
      expect(screen.getByText(race.name)).toBeInTheDocument();
    });
  });
});
