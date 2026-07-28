import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Layout } from '../components/Layout';
import { STEPS } from '../types/Steps';

describe('Layout', () => {
  it('renders sidebar with all step navigation items', () => {
    render(
      <Layout currentStep={0} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    // Check sidebar header
    expect(screen.getByAltText('Frostmark')).toBeInTheDocument();
    expect(screen.getByText('Character Creator')).toBeInTheDocument();

    // Check all step navigation items
    STEPS.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.icon)).toBeInTheDocument();
    });
  });

  it('highlights the current step', () => {
    render(
      <Layout currentStep={1} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    // Step 1 (Race & Subrace) should be active
    const raceStep = screen.getByText('Race & Subrace');
    expect(raceStep.parentElement).toHaveClass('active');
  });

  it('renders main content area', () => {
    render(
      <Layout currentStep={0} onNavigate={() => {}}>
        <div data-testid="main-content">Test Content</div>
      </Layout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders character summary aside', () => {
    render(
      <Layout currentStep={0} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Character Summary')).toBeInTheDocument();
    expect(screen.getByText(/Save Data/)).toBeInTheDocument();
    expect(screen.getByText(/Save Character Sheet/)).toBeInTheDocument();
  });

  it('renders step footer with navigation buttons', () => {
    render(
      <Layout currentStep={0} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('← Back')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 11/)).toBeInTheDocument();
  });

  it('disables Back button on first step', () => {
    render(
      <Layout currentStep={0} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('← Back')).toBeDisabled();
  });

  it('shows Finish button on last step', () => {
    render(
      <Layout currentStep={STEPS.length - 1} onNavigate={() => {}}>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Finish ✓')).toBeInTheDocument();
  });

  it('calls onNavigate when clicking step navigation', () => {
    const mockNavigate = vi.fn();
    render(
      <Layout currentStep={0} onNavigate={mockNavigate}>
        <div>Test Content</div>
      </Layout>
    );

    const raceStep = screen.getByText('Race & Subrace');
    fireEvent.click(raceStep);

    expect(mockNavigate).toHaveBeenCalledWith(1);
  });

  it('calls onNavigate when clicking Next button', () => {
    const mockNavigate = vi.fn();
    render(
      <Layout currentStep={0} onNavigate={mockNavigate}>
        <div>Test Content</div>
      </Layout>
    );

    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    expect(mockNavigate).toHaveBeenCalledWith(1);
  });

  it('calls onNavigate when clicking Back button', () => {
    const mockNavigate = vi.fn();
    render(
      <Layout currentStep={1} onNavigate={mockNavigate}>
        <div>Test Content</div>
      </Layout>
    );

    const backButton = screen.getByText('← Back');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(0);
  });
});
