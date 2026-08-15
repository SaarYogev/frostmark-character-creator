import React, { ReactNode } from 'react';
import { STEPS } from '../types/Steps';
import { useCharacter } from '../contexts/CharacterContext';
import { CharacterSummaryPanel } from './CharacterSummaryPanel';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { StorageStatus } from '../services/storage/types';
import { AboutModal } from './AboutModal';
import { InfoIcon, GitHubIcon } from './Icons';

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
    const stepId = STEPS[stepIndex]?.id;
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

const Sidebar: React.FC<{
  currentStep: number;
  onNavigate: (step: number) => void;
  onNavigateHome: () => void;
  onOpenAbout: () => void;
}> = ({
  currentStep,
  onNavigate,
  onNavigateHome,
  onOpenAbout,
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
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.65rem',
        }}
      >
        <button
          className="btn btn-secondary icon-btn-round"
          id="sidebar-btn-about"
          onClick={onOpenAbout}
          title="About Frostmark RPG"
          aria-label="About Frostmark RPG"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '8px',
          }}
        >
          <InfoIcon size={18} />
        </button>
        <a
          href="https://github.com/SaarYogev/frostmark-character-creator"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary icon-btn-round"
          id="sidebar-btn-github"
          title="GitHub Repository"
          aria-label="GitHub Repository"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          <GitHubIcon size={18} />
        </a>
      </div>
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
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);

  return (
    <>
      {/* Standardized Mobile Top Header Bar */}
      <header className="mobile-header-bar">
        <img
          src={`${import.meta.env.BASE_URL}frostmark-logo.png`}
          alt="Frostmark Mobile"
          className="mobile-header-logo"
        />
        <select
          className="mobile-step-dropdown"
          value={currentStep}
          onChange={(e) => onNavigate(Number(e.target.value))}
          aria-label="Select Step"
        >
          {STEPS.map((step, idx) => (
            <option key={step.id} value={idx}>
              Step {idx + 1}: {step.title}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          <button
            className="btn btn-secondary icon-btn-round"
            onClick={() => setIsAboutOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '6px',
            }}
            title="About Frostmark RPG"
            aria-label="About Frostmark RPG"
          >
            <InfoIcon size={16} />
          </button>
          <a
            href="https://github.com/SaarYogev/frostmark-character-creator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary icon-btn-round"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '6px',
              textDecoration: 'none',
            }}
            title="GitHub Repository"
            aria-label="GitHub Repository"
          >
            <GitHubIcon size={16} />
          </a>
          <button
            className="btn-summary-toggle"
            onClick={() => setIsDrawerOpen(true)}
          >
            Summary
          </button>
        </div>
      </header>

      <div className="app-layout">
        <Sidebar
          currentStep={currentStep}
          onNavigate={onNavigate}
          onNavigateHome={onNavigateHome}
          onOpenAbout={() => setIsAboutOpen(true)}
        />

        <main className="main-content">
          {/* Top Action Bar in Main Builder View */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
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
      </div>

      {/* Collapsible Mobile/Tablet Summary Drawer */}
      <div
        className={`drawer-backdrop ${isDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <div className={`summary-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3 className="drawer-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Quick Summary
          </h3>
          <button className="btn-close-drawer" onClick={() => setIsDrawerOpen(false)}>
            ✕
          </button>
        </div>
        <CharacterSummaryPanel isDrawer onNavigateHome={onNavigateHome} />
      </div>

      {/* Tooltip for locked steps */}
      <div id="nav-lock-tip" className="nav-lock-tip" />

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

export { STEPS };
