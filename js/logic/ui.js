import { CHARACTERISTICS, SKILLS, ACADEMICS_FIELDS, SKILL_RANK_CUMULATIVE_COSTS, SAVE_PROFICIENCY_COSTS } from '../data/constants.js';
import { RACES } from '../data/races.js';
import { BACKGROUNDS } from '../data/backgrounds.js';
import { ORIGINS } from '../data/origins.js';
import { SPELLS, CANTRIPS } from '../data/spells.js';
import { WEAPONS, ARMOR as ARMORS } from '../data/equipment.js';
import {
  getInitialState,
  getAbilityPointLimit,
  getBaseAccomplishmentPoints,
  getTotalAccomplishmentPointsLimit,
  getAttributePointCost,
  calculateSpentAbilityPoints,
  getProficiencyBonus,
  getFinalCharacteristics,
  getCharacteristicModifier,
  calculateSpentAccomplishmentPoints,
  exportCharacterJSON,
  importCharacterJSON,
  calculatePotentialGained,
  calculateHPBonus,
  getMaxSkillRank
} from './state.js';
import { exportToPDF, downloadPDF, getSpellSlotsForLevel } from './pdf.js';
import { levelUp } from './levelUp.js';

// ── Wizard Step Definitions ─────────────────────────────────────────────────
const STEPS = [
  { id: 'identity',       title: 'Identity',            icon: '🎭' },
  { id: 'race',           title: 'Race & Subrace',       icon: '🌍' },
  { id: 'background',     title: 'Background',           icon: '📖' },
  { id: 'abilities',      title: 'Ability Scores',       icon: '💪' },
  { id: 'origins',        title: 'Ability Origins',      icon: '✨' },
  { id: 'skills',         title: 'Skills',               icon: '🎯' },
  { id: 'proficiencies',  title: 'Proficiencies & AP',   icon: '🛡️' },
  { id: 'spellslots',     title: 'Spell Slots',          icon: '⚡' },
  { id: 'spellcasting',   title: 'Spell Selection',      icon: '🔮' },
  { id: 'equipment',      title: 'Equipment',            icon: '⚔️' },
  { id: 'finishing',      title: 'Finishing Touches',    icon: '✅' }
];

let state = getInitialState();
let currentStep = 0;

// ── Bootstrap ────────────────────────────────────────────────────────────────

export function initUI() {
  renderShell();
  renderStep(currentStep);
}

function renderShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="${import.meta.env.BASE_URL}frostmark-logo.png" alt="Frostmark" class="sidebar-logo">
        <p class="sidebar-subtitle">Character Creator</p>
      </div>
      <nav class="step-nav" id="step-nav"></nav>
      <div class="sidebar-actions">
        <button class="btn btn-ghost" id="btn-import">📂 Import JSON</button>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    </aside>
    <main class="main-content">
      <div class="step-container" id="step-container"></div>
      <div class="step-footer">
        <button class="btn btn-secondary" id="btn-prev" disabled>← Back</button>
        <div class="step-counter" id="step-counter"></div>
        <button class="btn btn-primary" id="btn-next">Next →</button>
      </div>
    </main>
    <aside class="character-summary" id="character-summary">
      <h2 class="summary-title">Character Summary</h2>
      <div id="summary-content"></div>
      <div class="summary-actions">
        <button class="btn btn-accent" id="btn-export-json">💾 Save JSON</button>
        <button class="btn btn-accent" id="btn-export-pdf">📄 Export PDF</button>
      </div>
    </aside>
  `;

  // Body-level tooltip to escape sidebar overflow clipping
  const tip = document.createElement('div');
  tip.id = 'nav-lock-tip';
  tip.className = 'nav-lock-tip';
  document.body.appendChild(tip);

  renderStepNav();
  bindGlobalEvents();
  updateSummary();
}


// Returns null if the step is freely accessible, or a string reason if it is locked.
// Only lock steps where the UI would be completely broken without prior data.
function getStepLockReason(stepIndex) {
  const stepId = STEPS[stepIndex].id;
  if ((stepId === 'spellslots' || stepId === 'spellcasting') && !state.primaryAO) {
    return 'Choose a Primary Ability Origin first to unlock spellcasting options';
  }
  return null;
}

function renderStepNav() {
  const nav = document.getElementById('step-nav');
  nav.innerHTML = STEPS.map((step, i) => {
    const lockReason = getStepLockReason(i);
    return `
      <button
        class="step-nav-item ${i === currentStep ? 'active' : ''} ${lockReason ? 'locked' : ''}"
        id="nav-${step.id}"
        data-step="${i}"
        data-lock-reason="${lockReason ?? ''}"
        ${lockReason ? 'aria-disabled="true"' : ''}
      >
        <span class="step-icon">${step.icon}</span>
        <span class="step-label">${step.title}</span>
        ${lockReason ? '<span class="step-lock-icon">🔒</span>' : ''}
      </button>
    `;
  }).join('');

  const tip = document.getElementById('nav-lock-tip');

  nav.querySelectorAll('.step-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) return;
      navigateTo(parseInt(btn.dataset.step, 10));
    });

    btn.addEventListener('mouseenter', () => {
      const reason = btn.dataset.lockReason;
      if (!reason || !tip) return;
      const rect = btn.getBoundingClientRect();
      tip.textContent = reason;
      tip.style.top = `${rect.top + rect.height / 2}px`;
      tip.style.left = `${rect.right + 10}px`;
      tip.classList.add('visible');
    });

    btn.addEventListener('mouseleave', () => {
      if (tip) tip.classList.remove('visible');
    });
  });
}

function bindGlobalEvents() {
  document.getElementById('btn-prev').addEventListener('click', () => navigateTo(currentStep - 1));
  document.getElementById('btn-next').addEventListener('click', () => navigateTo(currentStep + 1));
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', handleImport);
  document.getElementById('btn-export-json').addEventListener('click', handleExportJSON);
  document.getElementById('btn-export-pdf').addEventListener('click', handleExportPDF);
}

function navigateTo(targetStep) {
  if (targetStep < 0 || targetStep >= STEPS.length) return;
  if (getStepLockReason(targetStep)) return;
  currentStep = targetStep;
  renderStep(currentStep);
  renderStepNav();
  updateFooter();
  updateSummary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function updateFooter() {
  document.getElementById('btn-prev').disabled = currentStep === 0;
  document.getElementById('btn-next').textContent = currentStep === STEPS.length - 1 ? 'Finish ✓' : 'Next →';
  document.getElementById('step-counter').textContent = `Step ${currentStep + 1} of ${STEPS.length}`;
}

// ── Step Renderers ────────────────────────────────────────────────────────────

function renderStep(index) {
  const container = document.getElementById('step-container');
  container.innerHTML = '';
  const stepId = STEPS[index].id;
  const renderers = {
    identity:      renderIdentityStep,
    race:          renderRaceStep,
    background:    renderBackgroundStep,
    abilities:     renderAbilitiesStep,
    origins:       renderOriginsStep,
    skills:        renderSkillsStep,
    proficiencies: renderProficienciesStep,
    spellslots:    renderSpellslotsStep,
    spellcasting:  renderSpellcastingStep,
    equipment:     renderEquipmentStep,
    finishing:     renderFinishingStep
  };
  renderers[stepId]?.(container);
  updateFooter();
}

// ── Step: Identity ────────────────────────────────────────────────────────────

function renderIdentityStep(container) {
  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🎭 Identity</h2>
      <p class="step-desc">Give your character a name and set the campaign context.</p>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group">
        <label for="char-name">Character Name</label>
        <input type="text" id="char-name" class="input" placeholder="Enter character name..." value="${state.characterName}">
      </div>
      <div class="form-group">
        <label for="player-name">Player Name</label>
        <input type="text" id="player-name" class="input" placeholder="Enter player name..." value="${state.playerName}">
      </div>
      <div class="form-group">
        <label for="power-level">Campaign Power Level</label>
        <select id="power-level" class="select">
          <option value="Mundane" ${state.campaignPowerLevel === 'Mundane' ? 'selected' : ''}>Mundane (20 AP pts, 14 Acc pts)</option>
          <option value="Heroic" ${state.campaignPowerLevel === 'Heroic' ? 'selected' : ''}>Heroic – Default (25 AP pts, 16 Acc pts)</option>
          <option value="Champion" ${state.campaignPowerLevel === 'Champion' ? 'selected' : ''}>Champion (30 AP pts, 18 Acc pts)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="char-level">Starting Level</label>
        <input type="number" id="char-level" class="input" min="1" max="20" value="${state.level}">
      </div>
    </div>
    <div class="section-divider">Appearance (Optional)</div>
    <div class="form-grid form-grid-3">
      <div class="form-group">
        <label for="app-age">Age</label>
        <input type="text" id="app-age" class="input" placeholder="e.g. 25" value="${state.appearance?.age ?? ''}">
      </div>
      <div class="form-group">
        <label for="app-height">Height</label>
        <input type="text" id="app-height" class="input" placeholder="e.g. 5'10&quot;" value="${state.appearance?.height ?? ''}">
      </div>
      <div class="form-group">
        <label for="app-weight">Weight</label>
        <input type="text" id="app-weight" class="input" placeholder="e.g. 170 lbs" value="${state.appearance?.weight ?? ''}">
      </div>
    </div>
  `;

  bindInput('char-name', v => { state.characterName = v; updateSummary(); });
  bindInput('player-name', v => { state.playerName = v; updateSummary(); });
  bindSelect('power-level', v => { state.campaignPowerLevel = v; updateSummary(); });
  bindNumber('char-level', v => {
    state.level = v;
    if (!state.manualSkills) {
      // Clamping ranks on level reduction avoids retaining ranks that exceed the new level's caps.
      const maxRank = getMaxSkillRank(v);
      let adjusted = false;
      const bg = BACKGROUNDS.find(b => b.name === state.background);
      const builtInRanks = bg?.builtInRanks ?? {};
      const builtInAcademics = bg?.builtInAcademics ?? {};

      for (const sk in state.skillRanks) {
        const builtIn = builtInRanks[sk] ?? 0;
        const currentRank = state.skillRanks[sk] ?? 0;
        if (currentRank > maxRank) {
          state.skillRanks[sk] = Math.max(builtIn, maxRank);
          adjusted = true;
        }
      }
      for (const ac in state.academicsRanks) {
        const builtIn = builtInAcademics[ac] ?? 0;
        const currentRank = state.academicsRanks[ac] ?? 0;
        if (currentRank > maxRank) {
          state.academicsRanks[ac] = Math.max(builtIn, maxRank);
          adjusted = true;
        }
      }
      if (adjusted) {
        showToast('Some skill/academic ranks were clamped due to level reduction.', 'info');
      }
    }
    updateSummary();
  });
  bindInput('app-age', v => { state.appearance = { ...state.appearance, age: v }; });
  bindInput('app-height', v => { state.appearance = { ...state.appearance, height: v }; });
  bindInput('app-weight', v => { state.appearance = { ...state.appearance, weight: v }; });
}

// ── Step: Race ────────────────────────────────────────────────────────────────

function renderRaceStep(container) {
  const raceNames = ['Custom / Enter Manually...', ...RACES.map(r => r.name)];
  const selectedRace = RACES.find(r => r.name === state.race);

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🌍 Race & Subrace</h2>
      <p class="step-desc">Select your character's race. Each grants unique stat bonuses and traits.</p>
    </div>
    <div class="card-selector" id="race-selector">
      ${raceNames.map(name => buildRaceCard(name)).join('')}
    </div>
    <div id="race-details" class="info-card" style="display: ${state.race && state.race !== 'Custom' ? 'block' : 'none'}">
      ${selectedRace ? buildRaceDetails(selectedRace) : ''}
    </div>
    <div id="subrace-section" class="section-block" style="display: ${selectedRace?.subraces ? 'block' : 'none'}"></div>
    <div id="custom-race-section" class="section-block" style="display: ${state.race === 'Custom' ? 'block' : 'none'}">
      ${buildCustomRaceForm()}
    </div>
    
    <div class="section-block manual-races-block" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
      <h3 class="section-title">Manual Stat Allocation Override</h3>
      <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="manual-races-check" ${state.manualRaces ? 'checked' : ''}>
        <strong>Customize stat bonuses manually (+2 to one stat, +1 to another)</strong>
      </label>
      <div id="manual-races-selectors" style="display: ${state.manualRaces ? 'flex' : 'none'}; gap: 1.5rem; margin-top: 1rem;">
        <div class="form-group" style="flex: 1;">
          <label style="display: block; margin-bottom: 0.25rem;">+2 Attribute</label>
          <select id="manual-race-plus2" class="select" style="width: 100%;">
            <option value="">-- Choose --</option>
            ${CHARACTERISTICS.map(c => `<option value="${c.key}" ${state.racialStatOverrides?.[c.key] === 2 ? 'selected' : ''}>${c.key}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label style="display: block; margin-bottom: 0.25rem;">+1 Attribute</label>
          <select id="manual-race-plus1" class="select" style="width: 100%;">
            <option value="">-- Choose --</option>
            ${CHARACTERISTICS.map(c => `<option value="${c.key}" ${state.racialStatOverrides?.[c.key] === 1 ? 'selected' : ''}>${c.key}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('.race-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      state.race = name === 'Custom / Enter Manually...' ? 'Custom' : name;
      state.subrace = '';
      state.woodElfChoice = '';
      state.halfElfChoice1 = '';
      state.halfElfChoice2 = '';
      renderRaceStep(container);
      updateSummary();
    });
  });

  container.querySelector('#manual-races-check')?.addEventListener('change', e => {
    state.manualRaces = e.target.checked;
    renderRaceStep(container);
    updateSummary();
  });

  const handleOverrideChange = () => {
    const p2 = container.querySelector('#manual-race-plus2')?.value || '';
    const p1 = container.querySelector('#manual-race-plus1')?.value || '';
    
    if (p2 && p2 === p1) {
      showToast('Cannot select the same attribute for both +2 and +1 bonuses.', 'error');
      // Reset the duplicate choice in the DOM and logic
      container.querySelector('#manual-race-plus1').value = '';
      return;
    }

    const overrides = {
      Brawn: 0, Dexterity: 0, Vitality: 0, Intelligence: 0, Cunning: 0, Resolve: 0, Presence: 0, Manipulation: 0, Composure: 0
    };
    if (p2) overrides[p2] = 2;
    if (p1) overrides[p1] = 1;
    state.racialStatOverrides = overrides;
    updateSummary();
  };

  container.querySelector('#manual-race-plus2')?.addEventListener('change', handleOverrideChange);
  container.querySelector('#manual-race-plus1')?.addEventListener('change', handleOverrideChange);

  if (selectedRace?.subraces) {
    renderSubraceSection(container, selectedRace);
  }

  if (state.race === 'Custom') {
    bindCustomRaceEvents(container);
  }
}

