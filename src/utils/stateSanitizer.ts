import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import {
  SKILLS,
  SKILL_RANK_CUMULATIVE_COSTS,
  SAVE_PROFICIENCY_COSTS,
  WEAPON_PROFICIENCY_COSTS,
} from '../data/constants';
import {
  getTotalAccomplishmentPointsLimit,
  calculateSpentAccomplishmentPoints,
} from '../logic/state';
import { getSelectedFeats } from '../data/feats';

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
    lockedChoices: state.lockedChoices,
    accomplishmentPointsRemaining: state.accomplishmentPointsRemaining,
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
  const lockedChoices = sanitizedState.lockedChoices;
  const hasLockedBaseline = Boolean(
    lockedChoices &&
    (lockedChoices.skillRanks ||
     lockedChoices.accomplishmentPointsRemaining !== undefined ||
     lockedChoices.savingThrowsProficient)
  );

  const currentAPLimit = getTotalAccomplishmentPointsLimit(sanitizedState) || 16;

  if (hasLockedBaseline && lockedChoices) {
    const lockedAPLimit = lockedChoices.accomplishmentPointsLimit ?? currentAPLimit;
    const deltaLimit = Math.max(0, currentAPLimit - lockedAPLimit);
    const lockedAPRemaining = lockedChoices.accomplishmentPointsRemaining ?? (typeof sanitizedState.accomplishmentPointsRemaining === 'number' ? sanitizedState.accomplishmentPointsRemaining : 0);

    // 1. Calculate delta skills cost
    let deltaSkillsCost = 0;
    const currentSkills = sanitizedState.skillRanks ?? {};
    const lockedSkills = lockedChoices.skillRanks ?? {};
    for (const skill of SKILLS) {
      const curRank = currentSkills[skill.name] ?? 0;
      const lkRank = lockedSkills[skill.name] ?? 0;
      if (curRank !== lkRank) {
        const curCost = SKILL_RANK_CUMULATIVE_COSTS[curRank] ?? 0;
        const lkCost = SKILL_RANK_CUMULATIVE_COSTS[lkRank] ?? 0;
        deltaSkillsCost += (curCost - lkCost);
      }
    }

    const currentAcademics: { name: string; rank: number }[] = sanitizedState.academicsEntries ?? [];
    const lockedAcademics: { name: string; rank: number }[] = lockedChoices.academicsEntries ?? [];
    const lockedAcadMap = new Map(lockedAcademics.map((a: any) => [a.name.toLowerCase(), a.rank]));
    for (const a of currentAcademics) {
      const lkRank = lockedAcadMap.get(a.name.toLowerCase()) ?? 0;
      const curCost = SKILL_RANK_CUMULATIVE_COSTS[a.rank] ?? 0;
      const lkCost = SKILL_RANK_CUMULATIVE_COSTS[lkRank] ?? 0;
      deltaSkillsCost += (curCost - lkCost);
    }
    const currentAcadSet = new Set(currentAcademics.map((a: any) => a.name.toLowerCase()));
    for (const a of lockedAcademics) {
      if (!currentAcadSet.has(a.name.toLowerCase())) {
        deltaSkillsCost -= (SKILL_RANK_CUMULATIVE_COSTS[a.rank] ?? 0);
      }
    }

    const currentArts: { name: string; rank: number }[] = sanitizedState.artsCraftEntries ?? [];
    const lockedArts: { name: string; rank: number }[] = lockedChoices.artsCraftEntries ?? [];
    const lockedArtsMap = new Map(lockedArts.map((a: any) => [a.name.toLowerCase(), a.rank]));
    for (const a of currentArts) {
      const lkRank = lockedArtsMap.get(a.name.toLowerCase()) ?? 0;
      const curCost = SKILL_RANK_CUMULATIVE_COSTS[a.rank] ?? 0;
      const lkCost = SKILL_RANK_CUMULATIVE_COSTS[lkRank] ?? 0;
      deltaSkillsCost += (curCost - lkCost);
    }
    const currentArtsSet = new Set(currentArts.map((a: any) => a.name.toLowerCase()));
    for (const a of lockedArts) {
      if (!currentArtsSet.has(a.name.toLowerCase())) {
        deltaSkillsCost -= (SKILL_RANK_CUMULATIVE_COSTS[a.rank] ?? 0);
      }
    }

    // 2. Calculate delta saves cost
    let deltaSavesCost = 0;
    const currentSaves = sanitizedState.savingThrowsProficient ?? {};
    const lockedSaves = lockedChoices.savingThrowsProficient ?? {};
    for (const save in SAVE_PROFICIENCY_COSTS) {
      const cur = Boolean(currentSaves[save]);
      const lk = Boolean(lockedSaves[save]);
      if (cur && !lk) {
        deltaSavesCost += (SAVE_PROFICIENCY_COSTS[save] || 1);
      } else if (!cur && lk) {
        deltaSavesCost -= (SAVE_PROFICIENCY_COSTS[save] || 1);
      }
    }

    // 3. Calculate delta armor cost
    let deltaArmorCost = 0;
    const currentArmor = sanitizedState.armorProficiencies ?? {};
    const lockedArmor = lockedChoices.armorProficiencies ?? {};
    const selectedFeats = getSelectedFeats(sanitizedState);
    const featArmorProfs = new Set<string>();
    const featWeaponProfs = new Set<string>();
    for (const { feat } of selectedFeats) {
      feat.armor_proficiencies?.forEach((p: string) => featArmorProfs.add(p));
      feat.weapon_proficiencies?.forEach((w: string) => featWeaponProfs.add(w.toLowerCase()));
    }
    const calcArmorCost = (armor: Record<string, boolean>) => {
      let c = 0;
      if (armor.Heavy && !featArmorProfs.has('Heavy')) c += 3;
      else if (armor.Medium && !featArmorProfs.has('Medium')) c += 2;
      else if (armor.Light && !featArmorProfs.has('Light')) c += 1;
      if (armor.Shields && !featArmorProfs.has('Shields')) c += 1;
      return c;
    };
    deltaArmorCost = calcArmorCost(currentArmor) - calcArmorCost(lockedArmor);

    // 4. Calculate delta weapons cost
    let deltaWeaponsCost = 0;
    const currentWeapons: string[] = Array.isArray(sanitizedState.weaponProficiencies) ? sanitizedState.weaponProficiencies : [];
    const lockedWeapons: string[] = Array.isArray(lockedChoices.weaponProficiencies) ? lockedChoices.weaponProficiencies : [];
    const calcWeaponCost = (weaps: string[]) => {
      let c = 0;
      for (const group of weaps) {
        if (featWeaponProfs.has(group.toLowerCase())) continue;
        if (group === 'Handpicked 2 Weapons' || group === 'Handpicked2' || WEAPON_PROFICIENCY_COSTS.Groups1pt.includes(group)) {
          c += 1;
        } else if (WEAPON_PROFICIENCY_COSTS.Groups2pt.includes(group)) {
          c += 2;
        } else if (WEAPON_PROFICIENCY_COSTS.Groups3pt.includes(group)) {
          c += 3;
        }
      }
      return c;
    };
    deltaWeaponsCost = calcWeaponCost(currentWeapons) - calcWeaponCost(lockedWeapons);

    const deltaSpent = deltaSkillsCost + deltaSavesCost + deltaArmorCost + deltaWeaponsCost;
    const apRemaining = lockedAPRemaining + deltaLimit - deltaSpent;
    const totalSpent = currentAPLimit - apRemaining;

    return {
      apLimit: currentAPLimit,
      totalSpent,
      apRemaining,
      sanitizedState,
    };
  }

  const apLimit = state.importedMetadata?.accomplishmentPointsLimit ?? (currentAPLimit || 16);
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
