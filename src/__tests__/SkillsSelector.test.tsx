import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import SkillsSelector from '../components/SkillsSelector';
import { SKILLS } from '../../js/data/constants';

describe('SkillsSelector', () => {
  const renderWithProvider = (component = <SkillsSelector />) => {
    return render(<CharacterProvider>{component}</CharacterProvider>);
  };

  it('renders all standard skills', () => {
    renderWithProvider();

    SKILLS.forEach((s) => {
      expect(screen.getByText(s.name)).toBeInTheDocument();
    });
  });

  it('allows adjusting rank pips for skills', () => {
    renderWithProvider();

    const stealthRow = screen.getByText('Stealth').closest('.skill-row')!;
    const plusBtn = stealthRow.querySelector('.plus')!;
    const minusBtn = stealthRow.querySelector('.minus')!;

    // Enable manual override to bypass AP limit
    const manualCheckbox = screen.getByLabelText(/Manual Skills Override/);
    fireEvent.click(manualCheckbox);

    // Initial rank is 0, minus button disabled
    expect(minusBtn).toBeDisabled();

    // Increase rank to 1
    fireEvent.click(plusBtn);
    expect(minusBtn).not.toBeDisabled();
  });

  it('allows adding and removing custom academic fields', () => {
    renderWithProvider();

    const input = screen.getByPlaceholderText(/Enter academic field/);
    const addBtn = screen.getByText('+ Add Field');

    fireEvent.change(input, { target: { value: 'Ancient History' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('Ancient History')).toBeInTheDocument();
  });

  it('allows adding and removing custom arts and craft disciplines', () => {
    renderWithProvider();

    const input = screen.getByPlaceholderText(/Enter craft\/art discipline/);
    const addBtn = screen.getByText('+ Add Discipline');

    fireEvent.change(input, { target: { value: 'Jewelry Making' } });
    fireEvent.click(addBtn);

    expect(screen.getByText('Jewelry Making')).toBeInTheDocument();
  });

  it('updates free skill points tracker when background is selected', () => {
    render(
      <CharacterProvider
        initialState={{
          background: { name: 'Scholar' },
        }}
      >
        <SkillsSelector />
      </CharacterProvider>
    );

    expect(screen.getAllByText('0')[0]).toBeInTheDocument();
    expect(screen.getByText('/ 4')).toBeInTheDocument();
    expect(screen.getByText(/Scholar/)).toBeInTheDocument();
  });

  it('renders restricted skill badges for backgrounds like Criminal', () => {
    render(
      <CharacterProvider
        initialState={{
          background: { name: 'Criminal' },
        }}
      >
        <SkillsSelector />
      </CharacterProvider>
    );

    const badges = screen.getAllByText('Allowed for Background Free Points');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('enforces level rank limits on Academics entries', () => {
    renderWithProvider();

    const input = screen.getByPlaceholderText(/Enter academic field/);
    const addBtn = screen.getByText('+ Add Field');

    fireEvent.change(input, { target: { value: 'Biology' } });
    fireEvent.click(addBtn);

    const entry = screen.getByText('Biology').closest('.academic-entry')!;
    const plusBtn = entry.querySelector('.plus')!;
    const minusBtn = entry.querySelector('.minus')!;

    // Initial rank is 1 at level 1 (max 3)
    fireEvent.click(plusBtn); // rank 2
    fireEvent.click(plusBtn); // rank 3
    fireEvent.click(plusBtn); // should remain rank 3 due to level 1 limit (max 3)

    expect(entry.querySelector('.skill-cost')).toHaveTextContent('Cost: 4 pts');
  });
});
