import React, { ReactNode } from 'react';
import { STEPS } from '../types/Steps';
import { useCharacter } from '../contexts/CharacterContext';
import { CharacterSummaryPanel } from './CharacterSummaryPanel';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { StorageStatus } from '../services/storage/types';

interface LayoutProps {
  currentStep: number;
  children: ReactNode;
  onNavigate: (step: number) => void;
  onNavigateHome?: () => void;
  saveStatus?: StorageStatus;
  isCloud?: boolean;
  onRetrySave?: () => void;
}

const StepNav: React.FC<{ currentStep: number; onNavigate: (step: number) => void }> = ({ currentStep, onNavigate }) => {
  const getStepLockReason = (stepIndex: number): string | null => {
    const stepId = STEPS[stepIndex].id;
    if (stepId === 'spellslots' || stepId === 'spellcasting') {
      return null;
    }
    return null;
  };

  return (
    <nav className="step-nav" id="step-nav">
      {STEPS.map((step, i) => {
        const lockReason = getStepLockReason(i);
        const isLocked = lockReason !== null;
        const isActive = i === currentStep;

        return (
          <button
            key={step.id}
            className={`step-nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
            id={`nav-${step.id}`}
            data-step={i}
            data-lock-reason={lockReason ?? ''}
            aria-disabled={isLocked}
            onClick={() => !isLocked && onNavigate(i)}
            disabled={isLocked}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-label">{step.title}</span>
            {isLocked && <span className="step-lock-icon">🔒</span>}
          </button>
        );
      })}
    </nav>
  );
};

const Sidebar: React.FC<{ currentStep: number; onNavigate: (step: number) => void; onNavigateHome: () => void }> = ({
  currentStep,
  onNavigate,
  onNavigateHome,
}) => {
  return (
    <aside className="sidebar" id="sidebar">
      <div
        className="sidebar-header"
        onClick={onNavigateHome}
        style={{ cursor: 'pointer' }}
        title="Return to Home Dashboard"
      >
        <img src={`${import.meta.env.BASE_URL}frostmark-logo.png`} alt="Frostmark" className="sidebar-logo" />
        <p className="sidebar-subtitle">Character Creator</p>
      </div>
      <StepNav currentStep={currentStep} onNavigate={onNavigate} />
    </aside>
  );
};

const StepFooter: React.FC<{ currentStep: number; onNavigate: (step: number) => void; totalSteps: number }> = ({
  currentStep,
  onNavigate,
  totalSteps,
}) => {
  return (
    <div className="step-footer">
      <button
        className="btn btn-secondary"
        id="btn-prev"
        disabled={currentStep === 0}
        onClick={() => currentStep > 0 && onNavigate(currentStep - 1)}
      >
        ← Back
      </button>
      <div className="step-counter" id="step-counter">
        Step {currentStep + 1} of {totalSteps}
      </div>
      <button
        className="btn btn-primary"
        id="btn-next"
        onClick={() => currentStep < totalSteps - 1 && onNavigate(currentStep + 1)}
      >
        {currentStep === totalSteps - 1 ? 'Finish ✓' : 'Next →'}
      </button>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({
  currentStep,
  children,
  onNavigate,
  onNavigateHome = () => {},
  saveStatus = 'idle',
  isCloud = false,
  onRetrySave,
}) => {
  return (
    <div className="app-layout">
      <Sidebar currentStep={currentStep} onNavigate={onNavigate} onNavigateHome={onNavigateHome} />
      <main className="main-content">
        {/* Top Action Bar in Main Builder View */}
        <div
          style={{
            display: 'flex',
            justify: 'flex-end',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <AutoSaveIndicator status={saveStatus} isCloud={isCloud} onRetry={onRetrySave} />
        </div>

        <div className="step-container">{children}</div>
        <StepFooter currentStep={currentStep} onNavigate={onNavigate} totalSteps={STEPS.length} />
      </main>
      <CharacterSummaryPanel onNavigateHome={onNavigateHome} />
      {/* Tooltip for locked steps */}
      <div id="nav-lock-tip" className="nav-lock-tip" />
    </div>
  );
};

export { STEPS };