function buildRaceCard(name) {
  const isCustom = name === 'Custom / Enter Manually...';
  const raceName = isCustom ? 'Custom' : name;
  const isSelected = state.race === raceName;
  const race = RACES.find(r => r.name === name);
  const bonuses = race ? buildStatBonusSummary(race.stats) : 'Enter your own';

  return `
    <div class="race-card card-option ${isSelected ? 'selected' : ''}" data-name="${name}" id="race-card-${raceName.replace(/\s/g,'-')}">
      <div class="card-option-name">${name}</div>
      <div class="card-option-sub">${bonuses}</div>
    </div>
  `;
}

function buildStatBonusSummary(stats) {
  if (!stats) return '';
  return Object.entries(stats)
    .filter(([k]) => k !== 'choice' && k !== 'flexiblePoints')
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`)
    .join(', ') || 'No stat bonus';
}

function buildRaceDetails(race) {
  const traitList = race.traits?.map(t => `<li><strong>${t.name}</strong>: ${t.desc}</li>`).join('') ?? '';
  return `
    <h3>${race.name} Traits</h3>
    <p>Speed: ${race.speed} squares | Size: ${race.size} | Languages: ${race.languages?.join(', ') ?? 'Common'}</p>
    <ul class="trait-list">${traitList}</ul>
  `;
}

function buildSelectedSubraceDetails(race) {
  const subrace = race.subraces?.find(sub => sub.name === state.subrace);
  if (!subrace) return '';

  const traitList = subrace.traits?.map(t => `<li><strong>${t.name}</strong>: ${t.desc}</li>`).join('') ?? '';
  return `
    <div class="info-card subrace-details-card">
      <h3>${subrace.name} Features</h3>
      <p>Bonus: ${buildStatBonusSummary(subrace.stats)}</p>
      <ul class="trait-list">${traitList || '<li>No additional features listed.</li>'}</ul>
    </div>
  `;
}

function renderSubraceSection(container, race) {
  const section = container.querySelector('#subrace-section');
  if (!section) return;
  section.style.display = 'block';
  section.innerHTML = `
    <h3 class="section-title">Choose Subrace</h3>
    <div class="card-selector subrace-selector">
      ${race.subraces.map(sub => `
        <div class="race-card card-option subrace-card ${state.subrace === sub.name ? 'selected' : ''}" data-subrace="${sub.name}" id="subrace-card-${sub.name.replace(/\s/g,'-')}">
          <div class="card-option-name">${sub.name}</div>
          <div class="card-option-sub">${buildStatBonusSummary(sub.stats)}</div>
        </div>
      `).join('')}
    </div>
    ${buildSubraceChoiceInput(race)}
    ${buildSelectedSubraceDetails(race)}
  `;

  section.querySelectorAll('.subrace-card').forEach(card => {
    card.addEventListener('click', () => {
      state.subrace = card.dataset.subrace;
      renderRaceStep(container);
      updateSummary();
    });
  });

  if (state.race === 'Elf' && state.subrace === 'Wood') {
    const sel = section.querySelector('#wood-elf-choice');
    if (sel) {
      sel.addEventListener('change', e => { state.woodElfChoice = e.target.value; updateSummary(); });
    }
  }

  if (state.race === 'Half-elf') {
    bindHalfElfChoices(section);
  }
}

function buildSubraceChoiceInput(race) {
  if (race.name === 'Elf' && state.subrace === 'Wood') {
    return `<div class="form-group">
      <label>Bonus +1 to:</label>
      <select id="wood-elf-choice" class="select">
        <option value="">– choose –</option>
        <option value="Cunning" ${state.woodElfChoice === 'Cunning' ? 'selected' : ''}>Cunning</option>
        <option value="Composure" ${state.woodElfChoice === 'Composure' ? 'selected' : ''}>Composure</option>
      </select>
    </div>`;
  }
  if (race.name === 'Half-elf') {
    const nonPresence = CHARACTERISTICS.filter(c => c.key !== 'Presence').map(c => c.key);
    const opts = nonPresence.map(k => `<option value="${k}">${k}</option>`).join('');
    return `<div class="form-grid form-grid-2">
      <div class="form-group">
        <label>+1 to stat 1</label>
        <select id="half-elf-choice1" class="select">
          <option value="">– choose –</option>${opts}
        </select>
      </div>
      <div class="form-group">
        <label>+1 to stat 2</label>
        <select id="half-elf-choice2" class="select">
          <option value="">– choose –</option>${opts}
        </select>
      </div>
    </div>`;
  }
  return '';
}

function bindHalfElfChoices(section) {
  const s1 = section.querySelector('#half-elf-choice1');
  const s2 = section.querySelector('#half-elf-choice2');
  if (s1) { s1.value = state.halfElfChoice1; s1.addEventListener('change', e => { state.halfElfChoice1 = e.target.value; updateSummary(); }); }
  if (s2) { s2.value = state.halfElfChoice2; s2.addEventListener('change', e => { state.halfElfChoice2 = e.target.value; updateSummary(); }); }
}

function buildCustomRaceForm() {
  return `
    <h3 class="section-title">Custom Race</h3>
    <div class="form-group">
      <label>Race Name</label>
      <input type="text" id="custom-race-name" class="input" value="${state.customRace?.name ?? ''}" placeholder="Enter race name...">
    </div>
    <p class="form-hint">Assign stat bonuses (e.g. Brawn +1, Vitality +2)</p>
    <div class="form-grid form-grid-3">
      ${CHARACTERISTICS.map(c => `
        <div class="form-group">
          <label>${c.key}</label>
          <input type="number" id="custom-stat-${c.key}" class="input" min="-3" max="5"
                 value="${state.customRace?.stats?.[c.key] ?? 0}">
        </div>
      `).join('')}
    </div>
    <div class="form-group">
      <label>Speed (squares)</label>
      <input type="number" id="custom-race-speed" class="input" min="1" max="20" value="${state.customRace?.speed ?? 6}">
    </div>
    <div class="form-group">
      <label>Languages (comma separated)</label>
      <input type="text" id="custom-race-langs" class="input" value="${state.customRace?.languages?.join(', ') ?? ''}">
    </div>
    <div class="form-group">
      <label>Racial Traits (one per line)</label>
      <textarea id="custom-race-traits" class="textarea" rows="4">${(state.customRace?.traits ?? []).map(t => t.name + ': ' + t.desc).join('\n')}</textarea>
    </div>
  `;
}

function bindCustomRaceEvents(container) {
  const section = container.querySelector('#custom-race-section');
  if (!section) return;

  section.querySelector('#custom-race-name')?.addEventListener('input', e => {
    state.customRace = { ...state.customRace, name: e.target.value };
    updateSummary();
  });

  CHARACTERISTICS.forEach(c => {
    section.querySelector(`#custom-stat-${c.key}`)?.addEventListener('input', e => {
      state.customRace = { ...state.customRace, stats: { ...state.customRace.stats, [c.key]: parseInt(e.target.value, 10) || 0 } };
      updateSummary();
    });
  });

  section.querySelector('#custom-race-speed')?.addEventListener('input', e => {
    state.customRace = { ...state.customRace, speed: parseInt(e.target.value, 10) || 6 };
  });

  section.querySelector('#custom-race-langs')?.addEventListener('input', e => {
    state.customRace = { ...state.customRace, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
  });

  section.querySelector('#custom-race-traits')?.addEventListener('input', e => {
    const traits = e.target.value.split('\n').filter(Boolean).map(line => {
      const [name, ...rest] = line.split(':');
      return { name: name.trim(), desc: rest.join(':').trim() };
    });
    state.customRace = { ...state.customRace, traits };
  });
}

// ── Step: Background ──────────────────────────────────────────────────────────

function renderBackgroundStep(container) {
  const bgNames = ['Custom / Enter Manually...', ...BACKGROUNDS.map(b => b.name)];

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">📖 Background</h2>
      <p class="step-desc">Your background grants starting equipment, gold, and 4 free skill points.</p>
    </div>
    <div class="card-selector" id="bg-selector">
      ${bgNames.map(name => buildBGCard(name)).join('')}
    </div>
    <div id="custom-bg-section" class="section-block" style="display: ${state.background === 'Custom' ? 'block' : 'none'}">
      ${buildCustomBGForm()}
    </div>
    <div id="bg-details" class="info-card" style="display: ${state.background && state.background !== 'Custom' ? 'block' : 'none'}">
      ${buildBGDetails()}
    </div>
  `;

  container.querySelectorAll('.bg-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      state.background = name === 'Custom / Enter Manually...' ? 'Custom' : name;
      if (state.background !== 'Custom') {
        const bg = BACKGROUNDS.find(b => b.name === state.background);
        if (bg) state.goldAmount = bg.gold;
      }
      renderBackgroundStep(container);
      updateSummary();
    });
  });

  if (state.background === 'Custom') bindCustomBGEvents(container);
}

function buildBGCard(name) {
  const isCustom = name === 'Custom / Enter Manually...';
  const bgName = isCustom ? 'Custom' : name;
  const isSelected = state.background === bgName;
  const bg = BACKGROUNDS.find(b => b.name === name);

  return `
    <div class="bg-card card-option ${isSelected ? 'selected' : ''}" data-name="${name}" id="bg-card-${bgName.replace(/\s/g, '-')}">
      <div class="card-option-name">${name}</div>
      <div class="card-option-sub">${bg ? `${bg.gold}gp starting` : 'Enter custom details'}</div>
    </div>
  `;
}

function buildBGDetails() {
  const bg = BACKGROUNDS.find(b => b.name === state.background);
  if (!bg) return '';
  const bgFree = bg.freeSkillPoints ?? 4;
  const restrictDesc = bg.skills?.length 
    ? `Restricted to: ${bg.skills.join(', ')}` 
    : "Player's choice (any skill)";
  return `
    <h3>${bg.name}</h3>
    <p>${bg.desc ?? ''}</p>
    <p><strong>Starting Gold:</strong> ${bg.gold}gp | <strong>Equipment:</strong> ${bg.equipment ?? 'Varies'}</p>
    <p><strong>Free Skill Points:</strong> ${bgFree} (${restrictDesc})</p>
    <p><em>${bg.trait ?? ''}</em></p>
  `;
}

function buildCustomBGForm() {
  return `
    <h3 class="section-title">Custom Background</h3>
    <div class="form-grid form-grid-2">
      <div class="form-group">
        <label>Background Name</label>
        <input type="text" id="custom-bg-name" class="input" value="${state.customBackground?.name ?? ''}">
      </div>
      <div class="form-group">
        <label>Starting Gold (gp)</label>
        <input type="number" id="custom-bg-gold" class="input" min="0" value="${state.customBackground?.gold ?? 10}">
      </div>
    </div>
    <div class="form-group">
      <label>Starting Equipment</label>
      <input type="text" id="custom-bg-equipment" class="input" value="${state.customBackground?.equipment ?? ''}">
    </div>
    <div class="form-group">
      <label>Personality Trait</label>
      <textarea id="custom-bg-trait" class="textarea" rows="3">${state.customBackground?.trait ?? ''}</textarea>
    </div>
  `;
}

function bindCustomBGEvents(container) {
  const section = container.querySelector('#custom-bg-section');
  if (!section) return;
  section.querySelector('#custom-bg-name')?.addEventListener('input', e => {
    state.customBackground = { ...state.customBackground, name: e.target.value };
  });
  section.querySelector('#custom-bg-gold')?.addEventListener('input', e => {
    const gold = parseInt(e.target.value, 10) || 0;
    state.customBackground = { ...state.customBackground, gold };
    state.goldAmount = gold;
    updateSummary();
  });
  section.querySelector('#custom-bg-equipment')?.addEventListener('input', e => {
    state.customBackground = { ...state.customBackground, equipment: e.target.value };
  });
  section.querySelector('#custom-bg-trait')?.addEventListener('input', e => {
    state.customBackground = { ...state.customBackground, trait: e.target.value };
  });
}

// ── Step: Ability Scores ──────────────────────────────────────────────────────

function renderAbilitiesStep(container) {
  const limit = getAbilityPointLimit(state.campaignPowerLevel);
  const spent = calculateSpentAbilityPoints(state);
  const remaining = limit - spent;

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">💪 Ability Scores</h2>
      <p class="step-desc">Use Point Buy to distribute ${limit} points across your 9 characteristics.</p>
    </div>
    <div class="point-buy-tracker ${remaining < 0 ? 'over-budget' : ''}">
      <span>Points Remaining:</span>
      <strong id="points-remaining">${remaining}</strong>
      <span>/ ${limit}</span>
    </div>
    <div class="ability-grid" id="ability-grid">
      ${CHARACTERISTICS.map(c => buildAbilityRow(c, state.baseCharacteristics[c.key], getFinalCharacteristics(state, RACES))).join('')}
    </div>
    <div class="info-card race-bonuses-note">
      <p>🏷️ Values shown include racial bonuses. Base values can range from 6–17 before racial modifiers.</p>
    </div>
  `;

  CHARACTERISTICS.forEach(c => {
    container.querySelector(`#ability-minus-${c.key}`)?.addEventListener('click', () => adjustAbility(c.key, -1, container));
    container.querySelector(`#ability-plus-${c.key}`)?.addEventListener('click', () => adjustAbility(c.key, 1, container));
  });
}

