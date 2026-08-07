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

  it('renders character summary aside', () => {
    renderLayout(0);

    expect(screen.getByText('Character Summary')).toBeInTheDocument();
    expect(screen.getAllByText(/Save Data/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Save Character Sheet/)[0]).toBeInTheDocument();
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
});
