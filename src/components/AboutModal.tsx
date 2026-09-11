import React, { useEffect } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="about-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className="about-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated, #181d2e)',
          border: '1px solid var(--border-active, rgba(108, 141, 255, 0.35))',
          borderRadius: '16px',
          maxWidth: '640px',
          width: '100%',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(108, 141, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(108, 141, 255, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img
              src={`${import.meta.env.BASE_URL}frostmark-logo.png`}
              alt="Frostmark Logo"
              style={{ height: '36px', width: 'auto' }}
            />
            <div>
              <h2
                id="about-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}
              >
                About Frostmark RPG
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#9499b8' }}>Character Creator & Management Vault</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-close-drawer"
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#a0a5c0',
              cursor: 'pointer',
              fontSize: '1.1rem',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.75rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <p style={{ margin: 0, color: '#d1d5db', fontSize: '0.92rem', lineHeight: '1.6' }}>
            <strong>Frostmark Character Creator</strong> is a web application designed to streamline
            character creation, ability calculations, progression management, and printable sheet generation
            for the Frostmark tabletop roleplaying system.
          </p>

          {/* Maintainer Info Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(108, 141, 255, 0.2)',
              borderRadius: '12px',
              padding: '1.2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                marginBottom: '0.75rem',
                color: '#6c8dff',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Maintainer & Contact</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#9499b8', minWidth: '90px' }}>Maintainer:</span>
                <strong style={{ color: '#ffffff' }}>Saar Yogev</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#9499b8', minWidth: '90px' }}>Email:</span>
                <a
                  href="mailto:saaryogev@gmail.com"
                  style={{
                    color: '#60a5fa',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  saaryogev@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Contributions Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              borderRadius: '12px',
              padding: '1.2rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                marginBottom: '0.6rem',
                color: '#a78bfa',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <path d="M6 9v12" />
              </svg>
              <span>Contributing to the Project</span>
            </div>
            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.55' }}>
              Contributions from the community are warmly welcome! Whether you are interested in fixing bugs,
              adding character options, improving UI responsiveness, or submitting game mechanic enhancements,
              feel free to open a Pull Request or start a discussion on GitHub.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <a
                href="https://github.com/SaarYogev/frostmark-character-creator"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  padding: '0.5rem 0.95rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                View Repository
              </a>
              <a
                href="https://github.com/SaarYogev/frostmark-character-creator/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  padding: '0.5rem 0.95rem',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Issues & Feature Requests
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.45rem 1.25rem', fontSize: '0.9rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