function buildAbilityRow(characteristic, baseScore, finalStats) {
  const { key, short, type, desc } = characteristic;
  const finalScore = finalStats[key] ?? baseScore;
  const mod = getCharacteristicModifier(finalScore);
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  const cost = getAttributePointCost(baseScore);

  return `
    <div class="ability-row" id="ability-row-${key}">
      <div class="ability-info">
        <span class="ability-name">${key}</span>
        <span class="ability-type type-${type.toLowerCase()}">${type}</span>
      </div>
      <div class="ability-controls">
        <button class="ability-btn minus" id="ability-minus-${key}" ${baseScore <= 6 ? 'disabled' : ''}>−</button>
        <div class="ability-score-display">
          <div class="ability-base">${baseScore}</div>
          <div class="ability-final">${finalScore} <span class="ability-mod">(${modStr})</span></div>
        </div>
        <button class="ability-btn plus" id="ability-plus-${key}" ${baseScore >= 17 ? 'disabled' : ''}>+</button>
      </div>
      <div class="ability-cost">Cost: ${cost}</div>
    </div>
  `;
}

function adjustAbility(key, delta, container) {
  const current = state.baseCharacteristics[key];
  const next = current + delta;
  if (next < 6 || next > 17) return;

  const limit = getAbilityPointLimit(state.campaignPowerLevel);
  const spentBefore = calculateSpentAbilityPoints(state);
  const newScore = next;
  const costDelta = getAttributePointCost(newScore) - getAttributePointCost(current);
  if (spentBefore + costDelta > limit) {
    showToast('Not enough ability points remaining!', 'error');
    return;
  }

  state.baseCharacteristics = { ...state.baseCharacteristics, [key]: next };
  renderAbilitiesStep(container);
  updateSummary();
}

// ── Step: Ability Origins ─────────────────────────────────────────────────────

function renderOriginsStep(container) {
  const originNames = ['Custom / Enter Manually...', ...ORIGINS.map(o => o.name)];

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">✨ Ability Origins</h2>
      <p class="step-desc">Choose a Primary and optionally a Secondary Ability Origin. Your primary is locked once chosen.</p>
    </div>

    <div class="section-block">
      <h3 class="section-title">Primary Ability Origin</h3>
      <div class="card-selector" id="primary-ao-selector">
        ${originNames.map(name => buildAOCard(name, 'primary')).join('')}
      </div>
      <div id="custom-primary-ao" class="section-block" style="display:${state.primaryAO === 'Custom' ? 'block' : 'none'}">
        ${buildCustomAOForm('primary')}
      </div>
    </div>

    <div class="section-block" id="secondary-ao-section" style="display:${state.primaryAO ? 'block' : 'none'}">
      <h3 class="section-title">Secondary Ability Origin <span class="optional-tag">Optional</span></h3>
      <p class="form-hint">Secondary Ability Origin cannot be the same as primary. You use the lower HD of the two.</p>
      <div class="card-selector" id="secondary-ao-selector">
        ${buildSecondaryAOCards()}
      </div>
      <div id="custom-secondary-ao" class="section-block" style="display:${state.secondaryAO === 'Custom' ? 'block' : 'none'}">
        ${buildCustomAOForm('secondary')}
      </div>
    </div>
  `;

  container.querySelectorAll('.ao-card[data-slot="primary"]').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      state.primaryAO = name === 'Custom / Enter Manually...' ? 'Custom' : name;
      if (state.secondaryAO === state.primaryAO && state.primaryAO !== 'Custom') state.secondaryAO = '';
      syncPrimaryAOHD();
      renderOriginsStep(container);
      renderStepNav();
      updateSummary();
    });
  });

  container.querySelectorAll('.ao-card[data-slot="secondary"]').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      state.secondaryAO = name === 'Custom / Enter Manually...' ? 'Custom' : name;
      renderOriginsStep(container);
      updateSummary();
    });
  });

  if (state.primaryAO === 'Custom') bindCustomAOForm(container, 'primary');
  if (state.secondaryAO === 'Custom') bindCustomAOForm(container, 'secondary');
}

function syncPrimaryAOHD() {
  const origin = ORIGINS.find(o => o.name === state.primaryAO);
  state.primaryAOHD = origin?.hd ?? state.customPrimaryAO?.hd ?? 8;
  state.primaryAOSpellcasting = origin?.spellcasting ?? state.customPrimaryAO?.spellcasting ?? 'Minor';
}

function buildAOCard(name, slot) {
  const isCustom = name === 'Custom / Enter Manually...';
  const aoName = isCustom ? 'Custom' : name;
  const isSelected = slot === 'primary' ? state.primaryAO === aoName : state.secondaryAO === aoName;
  const origin = ORIGINS.find(o => o.name === name);

  return `
    <div class="ao-card card-option ${isSelected ? 'selected' : ''}" data-name="${name}" data-slot="${slot}" id="ao-${slot}-${aoName.replace(/\s/g,'-')}">
      <div class="card-option-name">${name}</div>
      <div class="card-option-sub">${origin ? `d${origin.hd} HD · ${origin.spellcasting} casting` : 'Enter custom details'}</div>
    </div>
  `;
}

function buildSecondaryAOCards() {
  const names = ['None', 'Custom / Enter Manually...', ...ORIGINS.map(o => o.name).filter(n => n !== state.primaryAO)];
  return names.map(name => {
    if (name === 'None') {
      const isSelected = !state.secondaryAO;
      return `<div class="ao-card card-option ${isSelected ? 'selected' : ''}" data-name="" data-slot="secondary" id="ao-secondary-None">
        <div class="card-option-name">None</div>
        <div class="card-option-sub">Single Origin character</div>
      </div>`;
    }
    return buildAOCard(name, 'secondary');
  }).join('');
}

function buildCustomAOForm(slot) {
  const data = slot === 'primary' ? state.customPrimaryAO : state.customSecondaryAO;
  return `
    <div class="form-grid form-grid-2">
      <div class="form-group">
        <label>Origin Name</label>
        <input type="text" id="custom-ao-${slot}-name" class="input" value="${data?.name ?? ''}" placeholder="Enter origin name...">
      </div>
      <div class="form-group">
        <label>Hit Die (e.g. 8 for d8)</label>
        <input type="number" id="custom-ao-${slot}-hd" class="input" min="4" max="12" step="2" value="${data?.hd ?? 8}">
      </div>
      <div class="form-group">
        <label>Spellcasting Tag</label>
        <select id="custom-ao-${slot}-spellcasting" class="select">
          <option value="Minor" ${data?.spellcasting === 'Minor' ? 'selected' : ''}>Minor</option>
          <option value="Moderate" ${data?.spellcasting === 'Moderate' ? 'selected' : ''}>Moderate</option>
          <option value="Major" ${data?.spellcasting === 'Major' ? 'selected' : ''}>Major</option>
        </select>
      </div>
      <div class="form-group">
        <label>Extra Skill Points</label>
        <input type="number" id="custom-ao-${slot}-extraskills" class="input" min="0" max="5" value="${data?.extraSkills ?? 0}">
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="custom-ao-${slot}-desc" class="textarea" rows="3">${data?.desc ?? ''}</textarea>
    </div>
  `;
}

function bindCustomAOForm(container, slot) {
  const prefix = `custom-ao-${slot}`;
  const update = (key, value) => {
    if (slot === 'primary') {
      state.customPrimaryAO = { ...state.customPrimaryAO, [key]: value };
      if (key === 'hd') state.primaryAOHD = value;
      if (key === 'spellcasting') state.primaryAOSpellcasting = value;
    } else {
      state.customSecondaryAO = { ...state.customSecondaryAO, [key]: value };
    }
    updateSummary();
  };

  container.querySelector(`#${prefix}-name`)?.addEventListener('input', e => update('name', e.target.value));
  container.querySelector(`#${prefix}-hd`)?.addEventListener('input', e => update('hd', parseInt(e.target.value, 10) || 8));
  container.querySelector(`#${prefix}-spellcasting`)?.addEventListener('change', e => update('spellcasting', e.target.value));
  container.querySelector(`#${prefix}-extraskills`)?.addEventListener('input', e => update('extraSkills', parseInt(e.target.value, 10) || 0));
  container.querySelector(`#${prefix}-desc`)?.addEventListener('input', e => update('desc', e.target.value));
}

// ── Step: Skills ──────────────────────────────────────────────────────────────

