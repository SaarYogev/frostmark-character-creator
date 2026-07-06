import { CHARACTERISTICS, SKILLS, ACADEMICS_FIELDS, SKILL_RANK_CUMULATIVE_COSTS } from '../data/constants.js';
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
  importCharacterJSON
} from './state.js';
import { exportToPDF, downloadPDF } from './pdf.js';
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
  { id: 'spellcasting',   title: 'Spellcasting',         icon: '🔮' },
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
        <img src="./frostmark-logo.png" alt="Frostmark" class="sidebar-logo">
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
  if (stepId === 'spellcasting' && !state.primaryAO) {
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
  bindNumber('char-level', v => { state.level = v; updateSummary(); });
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
  return `
    <h3>${bg.name}</h3>
    <p>${bg.desc ?? ''}</p>
    <p><strong>Starting Gold:</strong> ${bg.gold}gp | <strong>Equipment:</strong> ${bg.equipment ?? 'Varies'}</p>
    <p><strong>Free Skill:</strong> ${bg.skill ?? 'Player\'s choice'}</p>
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
      <p class="form-hint">Secondary AO cannot be the same as primary. You use the lower HD of the two.</p>
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

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🎯 Skills</h2>
      <p class="step-desc">Assign skill ranks using Accomplishment Points. Each rank multiplies your proficiency bonus.</p>
    </div>
    <div class="point-buy-tracker ${remaining < 0 ? 'over-budget' : ''}">
      <span>Free Skill Points Used:</span>
      <strong id="skill-points-used">${spentSkillPoints}</strong>
      <span>/ ${freeSkillPoints}</span>
      <span class="tracker-note">(4 from BG + ${freeSkillPoints - 4} from AO${remaining < 0 ? ' — extra will cost AP' : ''})</span>
    </div>
    <div class="skills-grid" id="skills-grid">
      ${SKILLS.map(skill => buildSkillRow(skill, finalStats, profBonus)).join('')}
    </div>
    <div class="section-divider">Academics (choose up to 3 fields)</div>
    <div id="academics-section">
      ${buildAcademicsSection(finalStats, profBonus)}
    </div>
  `;

  SKILLS.forEach(skill => {
    container.querySelector(`#skill-minus-${skill.key}`)?.addEventListener('click', () => adjustSkill(skill.name, -1, container));
    container.querySelector(`#skill-plus-${skill.key}`)?.addEventListener('click', () => adjustSkill(skill.name, 1, container));
  });

  bindAcademicsEvents(container, finalStats, profBonus);
}

function computeFreeSkillPoints() {
  const bgFree = 4;
  const primaryOrigin = ORIGINS.find(o => o.name === state.primaryAO);
  const secondaryOrigin = ORIGINS.find(o => o.name === state.secondaryAO);
  const primaryExtra = state.primaryAO === 'Custom' ? (state.customPrimaryAO?.extraSkills ?? 0) : (primaryOrigin?.extraSkills ?? 0);
  const secondaryExtra = state.secondaryAO === 'Custom' ? (state.customSecondaryAO?.extraSkills ?? 0) : (secondaryOrigin?.extraSkills ?? 0);
  return bgFree + primaryExtra + secondaryExtra;
}

function computeSpentSkillPoints() {
  let total = 0;
  for (const sk in state.skillRanks) {
    const rank = state.skillRanks[sk] ?? 0;
    total += SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0;
  }
  for (const sk in state.academicsRanks) {
    const rank = state.academicsRanks[sk] ?? 0;
    total += SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0;
  }
  return total;
}

