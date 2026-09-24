import React, { useState, useMemo } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { BACKGROUNDS, getKingdoms } from '../data/backgrounds';
import { Background, DEFAULT_BACKGROUND } from '../types/Background';

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '0.25rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.8rem',
  border: '1px solid',
  borderColor: active ? 'var(--primary, #6c8dff)' : 'var(--border-color, rgba(255,255,255,0.15))',
  background: active ? 'rgba(108, 141, 255, 0.25)' : 'rgba(255,255,255,0.04)',
  color: active ? '#fff' : 'var(--text-muted, #a0a5c0)',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  transition: 'all 0.15s ease-in-out',
});

function getFirstSentence(text?: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : (trimmed.split('\n')[0].trim() || trimmed);
}

const BackgroundDetails: React.FC<{ background: Background }> = ({ background }) => {
  const bgFree = background.freeSkillPoints ?? 4;
  const restrictDesc = Array.isArray(background?.skills) && background.skills.length 
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'General' | 'Kingdom'>('All');
  const [selectedKingdoms, setSelectedKingdoms] = useState<string[]>([]);

  const kingdoms = useMemo(() => getKingdoms(), []);

  const toggleKingdom = (k: string) => {
    setSelectedKingdoms((prev) =>
      prev.includes(k) ? prev.filter((item) => item !== k) : [...prev, k]
    );
  };

  const filteredBackgrounds = useMemo(() => {
    return BACKGROUNDS.filter((bg) => {
      if (selectedCategory === 'General' && bg.category !== 'General') {
        return false;
      }
      if (selectedCategory === 'Kingdom' && bg.category !== 'Kingdom') {
        return false;
      }

      if (selectedKingdoms.length > 0) {
        if (!bg.kingdom || !selectedKingdoms.includes(bg.kingdom)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = Boolean(bg.name?.toLowerCase().includes(q));
        const matchesDesc = Boolean(bg.desc && bg.desc.toLowerCase().includes(q));
        const matchesTrait = Boolean(bg.trait && bg.trait.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesTrait) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, selectedKingdoms, searchQuery]);

  const showCustom = useMemo(() => {
    if (selectedCategory !== 'All') return false;
    if (selectedKingdoms.length > 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return 'custom / enter manually...'.includes(q) || 'custom'.includes(q);
    }
    return true;
  }, [selectedCategory, selectedKingdoms, searchQuery]);

  const displayedCardNames = useMemo(() => {
    const list: string[] = [];
    if (showCustom) {
      list.push('Custom / Enter Manually...');
    }
    filteredBackgrounds.forEach((bg) => {
      list.push(bg.name);
    });
    return list;
  }, [showCustom, filteredBackgrounds]);

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

  const rawBg = state.background as any;
  const bgNameCandidate = typeof rawBg === 'string'
    ? rawBg
    : (rawBg?.name ?? rawBg?.background ?? rawBg?.id ?? (state as any)?.backgroundName ?? '');

  const matchedBgFromCatalog = Array.isArray(BACKGROUNDS)
    ? BACKGROUNDS.find(b => {
        if (!bgNameCandidate) return false;
        return b.name.toLowerCase() === bgNameCandidate.toLowerCase();
      })
    : undefined;

  const matchedByTraitOrDesc = Array.isArray(BACKGROUNDS) && typeof rawBg === 'object' && rawBg
    ? BACKGROUNDS.find(b => (rawBg.trait && b.trait === rawBg.trait) || (rawBg.desc && b.desc === rawBg.desc))
    : undefined;

  const resolvedBg = matchedBgFromCatalog
    || matchedByTraitOrDesc
    || (typeof rawBg === 'object' && rawBg?.name ? rawBg : (typeof rawBg === 'string' && rawBg ? { ...DEFAULT_BACKGROUND, name: rawBg } : undefined));

  const bgNameStr = resolvedBg?.name ?? bgNameCandidate;
  const isCustomSelected = bgNameStr === 'Custom' || bgNameStr === 'Custom / Enter Manually...' || (Boolean(bgNameStr) && !matchedBgFromCatalog && !matchedByTraitOrDesc && typeof rawBg === 'object' && rawBg?.isCustom);

  return (
    <div className="background-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">📖 Background</h2>
          <p className="step-desc">Select your character's background.</p>
        </div>

        <div className="filters-section" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div className="filter-container" style={{ marginBottom: '0.85rem' }}>
            <input
              type="text"
              id="background-search-input"
              className="input"
              placeholder="Search backgrounds…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#a0a5c0', fontWeight: 600 }}>Category:</span>
              <button
                type="button"
                style={pillStyle(selectedCategory === 'All')}
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedKingdoms([]);
                }}
              >
                All
              </button>
              <button
                type="button"
                style={pillStyle(selectedCategory === 'General')}
                onClick={() => {
                  setSelectedCategory('General');
                  setSelectedKingdoms([]);
                }}
              >
                General
              </button>
              <button
                type="button"
                style={pillStyle(selectedCategory === 'Kingdom')}
                onClick={() => {
                  setSelectedCategory('Kingdom');
                }}
              >
                Kingdom
              </button>
            </div>

            {selectedCategory !== 'General' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#a0a5c0', fontWeight: 600 }}>Kingdom:</span>
                {kingdoms.map((k) => (
                  <button
                    key={k}
                    type="button"
                    style={pillStyle(selectedKingdoms.includes(k))}
                    onClick={() => toggleKingdom(k)}
                  >
                    {k}
                  </button>
                ))}
                {selectedKingdoms.length > 0 && (
                  <button
                    type="button"
                    style={{ ...pillStyle(false), border: 'none', background: 'transparent', color: '#eb5e55', cursor: 'pointer', padding: '0.2rem 0.4rem' }}
                    onClick={() => setSelectedKingdoms([])}
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card-selector" id="background-selector">
          {displayedCardNames.map((name) => {
            const isCustom = name === 'Custom / Enter Manually...';
            const isSelected = isCustom 
              ? isCustomSelected
              : bgNameStr === name;
            
            const background = !isCustom && Array.isArray(BACKGROUNDS) 
              ? BACKGROUNDS.find(b => b.name === name) 
              : null;
              
            const desc = isCustom ? 'Enter your own custom background' : getFirstSentence(background?.desc);

            return (
              <div
                key={name}
                className={`background-card card-option ${isSelected ? 'selected' : ''}`}
                data-name={name}
                role="button"
                aria-label={name}
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

        {state.background && resolvedBg && !isCustomSelected && (
          <BackgroundDetails background={resolvedBg as Background} />
        )}
      </div>
    </div>
  );
};

export default BackgroundSelector;