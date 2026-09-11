import React, { useState } from 'react';
import { useCharacter } from '../contexts/CharacterContext';
import { SKILLS, SKILL_RANK_CUMULATIVE_COSTS } from '../data/constants';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import {
  getProficiencyBonus,
  getFinalCharacteristics,
  getCharacteristicModifier,
  getMaxSkillRank,
  computeFreeSkillPools,
} from '../logic/state';
import { getGlobalAPSummary } from '../utils/stateSanitizer';

const SkillsSelector: React.FC = () => {
  const { state, dispatch } = useCharacter();

  const [newAcademicName, setNewAcademicName] = useState('');
  const [newArtsName, setNewArtsName] = useState('');

  const currentLevel = state.identity?.level ?? 1;
  const profBonus = getProficiencyBonus(currentLevel);
  const finalStats = getFinalCharacteristics(state, RACES);
  const maxSkillRank = getMaxSkillRank(currentLevel);

  const { apLimit: totalAPLimit, apRemaining, sanitizedState: integratedState } = getGlobalAPSummary(state);

  const bgName = typeof integratedState.background === 'object' ? integratedState.background?.name : integratedState.background;
  const bgData = BACKGROUNDS.find((b) => b.name === bgName);
  const { bgFree, aoFree, builtInRanks, builtInAcademics, restrictSkills } = computeFreeSkillPools(integratedState, BACKGROUNDS, ORIGINS);

  const skillRanks = state.skills?.skillRanks ?? state.skillRanks ?? {};
  const academicsEntries = state.skills?.academicsEntries ?? state.academicsEntries ?? [];
  const artsCraftEntries = state.skills?.artsCraftEntries ?? state.artsCraftEntries ?? [];
  const manualSkills = state.skills?.manualSkills ?? state.manualSkills ?? false;

  // Compute spent points split by Background & AO free pools
  let restrictedSpent = 0;
  let unrestrictedSpent = 0;

  for (const sk in skillRanks) {
    const rank = skillRanks[sk] ?? 0;
    const builtIn = builtInRanks[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes(sk)) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  const isAcaRestricted = restrictSkills && (restrictSkills.includes('Academics') || restrictSkills.includes('Academic'));
  if (academicsEntries.length > 0) {
    for (const entry of academicsEntries) {
      const rank = entry.rank ?? 1;
      const builtIn = builtInAcademics[entry.name] ?? 0;
      const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
      if (isAcaRestricted || (restrictSkills && restrictSkills.includes(entry.name))) {
        restrictedSpent += cost;
      } else {
        unrestrictedSpent += cost;
      }
    }
  } else {
    const academicsRanks = state.skills?.academicsRanks ?? state.academicsRanks ?? {};
    for (const field in academicsRanks) {
      const rank = academicsRanks[field] ?? 0;
      const builtIn = builtInAcademics[field] ?? 0;
      const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
      if (isAcaRestricted || (restrictSkills && restrictSkills.includes(field))) {
        restrictedSpent += cost;
      } else {
        unrestrictedSpent += cost;
      }
    }
  }

  for (const entry of artsCraftEntries) {
    const rank = entry.rank ?? 1;
    const builtIn = builtInRanks['Arts & Craft'] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes('Arts & Craft')) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  // Calculate points spent: first consume Background Free, then AO Free, then AP
  let bgSpent = 0;
  let aoSpent = 0;

  if (restrictSkills) {
    // Restricted background points can only cover restricted skills
    bgSpent = Math.min(bgFree, restrictedSpent);
    const excessRestricted = restrictedSpent - bgSpent;
    const totalUnrestricted = excessRestricted + unrestrictedSpent;
    aoSpent = Math.min(aoFree, totalUnrestricted);
  } else {
    // Unrestricted background points cover any skills first, then AO free points
    const totalSpentPoints = restrictedSpent + unrestrictedSpent;
    bgSpent = Math.min(bgFree, totalSpentPoints);
    aoSpent = Math.min(aoFree, Math.max(0, totalSpentPoints - bgSpent));
  }

  const totalFreeSpent = bgSpent + aoSpent;
  const totalFreeAvailable = (integratedState.background ? bgFree : 0) + aoFree;
  const freeRemaining = Math.max(0, totalFreeAvailable - totalFreeSpent);

  const calculateRankBonus = (rank: number) => {
    if (rank === 1) return Math.ceil(profBonus / 2);
    if (rank === 2) return profBonus;
    if (rank === 3) return Math.ceil(profBonus * 1.5);
    if (rank === 4) return profBonus * 2;
    if (rank === 5) return Math.ceil(profBonus * 2.5);
    return 0;
  };

  const handleAdjustSkill = (skillName: string, delta: number) => {
    const currentRank = skillRanks[skillName] ?? 0;
    const nextRank = currentRank + delta;

    if (nextRank < 0 || nextRank > 5) return;

    dispatch({
      type: 'SET_SKILLS',
      payload: {
        skillRanks: {
          ...skillRanks,
          [skillName]: nextRank,
        },
      },
    });
  };

  const handleAddAcademic = () => {
    if (!newAcademicName.trim()) return;
    const name = newAcademicName.trim();
    if (academicsEntries.some((e) => e.name.toLowerCase() === name.toLowerCase())) return;

    const nextEntries = [...academicsEntries, { name, rank: 1 }];
    dispatch({
      type: 'SET_SKILLS',
      payload: { academicsEntries: nextEntries },
    });
    setNewAcademicName('');
  };

  const handleRemoveAcademic = (index: number) => {
    const nextEntries = academicsEntries.filter((_, idx) => idx !== index);
    dispatch({
      type: 'SET_SKILLS',
      payload: { academicsEntries: nextEntries },
    });
  };

  const handleAdjustAcademic = (index: number, delta: number) => {
    const entry = academicsEntries[index];
    if (!entry) return;
    const builtIn = builtInAcademics[entry.name] ?? 0;
    const minRank = index === 0 ? Math.max(1, builtIn) : 1;
    const currentRank = entry.rank ?? 1;
    const nextRank = currentRank + delta;

    if (nextRank < minRank || nextRank > 5) return;
    if (delta > 0 && nextRank > maxSkillRank && !manualSkills) return;

    const nextEntries = academicsEntries.map((e, idx) => {
      if (idx !== index) return e;
      return { ...e, rank: nextRank };
    });

    dispatch({
      type: 'SET_SKILLS',
      payload: { academicsEntries: nextEntries },
    });
  };

  const handleAddArts = () => {
    if (!newArtsName.trim()) return;
    const name = newArtsName.trim();
    if (artsCraftEntries.some((e) => e.name.toLowerCase() === name.toLowerCase())) return;

    const nextEntries = [...artsCraftEntries, { name, rank: 1 }];
    dispatch({
      type: 'SET_SKILLS',
      payload: { artsCraftEntries: nextEntries },
    });
    setNewArtsName('');
  };

  const handleRemoveArts = (index: number) => {
    const nextEntries = artsCraftEntries.filter((_, idx) => idx !== index);
    dispatch({
      type: 'SET_SKILLS',
      payload: { artsCraftEntries: nextEntries },
    });
  };

  const handleAdjustArts = (index: number, delta: number) => {
    const entry = artsCraftEntries[index];
    if (!entry) return;
    const builtIn = builtInRanks['Arts & Craft'] ?? 0;
    const minRank = index === 0 ? Math.max(1, builtIn) : 1;
    const currentRank = entry.rank ?? 1;
    const nextRank = currentRank + delta;

    if (nextRank < minRank || nextRank > 5) return;
    if (delta > 0 && nextRank > maxSkillRank && !manualSkills) return;

    const nextEntries = artsCraftEntries.map((e, idx) => {
      if (idx !== index) return e;
      return { ...e, rank: nextRank };
    });

    dispatch({
      type: 'SET_SKILLS',
      payload: { artsCraftEntries: nextEntries },
    });
  };

  return (
    <div className="skills-selector">
      <div className="step-container">
        <div className="step-header">
          <h2 className="step-title">🎯 Skills</h2>
          <p className="step-desc">Assign skill ranks using Accomplishment Points. Each rank multiplies your proficiency bonus.</p>
          <p className="form-hint" style={{ marginTop: '0.5rem', color: '#a0a5c0', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <strong>Frostmark Level Limits:</strong> You may possess skills with 1 to 3 ranks at level 1–3. At level 4 you may purchase skills of rank 4. Rank 5 can be purchased at 8th level if you possess a feat/ability allowing it.
          </p>
        </div>

        {/* Manual Override Control */}
        <div className="manual-override-control" style={{ marginBottom: '1.5rem' }}>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={manualSkills}
              onChange={(e) => dispatch({ type: 'SET_SKILLS', payload: { manualSkills: e.target.checked } })}
            />
            <strong>Manual Skills Override (Ignore AP limits/allow custom distribution)</strong>
          </label>
        </div>

        {/* Restriction Notice */}
        {restrictSkills && (
          <div
            className="restriction-notice"
            style={{
              background: 'rgba(230, 126, 34, 0.15)',
              color: '#e67e22',
              padding: '0.85rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              border: '1px solid rgba(230, 126, 34, 0.3)',
            }}
          >
            <strong>⚠️ Background Skill Restriction:</strong> The {bgFree} free skill points from your background (
            <strong>{bgData?.name ?? (typeof integratedState.background === 'object' ? integratedState.background?.name : integratedState.background)}</strong>) can only be spent on the following skills:{' '}
            <strong>{Array.isArray(restrictSkills) ? restrictSkills.join(', ') : String(restrictSkills || '')}</strong>.
          </div>
        )}

        {/* Double Point Buy Trackers (Background Free Points Used + AO Free Points Used) */}
        <div
          className={`point-buy-tracker ${apRemaining < 0 ? 'over-budget' : ''}`}
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '12px 16px',
            borderLeft: '4px solid var(--accent-color, #4a90e2)',
            background: 'rgba(74, 144, 226, 0.08)',
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span>Background Free Skill Points Used: </span>
            <strong style={{ fontSize: '1.1rem', marginLeft: '0.25rem', color: '#2ecc71' }}>{bgSpent}</strong>
            <span> / {bgFree}</span>
          </div>
          <div>
            <span>Ability Origin Free Skill Points Used: </span>
            <strong style={{ fontSize: '1.1rem', marginLeft: '0.25rem', color: '#2ecc71' }}>{aoSpent}</strong>
            <span> / {aoFree}</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>
            <span>Accomplishment Points Remaining: </span>
            <strong style={{ color: apRemaining < 0 ? '#e74c3c' : 'var(--accent-color)' }}>{apRemaining}</strong>
            <span> / {totalAPLimit} AP</span>
          </div>
        </div>

        {/* Standard Skills Grid */}
        <div className="section-block" style={{ marginBottom: '2rem' }}>
          <h3 className="section-title">Standard Skills</h3>
          <div className="skills-grid">
            {SKILLS.map((skill) => {
              const rank = skillRanks[skill.name] ?? (builtInRanks[skill.name] ?? 0);
              const builtInRank = builtInRanks[skill.name] ?? 0;

              const [stat1, stat2] = skill.stats;
              const mod1 = getCharacteristicModifier(finalStats[stat1 as keyof typeof finalStats] ?? 10);
              const mod2 = stat2 ? getCharacteristicModifier(finalStats[stat2 as keyof typeof finalStats] ?? 10) : null;

              const rankBonus = calculateRankBonus(rank);
              const total1 = mod1 + rankBonus;
              const total2 = mod2 !== null ? mod2 + rankBonus : null;

              const nextRank = rank + 1;
              const currentCost = SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0;
              const nextCost = SKILL_RANK_CUMULATIVE_COSTS[nextRank] ?? 0;
              const incrementalCost = nextCost - currentCost;

              const isRestrictedSkill = restrictSkills && restrictSkills.includes(skill.name);
              const costsAP = (!isRestrictedSkill && restrictSkills !== null) || freeRemaining <= 0;
              const canAfford = !costsAP || apRemaining >= incrementalCost;
              const isLevelRestricted = rank >= maxSkillRank && !manualSkills;
              const plusDisabled = rank >= 5 || isLevelRestricted || (!canAfford && !manualSkills);

              let plusTooltip = '';
              if (rank >= 5) {
                plusTooltip = 'Max rank 5 reached';
              } else if (isLevelRestricted) {
                if (maxSkillRank === 3) {
                  plusTooltip = 'Requires level 4 to advance to rank 4.';
                } else if (maxSkillRank === 4) {
                  plusTooltip = 'Requires level 8 and a relevant feat/ability to advance to rank 5.';
                }
              } else if (!canAfford && !manualSkills) {
                plusTooltip = `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`;
              }

              const allowedSkills = restrictSkills ?? bgData?.skills ?? null;
              const isAllowedSkill = allowedSkills && allowedSkills.includes(skill.name);

              return (
                <div key={skill.key} className="skill-row" id={`skill-row-${skill.key}`}>
                  <div className="skill-name">
                    {skill.name}
                    {builtInRank > 0 && (
                      <span
                        className="built-in-badge"
                        style={{
                          background: 'rgba(148,161,255,0.15)',
                          color: 'var(--accent-color)',
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          marginLeft: '0.5rem',
                        }}
                        title="Starting rank from background"
                      >
                        Starting: {builtInRank}
                      </span>
                    )}
                  </div>

                  <div className="skill-stats">
                    <span className="stat-tag">
                      {stat1.slice(0, 3)}: {total1 >= 0 ? '+' : ''}
                      {total1}
                    </span>
                    {total2 !== null && (
                      <span className="stat-tag">
                        {stat2!.slice(0, 3)}: {total2 >= 0 ? '+' : ''}
                        {total2}
                      </span>
                    )}
                    {allowedSkills && isAllowedSkill && (
                      <span
                        className="restricted-skill-badge"
                        style={{
                          background: 'rgba(46,204,113,0.15)',
                          color: '#2ecc71',
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.72rem',
                          borderRadius: '4px',
                          display: 'inline-block',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.2',
                          marginTop: '0.25rem',
                        }}
                        title="Background-free points can be used here"
                      >
                        Allowed for Background Free Points
                      </span>
                    )}
                  </div>

                  <div className="rank-controls" style={{ flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="rank-btn minus"
                        disabled={rank <= 0}
                        onClick={() => handleAdjustSkill(skill.name, -1)}
                      >
                        −
                      </button>
                      <div className="rank-pips">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className={`pip ${n <= rank ? 'filled' : ''}`} />
                        ))}
                      </div>
                      <button
                        className="rank-btn plus"
                        disabled={plusDisabled}
                        title={plusTooltip}
                        onClick={() => handleAdjustSkill(skill.name, 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="skill-cost" style={{ fontSize: '0.72rem', color: '#a0a5c0' }}>
                      Cost: {currentCost} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Academics & Arts/Craft Custom Fields */}
        <div className="section-block">
          <h3 className="section-title">Specialized Disciplines</h3>

          {/* Academics */}
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#a0a5c0' }}>Academics Fields</div>
          <div className="custom-academic-input-group" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="input"
              value={newAcademicName}
              onChange={(e) => setNewAcademicName(e.target.value)}
              placeholder="Enter academic field (e.g. History, Engineering)..."
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAcademic();
                }
              }}
            />
            <button className="btn btn-secondary" onClick={handleAddAcademic} style={{ whiteSpace: 'nowrap' }}>
              + Add Field
            </button>
          </div>

          <div className="academics-fields" style={{ marginBottom: '1.5rem' }}>
            {academicsEntries.map((entry, idx) => (
              <div key={`aca-${entry.name}`} className="academic-entry info-card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{entry.name}</span>
                  <button
                    className="btn-icon"
                    onClick={() => handleRemoveAcademic(idx)}
                    style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="rank-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="rank-btn minus" onClick={() => handleAdjustAcademic(idx, -1)}>
                    −
                  </button>
                  <div className="rank-pips">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`pip ${n <= (entry.rank ?? 1) ? 'filled' : ''}`} />
                    ))}
                  </div>
                  <button className="rank-btn plus" onClick={() => handleAdjustAcademic(idx, 1)}>
                    +
                  </button>
                </div>
                <div className="skill-cost" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Cost: {SKILL_RANK_CUMULATIVE_COSTS[entry.rank ?? 1] ?? 0} pts
                </div>
              </div>
            ))}
          </div>

          {/* Arts & Craft */}
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#a0a5c0' }}>Arts & Craft Disciplines</div>
          <div className="custom-arts-input-group" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="input"
              value={newArtsName}
              onChange={(e) => setNewArtsName(e.target.value)}
              placeholder="Enter craft/art discipline (e.g. Blacksmithing, Painting)..."
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddArts();
                }
              }}
            />
            <button className="btn btn-secondary" onClick={handleAddArts} style={{ whiteSpace: 'nowrap' }}>
              + Add Discipline
            </button>
          </div>

          <div className="arts-craft-fields">
            {artsCraftEntries.map((entry, idx) => (
              <div key={`arts-${entry.name}`} className="arts-entry info-card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>{entry.name}</span>
                  <button
                    className="btn-icon"
                    onClick={() => handleRemoveArts(idx)}
                    style={{ color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="rank-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="rank-btn minus" onClick={() => handleAdjustArts(idx, -1)}>
                    −
                  </button>
                  <div className="rank-pips">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className={`pip ${n <= (entry.rank ?? 1) ? 'filled' : ''}`} />
                    ))}
                  </div>
                  <button className="rank-btn plus" onClick={() => handleAdjustArts(idx, 1)}>
                    +
                  </button>
                </div>
                <div className="skill-cost" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Cost: {SKILL_RANK_CUMULATIVE_COSTS[entry.rank ?? 1] ?? 0} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsSelector;
