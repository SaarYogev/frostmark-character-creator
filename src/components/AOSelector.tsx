import React, { useState } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { ORIGINS } from '../data/origins';
import { getAbilitiesForLevel, getAbilityById, ABILITIES } from '../data/abilities';
import { CustomOrigin, AbilityItem } from '../types/AO';
import { getAOChoiceDefinition } from '../data/aoChoices';
import { CHARACTERISTICS } from '../data/constants';
import FeatChoicePicker from './FeatChoicePicker';
import { parseFeatChoice } from '../data/feats';

const AOSelector: React.FC = () => {
  const { state, dispatch, editMode } = useCharacter();
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
  const [activeLevelFilter, setActiveLevelFilter] = useState<number | 'all'>(currentLevel > 1 ? currentLevel : 'all');
  const selectedAOs = state.ao?.selectedAOs ?? [];
  const customAOs = state.ao?.customAOs ?? [];
  const customAbilities = (state.ao as any)?.customAbilities ?? [];

  const lockedChoices = state.lockedChoices ?? {};
  const lockedPoolAOs: string[] = lockedChoices.poolAOs ?? [];
  const lockedLevelSelections = lockedChoices.levelSelections ?? {};

  const handleTogglePoolAO = (aoName: string) => {
    let nextAOs = [...selectedAOs];
    if (nextAOs.includes(aoName)) {
      if (!editMode && lockedPoolAOs.includes(aoName)) {
        return;
      }
      nextAOs = nextAOs.filter((n) => n !== aoName);
    } else if (nextAOs.length < 4) {
      nextAOs.push(aoName);
    }

    const primaryAO = nextAOs[0] || '';
    const secondaryAO = nextAOs[1] || '';

    const currentSelections = state.ao?.levelSelections ?? {};
    const lvl1Sel = currentSelections[1] ?? {
      primaryAO,
      secondaryAO,
      primaryAbility: '',
      secondaryAbility: '',
    };
    const nextLevelSelections = {
      ...currentSelections,
      1: {
        ...lvl1Sel,
        primaryAO: lvl1Sel.primaryAO || primaryAO,
        secondaryAO: lvl1Sel.secondaryAO || secondaryAO,
      },
    };

    dispatch({
      type: 'SET_AO',
      payload: {
        selectedAOs: nextAOs,
        primaryAO,
        secondaryAO,
        levelSelections: nextLevelSelections,
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

    const descText = [customAbilityShortDesc.trim(), customAbilityFullDesc.trim()].filter(Boolean).join('\n\n') || customAbilityName.trim();

    const newAbility: AbilityItem = {
      id: `custom-${customAbilityOrigin}-${customAbilityLevel}-${customAbilitySlot}-${customAbilityName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      name: customAbilityName.trim(),
      origin: customAbilityOrigin,
      level: customAbilityLevel,
      selection: customAbilitySlot === 'primary' ? 'Primary' : 'Secondary',
      desc: descText,
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

  const getLockedAbilityId = (lvl: number, slot: 'primary' | 'secondary'): string | undefined => {
    if (editMode) return undefined;
    const isPrimarySlot = slot === 'primary';
    const lockedSel = lockedLevelSelections[lvl];
    const explicitLockedId = isPrimarySlot ? lockedSel?.primaryAbility : lockedSel?.secondaryAbility;
    if (explicitLockedId) return explicitLockedId;
    if (lvl < currentLevel) {
      const currentLevelSel = (state.ao?.levelSelections ?? {})[lvl];
      return isPrimarySlot ? currentLevelSel?.primaryAbility : currentLevelSel?.secondaryAbility;
    }
    return undefined;
  };

  const handleSelectAbility = (level: number, slot: 'primary' | 'secondary', abilityId: string) => {
    const lockedAbilityId = getLockedAbilityId(level, slot);

    /*
     * If clicking the locked ability for this level, it cannot be deselected or changed in standard mode.
     * Only full editMode allows changing a previously-locked selection.
     */
    if (!editMode && lockedAbilityId && lockedAbilityId === abilityId) {
      setSelectedAbilityForDetailId(abilityId);
      return;
    }

    /*
     * In standard progression mode (!editMode), earlier level slots are locked milestones.
     * Any unchosen ability selected from an earlier level is chosen as the currentLevel's slot.
     */
    const targetLevel = (!editMode && level < currentLevel) ? currentLevel : level;
    const effectiveSlot = (targetLevel > 3) ? 'primary' : slot;
    const isPrimarySlot = effectiveSlot === 'primary';

    const currentSelections = state.ao?.levelSelections ?? {};
    const levelSel = currentSelections[targetLevel] ?? {
      primaryAO: state.ao?.primaryAO || selectedAOs[0] || '',
      secondaryAO: state.ao?.secondaryAO || '',
      primaryAbility: '',
      secondaryAbility: '',
    };

    const isUnselecting = levelSel[isPrimarySlot ? 'primaryAbility' : 'secondaryAbility'] === abilityId;

    // Prevent selecting an ability that has already been chosen in any other level or slot
    if (!isUnselecting) {
      const allLevelSelections = state.ao?.levelSelections ?? {};
      const isAlreadyPickedElsewhere = Object.entries(allLevelSelections).some(([lvlStr, s]) => {
        const otherLvl = parseInt(lvlStr, 10);
        if (otherLvl === targetLevel) {
          return isPrimarySlot ? s.secondaryAbility === abilityId : s.primaryAbility === abilityId;
        }
        return s.primaryAbility === abilityId || s.secondaryAbility === abilityId;
      });
      if (isAlreadyPickedElsewhere) {
        return;
      }
    }

    let updatedPrimaryAO = levelSel.primaryAO;
    let updatedSecondaryAO = levelSel.secondaryAO;
    if (isPrimarySlot && !isUnselecting) {
      const chosenAbility = [...getInspectedAbilityList(), ...customAbilities].find((ab) => ab.id === abilityId);
      if (chosenAbility?.origin) {
        updatedPrimaryAO = chosenAbility.origin;
      }
    } else if (!isPrimarySlot && !isUnselecting) {
      const chosenAbility = [...getInspectedAbilityList(), ...customAbilities].find((ab) => ab.id === abilityId);
      if (chosenAbility?.origin) {
        updatedSecondaryAO = chosenAbility.origin;
      }
    }

    const nextLevelSel = {
      ...levelSel,
      primaryAO: updatedPrimaryAO,
      secondaryAO: updatedSecondaryAO,
      [isPrimarySlot ? 'primaryAbility' : 'secondaryAbility']: isUnselecting ? '' : abilityId,
    };

    dispatch({
      type: 'SET_AO',
      payload: {
        levelSelections: {
          ...currentSelections,
          [targetLevel]: nextLevelSel,
        },
      },
    });

    // Mirror to top-level levelSelections for legacy state helpers
    dispatch({
      type: 'SET_STATE',
      payload: {
        levelSelections: {
          ...currentSelections,
          [targetLevel]: nextLevelSel,
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
    const isChoiceLocked = !editMode && selectedLevel !== null && Boolean(lockedLevelSelections[selectedLevel]?.upgradeChoices?.[abilityTarget.id]);

    const isUpgrade =
      (abilityTarget.name ?? '').includes('Upgrade') ||
      (abilityTarget.name ?? '').includes('Ability Score') ||
      (abilityTarget.name ?? '').includes('Feat') ||
      (abilityTarget.name ?? '').includes('ASI') ||
      (abilityTarget.desc ?? '').includes('Gain one of your choices:') ||
      (abilityTarget.desc ?? '').includes('increase one ability score');

    const choiceDef = getAOChoiceDefinition(abilityTarget.name, abilityTarget.desc);

    const handleUpgradeChoiceChange = (val: string) => {
      const targetLvl = selectedLevel || abilityTarget.level;
      if (!editMode && lockedLevelSelections[targetLvl]?.upgradeChoices?.[abilityTarget.id]) {
        return;
      }
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

    const handleMultiChoiceToggle = (option: string, maxChoices = 2) => {
      const currentVals = choiceValue ? choiceValue.split(', ').filter(Boolean) : [];
      let nextVals: string[];
      if (currentVals.includes(option)) {
        nextVals = currentVals.filter((v) => v !== option);
      } else {
        if (currentVals.length >= maxChoices) {
          nextVals = [...currentVals.slice(1), option];
        } else {
          nextVals = [...currentVals, option];
        }
      }
      handleUpgradeChoiceChange(nextVals.join(', '));
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
          {(abilityTarget.desc || abilityTarget.full_desc || abilityTarget.short_desc || '').split('\n\n').map((block: string, idx: number) => {
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

        {/* 1. Structured Choice (Single Select Dropdown) */}
        {choiceDef && choiceDef.type === 'single' && (() => {
          const isSplitASI = choiceValue.startsWith('+1 to Two Ability Scores');
          let splitFirst = '';
          let splitSecond = '';
          if (isSplitASI) {
            const cleaned = choiceValue.replace(/^\+1 to Two Ability Scores(?::\s*)?/i, '');
            const parts = cleaned.split(/[,&]+/).map(p => p.trim().replace(/^\+1\s+/, '')).filter(Boolean);
            splitFirst = parts[0] || '';
            splitSecond = parts[1] || '';
          }

          const isFeat = choiceValue === 'Feat' || choiceValue.startsWith('Feat:') || Boolean(parseFeatChoice(choiceValue));
          const isKnownOption = choiceDef.options.includes(choiceValue) || isSplitASI || isFeat;
          const mainSelectValue = isSplitASI
            ? '+1 to Two Ability Scores'
            : isFeat
            ? 'Feat'
            : choiceDef.options.includes(choiceValue)
            ? choiceValue
            : (choiceValue ? 'Other' : '');

          return (
            <div className="form-group" style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                {choiceDef.label}:
              </label>
              <select
                className="select"
                style={{ marginTop: '0.4rem', width: '100%' }}
                disabled={isChoiceLocked}
                title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                value={mainSelectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    handleUpgradeChoiceChange('Other: ');
                  } else if (val === '+1 to Two Ability Scores') {
                    handleUpgradeChoiceChange('+1 to Two Ability Scores: Brawn, Dexterity');
                  } else {
                    handleUpgradeChoiceChange(val);
                  }
                }}
              >
                <option value="">-- Select Option --</option>
                {choiceDef.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="Other">Other / Specific Details...</option>
              </select>

              {/* Split ASI Selectors */}
              {isSplitASI && (
                <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label htmlFor={`asi-split-1-${abilityTarget.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      First Ability Score (+1):
                    </label>
                    <select
                      id={`asi-split-1-${abilityTarget.id}`}
                      className="select"
                      style={{ width: '100%' }}
                      disabled={isChoiceLocked}
                      title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                      value={splitFirst}
                      onChange={(e) => {
                        const newFirst = e.target.value;
                        const newSecond = splitSecond || (newFirst === 'Brawn' ? 'Dexterity' : 'Brawn');
                        handleUpgradeChoiceChange(`+1 to Two Ability Scores: ${newFirst}, ${newSecond}`);
                      }}
                    >
                      <option value="">-- Select Stat --</option>
                      {CHARACTERISTICS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.key}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`asi-split-2-${abilityTarget.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Second Ability Score (+1):
                    </label>
                    <select
                      id={`asi-split-2-${abilityTarget.id}`}
                      className="select"
                      style={{ width: '100%' }}
                      disabled={isChoiceLocked}
                      title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                      value={splitSecond}
                      onChange={(e) => {
                        const newSecond = e.target.value;
                        const newFirst = splitFirst || (newSecond === 'Brawn' ? 'Dexterity' : 'Brawn');
                        handleUpgradeChoiceChange(`+1 to Two Ability Scores: ${newFirst}, ${newSecond}`);
                      }}
                    >
                      <option value="">-- Select Stat --</option>
                      {CHARACTERISTICS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.key}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Structured Feat Picker */}
              {isFeat && (
                <FeatChoicePicker
                  value={choiceValue}
                  state={state}
                  disabled={isChoiceLocked}
                  onChange={handleUpgradeChoiceChange}
                />
              )}

              {/* Custom / Other Text Input */}
              {!isSplitASI && !isFeat && (choiceValue.startsWith('Other:') ||
                (!isKnownOption && choiceValue !== '')) && (
                <input
                  type="text"
                  className="input"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                  disabled={isChoiceLocked}
                  title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                  placeholder="Enter custom choice details..."
                  value={choiceValue.startsWith('Other: ') ? choiceValue.slice(7) : choiceValue}
                  onChange={(e) => {
                    handleUpgradeChoiceChange(`Other: ${e.target.value}`);
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* 2. Structured Choice (Multi-Select Pills / Checkboxes) */}
        {choiceDef && choiceDef.type === 'multi' && (
          <div className="form-group" style={{ marginTop: '1rem', background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-gold)', display: 'block', marginBottom: '0.5rem' }}>
              {choiceDef.label} (Max {choiceDef.maxChoices || 2}):
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {choiceDef.options.map((opt) => {
                const selectedList = choiceValue ? choiceValue.split(', ').filter(Boolean) : [];
                const isChecked = selectedList.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={isChoiceLocked}
                    title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                    className={`btn btn-sm ${isChecked ? 'btn-accent' : 'btn-secondary'}`}
                    style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => handleMultiChoiceToggle(opt, choiceDef.maxChoices || 2)}
                  >
                    {isChecked ? '✓ ' : ''}{opt}
                  </button>
                );
              })}
            </div>
            {choiceValue && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Selected: <strong>{choiceValue}</strong>
              </div>
            )}
          </div>
        )}

        {/* 3. Fallback Open Input for Generic Upgrades */}
        {!choiceDef && isUpgrade && (
          <div className="form-group" style={{ marginTop: '1rem', background: 'var(--bg-elevated)', padding: '0.75rem', borderRadius: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)' }}>Upgrade Choice:</label>
            <input
              type="text"
              className="input"
              disabled={isChoiceLocked}
              title={isChoiceLocked ? 'Choice is locked from a previous level. Enable Full Edit Mode to change.' : ''}
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
              const isLocked = !editMode && lockedPoolAOs.includes(o.name);
              const isDisabled = (!isSelected && selectedAOs.length >= 4) || (isSelected && isLocked);
              const tooltip = isLocked
                ? 'Origin pool choice was locked at a previous level. Enable Full Edit Mode to deselect.'
                : (!isSelected && selectedAOs.length >= 4)
                ? 'Maximum 4 origins selected in pool.'
                : '';

              return (
                <div
                  key={o.name}
                  className={`ao-card card-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  data-pool-ao={o.name}
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  title={tooltip}
                  onClick={() => !isDisabled && handleTogglePoolAO(o.name)}
                  onKeyDown={(e) => {
                    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleTogglePoolAO(o.name);
                    }
                  }}
                  style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  <div className="card-option-name">
                    {o.name}
                    {isLocked && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem' }}>🔒</span>}
                  </div>
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
          // Check if inspecting a feat choice or an ability with feat selection available
          let isInspectedFeat = false;
          if (inspectedAbility) {
            const inspectedChoiceDef = getAOChoiceDefinition(inspectedAbility.name, inspectedAbility.desc);
            if (inspectedChoiceDef?.options?.includes('Feat')) {
              isInspectedFeat = true;
            } else {
              for (const sel of Object.values(state.ao?.levelSelections ?? {})) {
                const upgradeChoice = (sel as any)?.upgradeChoices?.[inspectedAbility.id];
                if (upgradeChoice === 'Feat' || (typeof upgradeChoice === 'string' && (upgradeChoice.startsWith('Feat:') || parseFeatChoice(upgradeChoice)))) {
                  isInspectedFeat = true;
                  break;
                }
              }
            }
          }

          const isInspectedLarge = Boolean(
            inspectedAbility &&
            ((inspectedAbility.desc ?? '').length > 400 || (inspectedAbility.desc ?? '').includes(' | '))
          );

          // On wide screens (>= 1200px / ultrawide / 4k), if viewing a feat or detailed card,
          // give the right column the prominent width it deserves (e.g. 580px-1100px or 60% of layout),
          // since the left column has only a few level cards while feats has 66 cards.
          let gridColumns = `minmax(0, 1fr) ${
            !inspectedAbility
              ? '320px'
              : isInspectedLarge
              ? 'minmax(460px, 540px)'
              : '360px'
          }`;

          if (isInspectedFeat) {
            // Allocate 35-40% to left level selections and 60-65% to right feat grid
            gridColumns = 'minmax(280px, 3.5fr) minmax(580px, 6.5fr)';
          }

          return (
            <div className="ao-main-layout" style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Left: Level Selections */}
            <div className="ao-levels-column" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>2. Level Selections</h3>
                {currentLevel > 1 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${activeLevelFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                      onClick={() => setActiveLevelFilter('all')}
                    >
                      All (1–{currentLevel})
                    </button>
                    {Array.from({ length: currentLevel }, (_, idx) => idx + 1).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        className={`btn btn-sm ${activeLevelFilter === lvl ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                        onClick={() => setActiveLevelFilter(lvl)}
                      >
                        Lvl {lvl}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="ao-levels-accordion">
                {Array.from({ length: currentLevel }, (_, idx) => idx + 1)
                  .filter((lvl) => activeLevelFilter === 'all' || activeLevelFilter === lvl)
                  .map((lvl) => {
                  const levelSelections = state.ao?.levelSelections ?? {};
                  const sel = levelSelections[lvl] ?? {
                    primaryAO: '',
                    secondaryAO: '',
                    primaryAbility: '',
                    secondaryAbility: '',
                  };
                  const isSecondaryAllowed = lvl <= 3;
                  const allPickedAbilities = new Map<string, { level: number; slot: 'Primary' | 'Secondary' }>();
                  Object.entries(levelSelections).forEach(([lvlKey, s]) => {
                    const lNum = parseInt(lvlKey, 10);
                    if (s.primaryAbility) {
                      allPickedAbilities.set(s.primaryAbility, { level: lNum, slot: 'Primary' });
                    }
                    if (s.secondaryAbility) {
                      allPickedAbilities.set(s.secondaryAbility, { level: lNum, slot: 'Secondary' });
                    }
                  });

                  const premadePrimary = selectedAOs.flatMap((ao) => getAbilitiesForLevel(lvl, 'Primary', ao));
                  const premadeSecondary = isSecondaryAllowed
                    ? selectedAOs.flatMap((ao) => getAbilitiesForLevel(lvl, 'Secondary', ao))
                    : [];

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
                            {(() => {
                              const lockedPrimaryId = getLockedAbilityId(lvl, 'primary');
                              const isPrimaryLocked = Boolean(!editMode && lockedPrimaryId);
                              return (
                                <div
                                  className={`ability-card custom-card-square ${isPrimaryLocked ? 'disabled' : ''}`}
                                  title={isPrimaryLocked ? 'Ability slot is locked from a previous level. Enable Full Edit Mode to change.' : ''}
                                  onClick={() => {
                                    if (isPrimaryLocked) return;
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
                                  style={{ cursor: isPrimaryLocked ? 'not-allowed' : 'pointer', opacity: isPrimaryLocked ? 0.5 : 1 }}
                                >
                                  <div className="custom-card-icon">＋</div>
                                  <div className="custom-card-title">Custom Ability</div>
                                </div>
                              );
                            })()}
                            {(() => {
                              if (sel.primaryAbility && !primaryAbilities.some((a: any) => a.id === sel.primaryAbility)) {
                                const chosenAb = getInspectedAbility(sel.primaryAbility);
                                if (chosenAb) {
                                  const isInspected = activeDetailId === chosenAb.id;
                                  return (
                                    <React.Fragment key={chosenAb.id}>
                                      <div
                                        className={`ability-card card-option selected ${isInspected ? 'inspected' : ''}`}
                                        data-ability-id={chosenAb.id}
                                        data-level={lvl}
                                        data-slot="primary"
                                        onClick={() => {
                                          handleSelectAbility(lvl, 'primary', chosenAb.id);
                                          setSelectedAbilityForDetailId(null);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className="ability-card-header">
                                          <span className="ability-origin-tag">
                                            {chosenAb.origin} (Lvl {chosenAb.level})
                                          </span>
                                          <span className="selected-badge"> ✓ Selected</span>
                                        </div>
                                        <h4 className="ability-card-title">{chosenAb.name}</h4>
                                      </div>
                                      {isInspected && (
                                        <div className="mobile-inline-ao-detail" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                                          {renderAODetailContent(chosenAb)}
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                }
                              }
                              return null;
                            })()}
                            {primaryAbilities.map((ab: any) => {
                                const lockedPrimaryId = getLockedAbilityId(lvl, 'primary');
                                const isLocked = Boolean(lockedPrimaryId && ab.id === lockedPrimaryId);
                                const isPickedThisLevel = sel.primaryAbility === ab.id;
                                const isInspected = activeDetailId === ab.id;
                                const pickedInfo = allPickedAbilities.get(ab.id);
                                const isPickedForCurrentLevel = Boolean(
                                  pickedInfo &&
                                  pickedInfo.level === currentLevel &&
                                  pickedInfo.slot === 'Primary' &&
                                  currentLevel !== lvl
                                );
                                const isPickedElsewhere = Boolean(
                                  pickedInfo &&
                                  (pickedInfo.level !== lvl || pickedInfo.slot !== 'Primary') &&
                                  !isPickedForCurrentLevel
                                );
                                const isSelected = isPickedThisLevel || isPickedForCurrentLevel;
                                const isDisabled = isPickedElsewhere;

                                const cardTitle = isLocked
                                  ? 'Ability was locked at a previous level. Enable Full Edit Mode to change.'
                                  : isPickedElsewhere
                                  ? `Already selected at Level ${pickedInfo?.level} (${pickedInfo?.slot})`
                                  : '';

                                return (
                                  <React.Fragment key={ab.id}>
                                    <div
                                      className={`ability-card card-option ${isSelected ? 'selected' : ''} ${isInspected ? 'inspected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                      data-ability-id={ab.id}
                                      data-level={lvl}
                                      data-slot="primary"
                                      title={cardTitle}
                                      onClick={() => {
                                        if (isDisabled) return;
                                        handleSelectAbility(lvl, 'primary', ab.id);
                                        setSelectedAbilityForDetailId(isSelected && !isLocked ? null : ab.id);
                                      }}
                                      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
                                    >
                                      <div className="ability-card-header">
                                        <span className="ability-origin-tag">
                                          {ab.origin}
                                        </span>
                                        {isLocked && <span className="selected-badge"> 🔒 Locked</span>}
                                        {!isLocked && isPickedThisLevel && <span className="selected-badge"> ✓ Selected</span>}
                                        {isPickedForCurrentLevel && <span className="selected-badge"> ✓ Selected (Lvl {currentLevel})</span>}
                                        {isPickedElsewhere && <span className="selected-badge" style={{ color: 'var(--text-secondary)' }}>Lvl {pickedInfo?.level}</span>}
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
                                onSubmit={handleCreateCustomAbility}
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
                              {(() => {
                                const lockedSecondaryId = getLockedAbilityId(lvl, 'secondary');
                                const isSecondaryLocked = Boolean(!editMode && lockedSecondaryId);
                                return (
                                  <div
                                    className={`ability-card custom-card-square ${isSecondaryLocked ? "disabled" : ""}`}
                                    title={isSecondaryLocked ? "Ability slot is locked from a previous level. Enable Full Edit Mode to change." : ""}
                                    onClick={() => {
                                      if (isSecondaryLocked) return;
                                      if (customAbilityLevel === lvl && customAbilitySlot === "secondary") {
                                        setCustomAbilityLevel(null);
                                      } else {
                                        setCustomAbilityLevel(lvl);
                                        setCustomAbilitySlot("secondary");
                                        setCustomAbilityOrigin(selectedAOs[0] || "");
                                      }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    style={{ cursor: isSecondaryLocked ? "not-allowed" : "pointer", opacity: isSecondaryLocked ? 0.5 : 1 }}
                                  >
                                    <div className="custom-card-icon">＋</div>
                                    <div className="custom-card-title">Custom Ability</div>
                                  </div>
                                );
                              })()}
                              {(() => {
                                if (sel.secondaryAbility && !secondaryAbilities.some((a: any) => a.id === sel.secondaryAbility)) {
                                  const chosenAb = getInspectedAbility(sel.secondaryAbility);
                                  if (chosenAb) {
                                    const isInspected = activeDetailId === chosenAb.id;
                                    return (
                                      <React.Fragment key={chosenAb.id}>
                                        <div
                                          className={`ability-card card-option selected ${isInspected ? "inspected" : ""}`}
                                          data-ability-id={chosenAb.id}
                                          data-level={lvl}
                                          data-slot="secondary"
                                          onClick={() => {
                                            handleSelectAbility(lvl, "secondary", chosenAb.id);
                                            setSelectedAbilityForDetailId(null);
                                          }}
                                          style={{ cursor: "pointer" }}
                                        >
                                          <div className="ability-card-header">
                                            <span className="ability-origin-tag">
                                              {chosenAb.origin} (Lvl {chosenAb.level})
                                            </span>
                                            <span className="selected-badge"> ✓ Selected</span>
                                          </div>
                                          <h4 className="ability-card-title">{chosenAb.name}</h4>
                                        </div>
                                        {isInspected && (
                                          <div className="mobile-inline-ao-detail" style={{ gridColumn: "1 / -1", marginBottom: "0.5rem" }}>
                                            {renderAODetailContent(chosenAb)}
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  }
                                }
                                return null;
                              })()}
                              {secondaryAbilities.length === 0 ? (
                                <div className="no-abilities">No secondary abilities found for level {lvl} in pool</div>
                              ) : (
                                secondaryAbilities.map((ab: any) => {
                                  const lockedSecondaryId = getLockedAbilityId(lvl, 'secondary');
                                  const isLocked = Boolean(lockedSecondaryId && ab.id === lockedSecondaryId);
                                  const isPickedThisLevel = sel.secondaryAbility === ab.id;
                                  const isInspected = activeDetailId === ab.id;
                                  const pickedInfo = allPickedAbilities.get(ab.id);
                                  const isPickedForCurrentLevel = Boolean(
                                    pickedInfo &&
                                    pickedInfo.level === currentLevel &&
                                    pickedInfo.slot === "Secondary" &&
                                    currentLevel !== lvl
                                  );
                                  const isPickedElsewhere = Boolean(
                                    pickedInfo &&
                                    (pickedInfo.level !== lvl || pickedInfo.slot !== "Secondary") &&
                                    !isPickedForCurrentLevel
                                  );
                                  const isSelected = isPickedThisLevel || isPickedForCurrentLevel;
                                  const isDisabled = isPickedElsewhere;

                                  const cardTitle = isLocked
                                    ? "Ability was locked at a previous level. Enable Full Edit Mode to change."
                                    : isPickedElsewhere
                                    ? `Already selected at Level ${pickedInfo?.level} (${pickedInfo?.slot})`
                                    : "";

                                  return (
                                    <React.Fragment key={ab.id}>
                                      <div
                                        className={`ability-card card-option ${isSelected ? "selected" : ""} ${isInspected ? "inspected" : ""} ${isDisabled ? "disabled" : ""}`}
                                        data-ability-id={ab.id}
                                        data-level={lvl}
                                        data-slot="secondary"
                                        title={cardTitle}
                                        onClick={() => {
                                          if (isDisabled) return;
                                          handleSelectAbility(lvl, "secondary", ab.id);
                                          setSelectedAbilityForDetailId(isSelected && !isLocked ? null : ab.id);
                                        }}
                                        style={{ cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.5 : 1 }}
                                      >
                                        <div className="ability-card-header">
                                          <span className="ability-origin-tag">
                                            {ab.origin}
                                          </span>
                                          {isLocked && <span className="selected-badge"> 🔒 Locked</span>}
                                          {!isLocked && isPickedThisLevel && <span className="selected-badge"> ✓ Selected</span>}
                                          {isPickedForCurrentLevel && <span className="selected-badge"> ✓ Selected (Lvl {currentLevel})</span>}
                                          {isPickedElsewhere && <span className="selected-badge" style={{ color: "var(--text-secondary)" }}>Lvl {pickedInfo?.level}</span>}
                                        </div>
                                        <h4 className="ability-card-title">{ab.name}</h4>
                                      </div>
                                      {isInspected && (
                                        <div className="mobile-inline-ao-detail" style={{ gridColumn: "1 / -1", marginBottom: "0.5rem" }}>
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