function renderSkillsStep(container) {
  const profBonus = getProficiencyBonus(state.level);
  const finalStats = getFinalCharacteristics(state, RACES);
  const freeSkillPoints = computeFreeSkillPoints();
  const spentSkillPoints = computeSpentSkillPoints();
  const remaining = freeSkillPoints - spentSkillPoints;

  const apLimit = getTotalAccomplishmentPointsLimit(state);
  const { totalSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
  const apRemaining = apLimit - totalSpent;

  const bg = BACKGROUNDS.find(b => b.name === state.background);
  const bgFallbackList = bg ? [
    ...(bg.skills ?? []),
    ...Object.keys(bg.builtInRanks ?? {}),
    ...Object.keys(bg.builtInAcademics ?? {})
  ] : [];
  const restrictSkills = bg?.restrictSkills ?? (bgFallbackList.length ? bgFallbackList : null);
  const bgFree = state.background === 'Custom' ? (state.customBackground?.skills?.length ?? 4) : (bg?.freeSkillPoints ?? 4);

  const primaryOrigin = ORIGINS.find(o => o.name === state.primaryAO);
  const secondaryOrigin = ORIGINS.find(o => o.name === state.secondaryAO);
  const primaryExtra = state.primaryAO === 'Custom' ? (state.customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
  const secondaryExtra = state.secondaryAO === 'Custom' ? (state.customSecondaryAO?.extraSkills ?? 0) : (secondaryOrigin?.extraSkills ?? 0);
  const aoFree = (primaryExtra + secondaryExtra) * 4;

  const builtInRanks = bg?.builtInRanks ?? {};
  const builtInAcademics = bg?.builtInAcademics ?? {};

  let restrictedSpent = 0;
  let unrestrictedSpent = 0;

  for (const sk in state.skillRanks) {
    const rank = state.skillRanks[sk] ?? 0;
    const builtIn = builtInRanks[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes(sk)) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  for (const sk in state.academicsRanks) {
    const rank = state.academicsRanks[sk] ?? 0;
    const builtIn = builtInAcademics[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    unrestrictedSpent += cost;
  }

  let bgSpent = 0;
  let aoSpent = 0;
  if (state.background && restrictSkills) {
    bgSpent = Math.min(bgFree, restrictedSpent);
    const excessRestricted = restrictedSpent - bgSpent;
    const totalUnrestricted = excessRestricted + unrestrictedSpent;
    aoSpent = Math.min(aoFree, totalUnrestricted);
  } else {
    const totalSpentPoints = restrictedSpent + unrestrictedSpent;
    bgSpent = Math.min(state.background ? bgFree : 0, totalSpentPoints);
    aoSpent = Math.min(aoFree, Math.max(0, totalSpentPoints - bgSpent));
  }

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🎯 Skills</h2>
      <p class="step-desc">Assign skill ranks using Accomplishment Points. Each rank multiplies your proficiency bonus.</p>
      <p class="form-hint" style="margin-top: 0.5rem; color: #a0a5c0; font-size: 0.85rem; line-height: 1.4;">
        <strong>Frostmark Level Limits:</strong> You may possess skills with 1 to 3 ranks at level 1–3. At level 4 you may purchase skills of rank 4. Rank 5 can be purchased at 8th level if you possess a feat/ability allowing it.
      </p>
    </div>
    
    <div class="manual-override-control" style="margin-bottom: 1.5rem;">
      <label class="checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="manual-skills-check" ${state.manualSkills ? 'checked' : ''}>
        <strong>Manual Skills Override (Ignore AP limits/allow custom distribution)</strong>
      </label>
    </div>

    ${restrictSkills ? `
      <div class="restriction-notice" style="background: rgba(230, 126, 34, 0.15); color: #e67e22; padding: 0.85rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.85rem; border: 1px solid rgba(230, 126, 34, 0.3);">
        <strong>⚠️ Background Skill Restriction:</strong> The ${bgFree} free skill points from your background (<strong>${bg?.name}</strong>) can only be spent on the following skills: <strong>${restrictSkills.join(', ')}</strong>.
      </div>
    ` : ''}

    <div class="point-buy-tracker ${remaining < 0 ? 'over-budget' : ''}" style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; padding: 12px 16px;">
      <div>
        <span>Background Free Skill Points Used:</span>
        <strong id="background-skill-points-used" style="font-size: 1.1rem; margin-left: 0.25rem;">${bgSpent}</strong>
        <span>/ ${state.background ? bgFree : 0}</span>
      </div>
      <div>
        <span>Ability Origin Free Skill Points Used:</span>
        <strong id="ao-skill-points-used" style="font-size: 1.1rem; margin-left: 0.25rem;">${aoSpent}</strong>
        <span>/ ${aoFree}</span>
      </div>
    </div>
    <div class="skills-grid" id="skills-grid">
      ${SKILLS.map(skill => buildSkillRow(skill, finalStats, profBonus, bg, apRemaining, remaining, restrictSkills)).join('')}
    </div>
    <div class="section-divider">Academics (choose up to 3 fields)</div>
    <div id="academics-section">
      ${buildAcademicsSection(finalStats, profBonus, bg, apRemaining, remaining, restrictSkills)}
    </div>
  `;

  SKILLS.forEach(skill => {
    container.querySelector(`#skill-minus-${skill.key}`)?.addEventListener('click', () => adjustSkill(skill.name, -1, container));
    container.querySelector(`#skill-plus-${skill.key}`)?.addEventListener('click', () => adjustSkill(skill.name, 1, container));
  });

  container.querySelector('#manual-skills-check')?.addEventListener('change', e => {
    state.manualSkills = e.target.checked;
    renderSkillsStep(container);
    updateSummary();
  });

  bindAcademicsEvents(container, finalStats, profBonus, bg);
}

function computeFreeSkillPoints() {
  let bgFree = 0;
  if (state.background === 'Custom') {
    bgFree = state.customBackground?.skills?.length ?? 4;
  } else if (state.background) {
    const bg = BACKGROUNDS.find(b => b.name === state.background);
    if (bg) bgFree = bg.freeSkillPoints ?? 4;
  }
  const primaryOrigin = ORIGINS.find(o => o.name === state.primaryAO);
  const secondaryOrigin = ORIGINS.find(o => o.name === state.secondaryAO);
  const primaryExtra = state.primaryAO === 'Custom' ? (state.customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
  const secondaryExtra = state.secondaryAO === 'Custom' ? (state.customSecondaryAO?.extraSkills ?? 0) : (secondaryOrigin?.extraSkills ?? 0);
  // Each AO extra skill represents 4 extra skill points in the character creation rules
  return bgFree + (primaryExtra + secondaryExtra) * 4;
}

function computeSpentSkillPoints() {
  const bg = BACKGROUNDS.find(b => b.name === state.background);
  const builtInRanks = bg?.builtInRanks ?? {};
  const builtInAcademics = bg?.builtInAcademics ?? {};
  const bgFallbackList = bg ? [
    ...(bg.skills ?? []),
    ...Object.keys(builtInRanks),
    ...Object.keys(builtInAcademics)
  ] : [];
  const restrictSkills = bg?.restrictSkills ?? (bgFallbackList.length ? bgFallbackList : null);

  let restrictedSpent = 0;
  let unrestrictedSpent = 0;

  for (const sk in state.skillRanks) {
    const rank = state.skillRanks[sk] ?? 0;
    const builtIn = builtInRanks[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    if (restrictSkills && restrictSkills.includes(sk)) {
      restrictedSpent += cost;
    } else {
      unrestrictedSpent += cost;
    }
  }

  for (const sk in state.academicsRanks) {
    const rank = state.academicsRanks[sk] ?? 0;
    const builtIn = builtInAcademics[sk] ?? 0;
    const cost = Math.max(0, (SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0) - (SKILL_RANK_CUMULATIVE_COSTS[builtIn] ?? 0));
    unrestrictedSpent += cost;
  }

  const bgFree = state.background === 'Custom' ? (state.customBackground?.skills?.length ?? 4) : (bg?.freeSkillPoints ?? 4);
  const primaryOrigin = ORIGINS.find(o => o.name === state.primaryAO);
  const secondaryOrigin = ORIGINS.find(o => o.name === state.secondaryAO);
  const primaryExtra = state.primaryAO === 'Custom' ? (state.customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
  const secondaryExtra = state.secondaryAO === 'Custom' ? (state.customSecondaryAO?.extraSkills ?? 0) : (secondaryOrigin?.extraSkills ?? 0);
  const aoFree = (primaryExtra + secondaryExtra) * 4;

  if (state.background && restrictSkills) {
    // Under background restrictions, BG free points can only apply to restricted skills.
    const restrictedDiscount = Math.min(bgFree, restrictedSpent);
    const excessRestricted = restrictedSpent - restrictedDiscount;
    const totalUnrestricted = excessRestricted + unrestrictedSpent;
    const aoDiscount = Math.min(aoFree, totalUnrestricted);
    return restrictedDiscount + aoDiscount;
  } else {
    const totalSpentPoints = restrictedSpent + unrestrictedSpent;
    const totalFreePoints = (state.background ? bgFree : 0) + aoFree;
    return Math.min(totalFreePoints, totalSpentPoints);
  }
}

function buildSkillRow(skill, finalStats, profBonus, bg, apRemaining, freeRemaining, restrictSkills) {
  const rank = state.skillRanks?.[skill.name] ?? 0;
  const builtInRank = bg?.builtInRanks?.[skill.name] ?? 0;

  const [stat1, stat2] = skill.stats;
  const mod1 = getCharacteristicModifier(finalStats[stat1] ?? 10);
  const mod2 = stat2 ? getCharacteristicModifier(finalStats[stat2] ?? 10) : null;

  const rankBonus = rankBonusValue(profBonus, rank);
  const total1 = mod1 + rankBonus;
  const total2 = mod2 !== null ? mod2 + rankBonus : null;

  const nextRank = rank + 1;
  const currentCost = SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0;
  const nextCost = SKILL_RANK_CUMULATIVE_COSTS[nextRank] ?? 0;
  const incrementalCost = nextCost - currentCost;

  const isRestrictedSkill = restrictSkills && restrictSkills.includes(skill.name);
  const costsAP = (restrictSkills && !isRestrictedSkill) || (freeRemaining <= 0);

  const canAfford = !costsAP || (apRemaining >= incrementalCost);
  const maxSkillRank = getMaxSkillRank(state.level);
  const isLevelRestricted = rank >= maxSkillRank && !state.manualSkills;
  const plusDisabled = rank >= 5 || isLevelRestricted || (!canAfford && !state.manualSkills);

  let plusTooltip = '';
  if (rank >= 5) {
    plusTooltip = 'Max rank 5 reached';
  } else if (isLevelRestricted) {
    if (maxSkillRank === 3) {
      plusTooltip = `Requires level 4 to advance to rank 4.`;
    } else if (maxSkillRank === 4) {
      plusTooltip = `Requires level 8 and a relevant feat/ability to advance to rank 5.`;
    }
  } else if (!canAfford && !state.manualSkills) {
    plusTooltip = `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`;
  }

  return `
    <div class="skill-row" id="skill-row-${skill.key}">
      <div class="skill-name">
        ${skill.name}
        ${builtInRank > 0 ? `<span class="built-in-badge" style="background: rgba(148,161,255,0.15); color: var(--accent-color); padding: 0.1rem 0.4rem; font-size: 0.75rem; border-radius: 4px; margin-left: 0.5rem;" title="Starting rank from background">Starting: ${builtInRank}</span>` : ''}
      </div>
      <div class="skill-stats">
        <span class="stat-tag">${stat1.slice(0, 3)}: ${total1 >= 0 ? '+' : ''}${total1}</span>
        ${total2 !== null ? `<span class="stat-tag">${stat2.slice(0, 3)}: ${total2 >= 0 ? '+' : ''}${total2}</span>` : ''}
        ${restrictSkills && isRestrictedSkill ? (
          `<span class="restricted-skill-badge" style="background: rgba(46,204,113,0.15); color: #2ecc71; padding: 0.1rem 0.4rem; font-size: 0.75rem; border-radius: 4px; margin-left: 0.5rem; white-space: nowrap;" title="Background-free points can be used here">Allowed for Background Free Points</span>`
        ) : ''}
      </div>
      <div class="rank-controls">
        <button class="rank-btn" id="skill-minus-${skill.key}" ${rank <= builtInRank ? 'disabled' : ''}>−</button>
        <div class="rank-pips">
          ${[1,2,3,4,5].map(n => `<div class="pip ${n <= rank ? 'filled' : ''}"></div>`).join('')}
        </div>
        <button class="rank-btn" id="skill-plus-${skill.key}" ${plusDisabled ? 'disabled' : ''} ${plusTooltip ? `title="${plusTooltip}"` : ''}>+</button>
      </div>
      <div class="skill-cost">Cost: ${currentCost} pts</div>
    </div>
  `;
}

function rankBonusValue(profBonus, rank) {
  if (rank === 1) return Math.ceil(profBonus / 2);
  if (rank === 2) return profBonus;
  if (rank === 3) return Math.ceil(profBonus * 1.5);
  if (rank === 4) return profBonus * 2;
  if (rank === 5) return Math.ceil(profBonus * 2.5);
  return 0;
}

function adjustSkill(skillName, delta, container) {
  const bg = BACKGROUNDS.find(b => b.name === state.background);
  const builtInRank = bg?.builtInRanks?.[skillName] ?? 0;
  const current = state.skillRanks?.[skillName] ?? builtInRank;

  if (delta > 0 && !state.manualSkills) {
    const maxRank = getMaxSkillRank(state.level);
    if (current >= maxRank) {
      if (maxRank === 3) {
        showToast('Requires level 4 to purchase rank 4.', 'error');
      } else if (maxRank === 4) {
        showToast('Requires level 8 and a relevant feat/ability to purchase rank 5.', 'error');
      }
      return;
    }
    if (current === 4 && state.level >= 8) {
      showToast('Purchasing Rank 5 requires a feat/ability allowing it.', 'info');
    }
  }

  const next = Math.max(builtInRank, Math.min(5, current + delta));
  state.skillRanks = { ...state.skillRanks, [skillName]: next };
  renderSkillsStep(container);
  updateSummary();
}

function buildAcademicsSection(finalStats, profBonus, bg, apRemaining, freeRemaining, restrictSkills) {
  const intMod = getCharacteristicModifier(finalStats.Intelligence ?? 10);
  const cunMod = getCharacteristicModifier(finalStats.Cunning ?? 10);
  const builtInAcademics = bg?.builtInAcademics ?? {};

  return `
    <p class="form-hint">Select academic fields and assign ranks. The ranks use the same cost structure as skills.</p>
    <div class="academics-fields">
      ${ACADEMICS_FIELDS.map(field => {
        const isSelected = (state.academicsFields ?? []).includes(field);
        const rank = state.academicsRanks?.[field] ?? 0;
        const builtInRank = builtInAcademics[field] ?? 0;
        const rankBonus = rankBonusValue(profBonus, rank);

        const nextRank = rank + 1;
        const currentCost = SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0;
        const nextCost = SKILL_RANK_CUMULATIVE_COSTS[nextRank] ?? 0;
        const incrementalCost = nextCost - currentCost;

        const costsAP = (restrictSkills !== null) || (freeRemaining <= 0);
        const canAfford = !costsAP || (apRemaining >= incrementalCost);
        const maxSkillRank = getMaxSkillRank(state.level);
        const isLevelRestricted = rank >= maxSkillRank && !state.manualSkills;
        const plusDisabled = rank >= 5 || isLevelRestricted || (!canAfford && !state.manualSkills);

        let plusTooltip = '';
        if (rank >= 5) {
          plusTooltip = 'Max rank 5 reached';
        } else if (isLevelRestricted) {
          if (maxSkillRank === 3) {
            plusTooltip = `Requires level 4 to advance to rank 4.`;
          } else if (maxSkillRank === 4) {
            plusTooltip = `Requires level 8 and a relevant feat/ability to advance to rank 5.`;
          }
        } else if (!canAfford && !state.manualSkills) {
          plusTooltip = `Requires ${incrementalCost} AP, but you only have ${apRemaining} remaining. Set to manual to bypass.`;
        }

        return `
          <div class="academic-entry ${isSelected ? 'selected' : ''}" id="aca-entry-${field}">
            <div class="academic-header">
              <input type="checkbox" id="aca-check-${field}" ${isSelected ? 'checked' : ''} 
                     ${!isSelected && (state.academicsFields?.length ?? 0) >= 3 && builtInRank === 0 ? 'disabled' : ''}
                     ${builtInRank > 0 ? 'disabled title="Built-in starting field from background"' : ''}>
              <label for="aca-check-${field}" class="academic-name">
                ${field}
                ${builtInRank > 0 ? `<span class="built-in-badge" style="background: rgba(148,161,255,0.15); color: var(--accent-color); padding: 0.1rem 0.4rem; font-size: 0.75rem; border-radius: 4px; margin-left: 0.5rem;">Starting: ${builtInRank}</span>` : ''}
              </label>
            </div>
            ${isSelected ? `
              <div class="rank-controls">
                <button class="rank-btn" id="aca-minus-${field}" ${rank <= builtInRank ? 'disabled' : ''}>−</button>
                <div class="rank-pips">
                  ${[1,2,3,4,5].map(n => `<div class="pip ${n <= rank ? 'filled' : ''}"></div>`).join('')}
                </div>
                <button class="rank-btn" id="aca-plus-${field}" ${plusDisabled ? 'disabled' : ''} ${plusTooltip ? `title="${plusTooltip}"` : ''}>+</button>
              </div>
              <span class="stat-tag">Int: ${intMod + rankBonus >= 0 ? '+' : ''}${intMod + rankBonus} | Cun: ${cunMod + rankBonus >= 0 ? '+' : ''}${cunMod + rankBonus}</span>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function bindAcademicsEvents(container, finalStats, profBonus, bg) {
  ACADEMICS_FIELDS.forEach(field => {
    container.querySelector(`#aca-check-${field}`)?.addEventListener('change', e => {
      const builtInAcademics = bg?.builtInAcademics ?? {};
      const builtInRank = builtInAcademics[field] ?? 0;
      if (e.target.checked) {
        if ((state.academicsFields?.length ?? 0) < 3) {
          state.academicsFields = [...(state.academicsFields ?? []), field];
        }
      } else {
        state.academicsFields = (state.academicsFields ?? []).filter(f => f !== field);
        const { [field]: _, ...rest } = state.academicsRanks ?? {};
        state.academicsRanks = rest;
      }
      renderSkillsStep(container);
    });

    container.querySelector(`#aca-minus-${field}`)?.addEventListener('click', () => {
      const rank = state.academicsRanks?.[field] ?? 0;
      state.academicsRanks = { ...state.academicsRanks, [field]: Math.max(0, rank - 1) };
      renderSkillsStep(container);
    });

    container.querySelector(`#aca-plus-${field}`)?.addEventListener('click', () => {
      const rank = state.academicsRanks?.[field] ?? 0;
      if (!state.manualSkills) {
        const maxRank = getMaxSkillRank(state.level);
        if (rank >= maxRank) {
          if (maxRank === 3) {
            showToast('Requires level 4 to purchase rank 4.', 'error');
          } else if (maxRank === 4) {
            showToast('Requires level 8 and a relevant feat/ability to purchase rank 5.', 'error');
          }
          return;
        }
        if (rank === 4 && state.level >= 8) {
          showToast('Purchasing Rank 5 requires a feat/ability allowing it.', 'info');
        }
      }
      state.academicsRanks = { ...state.academicsRanks, [field]: Math.min(5, rank + 1) };
      renderSkillsStep(container);
    });
  });
}

// ── Step: Proficiencies & AP ──────────────────────────────────────────────────

function renderProficienciesStep(container) {
  const apLimit = getTotalAccomplishmentPointsLimit(state);
  const { totalSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
  const remaining = apLimit - totalSpent;

  // Helper to get armor AP cost
  const getArmorCost = (prof) => {
    let cost = 0;
    if (prof.Heavy) cost = 3;
    else if (prof.Medium) cost = 2;
    else if (prof.Light) cost = 1;
    if (prof.Shields) cost += 1;
    return cost;
  };

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🛡️ Proficiencies & Accomplishment Points</h2>
      <p class="step-desc">Use AP to buy saving throw proficiencies, armor/weapon proficiencies, and extra gold.</p>
    </div>
    
    <div class="manual-override-control" style="margin-bottom: 1.5rem;">
      <label class="checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="manual-proficiencies-check" ${state.manualProficiencies ? 'checked' : ''}>
        <strong>Manual Proficiencies Override (Ignore AP limits/allow custom distribution)</strong>
      </label>
    </div>

    <div class="section-block">
      <h3 class="section-title">Saving Throw Proficiencies</h3>
      <div class="proficiency-grid">
        ${CHARACTERISTICS.map(c => {
          const isChecked = state.savingThrowsProficient?.[c.key];
          const incrementalCost = SAVE_PROFICIENCY_COSTS[c.key] || 1;
          const canAfford = isChecked || (remaining >= incrementalCost);
          const isDisabled = !isChecked && !canAfford && !state.manualProficiencies;
          const tooltip = isDisabled ? `Requires ${incrementalCost} AP, but you only have ${remaining} remaining. Set to manual to bypass.` : '';
          
          return `
            <label class="prof-toggle ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" 
                   id="save-toggle-${c.key}" 
                   ${tooltip ? `title="${tooltip}"` : ''}>
              <input type="checkbox" id="save-check-${c.key}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
              ${c.key}
            </label>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Armor Proficiencies</h3>
      <p class="form-hint">Light=1 AP, Medium=2 AP, Heavy=3 AP, Shields=1 AP</p>
      <div class="proficiency-grid">
        ${['Light', 'Medium', 'Heavy', 'Shields'].map(a => {
          const isChecked = state.armorProficiencies?.[a];
          const currentCost = getArmorCost(state.armorProficiencies);
          const nextCost = getArmorCost({ ...state.armorProficiencies, [a]: true });
          const incrementalCost = Math.max(0, nextCost - currentCost);
          const canAfford = isChecked || (remaining >= incrementalCost);
          const isDisabled = !isChecked && !canAfford && !state.manualProficiencies;
          const tooltip = isDisabled ? `Requires ${incrementalCost} AP, but you only have ${remaining} remaining. Set to manual to bypass.` : '';

          return `
            <label class="prof-toggle ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" 
                   id="armor-toggle-${a}" 
                   ${tooltip ? `title="${tooltip}"` : ''}>
              <input type="checkbox" id="armor-check-${a}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
              ${a}
            </label>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Languages</h3>
      <div class="form-group">
        <label>Additional Languages (comma-separated)</label>
        <input type="text" id="extra-languages" class="input" 
               value="${(state.languages ?? []).join(', ')}" 
               placeholder="e.g. Elvish, Dwarvish">
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Extra Gold (1 AP = 25 gp)</h3>
      <div class="form-group">
        <label>Total Starting Gold (gp)</label>
        <input type="number" id="gold-input" class="input" min="0" value="${state.goldAmount ?? 0}">
      </div>
    </div>
  `;

  CHARACTERISTICS.forEach(c => {
    container.querySelector(`#save-check-${c.key}`)?.addEventListener('change', e => {
      state.savingThrowsProficient = { ...state.savingThrowsProficient, [c.key]: e.target.checked };
      renderProficienciesStep(container);
      updateSummary();
    });
  });

  ['Light', 'Medium', 'Heavy', 'Shields'].forEach(a => {
    container.querySelector(`#armor-check-${a}`)?.addEventListener('change', e => {
      state.armorProficiencies = { ...state.armorProficiencies, [a]: e.target.checked };
      renderProficienciesStep(container);
      updateSummary();
    });
  });

  container.querySelector('#manual-proficiencies-check')?.addEventListener('change', e => {
    state.manualProficiencies = e.target.checked;
    renderProficienciesStep(container);
    updateSummary();
  });

  container.querySelector('#extra-languages')?.addEventListener('input', e => {
    state.languages = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
  });

  container.querySelector('#gold-input')?.addEventListener('input', e => {
    state.goldAmount = parseInt(e.target.value, 10) || 0;
    renderProficienciesStep(container);
    updateSummary();
  });
}

// ── Step: Spellcasting ────────────────────────────────────────────────────────

let spellFilters = {
  schools: [],
  levels: [],
  castingTimes: [],
  damageTypes: [],
  concentration: false,
  minRange: 0,
  maxRange: 36,
  sortBy: 'name',
  selectedSpellForDetail: null,
  searchQuery: '',
  activeFilters: []
};

function getRangeLabel(val) {
  if (val === 0) return 'Self/Touch';
  if (val >= 36) return '36m+';
  return `${val}m`;
}

function getSpellByName(name) {
  let spell = CANTRIPS.find(c => c.name === name) || SPELLS.find(s => s.name === name);
  if (!spell) {
    const isCantrip = state.spellcasting?.cantrips?.includes(name);
    const customSpell = state.spellcasting?.spells?.find(s => s.name === name);
    const level = isCantrip ? 0 : (customSpell?.level ?? 1);
    spell = {
      name,
      level,
      school: 'Custom',
      castingTime: '1 action',
      range: 0,
      rangeLabel: 'Self/Touch',
      damageTypes: [],
      duration: 'Instantaneous',
      concentration: false,
      desc: 'Custom homebrew spell.'
    };
  }
  return spell;
}

function getFilteredSpells(allSpells) {
  let list = allSpells.filter(spell => {
    if (spellFilters.searchQuery) {
      const query = spellFilters.searchQuery.toLowerCase().trim();
      const nameMatch = spell.name.toLowerCase().includes(query);
      const descMatch = spell.desc && spell.desc.toLowerCase().includes(query);
      if (!nameMatch && !descMatch) {
        return false;
      }
    }
    if (spellFilters.schools.length > 0 && !spellFilters.schools.includes(spell.school)) {
      return false;
    }
    if (spellFilters.levels.length > 0 && !spellFilters.levels.includes(spell.level)) {
      return false;
    }
    if (spellFilters.castingTimes.length > 0) {
      const ct = spell.castingTime.toLowerCase();
      const match = spellFilters.castingTimes.some(filter => {
        if (filter === 'Action') return ct.includes('action') && !ct.includes('bonus') && !ct.includes('reaction');
        if (filter === 'Bonus Action') return ct.includes('bonus');
        if (filter === 'Reaction') return ct.includes('reaction');
        if (filter === 'Minute+') return ct.includes('minute') || ct.includes('hour');
        return false;
      });
      if (!match) return false;
    }
    if (spellFilters.damageTypes.length > 0) {
      const match = spellFilters.damageTypes.some(dt => 
        spell.damageTypes && spell.damageTypes.map(d => d.toLowerCase()).includes(dt.toLowerCase())
      );
      if (!match) return false;
    }
    if (spellFilters.concentration && !spell.concentration) {
      return false;
    }
    const rangeVal = spell.range ?? 0;
    const minRange = spellFilters.minRange;
    const maxRange = spellFilters.maxRange;
    const fitsRange = rangeVal >= minRange && (maxRange >= 36 ? true : rangeVal <= maxRange);
    if (!fitsRange) {
      return false;
    }
    return true;
  });

  list.sort((a, b) => {
    if (spellFilters.sortBy === 'level') {
      if (a.level !== b.level) return a.level - b.level;
    } else if (spellFilters.sortBy === 'range') {
      if (a.range !== b.range) return a.range - b.range;
    }
    return a.name.localeCompare(b.name);
  });

  return list;
}

const FILTER_CATALOG = [
  { key: 'search', label: 'Search' },
  { key: 'schools', label: 'Schools' },
  { key: 'levels', label: 'Levels' },
  { key: 'concentration', label: 'Concentration' },
  { key: 'casting', label: 'Casting Times' },
  { key: 'damage', label: 'Damage Types (Experimental)' },
  { key: 'range', label: 'Range' },
  { key: 'sort', label: 'Sort By' }
];

function filterBodySearch() {
  return `<input type="text" id="spell-search-input" class="input" placeholder="Search spells…" value="${spellFilters.searchQuery || ''}" style="width: 100%; font-size: 0.9rem;">`;
}

function filterBodySchools() {
  return `<div class="filter-pills" id="filter-schools">${['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Transmutation','Vismancy'].map(school => `<button class="pill-btn ${spellFilters.schools.includes(school) ? 'active' : ''}" data-value="${school}">${school}</button>`).join('')}</div>`;
}

function filterBodyLevels() {
  return `<div class="filter-pills" id="filter-levels">${['Cantrip','1','2','3','4','5','6','7','8','9'].map(lvl => { const val = lvl === 'Cantrip' ? 0 : parseInt(lvl, 10); return `<button class="pill-btn ${spellFilters.levels.includes(val) ? 'active' : ''}" data-value="${val}">${lvl}</button>`; }).join('')}</div>`;
}

function filterBodyConcentration() {
  return `<label class="toggle-switch-label" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
    <input type="checkbox" id="filter-concentration" ${spellFilters.concentration ? 'checked' : ''}>
    <span class="toggle-switch-slider"></span>
    <strong>Concentration only</strong>
  </label>`;
}

function filterBodyCasting() {
  return `<div class="filter-pills" id="filter-casting">${['Action','Bonus Action','Reaction','Minute+'].map(ct => `<button class="pill-btn ${spellFilters.castingTimes.includes(ct) ? 'active' : ''}" data-value="${ct}">${ct}</button>`).join('')}</div>`;
}

function filterBodyDamage() {
  return `<div class="filter-pills" id="filter-damage">${['Acid','Cold','Fire','Force','Lightning','Necrotic','Poison','Psychic','Radiant','Thunder','Bludgeoning','Piercing','Slashing'].map(dt => `<button class="pill-btn ${spellFilters.damageTypes.includes(dt.toLowerCase()) ? 'active' : ''}" data-value="${dt.toLowerCase()}">${dt}</button>`).join('')}</div>`;
}

function filterBodyRange() {
  return `<div class="range-slider-wrapper">
    <div class="range-slider-container">
      <input type="range" id="range-min" min="0" max="36" value="${spellFilters.minRange}" class="slider-thumb">
      <input type="range" id="range-max" min="0" max="36" value="${spellFilters.maxRange}" class="slider-thumb">
      <div class="slider-track" style="left: ${(spellFilters.minRange / 36) * 100}%; right: ${100 - (spellFilters.maxRange / 36) * 100}%;"></div>
    </div>
    <div class="range-slider-labels"><span>Min: ${getRangeLabel(spellFilters.minRange)}</span><span>Max: ${getRangeLabel(spellFilters.maxRange)}</span></div>
  </div>`;
}

function filterBodySort() {
  return `<select id="sort-spells-select" class="select">
    <option value="name" ${spellFilters.sortBy === 'name' ? 'selected' : ''}>Name</option>
    <option value="level" ${spellFilters.sortBy === 'level' ? 'selected' : ''}>Level</option>
    <option value="range" ${spellFilters.sortBy === 'range' ? 'selected' : ''}>Range</option>
  </select>`;
}

const FILTER_BODIES = {
  search: filterBodySearch,
  schools: filterBodySchools,
  levels: filterBodyLevels,
  concentration: filterBodyConcentration,
  casting: filterBodyCasting,
  damage: filterBodyDamage,
  range: filterBodyRange,
  sort: filterBodySort
};

function renderFilterPanel(key) {
  const meta = FILTER_CATALOG.find(f => f.key === key);
  if (!meta || !FILTER_BODIES[key]) return '';

  // Compact filters sit side-by-side; long ones take the full row
  const compact = ['concentration', 'casting', 'levels', 'range'].includes(key);
  const flexStyle = compact ? (key === 'range' ? 'flex: 0 1 auto; min-width: 220px;' : 'flex: 0 1 auto;') : 'flex: 1 1 100%;';

  return `
    <div class="filter-item" data-filter-key="${key}" style="
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      background: rgba(255,255,255,0.02);
      ${flexStyle}
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
        <strong style="font-size: 0.75rem; color: #a0a5c0; text-transform: uppercase; letter-spacing: 0.04em;">${meta.label}</strong>
        <button class="remove-filter-btn" data-filter-key="${key}" title="Remove filter" style="background: none; border: none; color: #eb5e55; cursor: pointer; font-size: 0.85rem; line-height: 1; padding: 0 0.25rem;">✕</button>
      </div>
      ${FILTER_BODIES[key]()}
    </div>
  `;
}

function renderSpellsFilters() {
  const active = spellFilters.activeFilters ?? (spellFilters.activeFilters = []);

  // Search + Sort are always on the page (left/right), not filters
  const searchField = `<input type="text" id="spell-search-input" class="input" placeholder="Search spells…" value="${spellFilters.searchQuery || ''}" style="flex: 1; font-size: 0.9rem;">`;
  const sortSelect = `<select id="sort-spells-select" class="select" style="flex: 1; font-size: 0.85rem;">
    <option value="name">Sort: Name</option>
    <option value="level">Sort: Level</option>
    <option value="range">Sort: Range</option>
  </select>`;

  const available = FILTER_CATALOG.filter(f => !active.includes(f.key) && !['search', 'sort'].includes(f.key));

  return `
    <div class="spells-filters-container">
      <div class="filter-container" style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
        ${searchField}
        ${sortSelect}
      </div>

      <div class="filters-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <strong style="font-size: 0.85rem; color: #a0a5c0; text-transform: uppercase; letter-spacing: 0.05em;">Filters</strong>
          <select id="add-filter-select" class="select" style="font-size: 0.8rem;">
            <option value="">+ Add filter</option>
            ${available.map(f => `<option value="${f.key}">${f.label}</option>`).join('')}
          </select>
        </div>

        <div class="active-filters-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: flex-start;">
          ${active.filter(key => ['search', 'sort'].indexOf(key) === -1).map(key => renderFilterPanel(key)).join('')}
        </div>
      </div>
    </div>
  `;
}

function resetFilterValue(key) {
  switch (key) {
    case 'search': spellFilters.searchQuery = ''; break;
    case 'schools': spellFilters.schools = []; break;
    case 'levels': spellFilters.levels = []; break;
    case 'concentration': spellFilters.concentration = false; break;
    case 'casting': spellFilters.castingTimes = []; break;
    case 'damage': spellFilters.damageTypes = []; break;
    case 'range': spellFilters.minRange = 0; spellFilters.maxRange = 36; break;
    case 'sort': spellFilters.sortBy = 'name'; break;
  }
}

function renderSpellDetailPane(potentialRemaining) {
  const activeName = spellFilters.selectedSpellForDetail;
  if (!activeName) {
    return `
      <div class="spell-detail-empty" style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #a0a5c0;
        text-align: center;
        padding: 2rem;
        border: 2px dashed rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      ">
        <p>Select a spell from the list to view its complete details, stats, and description.</p>
      </div>
    `;
  }

  const spell = getSpellByName(activeName);
  const schoolColorClass = `school-${spell.school.toLowerCase()}`;

  const isCantrip = spell.level === 0;
  const isSelected = isCantrip
    ? state.spellcasting?.cantrips?.includes(spell.name)
    : state.spellcasting?.spells?.some(s => s.name === spell.name);

  let isBtnDisabled = false;
  let btnTooltip = '';

  if (!isSelected) {
    if (isCantrip) {
      if ((state.spellcasting?.cantrips ?? []).length >= 5) {
        isBtnDisabled = true;
        btnTooltip = 'Maximum 5 cantrips allowed by the character sheet.';
      } else if (potentialRemaining < 10 && !state.manualSpells) {
        isBtnDisabled = true;
        btnTooltip = `Requires 10 Potential.`;
      }
    } else {
      const cost = 10 * spell.level;

      if (potentialRemaining < cost && !state.manualSpells) {
        isBtnDisabled = true;
        btnTooltip = `Requires ${cost} Potential.`;
      }
    }
  }

  return `
    <div class="spell-detail-card ${schoolColorClass}">
      <div class="spell-detail-header">
        <h4 class="spell-detail-name">${spell.name}</h4>
        <div class="spell-detail-tags">
          <span class="spell-tag level-tag">${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
          <span class="spell-tag school-tag">${spell.school}</span>
        </div>
      </div>
      <div class="spell-detail-stats">
        <div class="stat-item">
          <strong>Casting Time</strong>
          <span>${spell.castingTime}</span>
        </div>
        <div class="stat-item">
          <strong>Range</strong>
          <span>${spell.rangeLabel}</span>
        </div>
        <div class="stat-item">
          <strong>Duration</strong>
          <span>${spell.duration}</span>
        </div>
        <div class="stat-item">
          <strong>Concentration</strong>
          <span>${spell.concentration ? 'Yes' : 'No'}</span>
        </div>
${spell.damageTypes && spell.damageTypes.length > 0 ? `
           <div class="stat-item full-width">
             <strong>Damage Types</strong>
             <span class="damage-types-list">
               ${spell.damageTypes.map(dt => `<span class="damage-type-pill ${dt.toLowerCase()}">${dt} <strong style="font-size: 0.85rem;">(Experimental)</strong></span>`).join(' ')}
             </span>
           </div>
         ` : ''}
      </div>
      <div class="spell-detail-desc">
        <h5>Description</h5>
        <p>${spell.desc}</p>
      </div>
      <div class="spell-detail-actions" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
        <button class="btn ${isSelected ? 'btn-danger' : 'btn-primary'} learn-spell-btn" 
                data-spell="${spell.name}" 
                data-type="${isCantrip ? 'cantrips' : 'spells'}"
                ${isBtnDisabled ? 'disabled' : ''} 
                ${btnTooltip ? `title="${btnTooltip}"` : ''}
                style="width: 100%; justify-content: center;">
          ${isSelected ? 'Forget Spell' : 'Learn Spell'}
        </button>
        ${btnTooltip ? `<div class="btn-error-tooltip" style="color: #eb5e55; font-size: 0.8rem; margin-top: 0.5rem; text-align: center;">${btnTooltip}</div>` : ''}
      </div>
    </div>
  `;
}

function renderSpellslotsStep(container) {
  if (!state.spellcasting) state.spellcasting = {};
  state.spellcasting.cantrips = state.spellcasting.cantrips ?? [];
  state.spellcasting.spells = state.spellcasting.spells ?? [];
  state.spellcasting.slots = state.spellcasting.slots ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

  const selectedCantrips = state.spellcasting.cantrips;
  const selectedSpells = state.spellcasting.spells;

  let potentialSpent = selectedCantrips.length * 10;
  selectedSpells.forEach(s => {
    potentialSpent += 10 * (s.level ?? 1);
  });
  for (let lvl = 1; lvl <= 9; lvl++) {
    const qty = state.spellcasting.slots[lvl] ?? 0;
    potentialSpent += qty * 10 * lvl;
  }

  const potentialLimit = state.potentialGained ?? 0;
  const potentialRemaining = potentialLimit - potentialSpent;

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">⚡ Spell Slots</h2>
      <p class="step-desc">Spend your Potential to buy spell slots. You cannot exceed the physical sheet slot limit.</p>
    </div>
    
    <div class="manual-override-control" style="margin-bottom: 1.5rem;">
      <label class="checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="manual-spells-check" ${state.manualSpells ? 'checked' : ''}>
        <strong>Manual Spellcasting Override (Ignore Potential limits)</strong>
      </label>
    </div>

    <div style="display: flex; gap: 1.5rem; flex-direction: column; margin-bottom: 1.5rem;">
      <div class="point-buy-tracker ${potentialRemaining < 0 ? 'over-budget' : ''}" style="margin-bottom: 0;">
        <span>Potential Remaining:</span>
        <strong>${potentialRemaining}</strong>
        <span>/ ${potentialLimit}</span>
      </div>

      <div class="spell-slots-budget" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.85rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      ">
        <div style="text-align: center; border-right: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: #a0a5c0;">Cantrips</div>
          <div style="font-size: 1rem; font-weight: bold; color: ${selectedCantrips.length > 5 ? '#eb5e55' : '#ffffff'};">
            ${selectedCantrips.length} / 5
          </div>
        </div>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
          const slotsPurchased = state.spellcasting.slots[lvl] ?? 0;
          return `
            <div style="text-align: center;">
              <div style="font-size: 0.7rem; color: #a0a5c0;">Level ${lvl} Slots</div>
              <div style="font-size: 0.9rem; font-weight: bold; color: #ffffff;">
                ${slotsPurchased}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Buy Spell Slots</h3>
      <p class="form-hint">Cost: 10 Potential * Spell Level. You cannot exceed the physical sheet slot limit.</p>
      <div class="spell-slots-buying-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      ">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
          const limit = getSpellSlotsForLevel(lvl);
          const current = state.spellcasting.slots[lvl] ?? 0;
          const cost = 10 * lvl;
          const plusDisabled = current >= limit || (potentialRemaining < cost && !state.manualSpells);
          const minusDisabled = current <= 0;
          
          let tooltip = '';
          if (current >= limit) {
            tooltip = `Max slots (${limit}) reached.`;
          } else if (potentialRemaining < cost && !state.manualSpells) {
            tooltip = `Requires ${cost} Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`;
          }
          
          return `
            <div class="slot-buy-row" style="
              background: rgba(255,255,255,0.02);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              padding: 0.5rem 0.75rem;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }">
              <div>
                <strong style="display: block; font-size: 0.9rem;">Level ${lvl} Slot</strong>
                <span style="font-size: 0.75rem; color: #a0a5c0;">Cost: ${cost} Pot</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="rank-btn slot-minus" data-level="${lvl}" ${minusDisabled ? 'disabled' : ''}>−</button>
                <span style="font-weight: bold; font-size: 1rem; min-width: 2.5rem; text-align: center;">${current} / ${limit}</span>
                <button class="rank-btn slot-plus" data-level="${lvl}" ${plusDisabled ? 'disabled' : ''} ${tooltip ? `title="${tooltip}"` : ''}>+</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.slot-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.level, 10);
      const slots = state.spellcasting?.slots ?? {};
      const current = slots[lvl] ?? 0;
      state.spellcasting.slots = { ...slots, [lvl]: current + 1 };
      renderSpellslotsStep(container);
      updateSummary();
    });
  });

  container.querySelectorAll('.slot-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const lvl = parseInt(btn.dataset.level, 10);
      const slots = state.spellcasting?.slots ?? {};
      const current = slots[lvl] ?? 0;
      state.spellcasting.slots = { ...slots, [lvl]: Math.max(0, current - 1) };
      renderSpellslotsStep(container);
      updateSummary();
    });
  });

  container.querySelector('#manual-spells-check')?.addEventListener('change', e => {
    state.manualSpells = e.target.checked;
    renderSpellslotsStep(container);
    updateSummary();
  });
}

