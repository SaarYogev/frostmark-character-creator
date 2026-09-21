import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Layout } from '../components/Layout';
import { STEPS } from '../types/Steps';
import { CharacterProvider } from '../contexts/CharacterContext';

describe('Layout', () => {
  const renderLayout = (currentStep = 0, onNavigate = () => {}) => {
    return render(
      <CharacterProvider>
        <Layout currentStep={currentStep} onNavigate={onNavigate}>
          <div>Test Content</div>
        </Layout>
      </CharacterProvider>
    );
  };

  it('renders sidebar with all step navigation items', () => {
    renderLayout(0);

    // Check sidebar header
    expect(screen.getByAltText('Frostmark')).toBeInTheDocument();
    expect(screen.getByText('Character Creator')).toBeInTheDocument();

    // Check all step navigation items
    STEPS.forEach((step) => {
      expect(screen.getAllByText(step.title)[0]).toBeInTheDocument();
      expect(screen.getAllByText(step.icon)[0]).toBeInTheDocument();
    });
  });

  it('highlights the current step', () => {
    renderLayout(1);

    // Step 1 (Race & Subrace) should be active
    const raceStep = screen.getByText('Race & Subrace');
    expect(raceStep.parentElement).toHaveClass('active');
  });

  it('renders main content area', () => {
    render(
      <CharacterProvider>
        <Layout currentStep={0} onNavigate={() => {}}>
          <div data-testid="main-content">Test Content</div>
        </Layout>
      </CharacterProvider>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders character summary aside with HP and HD stats', () => {
    renderLayout(0);

    expect(screen.getByText('Character Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Hit Points (HP)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Hit Dice')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Save Data/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Download Character Sheet/)[0]).toBeInTheDocument();
  });

  it('renders step footer with navigation buttons', () => {
    renderLayout(0);

    expect(screen.getByText('← Back')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 11/)).toBeInTheDocument();
  });

  it('disables Back button on first step', () => {
    renderLayout(0);

    expect(screen.getByText('← Back')).toBeDisabled();
  });

  it('shows Finish button on last step', () => {
    renderLayout(STEPS.length - 1);

    expect(screen.getByText('Finish ✓')).toBeInTheDocument();
  });

  it('calls onNavigate when clicking step navigation', () => {
    const mockNavigate = vi.fn();
    renderLayout(0, mockNavigate);

    const raceStep = screen.getByText('Race & Subrace');
    fireEvent.click(raceStep);

    expect(mockNavigate).toHaveBeenCalledWith(1);
  });

  it('calls onNavigate when clicking Next button', () => {
    const mockNavigate = vi.fn();
    renderLayout(0, mockNavigate);

    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    expect(mockNavigate).toHaveBeenCalledWith(1);
  });

  it('calls onNavigate when clicking Back button', () => {
    const mockNavigate = vi.fn();
    renderLayout(1, mockNavigate);

    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(0);
  });

  it('calls onNavigateHome when clicking Frostmark logo', () => {
    const mockNavigateHome = vi.fn();
    render(
      <CharacterProvider>
        <Layout currentStep={0} onNavigate={() => {}} onNavigateHome={mockNavigateHome}>
          <div>Test Content</div>
        </Layout>
      </CharacterProvider>
    );

    const desktopLogo = screen.getByAltText('Frostmark');
    fireEvent.click(desktopLogo);
    expect(mockNavigateHome).toHaveBeenCalledTimes(1);

    const mobileLogo = screen.getByAltText('Frostmark Mobile');
    fireEvent.click(mobileLogo);
    expect(mockNavigateHome).toHaveBeenCalledTimes(2);
  });

  it('filters out one-time creation steps when character level is greater than 1', () => {
    render(
      <CharacterProvider initialState={{ identity: { characterName: 'Test', playerName: '', campaignPowerLevel: 'Heroic', level: 2, personalityBackstory: '', appearance: {} } }}>
        <Layout currentStep={0} onNavigate={() => {}}>
          <div>Level 2 Content</div>
        </Layout>
      </CharacterProvider>
    );

    expect(screen.queryByText('Equipment')).not.toBeInTheDocument();
    expect(screen.queryByText('Race & Subrace')).not.toBeInTheDocument();
    expect(screen.queryByText('Background')).not.toBeInTheDocument();
    expect(screen.queryByText('Ability Scores')).not.toBeInTheDocument();

    expect(screen.getAllByText('Identity')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Ability Origins')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Skills')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Proficiencies & AP')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Spell Slots')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Spell Selection')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Finishing Touches')[0]).toBeInTheDocument();
  });

  it('shows all steps when showAllSteps is true even at level > 1', () => {
    render(
      <CharacterProvider initialState={{ identity: { characterName: 'Test', playerName: '', campaignPowerLevel: 'Heroic', level: 3, personalityBackstory: '', appearance: {} } }}>
        <Layout currentStep={0} onNavigate={() => {}} showAllSteps={true}>
          <div>Level 3 Edit Content</div>
        </Layout>
      </CharacterProvider>
    );

    STEPS.forEach((step) => {
      expect(screen.getAllByText(step.title)[0]).toBeInTheDocument();
    });
  });
});


