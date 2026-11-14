import { describe, it, expect } from 'vitest';
import { characterReducer, DEFAULT_CHARACTER } from '../src/types/Character';
import { getGlobalAPSummary } from '../src/utils/stateSanitizer';
import { levelUp } from '../src/logic/levelUp';
import { exportCharacterJSON } from '../src/logic/state';
import { ORIGINS } from '../src/data/origins';
import { BACKGROUNDS } from '../src/data/backgrounds';
import { RACES } from '../src/data/races';

describe('Locking and Incremental AP Calculations', () => {
  it('locks imported character choices and calculates AP from locked baseline without penalizing adventuring gold', () => {
    // Progressed character: Level 3 Heroic, Hunter background (10gp default), 50gp acquired,
    // 6 skills (18 pts total, 14 net after 4 bg free), 2 saves (Brawn + Presence = 2 pts).
    // Total spent at creation = 16 AP. Budget = 16 AP.
    const importedCharacter: any = {
      isImported: true,
      campaignPowerLevel: 'Heroic',
      identity: {
        characterName: 'Adventurer',
        level: 3,
        campaignPowerLevel: 'Heroic',
      },
      background: {
        name: 'Hunter',
        freeSkillPoints: 4,
        gold: 10,
        restrictSkills: ['Animal Handling', 'Arts & Craft', 'Athletics', 'Perception', 'Stealth', 'Survival'],
      },
      ao: {
        primaryAO: 'Power',
        secondaryAO: 'Divine Oath',
        selectedAOs: ['Power', 'Divine Oath'],
        levelSelections: {
          1: { primaryAO: 'Power', secondaryAO: 'Power' },
          2: { primaryAO: 'Power', secondaryAO: 'Power' },
          3: { primaryAO: 'Power', secondaryAO: 'Divine Oath' },
        },
      },
      skills: {
        skillRanks: {
          'Animal Handling': 2,
          'Perception': 3,
          'Athletics': 3,
          'Stealth': 2,
          'Survival': 3,
          'Leadership': 2,
        },
      },
      proficiencies: {
        savingThrowsProficient: {
          Brawn: true,
          Presence: true,
        },
        armorProficiencies: {},
        weaponProficiencies: [],
        goldAmount: 50, // 50 gold from adventures
      },
      combat: {},
      spellcasting: {},
    };

    const state = characterReducer(DEFAULT_CHARACTER, { type: 'LOAD_STATE', payload: importedCharacter });

    // 1. Verify lockedChoices were populated upon loading the imported character
    expect(state.lockedChoices).toBeDefined();
    expect(state.lockedChoices?.skillRanks?.['Athletics']).toBe(3);
    expect(state.lockedChoices?.savingThrowsProficient?.['Brawn']).toBe(true);
    expect(state.lockedChoices?.goldAmount).toBe(50);

    // 2. Verify AP summary evaluates from locked baseline (0 AP remaining, NOT -2 AP)
    const summary = getGlobalAPSummary(state);
    expect(summary.apLimit).toBe(16);
    expect(summary.totalSpent).toBe(16);
    expect(summary.apRemaining).toBe(0);
  });

  it('preserves locked choices across state updates and charges AP only for increments above locked values', () => {
    const baseLockedState: any = {
      campaignPowerLevel: 'Heroic',
      identity: { level: 5, campaignPowerLevel: 'Heroic' },
      background: 'Hunter',
      skills: {
        skillRanks: { Athletics: 3 },
      },
      proficiencies: {
        savingThrowsProficient: { Brawn: true },
        goldAmount: 100,
      },
      lockedChoices: {
        skillRanks: { Athletics: 3 },
        savingThrowsProficient: { Brawn: true },
        goldAmount: 50,
        accomplishmentPointsRemaining: 2, // Gained +2 AP on level 5
        accomplishmentPointsLimit: 18,
      },
    };

    const state = characterReducer(DEFAULT_CHARACTER, { type: 'LOAD_STATE', payload: baseLockedState });
    const initialSummary = getGlobalAPSummary(state);
    expect(initialSummary.apRemaining).toBe(2);

    // Increasing Athletics from Rank 3 to Rank 4 costs 2 AP (cumulative 6 - 4 = 2)
    const stateWithRank4 = characterReducer(state, {
      type: 'SET_SKILLS',
      payload: {
        skillRanks: { Athletics: 4 },
      },
    });

    // Locked choices must not be wiped by SET_SKILLS
    expect(stateWithRank4.lockedChoices?.skillRanks?.['Athletics']).toBe(3);

    const summaryAfterRank4 = getGlobalAPSummary(stateWithRank4);
    // 2 initial AP remaining - 2 AP for rank 4 = 0 AP remaining
    expect(summaryAfterRank4.apRemaining).toBe(0);
    expect(summaryAfterRank4.totalSpent).toBe(18);

    // Gaining more gold (adventuring loot) does not consume AP
    const stateWithMoreGold = characterReducer(stateWithRank4, {
      type: 'SET_PROFICIENCIES',
      payload: {
        goldAmount: 250,
      },
    });
    const summaryAfterGold = getGlobalAPSummary(stateWithMoreGold);
    expect(summaryAfterGold.apRemaining).toBe(0);
  });

  it('locks choices and carries over AP appropriately upon levelUp', () => {
    const level4State: any = {
      campaignPowerLevel: 'Heroic',
      level: 4,
      identity: { level: 4, campaignPowerLevel: 'Heroic' },
      background: 'Hunter',
      skills: {
        skillRanks: { Athletics: 3, Survival: 2 },
      },
      proficiencies: {
        savingThrowsProficient: { Brawn: true },
        goldAmount: 75,
      },
      lockedChoices: {
        skillRanks: { Athletics: 3, Survival: 2 },
        savingThrowsProficient: { Brawn: true },
        goldAmount: 75,
        accomplishmentPointsRemaining: 0,
        accomplishmentPointsLimit: 16,
      },
    };

    // Level up to Level 5 (milestone level: grants +2 AP)
    const level5State = levelUp(level4State, ORIGINS, 'average');

    expect(level5State.identity.level).toBe(5);
    expect(level5State.lockedChoices).toBeDefined();
    expect(level5State.lockedChoices?.skillRanks?.['Athletics']).toBe(3);
    expect(level5State.lockedChoices?.goldAmount).toBe(75);
    // Milestone level 5 grants +2 AP
    expect(level5State.lockedChoices?.accomplishmentPointsRemaining).toBe(2);
    expect(level5State.lockedChoices?.accomplishmentPointsLimit).toBe(18);

    const summary = getGlobalAPSummary(level5State);
    expect(summary.apLimit).toBe(18);
    expect(summary.apRemaining).toBe(2);
  });

  it('exports lockedChoices and AP remaining in exportCharacterJSON and reloads them cleanly', () => {
    const charState: any = {
      campaignPowerLevel: 'Heroic',
      identity: { level: 3, characterName: 'Adventurer', campaignPowerLevel: 'Heroic' },
      background: 'Hunter',
      skills: {
        skillRanks: { Athletics: 3 },
      },
      proficiencies: {
        savingThrowsProficient: { Brawn: true },
        goldAmount: 50,
      },
      lockedChoices: {
        skillRanks: { Athletics: 3 },
        savingThrowsProficient: { Brawn: true },
        goldAmount: 50,
        accomplishmentPointsRemaining: 0,
        accomplishmentPointsLimit: 16,
      },
      accomplishmentPointsRemaining: 0,
    };

    const exportedJson = exportCharacterJSON(charState, RACES);
    const parsed = JSON.parse(exportedJson);

    expect(parsed.lockedChoices).toBeDefined();
    expect(parsed.lockedChoices.skillRanks.Athletics).toBe(3);
    expect(parsed.lockedChoices.goldAmount).toBe(50);
    expect(parsed.accomplishmentPointsRemaining).toBe(0);

    const reloaded = characterReducer(DEFAULT_CHARACTER, { type: 'LOAD_STATE', payload: parsed });
    const summary = getGlobalAPSummary(reloaded);
    expect(summary.apRemaining).toBe(0);
    expect(summary.apLimit).toBe(16);
  });

  it('loads imported character sheet with adventuring gold with 0 AP remaining (not -2 AP)', () => {
    const fs = require('fs');
    const path = 'test/imported_character_fixture.json';
    if (!fs.existsSync(path)) return;

    const raw = fs.readFileSync(path, 'utf8');
    const characterJson = JSON.parse(raw);

    const loadedState = characterReducer(DEFAULT_CHARACTER, { type: 'LOAD_STATE', payload: characterJson });

    expect(loadedState.lockedChoices).toBeDefined();
    expect(loadedState.lockedChoices?.skillRanks?.['Animal Handling']).toBe(2);
    expect(loadedState.lockedChoices?.skillRanks?.['Perception']).toBe(3);
    expect(loadedState.lockedChoices?.skillRanks?.['Athletics']).toBe(3);
    expect(loadedState.lockedChoices?.savingThrowsProficient?.['Brawn']).toBe(true);
    expect(loadedState.lockedChoices?.savingThrowsProficient?.['Presence']).toBe(true);
    expect(loadedState.lockedChoices?.goldAmount).toBe(50);

    const apSummary = getGlobalAPSummary(loadedState);
    expect(apSummary.apLimit).toBe(16);
    expect(apSummary.totalSpent).toBe(16);
    expect(apSummary.apRemaining).toBe(0);
  });
});
