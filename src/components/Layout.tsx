import React, { ReactNode } from 'react';
import { STEPS, StepId } from '../types/Steps';
import { useCharacter } from '../contexts/CharacterContext';

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

import { handleExportJSON, handleExportPDF } from '../utils/exportHelpers';

const Sidebar: React.FC<{ currentStep: number; onNavigate: (step: number) => void }> = ({ currentStep, onNavigate }) => {
  const { state, dispatch } = useCharacter();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const loadedState = JSON.parse(ev.target?.result as string);
        dispatch({ type: 'LOAD_STATE', payload: loadedState });
        alert('Character data loaded successfully!');
      } catch (err: any) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <img src={`${import.meta.env.BASE_URL}frostmark-logo.png`} alt="Frostmark" className="sidebar-logo" />
        <p className="sidebar-subtitle">Character Creator</p>
      </div>
      <StepNav currentStep={currentStep} onNavigate={onNavigate} />
    </aside>
  );
};

import { CharacterSummaryPanel } from './CharacterSummaryPanel';

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
      <CharacterSummaryPanel />
      {/* Tooltip for locked steps */}
      <div id="nav-lock-tip" className="nav-lock-tip" />
    </>
  );
};

export { STEPS };
