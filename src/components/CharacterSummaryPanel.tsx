import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { RACES } from '../data/races';
import { ORIGINS } from '../data/origins';
import { BACKGROUNDS } from '../data/backgrounds';
import { CHARACTERISTICS } from '../data/constants';
import {
  getFinalCharacteristics,
  getProficiencyBonus,
  getCharacteristicModifier,
} from '../logic/state';
import { handleExportJSON, handleExportPDF } from '../utils/exportHelpers';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

export const CharacterSummaryPanel: React.FC<{ onNavigateHome?: () => void }> = ({ onNavigateHome }) => {
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

  const { apLimit, apRemaining } = getGlobalAPSummary(state);

  const currentLevel = state.identity?.level ?? state.level ?? 1;
  const profBonus = getProficiencyBonus(currentLevel);
  const finalStats = getFinalCharacteristics(state, RACES);

  const charName = state.identity?.characterName || '—';

  let raceDisplay = '—';
  if (typeof state.race === 'string') {
    raceDisplay = state.race === 'Custom' ? (state.customRace?.name || 'Custom') : state.race;
  } else if (state.race?.race === 'Custom') {
    raceDisplay = state.race.customRace?.name || 'Custom';
  } else if (state.race?.race) {
    raceDisplay = state.race.race;
  }
  const subraceName = typeof state.subrace === 'string' ? state.subrace : state.race?.subrace;
  if (subraceName) {
    raceDisplay += ` (${subraceName})`;
  }

  let bgDisplay = '—';
  if (typeof state.background === 'string') {
    bgDisplay = state.background === 'Custom' ? (state.customBackground?.name || 'Custom') : state.background;
  } else if (state.background?.name === 'Custom') {
    bgDisplay = state.customBackground?.name || 'Custom';
  } else if (state.background?.name) {
    bgDisplay = state.background.name;
  }

  // Calculate Ability Origins level breakdown (Only increment when a primary ability of that origin is explicitly selected)
  const aoLevelCounts: Record<string, number> = {};
  const levelSelections = state.ao?.levelSelections ?? state.levelSelections ?? {};
  const selectedAOs = state.ao?.selectedAOs ?? [];

  // Initialize all selected AOs in pool to 0
  selectedAOs.forEach((aoName) => {
    aoLevelCounts[aoName] = 0;
  });

  for (let l = 1; l <= currentLevel; l++) {
    const sel = levelSelections[l];
    // Check if user has explicitly selected a primary ability for this level
    if (sel && sel.primaryAbility) {
      let originName = sel.primaryAO;
      if (originName === 'Custom' && state.ao?.customPrimaryAO?.name) {
        originName = state.ao.customPrimaryAO.name;
      }
      if (originName) {
        aoLevelCounts[originName] = (aoLevelCounts[originName] ?? 0) + 1;
      }
    }
  }

  const aoDisplayParts = Object.entries(aoLevelCounts).map(([aoName, count]) => `${aoName} ${count}`);
  const aoDisplay = aoDisplayParts.length > 0 ? aoDisplayParts.join(', ') : '—';

  return (
    <aside className="character-summary" id="character-summary">
      <h2 className="summary-title">Character Summary</h2>
      <div id="summary-content">
        <div
          className={`summary-ap-banner ${apRemaining < 0 ? 'over-budget' : ''}`}
          style={{
            background: apRemaining < 0 ? 'rgba(235, 94, 85, 0.15)' : 'rgba(148, 161, 255, 0.12)',
            border: `1px solid ${apRemaining < 0 ? '#eb5e55' : 'rgba(148, 161, 255, 0.3)'}`,
            borderRadius: '8px',
            padding: '0.85rem',
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

        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="summary-label" style={{ color: '#a0a5c0' }}>Name</span>
          <span className="summary-val" style={{ fontWeight: 'bold' }}>{charName}</span>
        </div>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="summary-label" style={{ color: '#a0a5c0' }}>Race</span>
          <span className="summary-val" style={{ fontWeight: 'bold' }}>{raceDisplay}</span>
        </div>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="summary-label" style={{ color: '#a0a5c0' }}>Background</span>
          <span className="summary-val" style={{ fontWeight: 'bold' }}>{bgDisplay}</span>
        </div>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="summary-label" style={{ color: '#a0a5c0' }}>Ability Origins</span>
          <span className="summary-val" style={{ fontWeight: 'bold' }}>{aoDisplay}</span>
        </div>
        <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span className="summary-label" style={{ color: '#a0a5c0' }}>Level / Prof</span>
          <span className="summary-val" style={{ fontWeight: 'bold' }}>{currentLevel} / +{profBonus}</span>
        </div>

        <div
          className="summary-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            background: 'var(--bg-elevated, rgba(255,255,255,0.03))',
            padding: '0.75rem',
            borderRadius: '8px',
          }}
        >
          {CHARACTERISTICS.map((c) => {
            const score = finalStats[c.key as keyof typeof finalStats] ?? 10;
            const mod = getCharacteristicModifier(score);
            return (
              <div key={c.key} className="summary-stat" style={{ textAlign: 'center' }}>
                <div className="summary-stat-key" style={{ fontSize: '0.7rem', color: '#a0a5c0' }}>{c.short}</div>
                <div className="summary-stat-score" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{score}</div>
                <div className="summary-stat-mod" style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>
                  {mod >= 0 ? '+' : ''}{mod}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="summary-actions" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button className="btn btn-secondary" id="btn-import" onClick={() => document.getElementById('right-import-file')?.click()}>
          📂 Load Data File
        </button>
        <button className="btn btn-accent" id="btn-export-json" onClick={() => handleExportJSON(state)}>
          💾 Save Data File
        </button>
        <button className="btn btn-primary" id="btn-export-pdf" onClick={() => handleExportPDF(state)}>
          📄 Download Character Sheet
        </button>
        <input type="file" id="right-import-file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
    </aside>
  );
};

