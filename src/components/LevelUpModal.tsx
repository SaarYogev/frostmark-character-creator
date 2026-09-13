import React, { useState } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { computeLevelUpPreview } from '../logic/levelUp';
import { ORIGINS } from '../data/origins';
import { RACES } from '../data/races';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLevelUpConfirmed?: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ isOpen, onClose, onLevelUpConfirmed }) => {
  const { state, dispatch } = useCharacter();
  const [hpChoice, setHpChoice] = useState<'average' | 'roll'>('average');
  const [rolledValue, setRolledValue] = useState<number | null>(null);

  if (!isOpen) return null;

  const preview = computeLevelUpPreview(state, ORIGINS, { racesData: RACES });

  const handleRollDie = () => {
    const roll = Math.floor(Math.random() * preview.hd) + 1;
    setRolledValue(roll);
  };

  const calculatedRollGain =
    rolledValue != null
      ? Math.max(1, rolledValue + preview.vitMod) + preview.toughnessBonus
      : preview.averageHpGain;

  const activeHpGain = hpChoice === 'average' ? preview.averageHpGain : calculatedRollGain;
  const activeNextMaxHP = (preview.currentMaxHP ?? 10) + activeHpGain;

  const handleConfirm = () => {
    dispatch({
      type: 'LEVEL_UP',
      payload: {
        hpChoice,
        rolledHp: hpChoice === 'roll' && rolledValue != null ? rolledValue : undefined,
      },
    });
    if (onLevelUpConfirmed) {
      onLevelUpConfirmed();
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          background: '#1a1d2e',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff' }}>
            🆙 Level Up: Level {preview.currentLevel} → Level {preview.targetLevel}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0a5c0',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 1.25rem 0', color: '#a0a5c0', fontSize: '0.92rem' }}>
          Advance <strong>{state.identity?.characterName || state.characterName || 'your character'}</strong> to{' '}
          <strong>Level {preview.targetLevel}</strong>. All existing stats, items, spells, and custom notes are preserved as the current truth.
        </p>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem', color: '#93c5fd' }}>
            ❤️ Hit Points Advancement (Hit Die: d{preview.hd})
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className={`btn ${hpChoice === 'average' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '0.88rem', padding: '0.5rem' }}
              onClick={() => setHpChoice('average')}
            >
              Average ({Math.ceil(preview.hd / 2)} + {preview.vitMod >= 0 ? `+${preview.vitMod}` : preview.vitMod})
            </button>
            <button
              type="button"
              className={`btn ${hpChoice === 'roll' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '0.88rem', padding: '0.5rem' }}
              onClick={() => setHpChoice('roll')}
            >
              🎲 Roll Hit Die
            </button>
          </div>

          {hpChoice === 'roll' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.85rem',
                padding: '0.65rem',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '8px',
              }}
            >
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleRollDie}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                🎲 Roll d{preview.hd}
              </button>
              <div style={{ fontSize: '0.9rem', color: '#d1d5db' }}>
                {rolledValue != null ? (
                  <span>
                    Rolled: <strong style={{ color: '#4ade80' }}>{rolledValue}</strong> on d{preview.hd}
                  </span>
                ) : (
                  <span>Click to roll or enter value below:</span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max={preview.hd}
                value={rolledValue ?? ''}
                onChange={(e) => setRolledValue(parseInt(e.target.value, 10) || null)}
                placeholder="Roll"
                style={{
                  width: '60px',
                  padding: '0.35rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  textAlign: 'center',
                  marginLeft: 'auto',
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem' }}>
            <span style={{ color: '#a0a5c0' }}>HP Delta:</span>
            <strong style={{ color: '#4ade80' }}>+{activeHpGain} HP</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#a0a5c0' }}>New Max HP:</span>
            <strong style={{ color: '#ffffff' }}>
              {preview.currentMaxHP} → {activeNextMaxHP} Max HP
            </strong>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem', color: '#facc15' }}>
            ✨ Level {preview.targetLevel} Advancements
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <li>
              Proficiency Bonus: <strong>+{preview.proficiencyBonus}</strong>
            </li>
            {preview.apGain > 0 ? (
              <li style={{ color: '#4ade80', fontWeight: 600 }}>
                Gain +{preview.apGain} Accomplishment Points!
              </li>
            ) : null}
            {preview.potentialGain > 0 ? (
              <li>
                Potential Limit: <strong>+{preview.potentialGain}</strong>
              </li>
            ) : null}
            <li>
              Skill Rank Cap: <strong>Rank {preview.maxSkillRank}</strong>
            </li>
            <li>New Ability Origin selection unlocked for Level {preview.targetLevel}.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            id="btn-confirm-level-up"
            onClick={handleConfirm}
            style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
          >
            Confirm Level Up →
          </button>
        </div>
      </div>
    </div>
  );
};