function renderSpellcastingStep(container) {
  if (!state.spellcasting) state.spellcasting = {};
  state.spellcasting.cantrips = state.spellcasting.cantrips ?? [];
  state.spellcasting.spells = state.spellcasting.spells ?? [];
  state.spellcasting.slots = state.spellcasting.slots ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

  const selectedCantrips = state.spellcasting.cantrips;
  const selectedSpells = state.spellcasting.spells;

  let potentialSpent = selectedCantrips.length * 10;
  selectedSpells.forEach(s => {
    potentialSpent += 10 * (s.level ?? 1);
  });
  for (let lvl = 1; lvl <= 9; lvl++) {
    const qty = state.spellcasting.slots[lvl] ?? 0;
    potentialSpent += qty * 10 * lvl;
  }

  const potentialLimit = state.potentialGained ?? 0;
  const potentialRemaining = potentialLimit - potentialSpent;

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🔮 Spell Selection</h2>
      <p class="step-desc">Filter, inspect, and choose cantrips and spells.</p>
    </div>
    
    <div class="manual-override-control" style="margin-bottom: 1.5rem;">
      <label class="checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="manual-spells-check" ${state.manualSpells ? 'checked' : ''}>
        <strong>Manual Spellcasting Override (Ignore Potential limits)</strong>
      </label>
    </div>

    <div style="display: flex; gap: 1.5rem; flex-direction: column; margin-bottom: 1.5rem;">
      <div class="point-buy-tracker ${potentialRemaining < 0 ? 'over-budget' : ''}" style="margin-bottom: 0;">
        <span>Potential Remaining:</span>
        <strong>${potentialRemaining}</strong>
        <span>/ ${potentialLimit}</span>
      </div>

      <div class="spell-slots-budget" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        padding: 0.85rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      ">
        <div style="text-align: center; border-right: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: #a0a5c0;">Cantrips</div>
          <div style="font-size: 1rem; font-weight: bold; color: ${selectedCantrips.length > 5 ? '#eb5e55' : '#ffffff'};">
            ${selectedCantrips.length} / 5
          </div>
        </div>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => {
          const slotsPurchased = state.spellcasting.slots[lvl] ?? 0;
          return `
            <div style="text-align: center;">
              <div style="font-size: 0.7rem; color: #a0a5c0;">Level ${lvl} Slots</div>
              <div style="font-size: 0.9rem; font-weight: bold; color: #ffffff;">
                ${slotsPurchased}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="section-block spells-filters-section" style="
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    ">
      <h3 class="section-title" style="margin-top: 0;">Filters & Search</h3>
      ${renderSpellsFilters()}
    </div>

    <div class="section-block" style="margin-bottom: 1.5rem;">
      <h3 class="section-title" style="margin-top: 0;">Selected</h3>
      <div class="selected-spells-sidebar-container">
        ${renderSelectedSpellsSidebar(selectedCantrips, selectedSpells)}
      </div>
    </div>

    <div class="spells-split-view" style="
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
      align-items: start;
    ">
      <div class="spells-list-column">
        <div class="section-block" style="margin-top: 0;">
          <h3 class="section-title" style="text-transform: none; margin-top: 0;">Spells & Cantrips</h3>
          <div class="spell-list" id="unified-spell-list">
            ${buildUnifiedSpellList([...CANTRIPS, ...SPELLS], potentialRemaining, selectedSpells, selectedCantrips)}
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <button class="btn btn-ghost btn-sm" id="add-custom-cantrip">+ Add Custom Cantrip</button>
            <button class="btn btn-ghost btn-sm" id="add-custom-spell">+ Add Custom Spell</button>
          </div>
        </div>
      </div>

      <div class="spells-detail-column" style="position: sticky; top: 1.5rem;">
        <div class="section-block" style="margin-top: 0;">
          <h3 class="section-title" style="margin-top: 0;">Active Spell Details</h3>
          <div class="spell-detail-container">
            ${renderSpellDetailPane(potentialRemaining)}
          </div>
        </div>
      </div>
    </div>
    </div>
  `;

  bindSpellEvents(container, potentialRemaining);
}

function buildUnifiedSpellList(allSpells, potentialRemaining, selectedSpells, selectedCantrips) {
  const selectedCantripNames = selectedCantrips.map(s => typeof s === 'string' ? s : s.name);
  const selectedSpellNames = selectedSpells.map(s => s.name ?? s);

  const filtered = getFilteredSpells(allSpells);

  if (filtered.length === 0) {
    return `<div class="no-spells-found" style="color: #a0a5c0; padding: 1.5rem; text-align: center; font-style: italic; background: rgba(0,0,0,0.1); border-radius: 6px;">No spells match current filters.</div>`;
  }

  return filtered.map(spell => {
    const name = spell.name;
    const level = spell.level ?? 0;
    const isCantrip = level === 0;
    const isSelected = isCantrip ? selectedCantripNames.includes(name) : selectedSpellNames.includes(name);
    const isActiveDetail = spellFilters.selectedSpellForDetail === name;

    let isDisabled = false;
    let tooltip = '';

    if (!isSelected) {
      if (isCantrip) {
        if (selectedCantrips.length >= 5) {
          isDisabled = true;
          tooltip = 'Maximum 5 cantrips allowed by the character sheet.';
        } else if (potentialRemaining < 10 && !state.manualSpells) {
          isDisabled = true;
          tooltip = `Requires 10 Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`;
        }
      } else {
        const cost = 10 * level;

        if (potentialRemaining < cost && !state.manualSpells) {
          isDisabled = true;
          tooltip = `Requires ${cost} Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`;
        }
      }
    }

    return `
      <div class="spell-entry ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isActiveDetail ? 'active-detail' : ''}" 
           data-spell="${name}" 
           id="spell-${name.replace(/\s/g, '-')}"
           ${tooltip ? `title="${tooltip}"` : ''}
           style="${isDisabled ? 'opacity: 0.5; cursor: not-allowed; pointer-events: none;' : ''}">
        <span class="spell-name">${name}</span>
        ${spell.level ? `<span class="spell-level-tag">Lv.${spell.level}</span>` : '<span class="spell-level-tag">Cantrip</span>'}
        ${spell.desc ? `<span class="spell-desc" style="max-height: 1.2em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${spell.desc}</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderSelectedSpellsSidebar(selectedCantrips, selectedSpells) {
  return `
    <div class="selected-spells-box" style="
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
    ">
      <h4 style="margin-top: 0; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: #a0a5c0; font-size: 0.9rem;">
        Cantrips (${selectedCantrips.length} / 5)
      </h4>
      <ul style="list-style: none; padding: 0; margin: 0 0 1.5rem 0; display: flex; flex-direction: column; gap: 0.4rem;">
        ${selectedCantrips.length === 0 ? '<li style="color: #606580; font-style: italic; font-size: 0.85rem;">None</li>' : selectedCantrips.map(name => `
          <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
            <span style="font-weight: 500; cursor: pointer; color: var(--text-color);" class="select-spell-detail-trigger" data-spell="${name}">${name}</span>
            <button class="remove-selected-spell-btn" data-spell="${name}" data-type="cantrips" style="background: none; border: none; color: #eb5e55; cursor: pointer; font-size: 0.95rem; padding: 0 0.25rem;">✕</button>
          </li>
        `).join('')}
      </ul>

      <h4 style="margin-top: 0; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: #a0a5c0; font-size: 0.9rem;">
        Spells
      </h4>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
        ${selectedSpells.length === 0 ? '<li style="color: #606580; font-style: italic; font-size: 0.85rem;">None</li>' : selectedSpells.slice().sort((a,b) => (a.level ?? 1) - (b.level ?? 1)).map(s => {
          const name = s.name ?? s;
          const lvl = s.level ?? 1;
          return `
            <li style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">
              <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 500; cursor: pointer; color: var(--text-color);" class="select-spell-detail-trigger" data-spell="${name}">${name}</span>
                <span style="font-size: 0.7rem; color: #a0a5c0;">Level ${lvl}</span>
              </div>
              <button class="remove-selected-spell-btn" data-spell="${name}" data-type="spells" style="background: none; border: none; color: #eb5e55; cursor: pointer; font-size: 0.95rem; padding: 0 0.25rem;">✕</button>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;
}

function bindSpellEvents(container, potentialRemaining) {
  container.querySelectorAll('.spell-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      spellFilters.selectedSpellForDetail = entry.dataset.spell;
      renderSpellcastingStep(container);
    });
  });

  container.querySelectorAll('.select-spell-detail-trigger').forEach(el => {
    el.addEventListener('click', () => {
      spellFilters.selectedSpellForDetail = el.dataset.spell;
      renderSpellcastingStep(container);
    });
  });

  container.querySelectorAll('.remove-selected-spell-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.spell;
      const type = btn.dataset.type;
      if (type === 'cantrips') {
        const current = state.spellcasting?.cantrips ?? [];
        state.spellcasting = { ...state.spellcasting, cantrips: current.filter(c => c !== name) };
      } else {
        const current = state.spellcasting?.spells ?? [];
        state.spellcasting = { ...state.spellcasting, spells: current.filter(s => (s.name ?? s) !== name) };
      }
      renderSpellcastingStep(container);
      updateSummary();
    });
  });

  container.querySelector('.learn-spell-btn')?.addEventListener('click', (e) => {
    const name = e.target.dataset.spell;
    const type = e.target.dataset.type;

    if (type === 'cantrips') {
      const current = state.spellcasting?.cantrips ?? [];
      if (current.includes(name)) {
        state.spellcasting = { ...state.spellcasting, cantrips: current.filter(c => c !== name) };
      } else {
        state.spellcasting = { ...state.spellcasting, cantrips: [...current, name] };
      }
    } else {
      const current = state.spellcasting?.spells ?? [];
      const existing = current.find(s => (s.name ?? s) === name);
      if (existing) {
        state.spellcasting = { ...state.spellcasting, spells: current.filter(s => (s.name ?? s) !== name) };
      } else {
        const spellData = SPELLS?.find(s => (s.name ?? s) === name) || CANTRIPS?.find(c => (c.name ?? c) === name);
        state.spellcasting = { ...state.spellcasting, spells: [...current, { name, level: spellData?.level ?? 1 }] };
      }
    }
    renderSpellcastingStep(container);
    updateSummary();
  });

  container.querySelectorAll('#filter-schools .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      if (spellFilters.schools.includes(val)) {
        spellFilters.schools = spellFilters.schools.filter(x => x !== val);
      } else {
        spellFilters.schools.push(val);
      }
      renderSpellcastingStep(container);
    });
  });

  container.querySelectorAll('#filter-levels .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.value, 10);
      if (spellFilters.levels.includes(val)) {
        spellFilters.levels = spellFilters.levels.filter(x => x !== val);
      } else {
        spellFilters.levels.push(val);
      }
      renderSpellcastingStep(container);
    });
  });

  container.querySelectorAll('#filter-casting .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      if (spellFilters.castingTimes.includes(val)) {
        spellFilters.castingTimes = spellFilters.castingTimes.filter(x => x !== val);
      } else {
        spellFilters.castingTimes.push(val);
      }
      renderSpellcastingStep(container);
    });
  });

  container.querySelectorAll('#filter-damage .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      if (spellFilters.damageTypes.includes(val)) {
        spellFilters.damageTypes = spellFilters.damageTypes.filter(x => x !== val);
      } else {
        spellFilters.damageTypes.push(val);
      }
      renderSpellcastingStep(container);
    });
  });

  const minSlider = container.querySelector('#range-min');
  const maxSlider = container.querySelector('#range-max');

  if (minSlider && maxSlider) {
    minSlider.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (val > spellFilters.maxRange) {
        val = spellFilters.maxRange;
        minSlider.value = val;
      }
      spellFilters.minRange = val;
      container.querySelector('.range-slider-labels span:first-child').textContent = `Min: ${getRangeLabel(val)}`;
    });

    minSlider.addEventListener('change', () => {
      renderSpellcastingStep(container);
    });

    maxSlider.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (val < spellFilters.minRange) {
        val = spellFilters.minRange;
        maxSlider.value = val;
      }
      spellFilters.maxRange = val;
      container.querySelector('.range-slider-labels span:last-child').textContent = `Max: ${getRangeLabel(val)}`;
    });

    maxSlider.addEventListener('change', () => {
      renderSpellcastingStep(container);
    });
  }

  container.querySelector('#filter-concentration')?.addEventListener('change', e => {
    spellFilters.concentration = e.target.checked;
    renderSpellcastingStep(container);
  });

  container.querySelector('#sort-spells-select')?.addEventListener('change', e => {
    spellFilters.sortBy = e.target.value;
    renderSpellcastingStep(container);
  });

  const addFilterSelect = container.querySelector('#add-filter-select');
  if (addFilterSelect) {
    addFilterSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key) {
        spellFilters.activeFilters = spellFilters.activeFilters ?? [];
        if (!spellFilters.activeFilters.includes(key)) {
          spellFilters.activeFilters.push(key);
        }
      }
      renderSpellcastingStep(container);
    });
  }

  container.querySelectorAll('.remove-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.filterKey;
      spellFilters.activeFilters = (spellFilters.activeFilters ?? []).filter(k => k !== key);
      resetFilterValue(key);
      renderSpellcastingStep(container);
    });
  });

  container.querySelector('#manual-spells-check')?.addEventListener('change', e => {
    state.manualSpells = e.target.checked;
    renderSpellcastingStep(container);
    updateSummary();
  });

  container.querySelector('#add-custom-cantrip')?.addEventListener('click', () => {
    const current = state.spellcasting?.cantrips ?? [];
    if (current.length >= 5) { showToast('Maximum 5 cantrips allowed by the character sheet.', 'error'); return; }
    if (potentialRemaining < 10 && !state.manualSpells) {
      showToast(`Requires 10 Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`, 'error');
      return;
    }
    const name = prompt('Enter custom cantrip name:');
    if (!name) return;
    state.spellcasting = { ...state.spellcasting, cantrips: [...current, name] };
    renderSpellcastingStep(container);
    updateSummary();
  });

  container.querySelector('#add-custom-spell')?.addEventListener('click', () => {
    const name = prompt('Enter custom spell name:');
    if (!name) return;
    const levelStr = prompt('Spell level (1-9):');
    const level = parseInt(levelStr, 10);
    if (!level || level < 1 || level > 9) { showToast('Invalid spell level!', 'error'); return; }
    
    const current = state.spellcasting?.spells ?? [];
    const cost = 10 * level;
    if (potentialRemaining < cost && !state.manualSpells) {
      showToast(`Requires ${cost} Potential, but you only have ${potentialRemaining} remaining. Set to manual to bypass.`, 'error');
      return;
    }
    state.spellcasting = { ...state.spellcasting, spells: [...current, { name, level }] };
    renderSpellcastingStep(container);
    updateSummary();
  });

  const searchInput = container.querySelector('#spell-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      spellFilters.searchQuery = e.target.value;
      const cursorStart = searchInput.selectionStart;
      const cursorEnd = searchInput.selectionEnd;
      renderSpellcastingStep(container);
      const newSearchInput = container.querySelector('#spell-search-input');
      if (newSearchInput) {
        newSearchInput.focus();
        newSearchInput.setSelectionRange(cursorStart, cursorEnd);
      }
    });
  }
}

