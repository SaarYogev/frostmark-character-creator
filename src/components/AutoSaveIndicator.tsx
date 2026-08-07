import React from 'react';
import { StorageStatus } from '../services/storage/types';

interface AutoSaveIndicatorProps {
  status: StorageStatus;
  isCloud: boolean;
  onRetry?: () => void;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status, isCloud, onRetry }) => {
  return (
    <div
      className="autosave-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.82rem',
        fontWeight: 500,
        background:
          status === 'saving'
            ? 'rgba(148, 161, 255, 0.15)'
            : status === 'saved'
            ? 'rgba(74, 222, 128, 0.15)'
            : status === 'error'
            ? 'rgba(248, 113, 113, 0.15)'
            : 'rgba(255, 255, 255, 0.06)',
        color:
          status === 'saving'
            ? '#a5b4fc'
            : status === 'saved'
            ? '#4ade80'
            : status === 'error'
            ? '#f87171'
            : '#9ca3af',
        border: `1px solid ${
          status === 'saving'
            ? 'rgba(165, 180, 252, 0.3)'
            : status === 'saved'
            ? 'rgba(74, 222, 128, 0.3)'
            : status === 'error'
            ? 'rgba(248, 113, 113, 0.3)'
            : 'rgba(255, 255, 255, 0.1)'
        }`,
      }}
    >
      {status === 'saving' && (
        <>
          <span
            className="spinner-icon"
            style={{
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
            }}
          >
            🔄
          </span>
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <span style={{ fontWeight: 'bold' }}>✓</span>
          <span>Saved {isCloud ? '(Cloud ☁️)' : '(Local 💻)'}</span>
        </>
      )}

      {status === 'error' && (
        <>
          <span>⚠️</span>
          <span>Save Error</span>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
              }}
            >
              Retry
            </button>
          )}
        </>
      )}

      {status === 'idle' && (
        <>
          <span>{isCloud ? '☁️' : '💻'}</span>
          <span>{isCloud ? 'Cloud Auto-Save' : 'Local Auto-Save'}</span>
        </>
      )}
    </div>
  );
};
