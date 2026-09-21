import React, { ReactNode } from 'react';
import { Step, STEPS, getStepsForLevel } from '../types/Steps';
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
  autoOpenLevelUp?: boolean;
  showAllSteps?: boolean;
  onToggleShowAllSteps?: () => void;
}

const StepNav: React.FC<{
  steps: Step[];
  currentStepId: string;
  onNavigate: (stepIndex: number) => void;
}> = ({ steps, currentStepId, onNavigate }) => {
  return (
    <nav className="step-nav" id="step-nav">
      {steps.map((step) => {
        const globalIndex = STEPS.findIndex((s) => s.id === step.id);
        const isActive = step.id === currentStepId;

        return (
          <button
            key={step.id}
            className={`step-nav-item ${isActive ? 'active' : ''}`}
            id={`nav-${step.id}`}
            data-step={globalIndex}
            data-lock-reason=""
            aria-disabled={false}
            onClick={() => onNavigate(globalIndex)}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-label">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
};

const Sidebar: React.FC<{
  steps: Step[];
  currentStepId: string;
  onNavigate: (stepIndex: number) => void;
  onNavigateHome: () => void;
  onOpenAbout: () => void;
  level: number;
  showAllSteps: boolean;
  onToggleShowAllSteps?: () => void;
}> = ({
  steps,
  currentStepId,
  onNavigate,
  onNavigateHome,
  onOpenAbout,
  level,
  showAllSteps,
  onToggleShowAllSteps,
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

      {level > 1 && (
        <div style={{ padding: '0.4rem 1rem 0.6rem 1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onToggleShowAllSteps}
            style={{
              width: '100%',
              fontSize: '0.78rem',
              padding: '0.35rem 0.6rem',
              borderRadius: '6px',
              border: showAllSteps ? '1px solid var(--accent-gold, #f59e0b)' : '1px solid var(--border-subtle)',
              color: showAllSteps ? 'var(--accent-gold, #f59e0b)' : '#a0a5c0',
            }}
          >
            {showAllSteps ? '🔒 Focus Level Up Tabs' : '🔓 Show All Tabs (Edit Mode)'}
          </button>
        </div>
      )}

      <StepNav steps={steps} currentStepId={currentStepId} onNavigate={onNavigate} />

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

const StepFooter: React.FC<{
  steps: Step[];
  currentStepId: string;
  onNavigate: (stepIndex: number) => void;
}> = ({
  steps,
  currentStepId,
  onNavigate,
}) => {
  const visibleIndex = Math.max(0, steps.findIndex((s) => s.id === currentStepId));
  const isFirst = visibleIndex <= 0;
  const isLast = visibleIndex >= steps.length - 1;

  const handlePrev = () => {
    if (!isFirst) {
      const prevStepId = steps[visibleIndex - 1].id;
      const prevGlobalIndex = STEPS.findIndex((s) => s.id === prevStepId);
      onNavigate(prevGlobalIndex);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      const nextStepId = steps[visibleIndex + 1].id;
      const nextGlobalIndex = STEPS.findIndex((s) => s.id === nextStepId);
      onNavigate(nextGlobalIndex);
    }
  };

  return (
    <div className="step-footer">
      <button
        className="btn btn-secondary"
        id="btn-prev"
        disabled={isFirst}
        onClick={handlePrev}
      >
        ← Back
      </button>
      <div className="step-counter" id="step-counter">
        Step {visibleIndex + 1} of {steps.length}
      </div>
      <button
        className="btn btn-primary"
        id="btn-next"
        onClick={handleNext}
      >
        {isLast ? 'Finish ✓' : 'Next →'}
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
  autoOpenLevelUp,
  showAllSteps = false,
  onToggleShowAllSteps,
}) => {
  const { state } = useCharacter();
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);

  const characterLevel = state.identity?.level ?? state.level ?? 1;
  const visibleSteps = getStepsForLevel(characterLevel, showAllSteps);
  const currentStepDef = STEPS[currentStep] ?? STEPS[0];
  const currentStepId = currentStepDef.id;

  return (
    <>
      {/* Standardized Mobile Top Header Bar */}
      <header className="mobile-header-bar">
        <img
          src={`${import.meta.env.BASE_URL}frostmark-logo.png`}
          alt="Frostmark Mobile"
          className="mobile-header-logo"
          onClick={onNavigateHome}
          style={{ cursor: 'pointer' }}
          title="Return to Home Dashboard"
        />
        <select
          className="mobile-step-dropdown"
          value={currentStep}
          onChange={(e) => onNavigate(Number(e.target.value))}
          aria-label="Select Step"
        >
          {visibleSteps.map((step) => {
            const globalIdx = STEPS.findIndex((s) => s.id === step.id);
            return (
              <option key={step.id} value={globalIdx}>
                {step.title}
              </option>
            );
          })}
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
          steps={visibleSteps}
          currentStepId={currentStepId}
          onNavigate={onNavigate}
          onNavigateHome={onNavigateHome}
          onOpenAbout={() => setIsAboutOpen(true)}
          level={characterLevel}
          showAllSteps={showAllSteps}
          onToggleShowAllSteps={onToggleShowAllSteps}
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
          <StepFooter steps={visibleSteps} currentStepId={currentStepId} onNavigate={onNavigate} />
        </main>

        <CharacterSummaryPanel
          onNavigateHome={onNavigateHome}
          onNavigateToStep={onNavigate}
          defaultLevelUpOpen={autoOpenLevelUp}
        />
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
        <CharacterSummaryPanel isDrawer onNavigateHome={onNavigateHome} onNavigateToStep={onNavigate} />
      </div>
      {/* Tooltip for locked steps */}
      <div id="nav-lock-tip" className="nav-lock-tip" />

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

export { STEPS };