// ── Step: Equipment ───────────────────────────────────────────────────────────

function getItemGoldCost(item) {
  if (!item.cost) return 0;
  const parsed = parseInt(item.cost.replace(/[^\d]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function renderEquipmentStep(container) {
  // Calculate gold spent
  let goldSpent = 0;
  (state.equipmentList ?? []).forEach(item => {
    goldSpent += getItemGoldCost(item);
  });
  const goldLimit = state.goldAmount ?? 0;
  const goldRemaining = goldLimit - goldSpent;

  const totalItemsCount = (state.equipmentList ?? []).length;
  const sheetLimitWarning = totalItemsCount > 21
    ? `<div class="warning-badge" style="color: #cf721c; margin-top: 1rem; font-size: 0.85rem; font-weight: bold;">⚠️ Note: The physical PDF sheet can only display the first 21 items.</div>`
    : '';

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">⚔️ Equipment</h2>
      <p class="step-desc">Choose starting weapons and armor, or add custom items.</p>
    </div>
    
    <div class="manual-override-control" style="margin-bottom: 1.5rem;">
      <label class="checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="manual-equipment-check" ${state.manualEquipment ? 'checked' : ''}>
        <strong>Manual Equipment Override (Ignore starting gold cost limits)</strong>
      </label>
    </div>

    <div class="point-buy-tracker ${goldRemaining < 0 ? 'over-budget' : ''}" style="margin-bottom: 1.5rem;">
      <span>Gold Remaining:</span>
      <strong>${goldRemaining} gp</strong>
      <span>/ ${goldLimit} gp</span>
    </div>

    <div class="section-block">
      <h3 class="section-title">Weapons</h3>
      <div class="equipment-list" id="weapon-list">
        ${buildEquipmentList(WEAPONS ?? [], 'weapon', goldRemaining)}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-weapon">+ Add Custom Weapon</button>
    </div>
    <div class="section-block">
      <h3 class="section-title">Armor</h3>
      <div class="equipment-list" id="armor-list">
        ${buildEquipmentList(ARMORS ?? [], 'armor', goldRemaining)}
      </div>
    </div>
    <div class="section-block">
      <h3 class="section-title">Other Items</h3>
      <div id="other-items-list">
        ${buildOtherItemsList()}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-item">+ Add Item</button>
      ${sheetLimitWarning}
    </div>
  `;

  bindEquipmentEvents(container);
}

function buildEquipmentList(items, type, goldRemaining) {
  const selected = (state.equipmentList ?? []).map(i => i.name);
  return items.map(item => {
    const name = item.name;
    const isSelected = selected.includes(name);
    const cost = getItemGoldCost(item);
    const canAfford = isSelected || (goldRemaining >= cost);
    const isDisabled = !isSelected && !canAfford && !state.manualEquipment;

    let tooltip = '';
    if (isDisabled) {
      tooltip = `Cannot afford this item (costs ${cost} gp, but you only have ${goldRemaining} gp remaining). Set to manual to bypass.`;
    } else {
      if (type === 'weapon') {
        tooltip = `Cost: ${item.cost} | Damage: ${item.damage} | Weight: ${item.weight} | Properties: ${item.properties}`;
      } else {
        tooltip = `Cost: ${item.cost} | Category: ${item.category} | AV: ${item.av} | Weight: ${item.weight} lbs | Stealth: ${item.stealth}`;
      }
    }

    return `
      <div class="equipment-entry ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
           data-item="${name}" 
           data-type="${type}" 
           id="equip-${type}-${name.replace(/\s/g,'-')}"
           ${tooltip ? `title="${tooltip}"` : ''}
           style="${isDisabled ? 'opacity: 0.5; cursor: not-allowed; pointer-events: none;' : ''}">
        <span class="equip-name">${name}</span>
        <span class="equip-detail">${item.damage ?? (item.av ? `AV ${item.av}` : '')} ${item.weight ? `· ${item.weight}` : ''}</span>
      </div>
    `;
  }).join('');
}

function buildOtherItemsList() {
  const others = (state.equipmentList ?? []).filter(i => !i.isWeapon && !i.isArmor);
  return others.map((item, i) => `
    <div class="other-item" id="other-item-${i}">
      <span>${item.name} ${item.quantity > 1 ? `×${item.quantity}` : ''}</span>
      <button class="btn-icon remove-item" data-idx="${i}">✕</button>
    </div>
  `).join('');
}

function bindEquipmentEvents(container) {
  container.querySelectorAll('.equipment-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      const name = entry.dataset.item;
      const type = entry.dataset.type;
      const existing = (state.equipmentList ?? []).find(i => i.name === name);

      if (existing) {
        state.equipmentList = (state.equipmentList ?? []).filter(i => i.name !== name);
      } else {
        const itemData = type === 'weapon'
          ? (WEAPONS ?? []).find(w => w.name === name)
          : (ARMORS ?? []).find(a => a.name === name);

        state.equipmentList = [...(state.equipmentList ?? []), {
          ...itemData,
          isWeapon: type === 'weapon',
          isArmor: type === 'armor',
          quantity: 1
        }];
      }
      renderEquipmentStep(container);
      updateSummary();
    });
  });

  container.querySelector('#manual-equipment-check')?.addEventListener('change', e => {
    state.manualEquipment = e.target.checked;
    renderEquipmentStep(container);
    updateSummary();
  });

  container.querySelector('#add-custom-weapon')?.addEventListener('click', () => {
    const name = prompt('Weapon name:');
    if (!name) return;
    const damage = prompt('Damage (e.g. 1d8 Slashing):') ?? '';
    const hit = prompt('Hit bonus (e.g. +4):') ?? '';
    const range = prompt('Range (e.g. 5 ft):') ?? '';
    state.equipmentList = [...(state.equipmentList ?? []), { name, damage, hit, range, isWeapon: true, quantity: 1 }];
    renderEquipmentStep(container);
  });

  container.querySelector('#add-custom-item')?.addEventListener('click', () => {
    const name = prompt('Item name:');
    if (!name) return;
    const weight = parseFloat(prompt('Weight (lbs, 0 if unknown):') ?? '0');
    const qty = parseInt(prompt('Quantity:') ?? '1', 10);
    state.equipmentList = [...(state.equipmentList ?? []), { name, weight, quantity: qty || 1 }];
    renderEquipmentStep(container);
    updateSummary();
  });

  container.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const others = (state.equipmentList ?? []).filter(i => !i.isWeapon && !i.isArmor);
      const toRemove = others[idx];
      state.equipmentList = (state.equipmentList ?? []).filter(i => i !== toRemove);
      renderEquipmentStep(container);
      updateSummary();
    });
  });
}

// ── Step: Finishing Touches ───────────────────────────────────────────────────

function renderFinishingStep(container) {
  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">✅ Finishing Touches</h2>
      <p class="step-desc">Finalize your character's backstory, then export your character sheet.</p>
    </div>
    <div class="form-group">
      <label for="personality-backstory">Personality & Backstory</label>
      <textarea id="personality-backstory" class="textarea" rows="8"
                placeholder="Describe your character's personality, goals, fears, and history...">${state.personalityBackstory ?? ''}</textarea>
    </div>
    <div class="form-group">
      <label>Custom Features / Notes</label>
      <textarea id="custom-features" class="textarea" rows="4"
                placeholder="Any custom abilities, special rules, or DM notes...">${(state.customFeatures ?? []).join('\n')}</textarea>
    </div>
    <div class="finishing-summary">
      ${buildCharacterSummaryHTML()}
    </div>
    <div class="export-actions">
      <button class="btn btn-accent" id="btn-final-export-json">💾 Save Character JSON</button>
      <button class="btn btn-primary" id="btn-final-export-pdf">📄 Export PDF Character Sheet</button>
    </div>
  `;

  container.querySelector('#personality-backstory')?.addEventListener('input', e => {
    state.personalityBackstory = e.target.value;
  });

  container.querySelector('#custom-features')?.addEventListener('input', e => {
    state.customFeatures = e.target.value.split('\n').filter(Boolean);
  });

  container.querySelector('#btn-final-export-json')?.addEventListener('click', handleExportJSON);
  container.querySelector('#btn-final-export-pdf')?.addEventListener('click', handleExportPDF);
}

// ── Character Summary Panel ───────────────────────────────────────────────────

function updateSummary() {
  const finalStats = getFinalCharacteristics(state, RACES);
  state.potentialGained = calculatePotentialGained(state, ORIGINS);
  state.hpBonus = calculateHPBonus(state, ORIGINS, finalStats);

  const content = document.getElementById('summary-content');
  if (!content) return;
  content.innerHTML = buildCharacterSummaryHTML();
}

function buildCharacterSummaryHTML() {
  const finalStats = getFinalCharacteristics(state, RACES);
  const profBonus = getProficiencyBonus(state.level);
  const apLimit = getTotalAccomplishmentPointsLimit(state);
  const { totalSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
  const apRemaining = apLimit - totalSpent;

  return `
    <div class="summary-ap-banner ${apRemaining < 0 ? 'over-budget' : ''}" style="
      background: ${apRemaining < 0 ? 'rgba(235, 94, 85, 0.15)' : 'rgba(148, 161, 255, 0.12)'};
      border: 1px solid ${apRemaining < 0 ? '#eb5e55' : 'rgba(148, 161, 255, 0.3)'};
      border-radius: 8px;
      padding: 0.85rem;
      text-align: center;
      margin-bottom: 1.5rem;
    ">
      <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #a0a5c0; margin-bottom: 0.25rem;">Accomplishment Points</div>
      <div style="font-size: 1.6rem; font-weight: bold; color: ${apRemaining < 0 ? '#eb5e55' : '#ffffff'};">
        ${apRemaining} <span style="font-size: 0.9rem; font-weight: normal; color: #a0a5c0;">/ ${apLimit} Remaining</span>
      </div>
    </div>

    <div class="summary-row">
      <span class="summary-label">Name</span>
      <span class="summary-val">${state.characterName || '—'}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Race</span>
      <span class="summary-val">${state.race === 'Custom' ? state.customRace?.name : state.race || '—'} ${state.subrace ? `(${state.subrace})` : ''}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Background</span>
      <span class="summary-val">${state.background === 'Custom' ? state.customBackground?.name : state.background || '—'}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Primary Ability Origin</span>
      <span class="summary-val">${state.primaryAO === 'Custom' ? state.customPrimaryAO?.name : state.primaryAO || '—'}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Level / Prof</span>
      <span class="summary-val">${state.level} / +${profBonus}</span>
    </div>
    <div class="summary-stats">
      ${CHARACTERISTICS.map(c => {
        const score = finalStats[c.key] ?? 10;
        const mod = getCharacteristicModifier(score);
        return `<div class="summary-stat">
          <div class="summary-stat-key">${c.short}</div>
          <div class="summary-stat-score">${score}</div>
          <div class="summary-stat-mod">${mod >= 0 ? '+' : ''}${mod}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ── Import / Export ───────────────────────────────────────────────────────────

function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      state = importCharacterJSON(ev.target.result);
      currentStep = 0;
      renderStep(currentStep);
      renderStepNav();
      updateSummary();
      showToast('Character imported successfully!', 'success');
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function handleExportJSON() {
  const json = exportCharacterJSON(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.characterName || 'frostmark-character'}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Character saved as JSON!', 'success');
}

async function handleExportPDF() {
  try {
    showToast('Generating PDF...', 'info');
    const pdfBytes = await exportToPDF(state, RACES, BACKGROUNDS);
    downloadPDF(pdfBytes, `${state.characterName || 'frostmark-character'}.pdf`);
    showToast('PDF exported!', 'success');
  } catch (err) {
    showToast(`PDF export failed: ${err.message}`, 'error');
    console.error(err);
  }
}

// ── Toast Notifications ───────────────────────────────────────────────────────

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bindInput(id, handler) {
  document.getElementById(id)?.addEventListener('input', e => handler(e.target.value));
}

function bindSelect(id, handler) {
  document.getElementById(id)?.addEventListener('change', e => handler(e.target.value));
}

function bindNumber(id, handler) {
  document.getElementById(id)?.addEventListener('input', e => handler(parseInt(e.target.value, 10) || 1));
}
