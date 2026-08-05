import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { CHARACTERISTICS } from '../../js/data/constants';
import { RACES } from '../../js/data/races';
import {
  getAbilityPointLimit,
  calculateSpentAbilityPoints,
  getFinalCharacteristics,
  getCharacteristicModifier,
  getAttributePointCost,
} from '../../js/logic/state';
import { CharacteristicName } from '../types/Ability';

const AbilityScoreSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const powerLevel = state.campaignPowerLevel ?? state.identity.campaignPowerLevel ?? 'Heroic';
  const limit = getAbilityPointLimit(powerLevel);
  const spent = calculateSpentAbilityPoints(state);
  const remaining = limit - spent;
  const finalStats = getFinalCharacteristics(state, RACES);

  const handleAdjustAbility = (key: CharacteristicName, delta: number) => {
    const current = state.baseCharacteristics[key] ?? 10;
    const next = current + delta;
    if (next < 6 || next > 17) return;

    const costDelta = getAttributePointCost(next) - getAttributePointCost(current);
    if (spent + costDelta > limit) {
      return;
    }

    dispatch({
      type: 'SET_CHARACTERISTICS',
      payload: {
        [key]: next,
      },
    });
  };

  return (
    <div className="abilities-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">💪 Ability Scores</h2>
          <p className="step-desc">
            Use Point Buy to distribute {limit} points across your 9 characteristics.
          </p>
        </div>

        <div className={`point-buy-tracker ${remaining < 0 ? 'over-budget' : ''}`}>
          <span>Points Remaining:</span>
          <strong id="points-remaining">{remaining}</strong>
          <span>/ {limit}</span>
        </div>

        <div className="ability-grid" id="ability-grid">
          {CHARACTERISTICS.map((c) => {
            const key = c.key as CharacteristicName;
            const type = c.type;
            const baseScore = state.baseCharacteristics[key] ?? 10;
            const finalScore = finalStats[key] ?? baseScore;
            const mod = getCharacteristicModifier(finalScore);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const cost = getAttributePointCost(baseScore);

            const canDecrease = baseScore > 6;
            const costOfNextIncrease = getAttributePointCost(baseScore + 1) - cost;
            const canIncrease = baseScore < 17 && remaining >= costOfNextIncrease;

            return (
              <div className="ability-row" key={key} id={`ability-row-${key}`}>
                <div className="ability-info">
                  <span className="ability-name">{key}</span>
                  <span className={`ability-type type-${type.toLowerCase()}`}>{type}</span>
                </div>
                <div className="ability-controls">
                  <button
                    className="ability-btn minus"
                    id={`ability-minus-${key}`}
                    disabled={!canDecrease}
                    onClick={() => handleAdjustAbility(key, -1)}
                  >
                    −
                  </button>
                  <div className="ability-score-display">
                    <div className="ability-base">{baseScore}</div>
                    <div className="ability-final">
                      {finalScore} <span className="ability-mod">({modStr})</span>
                    </div>
                  </div>
                  <button
                    className="ability-btn plus"
                    id={`ability-plus-${key}`}
                    disabled={!canIncrease}
                    onClick={() => handleAdjustAbility(key, 1)}
                  >
                    +
                  </button>
                </div>
                <div className="ability-cost">Cost: {cost}</div>
              </div>
            );
          })}
        </div>

        <div className="info-card race-bonuses-note" style={{ marginTop: '1.5rem' }}>
          <p>🏷️ Values shown include racial bonuses. Base values can range from 6–17 before racial modifiers.</p>
        </div>
      </div>
    </div>
  );
};

export default AbilityScoreSelector;
