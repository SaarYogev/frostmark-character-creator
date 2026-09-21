import React, { useState, useEffect } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { CHARACTERISTICS, WEAPON_PROFICIENCY_COSTS, SAVE_PROFICIENCY_COSTS } from '../data/constants';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

const ProficienciesSelector: React.FC = () => {
  const { state, dispatch, editMode } = useCharacter();

  const { apLimit, apRemaining } = getGlobalAPSummary(state);

  const locked = state.lockedChoices ?? {};
  const lockedSaves = locked.savingThrowsProficient ?? {};
  const lockedArmor = locked.armorProficiencies ?? {};
  const lockedWeapons = locked.weaponProficiencies ?? [];

  const savingThrowsProficient = state.proficiencies?.savingThrowsProficient ?? (state as any).savingThrowsProficient ?? {};
  const armorProficiencies = state.proficiencies?.armorProficiencies ?? (state as any).armorProficiencies ?? {};
  const weaponProficiencies = state.proficiencies?.weaponProficiencies ?? (state as any).weaponProficiencies ?? [];
  const languages = state.proficiencies?.languages ?? (state as any).languages ?? [];
  const goldAmount = state.proficiencies?.goldAmount ?? (state as any).goldAmount ?? 10;
  const manualProficiencies = state.proficiencies?.manualProficiencies ?? false;

  const currentSavesCount = Object.values(savingThrowsProficient || {}).filter(Boolean).length;

  const getArmorCost = (prof: Record<string, boolean>) => {
    let cost = 0;
    if (prof.Heavy) cost = 3;
    else if (prof.Medium) cost = 2;
    else if (prof.Light) cost = 1;
    if (prof.Shields) cost += 1;
    return cost;
  };

  const allWeaponGroups = [
    { name: 'Handpicked 2 Weapons', cost: 1 },
    ...WEAPON_PROFICIENCY_COSTS.Groups1pt.map((g) => ({ name: g, cost: 1 })),
    ...WEAPON_PROFICIENCY_COSTS.Groups2pt.map((g) => ({ name: g, cost: 2 })),
    ...WEAPON_PROFICIENCY_COSTS.Groups3pt.map((g) => ({ name: g, cost: 3 })),
  ];

  const handleToggleSave = (charKey: string, checked: boolean) => {
    if (checked && !manualProficiencies && currentSavesCount >= 3) {
      return;
    }

    const nextSaves = {
      ...savingThrowsProficient,
      [charKey]: checked,
    };

    dispatch({
      type: 'SET_PROFICIENCIES',
      payload: { savingThrowsProficient: nextSaves },
    });
    // Mirror to top-level for legacy state functions
    dispatch({
      type: 'SET_STATE',
      payload: { savingThrowsProficient: nextSaves },
    } as any);
  };

  const handleToggleArmor = (armorType: string, checked: boolean) => {
    const nextArmor = {
      ...armorProficiencies,
      [armorType]: checked,
    };

    dispatch({
      type: 'SET_PROFICIENCIES',
      payload: { armorProficiencies: nextArmor },
    });
    dispatch({
      type: 'SET_STATE',
      payload: { armorProficiencies: nextArmor },
    } as any);
  };

  const handleToggleWeapon = (weaponGroupName: string, checked: boolean) => {
    const currentList: string[] = Array.isArray(weaponProficiencies) ? weaponProficiencies : [];
    const nextWeapons = checked
      ? [...currentList.filter((w) => w !== weaponGroupName), weaponGroupName]
      : currentList.filter((w) => w !== weaponGroupName);

    dispatch({
      type: 'SET_PROFICIENCIES',
      payload: { weaponProficiencies: nextWeapons },
    });
    dispatch({
      type: 'SET_STATE',
      payload: { weaponProficiencies: nextWeapons },
    } as any);
  };

  const [languagesInput, setLanguagesInput] = useState<string>(() =>
    Array.isArray(languages) ? languages.join(', ') : ''
  );

  useEffect(() => {
    const formatted = Array.isArray(languages) ? languages.join(', ') : '';
    const parsedCurrent = languagesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const parsedStore = Array.isArray(languages) ? languages : [];
    if (parsedCurrent.join('|') !== parsedStore.join('|')) {
      setLanguagesInput(formatted);
    }
  }, [languages]);

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLanguagesInput(val);
    const langList = val.split(',').map((s) => s.trim()).filter(Boolean);
    dispatch({
      type: 'SET_PROFICIENCIES',
      payload: { languages: langList },
    });
    dispatch({
      type: 'SET_STATE',
      payload: { languages: langList },
    } as any);
  };

  const handleGoldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10) || 0;
    dispatch({
      type: 'SET_PROFICIENCIES',
      payload: { goldAmount: val },
    });
    dispatch({
      type: 'SET_STATE',
      payload: { goldAmount: val },
    } as any);
  };

  return (
    <div className="proficiencies-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">🛡️ Proficiencies & Accomplishment Points</h2>
          <p className="step-desc">Use AP to buy saving throw proficiencies (max 3), armor & weapon proficiencies, and extra gold.</p>
        </div>

        {/* Manual Override Control */}
        <div className="manual-override-control" style={{ marginBottom: '1.5rem' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={manualProficiencies}
              onChange={(e) => {
                const checked = e.target.checked;
                dispatch({
                  type: 'SET_PROFICIENCIES',
                  payload: { manualProficiencies: checked },
                });
                dispatch({
                  type: 'SET_STATE',
                  payload: { manualProficiencies: checked },
                } as any);
              }}
            />
            <strong>Manual Proficiencies Override (Ignore AP limits/allow custom distribution)</strong>
          </label>
        </div>

        {/* Saving Throw Proficiencies */}
        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">
            Saving Throw Proficiencies{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#a0a5c0' }}>({currentSavesCount} / 3 selected)</span>
          </h3>
          <div className="proficiency-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {CHARACTERISTICS.map((c) => {
              const isChecked = !!savingThrowsProficient[c.key];
              const isLocked = !editMode && !manualProficiencies && !!lockedSaves[c.key];
              const incrementalCost = (SAVE_PROFICIENCY_COSTS as any)[c.key] || 1;
              const canAfford = isChecked || apRemaining >= incrementalCost;
              const limitReached = !isChecked && currentSavesCount >= 3 && !manualProficiencies;
              const isDisabled = isLocked || (!isChecked && !canAfford && !manualProficiencies) || limitReached;
              const tooltip = isLocked
                ? 'Proficiency acquired at a previous level is locked. Enable Full Edit Mode to remove.'
                : limitReached
                ? 'Maximum 3 saving throw proficiencies allowed.'
                : isDisabled
                ? `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`
                : '';

              return (
                <label
                  key={c.key}
                  className={`prof-toggle ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  id={`save-toggle-${c.key}`}
                  title={tooltip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.85rem',
                    background: isChecked ? 'rgba(74, 144, 226, 0.2)' : 'var(--bg-elevated, rgba(255,255,255,0.04))',
                    border: `1px solid ${isChecked ? 'var(--accent-color, #4a90e2)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
                    borderRadius: '6px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={(e) => handleToggleSave(c.key, e.target.checked)}
                  />
                  <span>
                    {c.key} ({incrementalCost} AP)
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Armor Proficiencies */}
        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Armor Proficiencies</h3>
          <p className="form-hint" style={{ marginBottom: '0.75rem', color: '#a0a5c0', fontSize: '0.85rem' }}>
            Armor proficiency is a tiered progression (Light = 1 AP, Medium = 2 AP, Heavy = 3 AP). Higher tiers include all lower tiers. Shields cost 1 AP independently.
          </p>
          {(() => {
            const currentTier: 'None' | 'Light' | 'Medium' | 'Heavy' = armorProficiencies.Heavy
              ? 'Heavy'
              : armorProficiencies.Medium
              ? 'Medium'
              : armorProficiencies.Light
              ? 'Light'
              : 'None';

            const lockedTier: 'None' | 'Light' | 'Medium' | 'Heavy' = lockedArmor.Heavy
              ? 'Heavy'
              : lockedArmor.Medium
              ? 'Medium'
              : lockedArmor.Light
              ? 'Light'
              : 'None';

            const tierOrder = { None: 0, Light: 1, Medium: 2, Heavy: 3 };
            const currentTierCost = tierOrder[currentTier];

            const handleSetTier = (tier: 'None' | 'Light' | 'Medium' | 'Heavy') => {
              const targetCost = tierOrder[tier];
              const nextArmor = {
                ...armorProficiencies,
                Light: targetCost >= 1,
                Medium: targetCost >= 2,
                Heavy: targetCost >= 3,
              };
              dispatch({
                type: 'SET_PROFICIENCIES',
                payload: { armorProficiencies: nextArmor },
              });
              dispatch({
                type: 'SET_STATE',
                payload: { armorProficiencies: nextArmor },
              } as any);
            };

            const tiers: { id: 'None' | 'Light' | 'Medium' | 'Heavy'; label: string; desc: string; cost: number }[] = [
              { id: 'None', label: 'No Armor', desc: '0 AP', cost: 0 },
              { id: 'Light', label: 'Light Armor', desc: '1 AP', cost: 1 },
              { id: 'Medium', label: 'Medium Armor', desc: '2 AP (includes Light)', cost: 2 },
              { id: 'Heavy', label: 'Heavy Armor', desc: '3 AP (includes Light & Med)', cost: 3 },
            ];

            const isShieldChecked = !!armorProficiencies.Shields;
            const isShieldLocked = !editMode && !manualProficiencies && !!lockedArmor.Shields;
            const canAffordShield = isShieldChecked || apRemaining >= 1;
            const isShieldDisabled = isShieldLocked || (!isShieldChecked && !canAffordShield && !manualProficiencies);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {tiers.map((t) => {
                    const isSelected = currentTier === t.id;
                    const isLocked = !editMode && !manualProficiencies && tierOrder[t.id] < tierOrder[lockedTier];
                    const incrementalCost = Math.max(0, t.cost - currentTierCost);
                    const canAfford = isSelected || apRemaining >= incrementalCost;
                    const isDisabled = isLocked || (!isSelected && !canAfford && !manualProficiencies);

                    let tooltip = '';
                    if (isLocked) {
                      tooltip = `Armor tier was locked at ${lockedTier} at a previous level. Enable Full Edit Mode to downgrade.`;
                    } else if (!canAfford && !manualProficiencies) {
                      tooltip = `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`;
                    }

                    return (
                      <label
                        key={t.id}
                        className={`prof-toggle ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                        id={`armor-tier-${t.id.toLowerCase()}`}
                        title={tooltip}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.75rem 0.9rem',
                          background: isSelected ? 'rgba(74, 144, 226, 0.2)' : 'var(--bg-elevated, rgba(255,255,255,0.04))',
                          border: `1px solid ${isSelected ? 'var(--accent-color, #4a90e2)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
                          borderRadius: '6px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.4 : 1,
                        }}
                      >
                        <input
                          type="radio"
                          name="armor-tier"
                          aria-label={t.label}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => handleSetTier(t.id)}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                            <span>{t.label}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#a0a5c0' }}>{t.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Independent Shields Toggle */}
                <div style={{ maxWidth: '280px' }}>
                  <label
                    className={`prof-toggle ${isShieldChecked ? 'active' : ''} ${isShieldDisabled ? 'disabled' : ''}`}
                    id="armor-toggle-Shields"
                    title={isShieldLocked ? 'Shield proficiency acquired at a previous level is locked. Enable Full Edit Mode to remove.' : isShieldDisabled ? 'Requires 1 AP.' : ''}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.75rem 0.9rem',
                      background: isShieldChecked ? 'rgba(74, 144, 226, 0.2)' : 'var(--bg-elevated, rgba(255,255,255,0.04))',
                      border: `1px solid ${isShieldChecked ? 'var(--accent-color, #4a90e2)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
                      borderRadius: '6px',
                      cursor: isShieldDisabled ? 'not-allowed' : 'pointer',
                      opacity: isShieldDisabled ? 0.4 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isShieldChecked}
                      disabled={isShieldDisabled}
                      onChange={(e) => handleToggleArmor('Shields', e.target.checked)}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>Shields</div>
                      <div style={{ fontSize: '0.75rem', color: '#a0a5c0' }}>+1 AP</div>
                    </div>
                  </label>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Weapon Proficiencies */}
        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Weapon Proficiencies</h3>
          <p className="form-hint" style={{ marginBottom: '0.75rem', color: '#a0a5c0', fontSize: '0.85rem' }}>
            Select weapon categories or groups to purchase proficiency with AP.
          </p>
          <div className="proficiency-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {allWeaponGroups.map((wg) => {
              const isChecked = (Array.isArray(weaponProficiencies) ? weaponProficiencies : []).includes(wg.name);
              const isLocked = !editMode && !manualProficiencies && lockedWeapons.includes(wg.name);
              const canAfford = isChecked || apRemaining >= wg.cost;
              const isDisabled = isLocked || (!isChecked && !canAfford && !manualProficiencies);
              const tooltip = isLocked
                ? 'Weapon proficiency acquired at a previous level is locked. Enable Full Edit Mode to remove.'
                : isDisabled
                ? `Requires ${wg.cost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`
                : '';
              const sanitizeId = wg.name.replace(/\s+/g, '-');

              return (
                <label
                  key={wg.name}
                  className={`prof-toggle ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  id={`weapon-toggle-${sanitizeId}`}
                  title={tooltip}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.85rem',
                    background: isChecked ? 'rgba(74, 144, 226, 0.2)' : 'var(--bg-elevated, rgba(255,255,255,0.04))',
                    border: `1px solid ${isChecked ? 'var(--accent-color, #4a90e2)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
                    borderRadius: '6px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={(e) => handleToggleWeapon(wg.name, e.target.checked)}
                  />
                  <span>
                    {wg.name} ({wg.cost} AP)
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Languages */}
        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Languages</h3>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Additional Languages (comma-separated)</label>
            <input
              type="text"
              className="input"
              value={languagesInput}
              onChange={handleLanguagesChange}
              placeholder="e.g. Elvish, Dwarvish"
            />
          </div>
        </div>

        {/* Extra Gold */}
        <div className="section-block">
          <h3 className="section-title">Extra Gold (1 AP = 25 gp)</h3>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Total Starting Gold (gp)</label>
            <input
              type="number"
              className="input"
              min="10"
              step={25}
              value={goldAmount}
              onChange={handleGoldChange}
              style={{ maxWidth: '200px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProficienciesSelector;
