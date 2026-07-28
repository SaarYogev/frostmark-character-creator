import React, { useEffect } from 'react';
import { IdentityState, CampaignPowerLevel, DEFAULT_IDENTITY } from '../types/Identity';
import { useCharacter } from '../contexts/CharacterContext';

interface IdentityFormProps {
  initialState?: Partial<IdentityState>;
}

const POWER_LEVEL_DESCRIPTIONS: Record<CampaignPowerLevel, string> = {
  Mundane: 'Mundane (20 AP pts, 14 Acc pts)',
  Heroic: 'Heroic – Default (25 AP pts, 16 Acc pts)',
  Champion: 'Champion (30 AP pts, 18 Acc pts)',
};

export default function IdentityForm({ initialState = {} }: IdentityFormProps) {
  const { state: characterState, dispatch } = useCharacter();
  const state = characterState.identity;

  useEffect(() => {
    if (Object.keys(initialState).length > 0) {
      dispatch({ type: 'SET_IDENTITY', payload: initialState });
    }
  }, [initialState, dispatch]);

  const handleInputChange = (field: keyof IdentityState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_IDENTITY', payload: { [field]: e.target.value } });
  };

  const handleSelectChange = (field: keyof IdentityState) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SET_IDENTITY', payload: { [field]: e.target.value as CampaignPowerLevel } });
  };

  const handleNumberChange = (field: keyof IdentityState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 1;
    dispatch({ type: 'SET_IDENTITY', payload: { [field]: Math.max(1, Math.min(20, value)) } });
  };

  const handleAppearanceChange = (field: keyof Appearance) => (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_IDENTITY', payload: {
      appearance: {
        ...state.appearance,
        [field]: e.target.value,
      }
    } });
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">🎭 Identity</h2>
        <p className="step-desc">Give your character a name and set the campaign context.</p>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label htmlFor="char-name">Character Name</label>
          <input
            id="char-name"
            type="text"
            className="input"
            placeholder="Enter character name..."
            value={state.characterName}
            onChange={handleInputChange('characterName')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="player-name">Player Name</label>
          <input
            id="player-name"
            type="text"
            className="input"
            placeholder="Enter player name..."
            value={state.playerName}
            onChange={handleInputChange('playerName')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="power-level">Campaign Power Level</label>
          <select
            id="power-level"
            className="select"
            value={state.campaignPowerLevel}
            onChange={handleSelectChange('campaignPowerLevel')}
          >
            {(['Mundane', 'Heroic', 'Champion'] as CampaignPowerLevel[]).map(level => (
              <option key={level} value={level}>
                {POWER_LEVEL_DESCRIPTIONS[level]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="char-level">Starting Level</label>
          <input
            id="char-level"
            type="number"
            className="input"
            min="1"
            max="20"
            value={state.level}
            onChange={handleNumberChange('level')}
          />
        </div>
      </div>

      <div className="section-divider">Personality & Backstory</div>
      <div className="form-group">
        <label htmlFor="personality-backstory">Personality & Backstory</label>
        <textarea
          id="personality-backstory"
          className="textarea"
          rows={6}
          placeholder="Describe your character's personality, goals, fears, and history..."
          value={state.personalityBackstory}
          onChange={handleInputChange('personalityBackstory')}
        />
      </div>

      <div className="section-divider">Appearance (Optional)</div>
      <div className="form-grid form-grid-3">
        <div className="form-group">
          <label htmlFor="app-age">Age</label>
          <input
            id="app-age"
            type="text"
            className="input"
            placeholder="e.g. 25"
            value={state.appearance?.age ?? ''}
            onChange={handleAppearanceChange('age')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="app-height">Height</label>
          <input
            id="app-height"
            type="text"
            className="input"
            placeholder="e.g. 178 cm"
            value={state.appearance?.height ?? ''}
            onChange={handleAppearanceChange('height')}
          />
        </div>
        <div className="form-group">
          <label htmlFor="app-weight">Weight</label>
          <input
            id="app-weight"
            type="text"
            className="input"
            placeholder="e.g. 75 kg"
            value={state.appearance?.weight ?? ''}
            onChange={handleAppearanceChange('weight')}
          />
        </div>
      </div>
    </div>
  );
}
