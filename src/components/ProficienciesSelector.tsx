import React from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { CHARACTERISTICS, WEAPON_PROFICIENCY_COSTS, SAVE_PROFICIENCY_COSTS } from '../data/constants';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

const ProficienciesSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const { apLimit, apRemaining } = getGlobalAPSummary(state);

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

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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
              onChange={(e) =>
                dispatch({
                  type: 'SET_PROFICIENCIES',
                  payload: { manualProficiencies: e.target.checked },
                })
              }
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
              const incrementalCost = (SAVE_PROFICIENCY_COSTS as any)[c.key] || 1;
              const canAfford = isChecked || apRemaining >= incrementalCost;
              const limitReached = !isChecked && currentSavesCount >= 3 && !manualProficiencies;
              const isDisabled = (!isChecked && !canAfford && !manualProficiencies) || limitReached;
              const tooltip = limitReached
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
            Light=1 AP, Medium=2 AP, Heavy=3 AP, Shields=1 AP
          </p>
          <div className="proficiency-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {['Light', 'Medium', 'Heavy', 'Shields'].map((a) => {
              const isChecked = !!armorProficiencies[a];
              const currentCost = getArmorCost(armorProficiencies);
              const nextCost = getArmorCost({ ...armorProficiencies, [a]: true });
              const incrementalCost = Math.max(0, nextCost - currentCost);
              const canAfford = isChecked || apRemaining >= incrementalCost;
              const isDisabled = !isChecked && !canAfford && !manualProficiencies;
              const tooltip = isDisabled ? `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.` : '';

              return (
                <label
                  key={a}
                  className={`prof-toggle ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  id={`armor-toggle-${a}`}
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
                    onChange={(e) => handleToggleArmor(a, e.target.checked)}
                  />
                  <span>{a}</span>
                </label>
              );
            })}
          </div>
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
              const canAfford = isChecked || apRemaining >= wg.cost;
              const isDisabled = !isChecked && !canAfford && !manualProficiencies;
              const tooltip = isDisabled ? `Requires ${wg.cost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.` : '';
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
              value={Array.isArray(languages) ? languages.join(', ') : ''}
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