function buildSkillRow(skill, finalStats, profBonus) {
  const rank = state.skillRanks?.[skill.name] ?? 0;
  const [stat1, stat2] = skill.stats;
  const mod1 = getCharacteristicModifier(finalStats[stat1] ?? 10);
  const mod2 = stat2 ? getCharacteristicModifier(finalStats[stat2] ?? 10) : null;

  const rankBonus = rankBonusValue(profBonus, rank);
  const total1 = mod1 + rankBonus;
  const total2 = mod2 !== null ? mod2 + rankBonus : null;

  return `
    <div class="skill-row" id="skill-row-${skill.key}">
      <div class="skill-name">${skill.name}</div>
      <div class="skill-stats">
        <span class="stat-tag">${stat1.slice(0, 3)}: ${total1 >= 0 ? '+' : ''}${total1}</span>
        ${total2 !== null ? `<span class="stat-tag">${stat2.slice(0, 3)}: ${total2 >= 0 ? '+' : ''}${total2}</span>` : ''}
      </div>
      <div class="rank-controls">
        <button class="rank-btn" id="skill-minus-${skill.key}" ${rank <= 0 ? 'disabled' : ''}>−</button>
        <div class="rank-pips">
          ${[1,2,3,4,5].map(n => `<div class="pip ${n <= rank ? 'filled' : ''}"></div>`).join('')}
        </div>
        <button class="rank-btn" id="skill-plus-${skill.key}" ${rank >= 5 ? 'disabled' : ''}>+</button>
      </div>
      <div class="skill-cost">Cost: ${SKILL_RANK_CUMULATIVE_COSTS[rank] ?? 0} pts</div>
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
  const current = state.skillRanks?.[skillName] ?? 0;
  const next = Math.max(0, Math.min(5, current + delta));
  state.skillRanks = { ...state.skillRanks, [skillName]: next };
  renderSkillsStep(container);
  updateSummary();
}

function buildAcademicsSection(finalStats, profBonus) {
  const intMod = getCharacteristicModifier(finalStats.Intelligence ?? 10);
  const cunMod = getCharacteristicModifier(finalStats.Cunning ?? 10);

  return `
    <p class="form-hint">Select academic fields and assign ranks. The ranks use the same cost structure as skills.</p>
    <div class="academics-fields">
      ${ACADEMICS_FIELDS.map(field => {
        const isSelected = (state.academicsFields ?? []).includes(field);
        const rank = state.academicsRanks?.[field] ?? 0;
        const rankBonus = rankBonusValue(profBonus, rank);
        return `
          <div class="academic-entry ${isSelected ? 'selected' : ''}" id="aca-entry-${field}">
            <div class="academic-header">
              <input type="checkbox" id="aca-check-${field}" ${isSelected ? 'checked' : ''} 
                     ${!isSelected && (state.academicsFields?.length ?? 0) >= 3 ? 'disabled' : ''}>
              <label for="aca-check-${field}" class="academic-name">${field}</label>
            </div>
            ${isSelected ? `
              <div class="rank-controls">
                <button class="rank-btn" id="aca-minus-${field}" ${rank <= 0 ? 'disabled' : ''}>−</button>
                <div class="rank-pips">
                  ${[1,2,3,4,5].map(n => `<div class="pip ${n <= rank ? 'filled' : ''}"></div>`).join('')}
                </div>
                <button class="rank-btn" id="aca-plus-${field}" ${rank >= 5 ? 'disabled' : ''}>+</button>
              </div>
              <span class="stat-tag">Int: ${intMod + rankBonus >= 0 ? '+' : ''}${intMod + rankBonus} | Cun: ${cunMod + rankBonus >= 0 ? '+' : ''}${cunMod + rankBonus}</span>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function bindAcademicsEvents(container, finalStats, profBonus) {
  ACADEMICS_FIELDS.forEach(field => {
    container.querySelector(`#aca-check-${field}`)?.addEventListener('change', e => {
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
      state.academicsRanks = { ...state.academicsRanks, [field]: Math.min(5, rank + 1) };
      renderSkillsStep(container);
    });
  });
}

// ── Step: Proficiencies & AP ──────────────────────────────────────────────────

function renderProficienciesStep(container) {
  const apLimit = getTotalAccomplishmentPointsLimit(state);
  const { totalSpent, skillsSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
  const overFreeSkills = Math.max(0, computeSpentSkillPoints() - computeFreeSkillPoints());
  const totalAPSpent = totalSpent + overFreeSkills;
  const remaining = apLimit - totalAPSpent;

  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🛡️ Proficiencies & Accomplishment Points</h2>
      <p class="step-desc">Use AP to buy saving throw proficiencies, armor/weapon proficiencies, and extra gold.</p>
    </div>
    <div class="point-buy-tracker ${remaining < 0 ? 'over-budget' : ''}">
      <span>AP Remaining:</span>
      <strong>${remaining}</strong>
      <span>/ ${apLimit}</span>
    </div>

    <div class="section-block">
      <h3 class="section-title">Saving Throw Proficiencies</h3>
      <div class="proficiency-grid">
        ${CHARACTERISTICS.map(c => `
          <label class="prof-toggle ${state.savingThrowsProficient?.[c.key] ? 'active' : ''}" id="save-toggle-${c.key}">
            <input type="checkbox" id="save-check-${c.key}" ${state.savingThrowsProficient?.[c.key] ? 'checked' : ''}>
            ${c.key}
          </label>
        `).join('')}
      </div>
    </div>

    <div class="section-block">
      <h3 class="section-title">Armor Proficiencies</h3>
      <p class="form-hint">Light=1 AP, Medium=2 AP, Heavy=3 AP, Shields=1 AP</p>
      <div class="proficiency-grid">
        ${['Light', 'Medium', 'Heavy', 'Shields'].map(a => `
          <label class="prof-toggle ${state.armorProficiencies?.[a] ? 'active' : ''}" id="armor-toggle-${a}">
            <input type="checkbox" id="armor-check-${a}" ${state.armorProficiencies?.[a] ? 'checked' : ''}>
            ${a}
          </label>
        `).join('')}
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

function renderSpellcastingStep(container) {
  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">🔮 Spellcasting</h2>
      <p class="step-desc">Select cantrips and spells you know. You can add custom spells not listed here.</p>
    </div>
    <div class="section-block">
      <h3 class="section-title">Cantrips (up to 5)</h3>
      <div class="spell-list" id="cantrip-list">
        ${buildSpellList('cantrips', CANTRIPS ?? [])}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-cantrip">+ Add Custom Cantrip</button>
    </div>
    <div class="section-block">
      <h3 class="section-title">Spells</h3>
      <div class="spell-list" id="spell-list">
        ${buildSpellList('spells', SPELLS ?? [])}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-spell">+ Add Custom Spell</button>
    </div>
  `;

  bindSpellEvents(container);
}

function buildSpellList(type, allSpells) {
  const selected = type === 'cantrips'
    ? (state.spellcasting?.cantrips ?? []).map(s => typeof s === 'string' ? s : s.name)
    : (state.spellcasting?.spells ?? []).map(s => s.name ?? s);

  return allSpells.map(spell => {
    const name = spell.name ?? spell;
    const isSelected = selected.includes(name);
    return `
      <div class="spell-entry ${isSelected ? 'selected' : ''}" data-spell="${name}" data-type="${type}" id="spell-${type}-${name.replace(/\s/g, '-')}">
        <span class="spell-name">${name}</span>
        ${spell.level ? `<span class="spell-level-tag">Lv.${spell.level}</span>` : '<span class="spell-level-tag">Cantrip</span>'}
        ${spell.desc ? `<span class="spell-desc">${spell.desc}</span>` : ''}
      </div>
    `;
  }).join('');
}

function bindSpellEvents(container) {
  container.querySelectorAll('.spell-entry').forEach(entry => {
    entry.addEventListener('click', () => {
      const name = entry.dataset.spell;
      const type = entry.dataset.type;

      if (type === 'cantrips') {
        const current = state.spellcasting?.cantrips ?? [];
        if (current.includes(name)) {
          state.spellcasting = { ...state.spellcasting, cantrips: current.filter(c => c !== name) };
        } else if (current.length < 5) {
          state.spellcasting = { ...state.spellcasting, cantrips: [...current, name] };
        } else {
          showToast('Maximum 5 cantrips allowed!', 'error');
          return;
        }
      } else {
        const current = state.spellcasting?.spells ?? [];
        const existing = current.find(s => (s.name ?? s) === name);
        if (existing) {
          state.spellcasting = { ...state.spellcasting, spells: current.filter(s => (s.name ?? s) !== name) };
        } else {
          const spellData = SPELLS?.find(s => (s.name ?? s) === name);
          state.spellcasting = { ...state.spellcasting, spells: [...current, { name, level: spellData?.level ?? 1 }] };
        }
      }
      entry.classList.toggle('selected');
    });
  });

  container.querySelector('#add-custom-cantrip')?.addEventListener('click', () => {
    const name = prompt('Enter custom cantrip name:');
    if (!name) return;
    const current = state.spellcasting?.cantrips ?? [];
    if (current.length >= 5) { showToast('Maximum 5 cantrips!', 'error'); return; }
    state.spellcasting = { ...state.spellcasting, cantrips: [...current, name] };
    renderSpellcastingStep(container);
  });

  container.querySelector('#add-custom-spell')?.addEventListener('click', () => {
    const name = prompt('Enter custom spell name:');
    if (!name) return;
    const levelStr = prompt('Spell level (1-9):');
    const level = parseInt(levelStr, 10);
    if (!level || level < 1 || level > 9) { showToast('Invalid spell level!', 'error'); return; }
    const current = state.spellcasting?.spells ?? [];
    state.spellcasting = { ...state.spellcasting, spells: [...current, { name, level }] };
    renderSpellcastingStep(container);
  });
}

// ── Step: Equipment ───────────────────────────────────────────────────────────

function renderEquipmentStep(container) {
  container.innerHTML = `
    <div class="step-header">
      <h2 class="step-title">⚔️ Equipment</h2>
      <p class="step-desc">Choose starting weapons and armor, or add custom items.</p>
    </div>
    <div class="section-block">
      <h3 class="section-title">Weapons</h3>
      <div class="equipment-list" id="weapon-list">
        ${buildEquipmentList(WEAPONS ?? [], 'weapon')}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-weapon">+ Add Custom Weapon</button>
    </div>
    <div class="section-block">
      <h3 class="section-title">Armor</h3>
      <div class="equipment-list" id="armor-list">
        ${buildEquipmentList(ARMORS ?? [], 'armor')}
      </div>
    </div>
    <div class="section-block">
      <h3 class="section-title">Other Items</h3>
      <div id="other-items-list">
        ${buildOtherItemsList()}
      </div>
      <button class="btn btn-ghost btn-sm" id="add-custom-item">+ Add Item</button>
    </div>
  `;

  bindEquipmentEvents(container);
}

function buildEquipmentList(items, type) {
  const selected = (state.equipmentList ?? []).map(i => i.name);
  return items.map(item => {
    const name = item.name;
    const isSelected = selected.includes(name);
    return `
      <div class="equipment-entry ${isSelected ? 'selected' : ''}" data-item="${name}" data-type="${type}" id="equip-${type}-${name.replace(/\s/g,'-')}">
        <span class="equip-name">${name}</span>
        <span class="equip-detail">${item.damage ?? item.baseAC ?? ''} ${item.weight ? `· ${item.weight} lbs` : ''}</span>
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
        entry.classList.remove('selected');
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
        entry.classList.add('selected');
      }
      updateSummary();
    });
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
  const content = document.getElementById('summary-content');
  if (!content) return;
  content.innerHTML = buildCharacterSummaryHTML();
}

function buildCharacterSummaryHTML() {
  const finalStats = getFinalCharacteristics(state, RACES);
  const profBonus = getProficiencyBonus(state.level);
  const apLimit = getTotalAccomplishmentPointsLimit(state);
  const { totalSpent } = calculateSpentAccomplishmentPoints(state, BACKGROUNDS);
  const apRemaining = apLimit - totalSpent - Math.max(0, computeSpentSkillPoints() - computeFreeSkillPoints());

  return `
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
      <span class="summary-label">Primary AO</span>
      <span class="summary-val">${state.primaryAO === 'Custom' ? state.customPrimaryAO?.name : state.primaryAO || '—'}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Level / Prof</span>
      <span class="summary-val">${state.level} / +${profBonus}</span>
    </div>
    <div class="summary-row ${apRemaining < 0 ? 'over-budget' : ''}">
      <span class="summary-label">AP Remaining</span>
      <span class="summary-val">${apRemaining} / ${apLimit}</span>
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
