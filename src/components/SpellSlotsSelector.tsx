import React, { useMemo } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { ORIGINS } from '../data/origins';
import { calculatePotentialGained } from '../logic/state';
import { getSpellSlotsForLevel } from '../logic/pdf';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

const SpellSlotsSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const { sanitizedState } = getGlobalAPSummary(state);

  const spellcasting = (state as any).spellcasting ?? {};
  const cantrips: string[] = spellcasting.cantrips ?? [];
  const selectedSpells: { name: string; level: number }[] = spellcasting.spells ?? [];
  const slots: Record<number, number> = spellcasting.slots ?? {};
  const manualSpells: boolean = spellcasting.manualSpells ?? false;

  const potentialLimit = calculatePotentialGained(sanitizedState, ORIGINS);
  const potentialSpent = useMemo(() => {
    let spent = cantrips.length * 10;
    selectedSpells.forEach((s) => { spent += 10 * (s.level ?? 1); });
    for (let lvl = 1; lvl <= 9; lvl++) {
      spent += (slots[lvl] ?? 0) * 10 * lvl;
    }
    return spent;
  }, [cantrips, selectedSpells, slots]);
  const potentialRemaining = potentialLimit - potentialSpent;

  const updateSpellcasting = (patch: Record<string, unknown>) => {
    const next = { ...spellcasting, ...patch };
    dispatch({ type: 'SET_SPELLCASTING', payload: next } as any);
    dispatch({ type: 'SET_STATE', payload: { spellcasting: next } } as any);
  };

  const handleSlotChange = (lvl: number, delta: number) => {
    const current = slots[lvl] ?? 0;
    const limit = getSpellSlotsForLevel(lvl);
    const next = Math.max(0, Math.min(current + delta, manualSpells ? 999 : limit));
    updateSpellcasting({ slots: { ...slots, [lvl]: next } });
  };

  return (
    <div className="spell-slots-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">⚡ Spell Slots</h2>
          <p className="step-desc">Spend your Potential to buy spell slots. You cannot exceed the physical sheet slot limit.</p>
        </div>

        {/* Manual Override */}
        <div className="manual-override-control" style={{ marginBottom: '1.5rem' }}>
          <label className="checkbox-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={manualSpells}
              onChange={(e) => updateSpellcasting({ manualSpells: e.target.checked })}
            />
            <strong>Manual Spellcasting Override (Ignore Potential limits)</strong>
          </label>
        </div>

        {/* Potential tracker + slot summary */}
        <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column', marginBottom: '1.5rem' }}>
          <div className={`point-buy-tracker ${potentialRemaining < 0 ? 'over-budget' : ''}`} style={{ marginBottom: 0 }}>
            <span>Potential Remaining:</span>
            <strong>{potentialRemaining}</strong>
            <span>/ {potentialLimit}</span>
          </div>

          <div className="spell-slots-budget" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', color: '#a0a5c0' }}>Cantrips</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: cantrips.length > 5 ? '#eb5e55' : '#fff' }}>
                {cantrips.length} / 5
              </div>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
              <div key={lvl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0a5c0' }}>Level {lvl} Slots</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                  {slots[lvl] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Buy spell slots */}
        <div className="section-block">
          <h3 className="section-title">Buy Spell Slots</h3>
          <p className="form-hint" style={{ color: '#a0a5c0', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Cost: 10 Potential * Spell Level. You cannot exceed the physical sheet slot limit.
          </p>
          <div className="spell-slots-buying-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
              const limit = getSpellSlotsForLevel(lvl);
              const current = slots[lvl] ?? 0;
              const cost = 10 * lvl;
              const plusDisabled = current >= limit && !manualSpells || (potentialRemaining < cost && !manualSpells);
              const minusDisabled = current <= 0;

              let tooltip = '';
              if (current >= limit && !manualSpells) tooltip = `Max slots (${limit}) reached.`;
              else if (potentialRemaining < cost && !manualSpells) tooltip = `Requires ${cost} Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`;

              return (
                <div key={lvl} className="slot-buy-row" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Level {lvl} Slot</strong>
                    <span style={{ fontSize: '0.75rem', color: '#a0a5c0' }}>Cost: {cost} Pot</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="rank-btn" disabled={minusDisabled} onClick={() => handleSlotChange(lvl, -1)}>−</button>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', minWidth: '2.5rem', textAlign: 'center' }}>{current} / {limit}</span>
                    <button className="rank-btn" disabled={plusDisabled} title={tooltip} onClick={() => handleSlotChange(lvl, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpellSlotsSelector;
