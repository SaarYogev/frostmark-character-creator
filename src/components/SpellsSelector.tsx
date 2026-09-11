import React, { useState, useMemo } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { CANTRIPS, SPELLS } from '../data/spells';
import { ORIGINS } from '../data/origins';
import { calculatePotentialGained } from '../logic/state';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

interface SpellEntry {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: number;
  rangeLabel?: string;
  duration: string;
  concentration: boolean;
  ritual?: boolean;
  damageTypes?: string[];
  desc: string;
}

const FILTER_CATALOG = [
  { key: 'schools',       label: 'Schools' },
  { key: 'levels',        label: 'Levels' },
  { key: 'concentration', label: 'Concentration' },
  { key: 'ritual',        label: 'Ritual' },
  { key: 'casting',       label: 'Casting Times' },
  { key: 'damage',        label: 'Damage Types (Experimental)' },
];

const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Transmutation','Vismancy'];
const LEVEL_OPTIONS = [{ label: 'Cantrip', val: 0 }, ...Array.from({ length: 9 }, (_, i) => ({ label: String(i + 1), val: i + 1 }))];
const CASTING_TIMES = ['Action','Bonus Action','Reaction','Minute+'];
const DAMAGE_TYPES = ['Acid','Cold','Fire','Force','Lightning','Necrotic','Poison','Psychic','Radiant','Thunder','Bludgeoning','Piercing','Slashing'];

