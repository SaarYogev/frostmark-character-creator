import React, { ReactNode } from 'react';
import { STEPS, StepId } from '../types/Steps';

interface LayoutProps {
  currentStep: number;
  children: ReactNode;
  onNavigate: (step: number) => void;
}

const StepNav: React.FC<{ currentStep: number; onNavigate: (step: number) => void }> = ({ currentStep, onNavigate }) => {
  const getStepLockReason = (stepIndex: number): string | null => {
    const stepId = STEPS[stepIndex].id;
    // Only lock spell-related steps if no Primary AO is chosen
    // For now, we'll keep it simple and not lock anything
    // This can be enhanced later when we implement AO
    if ((stepId === 'spellslots' || stepId === 'spellcasting') ) {
      // In the future, check if primaryAO is selected
      // For now, don't lock
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

const Sidebar: React.FC<{ currentStep: number; onNavigate: (step: number) => void }> = ({ currentStep, onNavigate }) => {
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <img src={`${import.meta.env.BASE_URL}frostmark-logo.png`} alt="Frostmark" className="sidebar-logo" />
        <p className="sidebar-subtitle">Character Creator</p>
      </div>
      <StepNav currentStep={currentStep} onNavigate={onNavigate} />
      <div className="sidebar-actions">
        <button className="btn btn-ghost" id="btn-import">
          📂 Load Data
        </button>
        <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} />
      </div>
    </aside>
  );
};

const CharacterSummary: React.FC = () => {
  return (
    <aside className="character-summary" id="character-summary">
      <h2 className="summary-title">Character Summary</h2>
      <div id="summary-content">
        {/* Summary content will be added here */}
        <p>Character summary will appear here</p>
      </div>
      <div className="summary-actions">
        <button className="btn btn-accent" id="btn-export-json">
          💾 Save Data
        </button>
        <button className="btn btn-accent" id="btn-export-pdf">
          📄 Save Character Sheet
        </button>
      </div>
    </aside>
  );
};

const StepFooter: React.FC<{ currentStep: number; onNavigate: (step: number) => void; totalSteps: number }> = ({ currentStep, onNavigate, totalSteps }) => {
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

export const Layout: React.FC<LayoutProps> = ({ currentStep, children, onNavigate }) => {
  return (
    <>
      <Sidebar currentStep={currentStep} onNavigate={onNavigate} />
      <main className="main-content">
        <div className="step-container">{children}</div>
        <StepFooter
          currentStep={currentStep}
          onNavigate={onNavigate}
          totalSteps={STEPS.length}
        />
      </main>
      <CharacterSummary />
      {/* Tooltip for locked steps */}
      <div id="nav-lock-tip" className="nav-lock-tip" />
    </>
  );
};

export { STEPS };
