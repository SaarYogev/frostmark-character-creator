import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import {
  getTotalAccomplishmentPointsLimit,
  calculateSpentAccomplishmentPoints,
} from '../logic/state';

export function getSanitizedState(state: any) {
  return {
    ...state,
    background: state.background,
    level: state.identity?.level ?? state.level ?? 1,
    campaignPowerLevel: state.identity?.campaignPowerLevel ?? state.campaignPowerLevel ?? 'Heroic',
    levelSelections: state.ao?.levelSelections ?? state.levelSelections ?? {},
    primaryAO: state.ao?.primaryAO ?? state.primaryAO,
    customPrimaryAO: state.ao?.customPrimaryAO ?? state.customPrimaryAO,
    customAOs: state.ao?.customAOs ?? state.customAOs,
    customBackground: state.background?.customBackground ?? state.customBackground,
    armorProficiencies: state.proficiencies?.armorProficiencies ?? state.armorProficiencies ?? {},
    savingThrowsProficient: state.proficiencies?.savingThrowsProficient ?? state.savingThrowsProficient ?? {},
    weaponProficiencies: state.proficiencies?.weaponProficiencies ?? state.weaponProficiencies ?? {},
    skillRanks: (() => {
      const raw = state.skills?.skillRanks ?? state.skillRanks ?? {};
      const res = { ...raw };
      if (res['Subtlety'] != null && res['Subterfuge'] == null) {
        res['Subterfuge'] = res['Subtlety'];
        delete res['Subtlety'];
      }
      return res;
    })(),
    academicsEntries: state.skills?.academicsEntries ?? state.academicsEntries ?? [],
    artsCraftEntries: state.skills?.artsCraftEntries ?? state.artsCraftEntries ?? [],
  };
}

export function getGlobalAPSummary(state: any) {
  const sanitizedState = getSanitizedState(state);
  const apLimit = state.importedMetadata?.accomplishmentPointsLimit ?? (getTotalAccomplishmentPointsLimit(sanitizedState) || 16);
  const apResult = calculateSpentAccomplishmentPoints(sanitizedState, BACKGROUNDS, ORIGINS);
  const totalSpent = (typeof apResult === 'number' ? apResult : apResult?.totalSpent) || 0;
  
  let apRemaining = apLimit - totalSpent;
  if (typeof state.importedMetadata?.accomplishmentPointsRemaining === 'number') {
    apRemaining = state.importedMetadata.accomplishmentPointsRemaining;
  } else if (typeof state.accomplishmentPointsRemaining === 'number') {
    apRemaining = state.accomplishmentPointsRemaining;
  }

  return {
    apLimit,
    totalSpent,
    apRemaining,
    sanitizedState,
  };
}