const SpellsSelector: React.FC = () => {
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'range'>('name');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterSchools, setFilterSchools] = useState<string[]>([]);
  const [filterLevels, setFilterLevels] = useState<number[]>([]);
  const [filterConcentration, setFilterConcentration] = useState<'yes' | 'no' | null>(null);
  const [filterRitual, setFilterRitual] = useState<'yes' | 'no' | null>(null);
  const [filterCasting, setFilterCasting] = useState<string[]>([]);
  const [filterDamage, setFilterDamage] = useState<string[]>([]);
  const [selectedSpellName, setSelectedSpellName] = useState<string | null>(null);

  const updateSpellcasting = (patch: Record<string, unknown>) => {
    const next = { ...spellcasting, ...patch };
    dispatch({ type: 'SET_SPELLCASTING', payload: next } as any);
    dispatch({ type: 'SET_STATE', payload: { spellcasting: next } } as any);
  };

  const handleAddFilter = (key: string) => {
    if (!key || activeFilters.includes(key)) return;
    setActiveFilters((prev) => [...prev, key]);
  };

  const handleRemoveFilter = (key: string) => {
    setActiveFilters((prev) => prev.filter((k) => k !== key));
    if (key === 'schools') setFilterSchools([]);
    if (key === 'levels') setFilterLevels([]);
    if (key === 'concentration') setFilterConcentration(null);
    if (key === 'ritual') setFilterRitual(null);
    if (key === 'casting') setFilterCasting([]);
    if (key === 'damage') setFilterDamage([]);
  };

  const handleLearnSpell = (spell: SpellEntry) => {
    const isCantrip = spell.level === 0;
    if (isCantrip) {
      const next = cantrips.includes(spell.name)
        ? cantrips.filter((c) => c !== spell.name)
        : [...cantrips, spell.name];
      updateSpellcasting({ cantrips: next });
    } else {
      const isSelected = selectedSpells.some((s) => s.name === spell.name);
      if (isSelected) {
        updateSpellcasting({ spells: selectedSpells.filter((s) => s.name !== spell.name) });
      } else {
        updateSpellcasting({ spells: [...selectedSpells, { name: spell.name, level: spell.level ?? 1 }] });
      }
    }
  };

  const allSpells: SpellEntry[] = useMemo(() => {
    let list: SpellEntry[] = [...CANTRIPS, ...SPELLS] as SpellEntry[];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.desc?.toLowerCase().includes(q));
    }
    if (filterSchools.length > 0) list = list.filter((s) => filterSchools.includes(s.school));
    if (filterLevels.length > 0) list = list.filter((s) => filterLevels.includes(s.level));
    if (filterConcentration === 'yes') list = list.filter((s) => s.concentration);
    if (filterConcentration === 'no') list = list.filter((s) => !s.concentration);
    if (filterRitual === 'yes') list = list.filter((s) => s.ritual);
    if (filterRitual === 'no') list = list.filter((s) => !s.ritual);
    if (filterCasting.length > 0) {
      list = list.filter((s) => {
        const ct = s.castingTime?.toLowerCase() ?? '';
        return filterCasting.some((f) => {
          if (f === 'Action') return ct.includes('action') && !ct.includes('bonus') && !ct.includes('reaction');
          if (f === 'Bonus Action') return ct.includes('bonus');
          if (f === 'Reaction') return ct.includes('reaction');
          if (f === 'Minute+') return ct.includes('minute') || ct.includes('hour');
          return false;
        });
      });
    }
    if (filterDamage.length > 0) {
      list = list.filter((s) =>
        s.damageTypes && s.damageTypes.some((dt) => filterDamage.includes(dt.toLowerCase()))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'level') return (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name);
      if (sortBy === 'range') return (a.range ?? 0) - (b.range ?? 0) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [searchQuery, filterSchools, filterLevels, filterConcentration, filterRitual, filterCasting, filterDamage, sortBy]);

  const activeSpell: SpellEntry | null = selectedSpellName
    ? ([...CANTRIPS, ...SPELLS] as SpellEntry[]).find((s) => s.name === selectedSpellName) ?? null
    : null;

  const getSpellIsSelected = (spell: SpellEntry) =>
    spell.level === 0 ? cantrips.includes(spell.name) : selectedSpells.some((s) => s.name === spell.name);

  const getSpellDisabled = (spell: SpellEntry) => {
    if (manualSpells) return false;
    if (getSpellIsSelected(spell)) return false;
    const isCantrip = spell.level === 0;
    if (isCantrip && cantrips.length >= 5) return true;
    const cost = isCantrip ? 10 : 10 * spell.level;
    return potentialRemaining < cost;
  };

  const getSpellTooltip = (spell: SpellEntry) => {
    if (getSpellIsSelected(spell)) return '';
    const isCantrip = spell.level === 0;
    if (isCantrip && cantrips.length >= 5 && !manualSpells) return 'Maximum 5 cantrips allowed by the character sheet.';
    const cost = isCantrip ? 10 : 10 * spell.level;
    if (potentialRemaining < cost && !manualSpells) return `Requires ${cost} Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`;
    return '';
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.65rem',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--accent-color, #4a90e2)' : 'var(--border-color, rgba(255,255,255,0.1))'}`,
    background: active ? 'rgba(74,144,226,0.2)' : 'transparent',
    color: active ? '#fff' : '#a0a5c0',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
  });

  const renderFilterBody = (key: string) => {
    if (key === 'schools') return (
      <div className="filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {SCHOOLS.map((s) => (
          <button key={s} style={pillStyle(filterSchools.includes(s))} onClick={() => setFilterSchools((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}>{s}</button>
        ))}
      </div>
    );
    if (key === 'levels') return (
      <div className="filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {LEVEL_OPTIONS.map(({ label, val }) => (
          <button key={val} style={pillStyle(filterLevels.includes(val))} onClick={() => setFilterLevels((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val])}>{label}</button>
        ))}
      </div>
    );
    if (key === 'casting') return (
      <div className="filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {CASTING_TIMES.map((ct) => (
          <button key={ct} style={pillStyle(filterCasting.includes(ct))} onClick={() => setFilterCasting((prev) => prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct])}>{ct}</button>
        ))}
      </div>
    );
    if (key === 'damage') return (
      <div className="filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {DAMAGE_TYPES.map((dt) => {
          const lower = dt.toLowerCase();
          return (
            <button key={dt} style={pillStyle(filterDamage.includes(lower))} onClick={() => setFilterDamage((prev) => prev.includes(lower) ? prev.filter((x) => x !== lower) : [...prev, lower])}>{dt}</button>
          );
        })}
      </div>
    );
    if (key === 'concentration') return (
      <div className="filter-pills" style={{ display: 'flex', gap: '0.35rem' }}>
        <button style={pillStyle(filterConcentration === 'yes')} onClick={() => setFilterConcentration((prev) => prev === 'yes' ? null : 'yes')}>Yes</button>
        <button style={pillStyle(filterConcentration === 'no')} onClick={() => setFilterConcentration((prev) => prev === 'no' ? null : 'no')}>No</button>
      </div>
    );
    if (key === 'ritual') return (
      <div className="filter-pills" style={{ display: 'flex', gap: '0.35rem' }}>
        <button style={pillStyle(filterRitual === 'yes')} onClick={() => setFilterRitual((prev) => prev === 'yes' ? null : 'yes')}>Yes</button>
        <button style={pillStyle(filterRitual === 'no')} onClick={() => setFilterRitual((prev) => prev === 'no' ? null : 'no')}>No</button>
      </div>
    );
    return null;
  };

  const isCompact = (key: string) => ['concentration', 'ritual', 'casting', 'levels'].includes(key);

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const availableFilters = FILTER_CATALOG.filter((f) => !activeFilters.includes(f.key));

  const allSelectedSpellsCombined = useMemo(() => {
    const list: { name: string; level: number; isCantrip: boolean }[] = [];
    cantrips.forEach((name) => list.push({ name, level: 0, isCantrip: true }));
    selectedSpells.forEach((s) => list.push({ name: s.name, level: s.level ?? 1, isCantrip: false }));
    list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    return list;
  }, [cantrips, selectedSpells]);

  const renderActiveSpellDetailCard = () => {
    if (!activeSpell) {
      return (
        <div className="spell-detail-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a0a5c0', textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '8px' }}>
          <p>Select a spell from the list to view its complete details, stats, and description.</p>
        </div>
      );
    }

    const isSelected = getSpellIsSelected(activeSpell);
    const isDisabled = getSpellDisabled(activeSpell);
    const tooltip = getSpellTooltip(activeSpell);
    const schoolClass = `school-${activeSpell.school?.toLowerCase() ?? 'evocation'}`;

    return (
      <div className={`spell-detail-card ${schoolClass}`}>
        <div className="spell-detail-header">
          <h4 className="spell-detail-name">{activeSpell.name}</h4>
          <div className="spell-detail-tags">
            <span className="spell-tag level-tag">{activeSpell.level === 0 ? 'Cantrip' : `Level ${activeSpell.level}`}</span>
            <span className="spell-tag school-tag">{activeSpell.school}</span>
            {activeSpell.concentration && <span className="spell-tag concentration-tag">Concentration</span>}
            {activeSpell.ritual && <span className="spell-tag ritual-tag">Ritual</span>}
          </div>
        </div>
        <div className="spell-detail-stats">
          <div className="stat-item"><strong>Casting Time</strong><span>{activeSpell.castingTime}</span></div>
          <div className="stat-item"><strong>Range</strong><span>{activeSpell.rangeLabel ?? `${activeSpell.range}m`}</span></div>
          <div className="stat-item"><strong>Duration</strong><span>{activeSpell.duration}</span></div>
          <div className="stat-item"><strong>Concentration</strong><span>{activeSpell.concentration ? 'Yes' : 'No'}</span></div>
          <div className="stat-item"><strong>Ritual</strong><span>{activeSpell.ritual ? 'Yes' : 'No'}</span></div>
          {activeSpell.damageTypes && activeSpell.damageTypes.length > 0 && (
            <div className="stat-item full-width">
              <strong>Damage Types <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>(Experimental)</span></strong>
              <span className="damage-types-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                {activeSpell.damageTypes.map((dt) => (
                  <span key={dt} className={`damage-type-pill ${dt.toLowerCase()}`}>{dt}</span>
                ))}
              </span>
            </div>
          )}
        </div>
        <div className="spell-detail-desc">
          <h5>Description</h5>
          <p>{activeSpell.desc}</p>
        </div>
        <div className="spell-detail-actions">
          <button
            className={`btn ${isSelected ? 'btn-danger' : 'btn-primary'} learn-spell-btn`}
            data-spell={activeSpell.name}
            disabled={isDisabled}
            title={tooltip}
            onClick={() => handleLearnSpell(activeSpell)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isSelected ? 'Forget Spell' : 'Learn Spell'}
          </button>
          {tooltip && <div className="btn-error-tooltip" style={{ color: '#eb5e55', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>{tooltip}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="spells-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">🔮 Spell Selection</h2>
          <p className="step-desc">Filter, inspect, and choose cantrips and spells.</p>
        </div>

        {/* Manual Override */}
        <div className="manual-override-control" style={{ marginBottom: '1.5rem' }}>
          <label className="checkbox-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={manualSpells} onChange={(e) => updateSpellcasting({ manualSpells: e.target.checked })} />
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
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: cantrips.length > 5 ? '#eb5e55' : '#fff' }}>{cantrips.length} / 5</div>
            </div>
            {[1,2,3,4,5,6,7,8,9].map((lvl) => (
              <div key={lvl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#a0a5c0' }}>Level {lvl} Slots</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>{slots[lvl] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters & Search section */}
        <div className="section-block spells-filters-section" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Filters & Search</h3>
          <div className="spells-filters-container">
            {/* Search + Sort always visible */}
            <div className="filter-container" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <input
                type="text"
                id="spell-search-input"
                className="input"
                placeholder="Search spells…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '0', fontSize: '0.9rem' }}
              />
              <select
                id="sort-spells-select"
                className="select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'level' | 'range')}
                style={{ flex: '0 0 auto', width: 'auto', fontSize: '0.85rem' }}
              >
                <option value="name">Sort: Name</option>
                <option value="level">Sort: Level</option>
                <option value="range">Sort: Range</option>
              </select>
            </div>

            {/* Add filter dropdown + active filter panels */}
            <div className="filters-section" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#a0a5c0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters</strong>
                <select
                  id="add-filter-select"
                  className="select"
                  style={{ fontSize: '0.8rem', width: 'auto' }}
                  value=""
                  onChange={(e) => { handleAddFilter(e.target.value); e.target.value = ''; }}
                >
                  <option value="">+ Add filter</option>
                  {availableFilters.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Active filter panels */}
              <div className="active-filters-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start' }}>
                {activeFilters.map((key) => {
                  const meta = FILTER_CATALOG.find((f) => f.key === key);
                  if (!meta) return null;
                  return (
                    <div
                      key={key}
                      className="filter-item"
                      style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', ...(isCompact(key) ? { flex: '0 1 auto' } : { flex: '1 1 100%' }) }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <strong style={{ fontSize: '0.75rem', color: '#a0a5c0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{meta.label}</strong>
                        <button
                          className="remove-filter-btn"
                          onClick={() => handleRemoveFilter(key)}
                          style={{ background: 'none', border: 'none', color: '#eb5e55', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, padding: '0 0.25rem' }}
                          title="Remove filter"
                        >✕</button>
                      </div>
                      {renderFilterBody(key)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected spells */}
        <div className="section-block" style={{ marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>Selected</h3>
          <div className="selected-spells-sidebar-container">
            <div className="selected-spells-box" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: '#a0a5c0', fontSize: '0.9rem' }}>
                All Selected Spells ({allSelectedSpellsCombined.length})
              </h4>
              {allSelectedSpellsCombined.length === 0 ? (
                <span style={{ color: '#606580', fontStyle: 'italic', fontSize: '0.85rem' }}>None</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {allSelectedSpellsCombined.map((s) => (
                    <div
                      key={s.name}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(108, 141, 255, 0.15)', border: '1px solid var(--border-active)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}
                    >
                      <span>{s.name} <small style={{ opacity: 0.7 }}>({s.isCantrip ? 'Cantrip' : `Lv.${s.level}`})</small></span>
                      <button
                        onClick={() => {
                          if (s.isCantrip) {
                            updateSpellcasting({ cantrips: cantrips.filter((c) => c !== s.name) });
                          } else {
                            updateSpellcasting({ spells: selectedSpells.filter((sp) => sp.name !== s.name) });
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#a0a5c0', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main 2-column layout (Desktop: split list & detail pane; Mobile: fluid grid + slide-up sheet) */}
        <div className="spells-main-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
          <div className="spells-list-column">
            <div className="section-block" style={{ marginTop: 0 }}>
              <h3 className="section-title" style={{ marginTop: 0 }}>Spells & Cantrips ({allSpells.length})</h3>
              <div className="spells-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {allSpells.length === 0 ? (
                  <div className="no-spells" style={{ color: '#a0a5c0', padding: '1rem', gridColumn: '1 / -1' }}>No spells match current filters.</div>
                ) : (
                  allSpells.map((spell) => {
                    const isSelected = getSpellIsSelected(spell);
                    const isDisabled = getSpellDisabled(spell);
                    const isActiveDetail = activeSpell?.name === spell.name;
                    const tooltip = getSpellTooltip(spell);

                    return (
                      <React.Fragment key={spell.name}>
                        <div
                          className={`spell-entry ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isActiveDetail ? 'active-detail' : ''}`}
                          title={tooltip}
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedSpellName(selectedSpellName === spell.name ? null : spell.name);
                            }
                          }}
                          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1, padding: '0.5rem 0.65rem' }}
                        >
                          <span className="spell-name" style={{ fontSize: '0.82rem', fontWeight: 500, wordBreak: 'break-word' }}>{spell.name}</span>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                            {spell.ritual && (
                              <span className="spell-tag-badge ritual" title="Ritual" style={{ fontSize: '0.65rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '1px 4px', borderRadius: '4px', fontWeight: 600, lineHeight: 1 }}>R</span>
                            )}
                            {spell.concentration && (
                              <span className="spell-tag-badge concentration" title="Concentration" style={{ fontSize: '0.65rem', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '1px 4px', borderRadius: '4px', fontWeight: 600, lineHeight: 1 }}>C</span>
                            )}
                            <span className="spell-level-tag">{spell.level === 0 ? 'Cantrip' : `Lv.${spell.level}`}</span>
                          </div>
                        </div>
                        {isActiveDetail && (
                          <div className="mobile-inline-spell-detail" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                            {renderActiveSpellDetailCard()}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Desktop Detail Pane */}
          <div className="spells-detail-column" style={{ position: 'sticky', top: '1.5rem' }}>
            <div className="section-block" style={{ marginTop: 0 }}>
              <h3 className="section-title" style={{ marginTop: 0 }}>Active Spell Details</h3>
              <div className="spell-detail-container">
                {renderActiveSpellDetailCard()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpellsSelector;
