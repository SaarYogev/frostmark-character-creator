import { BACKGROUNDS } from '../../js/data/backgrounds';
import {
  getTotalAccomplishmentPointsLimit,
  calculateSpentAccomplishmentPoints,
} from '../../js/logic/state';

export function getSanitizedState(state: any) {
  return {
    ...state,
    background: typeof state.background === 'object' ? state.background?.name : state.background,
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
    skillRanks: state.skills?.skillRanks ?? state.skillRanks ?? {},
    academicsEntries: state.skills?.academicsEntries ?? state.academicsEntries ?? [],
    artsCraftEntries: state.skills?.artsCraftEntries ?? state.artsCraftEntries ?? [],
  };
}

export function getGlobalAPSummary(state: any) {
  const sanitizedState = getSanitizedState(state);
  const apLimit = getTotalAccomplishmentPointsLimit(sanitizedState) || 16;
  const apResult = calculateSpentAccomplishmentPoints(sanitizedState, BACKGROUNDS);
  const totalSpent = (typeof apResult === 'number' ? apResult : apResult?.totalSpent) || 0;
  const apRemaining = apLimit - totalSpent;

  return {
    apLimit,
    totalSpent,
    apRemaining,
    sanitizedState,
  };
}
