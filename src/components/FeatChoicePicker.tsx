import React, { useState } from 'react';
import {
  FEATS,
  getFeatsByCategory,
  getFeatByName,
  parseFeatChoice,
  checkFeatPrerequisites,
  FeatItem
} from '../data/feats';

interface FeatChoicePickerProps {
  value: string;
  state: any;
  disabled?: boolean;
  onChange: (val: string) => void;
}

const CATEGORIES = [
  'All',
  'General Feats',
  'Weapon Feats',
  'Armor Feats',
  'Skill Feats',
  'Tool Feats'
];

export const FeatChoicePicker: React.FC<FeatChoicePickerProps> = ({
  value,
  state,
  disabled = false,
  onChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const parsed = parseFeatChoice(value);
  const currentFeatName = parsed?.featName || (value !== 'Feat' && !value.startsWith('Other:') ? value : '');
  const currentFeat = getFeatByName(currentFeatName);
  const currentStat = parsed?.chosenStat || currentFeat?.ability_score_increase?.choices[0] || '';

  const featsToDisplay = (selectedCategory === 'All'
    ? FEATS
    : getFeatsByCategory(selectedCategory)
  ).filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q);
  });

  const handleFeatSelect = (featName: string) => {
    if (!featName) {
      onChange('Feat');
      return;
    }
    const feat = getFeatByName(featName);
    if (!feat) return;

    if (feat.ability_score_increase && feat.ability_score_increase.choices.length > 1) {
      const defaultStat = feat.ability_score_increase.choices[0];
      onChange(`Feat: ${feat.name} [${defaultStat}]`);
    } else {
      onChange(`Feat: ${feat.name}`);
    }
  };

  const handleStatChange = (stat: string) => {
    if (!currentFeat) return;
    onChange(`Feat: ${currentFeat.name} [${stat}]`);
  };

  const currentPrereq = currentFeat ? checkFeatPrerequisites(currentFeat, state) : null;

  return (
    <div
      className="feat-choice-picker"
      style={{
        marginTop: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      {/* Hidden standard select kept accessible for screen readers and existing automated test queries */}
      <select
        id="feat-select"
        aria-label="Select Feat"
        className="select sr-only"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 1, width: 1, overflow: 'hidden' }}
        disabled={disabled}
        value={currentFeat?.name || ''}
        onChange={(e) => handleFeatSelect(e.target.value)}
        tabIndex={-1}
      >
        <option value="">-- Choose a Feat --</option>
        {FEATS.map((f: FeatItem) => {
          const prereq = checkFeatPrerequisites(f, state);
          return (
            <option key={f.id} value={f.name} disabled={!prereq.met}>
              {f.name} {!prereq.met ? `(Requires: ${f.prerequisite})` : ''}
            </option>
          );
        })}
      </select>

      {/* Filter and Search Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Filter by Category:
          </label>
          <input
            type="text"
            className="input"
            disabled={disabled}
            placeholder="Search feats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '150px', padding: '3px 8px', fontSize: '0.75rem', height: '28px' }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={disabled}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feat Cards Grid */}
      <div className="feat-cards-container">
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', marginBottom: '0.35rem' }}>
          Choose a Feat ({featsToDisplay.length} available):
        </label>
        <div
          className="feat-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.6rem',
            maxHeight: 'min(52vh, 480px)',
            overflowY: 'auto',
            paddingRight: '4px',
            paddingBottom: '4px'
          }}
        >
          {featsToDisplay.map((f: FeatItem) => {
            const isSelected = currentFeat?.name === f.name;
            const prereq = checkFeatPrerequisites(f, state);
            const isLockedOrDisabled = disabled || !prereq.met;

            return (
              <div
                key={f.id}
                role="button"
                tabIndex={isLockedOrDisabled ? -1 : 0}
                className={`ability-card card-option ${isSelected ? 'selected' : ''} ${!prereq.met ? 'disabled' : ''}`}
                title={!prereq.met ? `Requires: ${f.prerequisite}` : f.name}
                onClick={() => {
                  if (isLockedOrDisabled) return;
                  handleFeatSelect(isSelected ? '' : f.name);
                }}
                onKeyDown={(e) => {
                  if (isLockedOrDisabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFeatSelect(isSelected ? '' : f.name);
                  }
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: isLockedOrDisabled ? 'not-allowed' : 'pointer',
                  opacity: !prereq.met ? 0.45 : 1,
                  border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(108, 141, 255, 0.15)' : 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '68px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {f.category.replace(' Feats', '')}
                    </span>
                    {isSelected && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        ✓
                      </span>
                    )}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: isSelected ? 'var(--accent-gold)' : 'var(--text-primary)', lineHeight: 1.25 }}>
                    {f.name}
                  </h4>
                </div>
                {!prereq.met && (
                  <div style={{ fontSize: '0.62rem', color: '#e74c3c', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Req: {f.prerequisite}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ability Score Sub-Choice */}
      {currentFeat && currentFeat.ability_score_increase && currentFeat.ability_score_increase.choices.length > 1 && (
        <div className="form-group" style={{ marginTop: '0.25rem' }}>
          <label
            htmlFor="feat-stat-select"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', marginBottom: '0.25rem' }}
          >
            Choose Ability Score (+1):
          </label>
          <select
            id="feat-stat-select"
            aria-label="Choose Ability Score"
            className="select"
            disabled={disabled}
            style={{ width: '100%', fontSize: '0.88rem' }}
            value={currentStat}
            onChange={(e) => handleStatChange(e.target.value)}
          >
            {currentFeat.ability_score_increase.choices.map((stat) => (
              <option key={stat} value={stat}>
                +1 {stat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Feat Information Box */}
      {currentFeat && (
        <div
          className="feat-details-box"
          style={{
            marginTop: '0.25rem',
            padding: '0.85rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-active)',
            borderLeft: '3px solid var(--accent-gold)',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
              {currentFeat.name}
            </strong>
            <span className="badge" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              {currentFeat.category}
            </span>
          </div>

          {/* Prerequisite Alert */}
          {currentFeat.prerequisite && (
            <div style={{ marginBottom: '0.35rem', color: currentPrereq?.met ? '#2ecc71' : '#e74c3c' }}>
              <strong>Prerequisite:</strong> {currentFeat.prerequisite}
              {currentPrereq && !currentPrereq.met && (
                <div style={{ fontSize: '0.72rem', marginTop: '0.1rem' }}>⚠️ {currentPrereq.reason}</div>
              )}
            </div>
          )}

          {/* Resource Bonuses Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
            {currentFeat.ability_score_increase && (
              <span className="badge" style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', fontSize: '0.72rem' }}>
                +{currentFeat.ability_score_increase.value} {currentStat || currentFeat.ability_score_increase.choices.join('/')}
              </span>
            )}
            {currentFeat.skill_ranks?.map((sr) => (
              <span key={sr.skill} className="badge" style={{ background: 'rgba(52, 152, 219, 0.2)', color: '#3498db', fontSize: '0.72rem' }}>
                +{sr.rank} Rank {sr.skill} {sr.allow_rank_5 ? '(Max 5)' : ''}
              </span>
            ))}
            {currentFeat.armor_proficiencies && (
              <span className="badge" style={{ background: 'rgba(155, 89, 182, 0.2)', color: '#9b59b6', fontSize: '0.72rem' }}>
                Armor: {currentFeat.armor_proficiencies.join(', ')}
              </span>
            )}
            {currentFeat.weapon_proficiencies && (
              <span className="badge" style={{ background: 'rgba(230, 126, 34, 0.2)', color: '#e67e22', fontSize: '0.72rem' }}>
                Weapons: {currentFeat.weapon_proficiencies.join(', ')}
              </span>
            )}
            {currentFeat.ac_bonus && (
              <span className="badge" style={{ background: 'rgba(26, 188, 156, 0.2)', color: '#1abc9c', fontSize: '0.72rem' }}>
                +{currentFeat.ac_bonus} AC
              </span>
            )}
          </div>

          <div
            className="feat-desc-scroll"
            style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              fontSize: '0.82rem',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {currentFeat.desc}
          </div>
        </div>
      )}
    </div>
  );
};
export default FeatChoicePicker;
