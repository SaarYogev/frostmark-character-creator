import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { BACKGROUNDS } from '../../js/data/backgrounds';
import { Background, DEFAULT_BACKGROUND } from '../types/Background';

const BackgroundDetails: React.FC<{ background: Background }> = ({ background }) => {
  const bgFree = background.freeSkillPoints ?? 4;
  const restrictDesc = background.skills?.length 
    ? `Restricted to: ${background.skills.join(', ')}` 
    : "Player's choice (any skill)";

  return (
    <div id="background-details" className="info-card" style={{ marginTop: '1.5rem' }}>
      <h3>{background.name}</h3>
      <p>{background.desc ?? ''}</p>
      <p>
        <strong>Starting Gold:</strong> {background.gold}gp | <strong>Equipment:</strong> {background.equipment ?? 'Varies'}
      </p>
      <p>
        <strong>Free Skill Points:</strong> {bgFree} ({restrictDesc})
      </p>
      <p>
        <em>{background.trait ?? ''}</em>
      </p>
    </div>
  );
};

const CustomBGForm: React.FC<{
  customBackground?: Background;
  onChange: (bg: Partial<Background>) => void;
}> = ({ customBackground, onChange }) => (
  <div className="section-block" id="custom-bg-section" style={{ marginTop: '1.5rem' }}>
    <h3 className="section-title">Custom Background</h3>
    <div className="form-grid form-grid-2">
      <div className="form-group">
        <label htmlFor="custom-bg-name">Background Name</label>
        <input
          type="text"
          id="custom-bg-name"
          className="input"
          value={customBackground?.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="custom-bg-gold">Starting Gold (gp)</label>
        <input
          type="number"
          id="custom-bg-gold"
          className="input"
          min="0"
          value={customBackground?.gold ?? 10}
          onChange={(e) => onChange({ gold: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
    </div>
    <div className="form-group">
      <label htmlFor="custom-bg-equipment">Starting Equipment</label>
      <input
        type="text"
        id="custom-bg-equipment"
        className="input"
        value={customBackground?.equipment ?? ''}
        onChange={(e) => onChange({ equipment: e.target.value })}
      />
    </div>
    <div className="form-group">
      <label htmlFor="custom-bg-trait">Personality Trait</label>
      <textarea
        id="custom-bg-trait"
        className="textarea"
        rows={3}
        value={customBackground?.trait ?? ''}
        onChange={(e) => onChange({ trait: e.target.value })}
      />
    </div>
  </div>
);

const BackgroundSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const bgNames = ['Custom / Enter Manually...', ...(Array.isArray(BACKGROUNDS) ? BACKGROUNDS.map(b => b.name) : [])];

  const handleBackgroundChange = (name: string) => {
    const isCustom = name === 'Custom / Enter Manually...' || name === 'Custom';
    if (isCustom) {
      const customBg = state.customBackground ?? {
        ...DEFAULT_BACKGROUND,
        name: 'Custom',
        desc: 'Custom background.',
        gold: 10,
      };
      dispatch({
        type: 'SET_BACKGROUND',
        payload: customBg,
      });
    } else {
      const selectedBackground = Array.isArray(BACKGROUNDS) 
        ? BACKGROUNDS.find(bg => bg.name === name)
        : undefined;

      if (selectedBackground) {
        dispatch({
          type: 'SET_BACKGROUND',
          payload: selectedBackground,
        });
      }
    }
  };

  const handleCustomChange = (updated: Partial<Background>) => {
    const newCustom = {
      ...state.customBackground,
      ...updated,
    };

    dispatch({
      type: 'SET_CUSTOM_BACKGROUND',
      payload: updated,
    });
    dispatch({
      type: 'SET_BACKGROUND',
      payload: newCustom,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, name: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBackgroundChange(name);
    }
  };

  const bgNameStr = typeof state.background === 'string'
    ? state.background
    : state.background?.name ?? '';

  const isCustomSelected = bgNameStr === 'Custom' || bgNameStr === 'Custom / Enter Manually...' || (Boolean(bgNameStr) && !BACKGROUNDS.find(b => b.name === bgNameStr));

  return (
    <div className="background-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">📖 Background</h2>
          <p className="step-desc">Select your character's background.</p>
        </div>
        <div className="card-selector" id="background-selector">
          {bgNames.map((name) => {
            const isCustom = name === 'Custom / Enter Manually...';
            const isSelected = isCustom 
              ? isCustomSelected
              : bgNameStr === name;
            
            const background = !isCustom && Array.isArray(BACKGROUNDS) 
              ? BACKGROUNDS.find(b => b.name === name) 
              : null;
              
            const desc = isCustom ? 'Enter your own custom background' : (background?.desc ?? '');

            return (
              <div
                key={name}
                className={`background-card card-option ${isSelected ? 'selected' : ''}`}
                data-name={name}
                role="button"
                tabIndex={0}
                aria-selected={isSelected}
                onClick={() => handleBackgroundChange(name)}
                onKeyDown={(e) => handleKeyDown(e, name)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-option-name">{name}</div>
                <div className="card-option-sub">{desc}</div>
              </div>
            );
          })}
        </div>

        {isCustomSelected && (
          <CustomBGForm
            customBackground={state.customBackground}
            onChange={handleCustomChange}
          />
        )}

        {state.background && state.background.name && !isCustomSelected && (() => {
          const fullBg = Array.isArray(BACKGROUNDS)
            ? BACKGROUNDS.find(b => b.name === state.background.name) ?? state.background
            : state.background;
          return <BackgroundDetails background={fullBg as Background} />;
        })()}
      </div>
    </div>
  );
};

export default BackgroundSelector;