import React, { useState } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { ORIGINS } from '../data/origins';
import { getAbilitiesForLevel, getAbilityById, ABILITIES } from '../data/abilities';
import { CustomOrigin, AbilityItem } from '../types/AO';

const AOSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const [selectedAbilityForDetailId, setSelectedAbilityForDetailId] = useState<string | null>(null);

  // Modal / Form state for Custom AO creation
  const [showCustomAOModal, setShowCustomAOModal] = useState(false);
  const [customAOName, setCustomAOName] = useState('');
  const [customAOHd, setCustomAOHd] = useState(8);
  const [customAOSpellcasting, setCustomAOSpellcasting] = useState<'Minor' | 'Moderate' | 'Major'>('Minor');
  const [customAOExtraSkills, setCustomAOExtraSkills] = useState(0);
  const [customAODesc, setCustomAODesc] = useState('');

  // Modal / Form state for Custom Ability creation
  const [customAbilityLevel, setCustomAbilityLevel] = useState<number | null>(null);
  const [customAbilitySlot, setCustomAbilitySlot] = useState<'primary' | 'secondary'>('primary');
  const [customAbilityName, setCustomAbilityName] = useState('');
  const [customAbilityOrigin, setCustomAbilityOrigin] = useState('');
  const [customAbilityShortDesc, setCustomAbilityShortDesc] = useState('');
  const [customAbilityFullDesc, setCustomAbilityFullDesc] = useState('');

  const currentLevel = state.identity?.level ?? 1;
  const selectedAOs = state.ao?.selectedAOs ?? [];
  const customAOs = state.ao?.customAOs ?? [];
  const customAbilities = (state.ao as any)?.customAbilities ?? [];

  const handleTogglePoolAO = (aoName: string) => {
    let nextAOs = [...selectedAOs];
    if (nextAOs.includes(aoName)) {
      nextAOs = nextAOs.filter((n) => n !== aoName);
    } else if (nextAOs.length < 4) {
      nextAOs.push(aoName);
    }

    const primaryAO = state.ao?.primaryAO || nextAOs[0] || '';
    const secondaryAO = state.ao?.secondaryAO || '';

    dispatch({
      type: 'SET_AO',
      payload: {
        selectedAOs: nextAOs,
        primaryAO,
        secondaryAO,
      },
    });
  };

  const handleCreateCustomAO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAOName.trim()) return;

    const newAO: CustomOrigin = {
      name: customAOName.trim(),
      hd: customAOHd,
      extraSkills: customAOExtraSkills,
      spellcasting: customAOSpellcasting,
      desc: customAODesc,
    };

    const nextCustomAOs = [...customAOs, newAO];

    dispatch({
      type: 'SET_AO',
      payload: {
        customAOs: nextCustomAOs,
      },
    });

    // Reset form
    setCustomAOName('');
    setCustomAOHd(8);
    setCustomAOSpellcasting('Minor');
    setCustomAOExtraSkills(0);
    setCustomAODesc('');
    setShowCustomAOModal(false);
  };

  const handleCreateCustomAbility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAbilityName.trim() || !customAbilityLevel || !customAbilityOrigin) return;

    const newAbility: AbilityItem = {
      id: `custom-${customAbilityOrigin}-${customAbilityLevel}-${customAbilitySlot}-${customAbilityName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      name: customAbilityName.trim(),
      origin: customAbilityOrigin,
      level: customAbilityLevel,
      selection: customAbilitySlot === 'primary' ? 'Primary' : 'Secondary',
      desc: customAbilityFullDesc || customAbilityShortDesc || customAbilityName,
    };

    const nextCustomAbilities = [...customAbilities, newAbility];

    dispatch({
      type: 'SET_AO',
      payload: {
        customAbilities: nextCustomAbilities,
      } as any,
    });

    // Automatically select newly created custom ability
    handleSelectAbility(customAbilityLevel, customAbilitySlot, newAbility.id);

    // Reset form
    setCustomAbilityLevel(null);
    setCustomAbilityName('');
    setCustomAbilityOrigin('');
    setCustomAbilityShortDesc('');
    setCustomAbilityFullDesc('');
  };

  const handleSelectAbility = (level: number, slot: 'primary' | 'secondary', abilityId: string) => {
    const currentSelections = state.ao?.levelSelections ?? {};
    const levelSel = currentSelections[level] ?? {
      primaryAO: state.ao?.primaryAO || selectedAOs[0] || '',
      secondaryAO: state.ao?.secondaryAO || '',
      primaryAbility: '',
      secondaryAbility: '',
    };

    const isPrimarySlot = slot === 'primary';
    const isUnselecting = levelSel[isPrimarySlot ? 'primaryAbility' : 'secondaryAbility'] === abilityId;

    let updatedPrimaryAO = levelSel.primaryAO;
    if (isPrimarySlot && !isUnselecting) {
      const chosenAbility = [...getInspectedAbilityList(), ...customAbilities].find((ab) => ab.id === abilityId);
      if (chosenAbility?.origin) {
        updatedPrimaryAO = chosenAbility.origin;
      }
    }

    const nextLevelSel = {
      ...levelSel,
      primaryAO: updatedPrimaryAO,
      [isPrimarySlot ? 'primaryAbility' : 'secondaryAbility']: isUnselecting ? '' : abilityId,
    };

    dispatch({
      type: 'SET_AO',
      payload: {
        levelSelections: {
          ...currentSelections,
          [level]: nextLevelSel,
        },
      },
    });

    // Mirror to top-level levelSelections for legacy state helpers
    dispatch({
      type: 'SET_STATE',
      payload: {
        levelSelections: {
          ...currentSelections,
          [level]: nextLevelSel,
        },
      },
    } as any);

    setSelectedAbilityForDetailId(abilityId);
  };

  const getInspectedAbilityList = (): AbilityItem[] => {
    return ABILITIES;
  };

  const allPoolOrigins = [...ORIGINS, ...customAOs];

  const getInspectedAbility = (id: string | null): AbilityItem | null => {
    if (!id) return null;
    return getAbilityById(id) || customAbilities.find((a: AbilityItem) => a.id === id) || null;
  };

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const firstSelectedAbilityId = React.useMemo(() => {
    const levelSelections = state.ao?.levelSelections ?? {};
    for (let l = 1; l <= currentLevel; l++) {
      const sel = levelSelections[l];
      if (sel?.primaryAbility) return sel.primaryAbility;
      if (sel?.secondaryAbility) return sel.secondaryAbility;
    }
    return null;
  }, [state.ao?.levelSelections, currentLevel]);

  const activeDetailId = selectedAbilityForDetailId ?? firstSelectedAbilityId;
  const inspectedAbility = getInspectedAbility(activeDetailId);

  const renderAODetailContent = (abilityTarget: AbilityItem | null) => {
    if (!abilityTarget) {
      return (
        <div className="no-ability-selected" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <p>Click on any ability card to view full details, rules, and effects.</p>
        </div>
      );
    }

    let selectedLevel: number | null = null;
    let selectedSlot: string | null = null;

    for (const [lvlStr, sel] of Object.entries(state.ao?.levelSelections ?? {})) {
      if (sel.primaryAbility === abilityTarget.id) {
        selectedLevel = parseInt(lvlStr, 10);
        selectedSlot = 'Primary';
        break;
      }
      if (sel.secondaryAbility === abilityTarget.id) {
        selectedLevel = parseInt(lvlStr, 10);
        selectedSlot = 'Secondary';
        break;
      }
    }

    const isCurrentlySelected = Boolean(selectedLevel);
    const choiceValue = selectedLevel
      ? state.ao?.levelSelections?.[selectedLevel]?.upgradeChoices?.[abilityTarget.id] || ''
      : '';

    const isUpgrade =
      (abilityTarget.name ?? '').includes('General Upgrade') ||
      (abilityTarget.name ?? '').includes('Magical Upgrade') ||
      (abilityTarget.desc ?? '').includes('Gain one of your choices:');

    const handleUpgradeChoiceChange = (val: string) => {
      const targetLvl = selectedLevel || abilityTarget.level;
      const currentSelections = state.ao?.levelSelections ?? {};
      const levelSel = currentSelections[targetLvl] ?? {
        primaryAO: state.ao?.primaryAO || selectedAOs[0] || '',
        secondaryAO: state.ao?.secondaryAO || '',
        primaryAbility: '',
        secondaryAbility: '',
      };

      const nextUpgradeChoices = {
        ...(levelSel.upgradeChoices ?? {}),
        [abilityTarget.id]: val,
      };

      dispatch({
        type: 'SET_AO',
        payload: {
          levelSelections: {
            ...currentSelections,
            [targetLvl]: {
              ...levelSel,
              upgradeChoices: nextUpgradeChoices,
            },
          },
        },
      });
    };

    return (
      <div className="ao-detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{abilityTarget.name}</h4>
            <span className="ability-origin-tag" style={{ marginTop: '0.25rem', display: 'inline-block' }}>{abilityTarget.origin}</span>
          </div>
          {isCurrentlySelected && (
            <span className="badge primary-tag">
              ✓ Lvl {selectedLevel} {selectedSlot}
            </span>
          )}
        </div>

        <div className="ability-full-desc" style={{ fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
          {abilityTarget.desc.split('\n\n').map((block, idx) => {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) return null;

            if (trimmedBlock.includes(' | ') && trimmedBlock.includes('---')) {
              const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(Boolean);
              const headerLine = lines.find(l => l.includes(' | ') && !l.includes('---'));
              const dividerIdx = lines.findIndex(l => l.includes('---'));
              if (headerLine && dividerIdx !== -1) {
                const bodyLines = lines.slice(dividerIdx + 1);
                const headers = headerLine.split('|').map(h => h.trim());
                return (
                  <div key={idx} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '1rem 0', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)' }}>
                    <table style={{ width: '100%', minWidth: '380px', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--accent-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--accent-gold)' }}>
                          {headers.map((h, i) => (
                            <th key={i} style={{ padding: '0.5rem 0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bodyLines.map((line, rIdx) => {
                          const cells = line.split('|').map(c => c.trim());
                          return (
                            <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              {cells.map((c, cIdx) => (
                                <td key={cIdx} style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>{c}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }
            }
            return (
              <p key={idx} style={{ margin: '0 0 0.75rem 0', whiteSpace: 'pre-wrap', width: '100%' }}>
                {trimmedBlock}
              </p>
            );
          })}
        </div>

        {isUpgrade && (
          <div className="form-group" style={{ marginTop: '1rem', background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)' }}>Upgrade Choice:</label>
            <input
              type="text"
              className="input"
              style={{ marginTop: '0.35rem' }}
              placeholder="e.g. +1 AC, Advantage on Perception..."
              value={choiceValue}
              onChange={(e) => handleUpgradeChoiceChange(e.target.value)}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ao-selector">
      <div className="step-container" id="step-container">
        <div className="step-header">
          <h2 className="step-title">✨ Ability Origins & Level Progression</h2>
          <p className="step-desc">
            Select up to 4 general Ability Origins for your character, then configure your Primary & Secondary choices and abilities level-by-level.
          </p>
        </div>

        {/* 1. Pool Selection (Up to 4) */}
        <div className="section-block">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              1. General Ability Origin Pool <span className="optional-tag">Select up to 4</span>
            </h3>
          </div>

          <p className="form-hint">
            Selected: <strong>{selectedAOs.length} / 4</strong>
          </p>

          {/* Form for Creating Custom Origin */}
          {showCustomAOModal && (
            <form
              onSubmit={handleCreateCustomAO}
              className="info-card"
              style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px dashed var(--accent-color)' }}
            >
              <h4 style={{ margin: '0 0 1rem 0' }}>Create Custom Ability Origin</h4>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label>Origin Name</label>
                  <input
                    type="text"
                    className="input"
                    value={customAOName}
                    onChange={(e) => setCustomAOName(e.target.value)}
                    placeholder="e.g. Frost Weaver"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hit Die (e.g. 8 for d8)</label>
                  <input
                    type="number"
                    className="input"
                    min={4}
                    max={12}
                    step={2}
                    value={customAOHd}
                    onChange={(e) => setCustomAOHd(parseInt(e.target.value, 10) || 8)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Spellcasting Tag</label>
                  <select
                    className="select"
                    value={customAOSpellcasting}
                    onChange={(e) => setCustomAOSpellcasting(e.target.value as any)}
                  >
                    <option value="Minor">Minor</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Major">Major</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Extra Skill Points</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={5}
                    value={customAOExtraSkills}
                    onChange={(e) => setCustomAOExtraSkills(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>Description</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={customAODesc}
                  onChange={(e) => setCustomAODesc(e.target.value)}
                  placeholder="Origin description details..."
                />
              </div>
              <button type="submit" className="btn btn-accent btn-sm" style={{ marginTop: '0.75rem' }}>
                Save Custom Origin
              </button>
            </form>
          )}

          <div className="card-selector ao-pool-selector">
            <div
              className="ability-card custom-card-square"
              onClick={() => setShowCustomAOModal(!showCustomAOModal)}
              role="button"
              tabIndex={0}
            >
              <div className="custom-card-icon">＋</div>
              <div className="custom-card-title">Custom Origin</div>
            </div>
            {allPoolOrigins.map((o) => {
              const isSelected = selectedAOs.includes(o.name);
              const isDisabled = !isSelected && selectedAOs.length >= 4;

              return (
                <div
                  key={o.name}
                  className={`ao-card card-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  data-pool-ao={o.name}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => !isDisabled && handleTogglePoolAO(o.name)}
                  onKeyDown={(e) => {
                    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleTogglePoolAO(o.name);
                    }
                  }}
                  style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  <div className="card-option-name">{o.name}</div>
                  <div className="card-option-sub">
                    d{o.hd} HD · {o.spellcasting} casting
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Level-by-Level Configuration & Ability Selection */}
        {selectedAOs.length === 0 ? (
          <div className="info-card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p>⚠️ Please select at least one Ability Origin in your general pool above to configure level choices.</p>
          </div>
        ) : (() => {
          const isInspectedLarge = Boolean(
            inspectedAbility &&
            ((inspectedAbility.desc ?? '').length > 400 || (inspectedAbility.desc ?? '').includes(' | '))
          );
          const detailsWidth = !inspectedAbility ? '300px' : isInspectedLarge ? 'minmax(420px, 480px)' : '340px';

          return (
            <div className="ao-main-layout" style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${detailsWidth}`, gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Left: Level Selections */}
            <div className="ao-levels-column" style={{ flex: 1 }}>
              <h3 className="section-title">2. Level Selections (Levels 1 to {currentLevel})</h3>

              <div className="ao-levels-accordion">
                {Array.from({ length: currentLevel }, (_, idx) => idx + 1).map((lvl) => {
                  const levelSelections = state.ao?.levelSelections ?? {};
                  const sel = levelSelections[lvl] ?? {
                    primaryAO: '',
                    secondaryAO: '',
                    primaryAbility: '',
                    secondaryAbility: '',
                  };
                  const isSecondaryAllowed = lvl <= 3;

                  // Pre-made abilities from selected AOs
                  const premadePrimary = selectedAOs.flatMap((ao) => getAbilitiesForLevel(lvl, 'Primary', ao));
                  const premadeSecondary = isSecondaryAllowed
                    ? selectedAOs.flatMap((ao) => getAbilitiesForLevel(lvl, 'Secondary', ao))
                    : [];

                  // Custom abilities created for this level & selection slot
                  const customPrimary = customAbilities.filter(
                    (a: AbilityItem) => a.level === lvl && a.selection === 'Primary' && selectedAOs.includes(a.origin)
                  );
                  const customSecondary = isSecondaryAllowed
                    ? customAbilities.filter(
                        (a: AbilityItem) => a.level === lvl && a.selection === 'Secondary' && selectedAOs.includes(a.origin)
                      )
                    : [];

                  const primaryAbilities = [...premadePrimary, ...customPrimary];
                  const secondaryAbilities = [...premadeSecondary, ...customSecondary];

                  return (
                    <div className="ao-level-card info-card" key={lvl} style={{ marginBottom: '1.5rem' }}>
                      <div
                        className="ao-level-header"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-color)',
                          paddingBottom: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <span className="ao-level-number" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          Level {lvl}
                        </span>
                        <div className="ao-level-tags" style={{ display: 'flex', gap: '0.5rem' }}>
                          <span className="ao-tag primary-tag badge">Primary Choices</span>
                          {isSecondaryAllowed && <span className="ao-tag secondary-tag badge">Secondary Choices (Levels 1–3)</span>}
                        </div>
                      </div>

                      {/* Primary Ability Choices */}
                      <div className="ao-level-abilities-section">
                        <div className="ao-ability-group">
                          <div
                            className="ao-ability-group-title"
                            style={{ marginBottom: '0.5rem' }}
                          >
                            <span style={{ fontWeight: 'bold' }}>Primary Ability Choices</span>
                          </div>

                          {/* Inline Custom Primary Ability Form */}
                          {customAbilityLevel === lvl && customAbilitySlot === 'primary' && (
                            <form
                              onSubmit={handleCreateCustomAbility}
                              className="info-card"
                              style={{ marginBottom: '1rem', padding: '1rem', border: '1px dashed var(--accent-color)' }}
                            >
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Create Custom Primary Ability (Level {lvl})</h4>
                              <div className="form-grid form-grid-2">
                                <div className="form-group">
                                  <label>Origin</label>
                                  <select
                                    className="select"
                                    value={customAbilityOrigin}
                                    onChange={(e) => setCustomAbilityOrigin(e.target.value)}
                                    required
                                  >
                                    {selectedAOs.map((ao) => (
                                      <option key={ao} value={ao}>
                                        {ao}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label>Ability Name</label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={customAbilityName}
                                    onChange={(e) => setCustomAbilityName(e.target.value)}
                                    placeholder="e.g. Frost Nova"
                                    required
                                  />
                                </div>
                              </div>
                              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label>Short Description</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={customAbilityShortDesc}
                                  onChange={(e) => setCustomAbilityShortDesc(e.target.value)}
                                  placeholder="Brief summary of effect..."
                                />
                              </div>
                              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label>Full Rules Description</label>
                                <textarea
                                  className="textarea"
                                  rows={3}
                                  value={customAbilityFullDesc}
                                  onChange={(e) => setCustomAbilityFullDesc(e.target.value)}
                                  placeholder="Complete mechanical details, damage, area of effect, etc."
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCustomAbilityLevel(null)}>
                                  Cancel
                                </button>
                                <button type="submit" className="btn btn-accent btn-sm">
                                  Save Custom Ability
                                </button>
                              </div>
                            </form>
                          )}

                          <div className="ao-abilities-grid card-selector">
                            <div
                              className="ability-card custom-card-square"
                              onClick={() => {
                                if (customAbilityLevel === lvl && customAbilitySlot === 'primary') {
                                  setCustomAbilityLevel(null);
                                } else {
                                  setCustomAbilityLevel(lvl);
                                  setCustomAbilitySlot('primary');
                                  setCustomAbilityOrigin(selectedAOs[0] || '');
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="custom-card-icon">＋</div>
                              <div className="custom-card-title">Custom Ability</div>
                            </div>
                            {primaryAbilities.map((ab: any) => {
                                const isPicked = sel.primaryAbility === ab.id;
                                const isInspected = activeDetailId === ab.id;

                                return (
                                  <React.Fragment key={ab.id}>
                                    <div
                                      className={`ability-card card-option ${isPicked ? 'selected' : ''} ${isInspected ? 'inspected' : ''}`}
                                      data-ability-id={ab.id}
                                      data-level={lvl}
                                      data-slot="primary"
                                      onClick={() => {
                                        handleSelectAbility(lvl, 'primary', ab.id);
                                        setSelectedAbilityForDetailId(isPicked ? null : ab.id);
                                      }}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className="ability-card-header">
                                        <span className="ability-origin-tag">{ab.origin}</span>
                                        {isPicked && <span className="selected-badge"> ✓ Selected</span>}
                                      </div>
                                      <h4 className="ability-card-title">{ab.name}</h4>
                                    </div>
                                    {isInspected && (
                                      <div className="mobile-inline-ao-detail" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                                        {renderAODetailContent(ab)}
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                            })}
                          </div>
                        </div>

                        {/* Secondary Ability Choices */}
                        {isSecondaryAllowed && (
                          <div className="ao-ability-group" style={{ marginTop: '1.25rem' }}>
                            <div
                              className="ao-ability-group-title"
                              style={{ marginBottom: '0.5rem' }}
                            >
                              <span style={{ fontWeight: 'bold' }}>Secondary Ability Choices</span>
                            </div>

                            {/* Inline Custom Secondary Ability Form */}
                            {customAbilityLevel === lvl && customAbilitySlot === 'secondary' && (
                              <form
                                className="custom-ability-form"
                                onSubmit={(e) => handleSaveCustomAbility(e, lvl, 'secondary')}
                                style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}
                              >
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Create Custom Secondary Ability (Level {lvl})</h4>
                                <div className="form-grid form-grid-2">
                                  <div className="form-group">
                                    <label>Origin</label>
                                    <select
                                      className="select"
                                      value={customAbilityOrigin}
                                      onChange={(e) => setCustomAbilityOrigin(e.target.value)}
                                      required
                                    >
                                      {selectedAOs.map((ao) => (
                                        <option key={ao} value={ao}>
                                          {ao}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label>Ability Name</label>
                                    <input
                                      type="text"
                                      className="input"
                                      value={customAbilityName}
                                      onChange={(e) => setCustomAbilityName(e.target.value)}
                                      placeholder="e.g. Arcane Ward"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                  <label>Short Description</label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={customAbilityShortDesc}
                                    onChange={(e) => setCustomAbilityShortDesc(e.target.value)}
                                    placeholder="Brief summary of effect..."
                                  />
                                </div>
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                  <label>Full Rules Description</label>
                                  <textarea
                                    className="textarea"
                                    rows={3}
                                    value={customAbilityFullDesc}
                                    onChange={(e) => setCustomAbilityFullDesc(e.target.value)}
                                    placeholder="Complete mechanical details..."
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCustomAbilityLevel(null)}>
                                    Cancel
                                  </button>
                                  <button type="submit" className="btn btn-accent btn-sm">
                                    Save Custom Ability
                                  </button>
                                </div>
                              </form>
                            )}

                            <div className="ao-abilities-grid card-selector">
                              {secondaryAbilities.length === 0 ? (
                                <div className="no-abilities">No secondary abilities found for level {lvl} in pool</div>
                              ) : (
                                secondaryAbilities.map((ab: any) => {
                                  const isPicked = sel.secondaryAbility === ab.id;
                                  const isInspected = activeDetailId === ab.id;

                                  return (
                                    <React.Fragment key={ab.id}>
                                      <div
                                        className={`ability-card card-option ${isPicked ? 'selected' : ''} ${isInspected ? 'inspected' : ''}`}
                                        data-ability-id={ab.id}
                                        data-level={lvl}
                                        data-slot="secondary"
                                        onClick={() => {
                                          handleSelectAbility(lvl, 'secondary', ab.id);
                                          setSelectedAbilityForDetailId(isPicked ? null : ab.id);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className="ability-card-header">
                                          <span className="ability-origin-tag">{ab.origin}</span>
                                          {isPicked && <span className="selected-badge"> ✓ Selected</span>}
                                        </div>
                                        <h4 className="ability-card-title">{ab.name}</h4>
                                      </div>
                                      {isInspected && (
                                        <div className="mobile-inline-ao-detail" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                                          {renderAODetailContent(ab)}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Sticky Detail Panel */}
            <div className="ao-details-column">
              <div className="sticky-detail-panel info-card" style={{ position: 'sticky', top: '1rem' }}>
                <h3 className="section-title">Ability Details</h3>
                {renderAODetailContent(inspectedAbility)}
              </div>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Mobile Slide-Up Detail Bottom Sheet for AO */}
      <div
        className={`sheet-backdrop ${isMobileSheetOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSheetOpen(false)}
      />
      <div className={`detail-bottom-sheet ${isMobileSheetOpen ? 'open' : ''}`}>
        <div className="sheet-drag-handle" />
        <div className="sheet-header-bar">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Ability Details
          </span>
          <button className="btn-sheet-close" onClick={() => setIsMobileSheetOpen(false)}>
            ✕ Close
          </button>
        </div>
        {renderAODetailContent(inspectedAbility)}
      </div>
    </div>
  );
};

export default AOSelector;
