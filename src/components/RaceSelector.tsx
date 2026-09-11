import React, { useEffect } from 'react';
import { RACES } from '../data/races';
import { RaceData, CustomRace, Characteristic, CHARACTERISTICS, StatBonuses, Trait, RaceState, DEFAULT_RACE_STATE } from '../types/Race';
import { useCharacter } from '../contexts/CharacterContext';

interface RaceSelectorProps {
  initialState?: Partial<RaceState>;
}

const buildStatBonusSummary = (stats: StatBonuses | undefined): string => {
  if (!stats) return '';
  return Object.entries(stats)
    .filter(([k]) => k !== 'choice' && k !== 'flexiblePoints')
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`)
    .join(', ') || 'No stat bonus';
};

const RaceCard: React.FC<{
  name: string;
  isSelected: boolean;
  bonuses: string;
  onClick: () => void;
}> = ({ name, isSelected, bonuses, onClick }) => (
  <div
    className={`race-card card-option ${isSelected ? 'selected' : ''}`}
    data-name={name}
    onClick={onClick}
    style={{ cursor: 'pointer' }}
  >
    <div className="card-option-name">{name}</div>
    <div className="card-option-sub">{bonuses}</div>
  </div>
);

const SubraceCard: React.FC<{
  subrace: any;
  isSelected: boolean;
  onClick: () => void;
}> = ({ subrace, isSelected, onClick }) => (
  <div
    className={`race-card card-option subrace-card ${isSelected ? 'selected' : ''}`}
    data-subrace={subrace.name}
    onClick={onClick}
    style={{ cursor: 'pointer' }}
  >
    <div className="card-option-name">{subrace.name}</div>
    <div className="card-option-sub">{buildStatBonusSummary(subrace.stats)}</div>
  </div>
);

const RaceDetails: React.FC<{ race: RaceData }> = ({ race }) => (
  <div className="info-card">
    <h3>{race.name} Traits</h3>
    <p>Speed: {race.speed} squares | Size: {race.size} | Languages: {race.languages?.join(', ') ?? 'Common'}</p>
    <ul className="trait-list">
      {race.traits?.map(trait => (
        <li key={trait.name}>
          <strong>{trait.name}</strong>: {trait.desc}
        </li>
      ))}
    </ul>
  </div>
);

const SubraceDetails: React.FC<{ race: RaceData; subraceName: string }> = ({ race, subraceName }) => {
  const subrace = race.subraces?.find((sub: any) => sub.name === subraceName);
  if (!subrace) return null;

  return (
    <div className="info-card subrace-details-card">
      <h3>{subrace.name} Features</h3>
      <p>Bonus: {buildStatBonusSummary(subrace.stats)}</p>
      <ul className="trait-list">
        {subrace.traits?.map((trait: any) => (
          <li key={trait.name}>
            <strong>{trait.name}</strong>: {trait.desc}
          </li>
        )) || <li>No additional features listed.</li>}
      </ul>
    </div>
  );
};

const CustomRaceForm: React.FC<{
  customRace: any;
  onChange: (race: any) => void;
}> = ({ customRace, onChange }) => {
  const handleStatChange = (stat: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    onChange({
      ...customRace,
      stats: {
        ...customRace.stats,
        [stat]: value,
      },
    });
  };

  const handleStringChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...customRace,
      [field]: e.target.value,
    });
  };

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const languages = e.target.value
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    onChange({
      ...customRace,
      languages,
    });
  };

  const handleTraitsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const traits = e.target.value
      .split('\n')
      .filter(Boolean)
      .map((line: string) => {
        const [name, ...rest] = line.split(':');
        return { name: name.trim(), desc: rest.join(':').trim() };
      });
    onChange({
      ...customRace,
      traits,
    });
  };

  return (
    <div className="section-block">
      <h3 className="section-title">Custom Race</h3>
      <div className="form-group">
        <label>Race Name</label>
        <input
          type="text"
          className="input"
          value={customRace.name}
          onChange={handleStringChange('name')}
          placeholder="Enter race name..."
        />
      </div>
      <p className="form-hint">Assign stat bonuses (e.g. Brawn +1, Vitality +2)</p>
      <div className="form-grid form-grid-3">
        {CHARACTERISTICS.map((stat: Characteristic) => (
          <div className="form-group" key={stat}>
            <label>{stat}</label>
            <input
              type="number"
              className="input"
              min="-3"
              max="5"
              value={customRace.stats[stat] ?? 0}
              onChange={handleStatChange(stat)}
            />
          </div>
        ))}
      </div>
      <div className="form-group">
        <label>Speed (squares)</label>
        <input
          type="number"
          className="input"
          min="1"
          max="20"
          value={customRace.speed}
          onChange={handleStringChange('speed')}
        />
      </div>
      <div className="form-group">
        <label>Languages (comma separated)</label>
        <input
          type="text"
          className="input"
          value={customRace.languages.join(', ')}
          onChange={handleLanguagesChange}
        />
      </div>
      <div className="form-group">
        <label>Racial Traits (one per line)</label>
        <textarea
          className="textarea"
          rows={4}
          value={customRace.traits.map((t: any) => `${t.name}: ${t.desc}`).join('\n')}
          onChange={handleTraitsChange}
        />
      </div>
    </div>
  );
};

const ManualRacesSection: React.FC<{
  manualRaces: boolean;
  racialStatOverrides: Record<string, number>;
  onManualRacesChange: (checked: boolean) => void;
  onOverrideChange: (overrides: Record<string, number>) => void;
}> = ({ manualRaces, racialStatOverrides, onManualRacesChange, onOverrideChange }) => {
  const handleOverrideChange = (p2: string, p1: string) => {
    if (p2 && p2 === p1) {
      alert('Cannot select the same attribute for both +2 and +1 bonuses.');
      return;
    }

    const overrides: Record<string, number> = {};
    if (p2) overrides[p2] = 2;
    if (p1) overrides[p1] = 1;
    onOverrideChange(overrides);
  };

  return (
    <div className="section-block manual-races-block" style={{
      marginTop: '2rem',
      borderTop: '1px solid var(--border-color)',
      paddingTop: '1.5rem'
    }}>
      <h3 className="section-title">Manual Stat Allocation Override</h3>
      <label className="checkbox-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={manualRaces}
          onChange={(e) => onManualRacesChange(e.target.checked)}
          style={{ margin: 0 }}
        />
        <strong>Customize stat bonuses manually (+2 to one stat, +1 to another)</strong>
      </label>
      {manualRaces && (
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginTop: '1rem'
        }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>+2 Attribute</label>
            <select
              className="select"
              style={{ width: '100%' }}
               value={Object.entries(racialStatOverrides).find(([k, v]) => v === 2)?.[0] ?? ''}
              onChange={(e) => {
                const plus1 = Object.entries(racialStatOverrides).find(([k, v]) => v === 1)?.[0] ?? '';
                handleOverrideChange(e.target.value, plus1);
              }}
            >
              <option value="">-- Choose --</option>
              {CHARACTERISTICS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>+1 Attribute</label>
            <select
              className="select"
              style={{ width: '100%' }}
               value={Object.entries(racialStatOverrides).find(([k, v]) => v === 1)?.[0] ?? ''}
              onChange={(e) => {
                const plus2 = Object.entries(racialStatOverrides).find(([k, v]) => v === 2)?.[0] ?? '';
                handleOverrideChange(plus2, e.target.value);
              }}
            >
              <option value="">-- Choose --</option>
              {CHARACTERISTICS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RaceSelector({ initialState = {} }: RaceSelectorProps) {
  const { state: characterState, dispatch } = useCharacter();
  const state = characterState.race;

  useEffect(() => {
    if (Object.keys(initialState).length > 0) {
      dispatch({ type: 'SET_RACE', payload: initialState });
    }
  }, [initialState, dispatch]);

  const selectedRace = RACES.find(r => r.name === state.race);
  const raceNames = ['Custom / Enter Manually...', ...RACES.map(r => r.name)];

  const handleRaceSelect = (name: string) => {
    const raceName = name === 'Custom / Enter Manually...' ? 'Custom' : name;
    dispatch({ type: 'SET_RACE', payload: {
      race: raceName,
      subrace: '',
      woodElfChoice: '',
      halfElfChoice1: '',
      halfElfChoice2: '',
    } });
  };

  const handleSubraceSelect = (subraceName: string) => {
    dispatch({ type: 'SET_RACE', payload: { subrace: subraceName } });
  };

  const handleCustomRaceChange = (customRace: any) => {
    dispatch({ type: 'SET_RACE', payload: { customRace } });
  };

  const handleManualRacesChange = (checked: boolean) => {
    dispatch({ type: 'SET_RACE', payload: { manualRaces: checked } });
  };

  const handleOverrideChange = (overrides: Record<string, number>) => {
    dispatch({ type: 'SET_RACE', payload: { racialStatOverrides: overrides } });
  };

  const handleWoodElfChoice = (value: string) => {
    dispatch({ type: 'SET_RACE', payload: { woodElfChoice: value } });
  };

  const handleHalfElfChoice = (field: 'halfElfChoice1' | 'halfElfChoice2', value: string) => {
    dispatch({ type: 'SET_RACE', payload: { [field]: value } });
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">🌍 Race & Subrace</h2>
        <p className="step-desc">Select your character's race. Each grants unique stat bonuses and traits.</p>
      </div>

      <div className="card-selector" id="race-selector">
        <div
          className={`race-card custom-card-square ${state.race === 'Custom' ? 'selected' : ''}`}
          onClick={() => handleRaceSelect('Custom / Enter Manually...')}
          role="button"
          tabIndex={0}
          title="Custom Race"
          style={{ padding: '12px 16px', boxSizing: 'border-box' }}
        >
          <span className="custom-card-icon">＋</span>
          <span className="custom-card-title">Custom Race</span>
        </div>
        {raceNames
          .filter((name) => name !== 'Custom / Enter Manually...')
          .map((name) => {
            const raceName = name;
            const race = RACES.find((r) => r.name === raceName);
            const bonuses = race ? buildStatBonusSummary(race.stats) : 'Enter your own';
            return (
              <RaceCard
                key={name}
                name={name}
                isSelected={state.race === raceName}
                bonuses={bonuses}
                onClick={() => handleRaceSelect(name)}
              />
            );
          })}
      </div>

       {state.race && state.race !== 'Custom' && selectedRace && (
         <div id="race-details">
           <RaceDetails race={selectedRace} />
         </div>
       )}

       {selectedRace?.subraces && selectedRace.subraces.length > 0 && (
         <div id="subrace-section" className="section-block">
           <h3 className="section-title">Choose Subrace</h3>
           <div className="card-selector subrace-selector">
             {selectedRace.subraces.map((subrace: any) => (
               <SubraceCard
                 key={subrace.name}
                 subrace={subrace}
                 isSelected={state.subrace === subrace.name}
                 onClick={() => handleSubraceSelect(subrace.name)}
               />
             ))}
           </div>
           {state.race === 'Elf' && state.subrace === 'Wood' && (
             <div className="form-group">
               <label>Bonus +1 to:</label>
               <select
                 id="wood-elf-choice"
                 className="select"
                 value={state.woodElfChoice}
                 onChange={(e) => handleWoodElfChoice(e.target.value)}
               >
                 <option value="">– choose –</option>
                 <option value="Cunning">Cunning</option>
                 <option value="Composure">Composure</option>
               </select>
             </div>
           )}
           {state.subrace && selectedRace && (
             <SubraceDetails race={selectedRace} subraceName={state.subrace} />
           )}
         </div>
        )}
        {state.race === 'Half-elf' && (
          <div className="section-block">
            <h3 className="section-title">Half-Elf Stat Choices</h3>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>+1 to stat 1</label>
                <select
                  id="half-elf-choice1"
                  className="select"
                  value={state.halfElfChoice1}
                  onChange={(e) => handleHalfElfChoice('halfElfChoice1', e.target.value)}
                >
                  <option value="">– choose –</option>
                  {CHARACTERISTICS.filter(c => c !== 'Presence').map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>+1 to stat 2</label>
                <select
                  id="half-elf-choice2"
                  className="select"
                  value={state.halfElfChoice2}
                  onChange={(e) => handleHalfElfChoice('halfElfChoice2', e.target.value)}
                >
                  <option value="">– choose –</option>
                  {CHARACTERISTICS.filter(c => c !== 'Presence').map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

      {state.race === 'Custom' && (
        <CustomRaceForm
          customRace={state.customRace}
          onChange={handleCustomRaceChange}
        />
      )}

      <ManualRacesSection
        manualRaces={state.manualRaces}
        racialStatOverrides={state.racialStatOverrides}
        onManualRacesChange={handleManualRacesChange}
        onOverrideChange={handleOverrideChange}
      />
    </div>
  );
}
