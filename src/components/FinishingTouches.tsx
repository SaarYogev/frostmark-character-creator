import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { handleExportJSON, handleExportPDF } from '../utils/exportHelpers';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

const FinishingTouches: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const { apRemaining, apLimit } = getGlobalAPSummary(state);
  const customFeatures: string[] = (state as any).customFeatures ?? [];

  const handleCustomFeaturesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n');
    dispatch({ type: 'SET_STATE', payload: { customFeatures: lines } } as any);
  };

  const onSaveJSON = () => handleExportJSON(state);
  const onSavePDF = () => handleExportPDF(state);

  return (
    <div className="finishing-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">✅ Finishing Touches</h2>
          <p className="step-desc">Review your character details and export your character sheet.</p>
        </div>

        {/* Custom Features & Notes */}
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-color, #4a90e2)', marginBottom: '0.5rem', display: 'block' }}>
            Custom Features / Notes
          </label>
          <textarea
            id="custom-features"
            className="textarea"
            rows={5}
            placeholder="Any custom abilities, special rules, or DM notes..."
            value={customFeatures.join('\n')}
            onChange={handleCustomFeaturesChange}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Summary AP Banner */}
        <div
          className={`summary-ap-banner ${apRemaining < 0 ? 'over-budget' : ''}`}
          style={{
            background: apRemaining < 0 ? 'rgba(235, 94, 85, 0.15)' : 'rgba(148, 161, 255, 0.12)',
            border: `1px solid ${apRemaining < 0 ? '#eb5e55' : 'rgba(148, 161, 255, 0.3)'}`,
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#a0a5c0', marginBottom: '0.25rem' }}>
            Accomplishment Points
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: apRemaining < 0 ? '#eb5e55' : '#ffffff' }}>
            {apRemaining} <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#a0a5c0' }}>/ {apLimit} Remaining</span>
          </div>
        </div>

        {/* Character Overview Card */}
        <div className="section-block" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Character Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#a0a5c0' }}>Name</span>
              <strong style={{ color: '#fff' }}>{state.characterName || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#a0a5c0' }}>Race</span>
              <strong style={{ color: '#fff' }}>
                {typeof state.race === 'string'
                  ? (state.race === 'Custom' ? state.customRace?.name : state.race || '—')
                  : (state.race as any)?.name ?? (state.race as any)?.race ?? '—'}{' '}
                {typeof state.subrace === 'string' ? (state.subrace ? `(${state.subrace})` : '') : ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#a0a5c0' }}>Background</span>
              <strong style={{ color: '#fff' }}>
                {typeof state.background === 'string'
                  ? (state.background === 'Custom' ? state.customBackground?.name : state.background || '—')
                  : (state.background as any)?.name ?? (state.background as any)?.background ?? '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#a0a5c0' }}>Primary Ability Origin</span>
              <strong style={{ color: '#fff' }}>
                {typeof state.primaryAO === 'string'
                  ? (state.primaryAO === 'Custom' ? state.customPrimaryAO?.name : state.primaryAO || '—')
                  : (state.primaryAO as any)?.name ?? (state.primaryAO as any)?.primaryAO ?? '—'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
              <span style={{ color: '#a0a5c0' }}>Level</span>
              <strong style={{ color: '#fff' }}>Level {state.level}</strong>
            </div>
          </div>
        </div>

        {/* Final Export Actions */}
        <div className="export-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary" id="btn-final-import" onClick={() => document.getElementById('right-import-file')?.click()}>
            📂 Load Data
          </button>
          <button className="btn btn-accent" id="btn-final-export-json" onClick={onSaveJSON}>
            💾 Save Data
          </button>
          <button className="btn btn-primary" id="btn-final-export-pdf" onClick={onSavePDF}>
            📄 Save Character Sheet
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinishingTouches;
