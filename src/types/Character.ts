import { IdentityState, DEFAULT_IDENTITY } from './Identity';
import { RaceState, DEFAULT_RACE_STATE } from './Race';
import { Background, DEFAULT_BACKGROUND } from './Background';
import { BACKGROUNDS } from '../data/backgrounds';
import { RACES } from '../data/races';
import { ORIGINS } from '../data/origins';
import { getRacialStatBonuses } from '../logic/state';
import { levelUp } from '../logic/levelUp';
import { BaseCharacteristics, DEFAULT_BASE_CHARACTERISTICS } from './Ability';
import { AOState, DEFAULT_AO_STATE } from './AO';
import { SkillsState, DEFAULT_SKILLS_STATE } from './Skills';
import { deduplicateEquipmentList } from '../logic/equipmentUtils';

export interface CharacterState {
  campaignPowerLevel: 'Mundane' | 'Heroic' | 'Champion';
  identity: IdentityState;
  race: RaceState;
  background: Background;
  customBackground?: Background;
  baseCharacteristics: BaseCharacteristics;
  ao: AOState;
  skills: SkillsState;
  characterName?: string;
  playerName?: string;
  level?: number;
  maxHP?: number;
  currentHP?: number;
  tempHP?: number;
  armorClass?: number;
  hpBonus?: number;
  goldAmount?: number;
  silverAmount?: number;
  copperAmount?: number;
  equipmentList?: any[];
  manualSkills?: boolean;
  manualProficiencies?: boolean;
  manualEquipment?: boolean;
  manualAbilityScores?: boolean;
  manualHP?: boolean;
  manualSpells?: boolean;
  potentialGained?: number;
  combat?: Record<string, any>;
  customFeatures?: any[];
  importedPdfBytes?: Uint8Array | ArrayBuffer | string;
  importedMetadata?: {
    version?: number;
    accomplishmentPointsRemaining?: number;
    accomplishmentPointsLimit?: number;
    bgFreeRemaining?: number;
    aoFreeRemaining?: number;
    freeSkillPointsRemaining?: number;
  };
  accomplishmentPointsRemaining?: number;
  bgFreeRemaining?: number;
  aoFreeRemaining?: number;
  freeSkillPointsRemaining?: number;
  isImported?: boolean;
  [key: string]: any;
}

export const DEFAULT_CHARACTER: CharacterState = {
  campaignPowerLevel: 'Heroic',
  identity: DEFAULT_IDENTITY,
  race: DEFAULT_RACE_STATE,
  background: DEFAULT_BACKGROUND,
  baseCharacteristics: DEFAULT_BASE_CHARACTERISTICS,
  ao: DEFAULT_AO_STATE,
  skills: DEFAULT_SKILLS_STATE,
};

export type CharacterAction =
  | { type: 'SET_CAMPAIGN_POWER_LEVEL'; payload: 'Mundane' | 'Heroic' | 'Champion' }
  | { type: 'SET_IDENTITY'; payload: Partial<IdentityState> }
  | { type: 'SET_RACE'; payload: Partial<RaceState> }
  | { type: 'SET_BACKGROUND'; payload: Partial<Background> }
  | { type: 'SET_CUSTOM_BACKGROUND'; payload: Partial<Background> }
  | { type: 'SET_CHARACTERISTICS'; payload: Partial<BaseCharacteristics> }
  | { type: 'SET_AO'; payload: Partial<AOState> }
  | { type: 'SET_SKILLS'; payload: Partial<SkillsState> }
  | { type: 'SET_PROFICIENCIES'; payload: Record<string, unknown> }
  | { type: 'SET_SPELLCASTING'; payload: Record<string, unknown> }
  | { type: 'SET_EQUIPMENT'; payload: Record<string, unknown> }
  | { type: 'SET_MANUAL_SCORES'; payload: boolean }
  | { type: 'LEVEL_UP'; payload?: { hpChoice?: 'average' | 'roll'; rolledHp?: number; chosenAbilities?: { primaryAbility?: string; secondaryAbility?: string } } }
  | { type: 'SET_STATE'; payload: Record<string, unknown> }
  | { type: 'LOAD_STATE'; payload: CharacterState }
  | { type: 'RESET' };

export function resolveIdentityField(identityVal?: string, rootVal?: string): string {
  if (identityVal !== undefined && identityVal.trim() !== '') {
    return identityVal;
  }
  if (rootVal !== undefined && rootVal.trim() !== '') {
    return rootVal;
  }
  return identityVal ?? rootVal ?? '';
}

export function characterReducer(state: CharacterState, action: CharacterAction): CharacterState {
  switch (action.type) {
    case 'LOAD_STATE': {
      const p = action.payload as any;
      if (!p) return state;

      let raceName = '';
      if (typeof p.race === 'string') {
        raceName = p.race;
      } else if (p.race && typeof p.race === 'object') {
        raceName = p.race.race || p.race.name || state.race?.race || '';
      } else if (p.raceState?.race) {
        raceName = p.raceState.race;
      } else if (state.race?.race) {
        raceName = state.race.race;
      }

      let subraceName = '';
      if (p.race && typeof p.race === 'object' && typeof p.race.subrace === 'string') {
        subraceName = p.race.subrace;
      } else if (typeof p.subrace === 'string') {
        subraceName = p.subrace;
      } else if (p.raceState?.subrace && typeof p.raceState.subrace === 'string') {
        subraceName = p.raceState.subrace;
      } else if (state.race?.subrace) {
        subraceName = state.race.subrace;
      }

      /* Purge mismatched subraces belonging to other races (e.g. Garden Dwarf) while preserving custom or imported subraces */
      const raceDataObj = RACES.find((r) => r.name === raceName);
      if (raceDataObj && subraceName) {
        const isValidSubrace = raceDataObj.subraces?.some((sub) => sub.name === subraceName);
        const belongsToOtherRace = RACES.some((r) => r.name !== raceName && r.subraces?.some((sub) => sub.name === subraceName));
        if (!isValidSubrace && belongsToOtherRace) {
          subraceName = '';
        }
      }

      let bgName = '';
      let matchedBg: any = undefined;
      if (typeof p.background === 'string') {
        bgName = p.background;
        matchedBg = BACKGROUNDS.find((b) => b.name.toLowerCase() === bgName.toLowerCase());
      } else if (typeof p.background === 'object' && p.background !== null) {
        if (p.background.name) {
          bgName = p.background.name;
          matchedBg = BACKGROUNDS.find((b) => b.name.toLowerCase() === bgName.toLowerCase());
        }
        if (!matchedBg && p.background.trait) {
          matchedBg = BACKGROUNDS.find(
            (b) => b.trait && b.trait.toLowerCase() === p.background.trait.toLowerCase()
          );
          if (matchedBg) bgName = matchedBg.name;
        }
        if (!matchedBg && p.background.desc) {
          matchedBg = BACKGROUNDS.find(
            (b) => b.desc && b.desc.toLowerCase() === p.background.desc.toLowerCase()
          );
          if (matchedBg) bgName = matchedBg.name;
        }
      }

      if (!bgName && state.background?.name) {
        bgName = state.background.name;
        matchedBg = BACKGROUNDS.find((b) => b.name.toLowerCase() === bgName.toLowerCase());
      }
      const primaryAO = p.primaryAO ?? p.ao?.primaryAO ?? state.ao?.primaryAO ?? '';
      const secondaryAO = p.secondaryAO ?? p.ao?.secondaryAO ?? state.ao?.secondaryAO ?? '';
      const selectedAOs = p.selectedAOs ?? p.ao?.selectedAOs ?? state.ao?.selectedAOs ?? (primaryAO ? [primaryAO] : []);
      const levelSelections = p.levelSelections ?? p.ao?.levelSelections ?? state.ao?.levelSelections ?? {};

      /*
       * Synchronize character and player names across both root-level convenience fields
       * and structured identity state, favoring identity updates while retaining backwards compatibility.
       */
      const resolvedCharName = resolveIdentityField(
        p.identity?.characterName,
        p.characterName ?? state.identity?.characterName ?? state.characterName
      );
      const resolvedPlayerName = resolveIdentityField(
        p.identity?.playerName,
        p.playerName ?? state.identity?.playerName ?? state.playerName
      );

      return {
        ...state,
        ...p,
        characterName: resolvedCharName,
        playerName: resolvedPlayerName,
        subrace: subraceName,
        campaignPowerLevel: p.campaignPowerLevel ?? p.identity?.campaignPowerLevel ?? state.campaignPowerLevel ?? 'Heroic',
        identity: {
          ...state.identity,
          characterName: resolvedCharName,
          playerName: resolvedPlayerName,
          campaignPowerLevel: p.campaignPowerLevel ?? p.identity?.campaignPowerLevel ?? state.campaignPowerLevel ?? 'Heroic',
          level: p.level ?? p.identity?.level ?? state.identity?.level ?? 1,
          personalityBackstory: p.personalityBackstory ?? p.identity?.personalityBackstory ?? state.identity?.personalityBackstory ?? '',
          appearance: p.appearance ?? p.identity?.appearance ?? state.identity?.appearance ?? { age: '', height: '', weight: '' },
        },
        raceState: {
          race: raceName,
          subrace: subraceName,
        },
        race: {
          ...state.race,
          race: raceName,
          subrace: subraceName,
          woodElfChoice: p.woodElfChoice ?? p.race?.woodElfChoice ?? state.race?.woodElfChoice ?? '',
          halfElfChoice1: p.halfElfChoice1 ?? p.race?.halfElfChoice1 ?? state.race?.halfElfChoice1 ?? '',
          halfElfChoice2: p.halfElfChoice2 ?? p.race?.halfElfChoice2 ?? state.race?.halfElfChoice2 ?? '',
          customRace: p.customRace ?? p.race?.customRace ?? state.race?.customRace,
          manualRaces: p.manualRaces ?? p.race?.manualRaces ?? state.race?.manualRaces ?? false,
          racialStatOverrides: p.racialStatOverrides ?? p.race?.racialStatOverrides ?? state.race?.racialStatOverrides ?? {},
        },
        background: (typeof p.background === 'object' && p.background?.freeSkillPoints !== undefined && p.background?.name)
          ? p.background
          : (matchedBg
              ? { ...matchedBg, ...(typeof p.background === 'object' ? p.background : {}), name: matchedBg.name }
              : {
                  ...DEFAULT_BACKGROUND,
                  ...(typeof p.background === 'object' ? p.background : {}),
                  name: bgName,
                }),
        customBackground: p.customBackground ?? p.background?.customBackground ?? state.customBackground,
        baseCharacteristics: (() => {
          const finalStatsProvided = p.finalCharacteristics ?? p.characteristics;
          let loadedBase = p.baseCharacteristics ?? state.baseCharacteristics ?? DEFAULT_BASE_CHARACTERISTICS;
          if (finalStatsProvided) {
            const bonuses = getRacialStatBonuses(p, RACES);
            loadedBase = { ...finalStatsProvided };
            for (const stat in bonuses) {
              if (loadedBase[stat] !== undefined) {
                loadedBase[stat] -= bonuses[stat];
              }
            }
          }
          return loadedBase;
        })(),
        ao: {
          ...state.ao,
          primaryAO,
          secondaryAO,
          selectedAOs,
          customPrimaryAO: p.customPrimaryAO ?? p.ao?.customPrimaryAO ?? state.ao?.customPrimaryAO,
          customSecondaryAO: p.customSecondaryAO ?? p.ao?.customSecondaryAO ?? state.ao?.customSecondaryAO,
          customAOs: p.customAOs ?? p.ao?.customAOs ?? state.ao?.customAOs ?? [],
          customAbilities: p.customAbilities ?? p.ao?.customAbilities ?? (state.ao as any)?.customAbilities ?? [],
          levelSelections,
        },
        skills: {
          ...state.skills,
          skillRanks: (() => {
            const raw = p.skillRanks ?? p.skills?.skillRanks ?? state.skills?.skillRanks ?? {};
            const res = { ...raw };
            if (res['Subtlety'] != null && res['Subterfuge'] == null) {
              res['Subterfuge'] = res['Subtlety'];
              delete res['Subtlety'];
            }
            return res;
          })(),
          academicsEntries: (p.academicsEntries && p.academicsEntries.length > 0)
            ? p.academicsEntries
            : (p.skills?.academicsEntries && p.skills.academicsEntries.length > 0)
            ? p.skills.academicsEntries
            : (p.academicsRanks && Object.keys(p.academicsRanks).length > 0)
            ? Object.entries(p.academicsRanks).map(([name, rank]) => ({ name, rank: Number(rank) }))
            : (p.academicsFields && Array.isArray(p.academicsFields))
            ? p.academicsFields.map((name: string) => ({ name, rank: 1 }))
            : state.skills?.academicsEntries ?? [],
          artsCraftEntries: p.artsCraftEntries ?? p.skills?.artsCraftEntries ?? state.skills?.artsCraftEntries ?? [],
          manualSkills: p.manualSkills ?? p.skills?.manualSkills ?? state.skills?.manualSkills ?? false,
        },
        proficiencies: {
          ...((state as any).proficiencies ?? {}),
          armorProficiencies: p.armorProficiencies ?? p.proficiencies?.armorProficiencies ?? (state as any).proficiencies?.armorProficiencies ?? {},
          savingThrowsProficient: p.savingThrowsProficient ?? p.proficiencies?.savingThrowsProficient ?? (state as any).proficiencies?.savingThrowsProficient ?? {},
          weaponProficiencies: p.weaponProficiencies ?? p.proficiencies?.weaponProficiencies ?? (state as any).proficiencies?.weaponProficiencies ?? [],
          manualProficiencies: p.manualProficiencies ?? p.proficiencies?.manualProficiencies ?? (state as any).proficiencies?.manualProficiencies ?? false,
          goldAmount: p.goldAmount ?? p.proficiencies?.goldAmount ?? (state as any).proficiencies?.goldAmount ?? 10,
          silverAmount: p.silverAmount ?? p.proficiencies?.silverAmount ?? (state as any).proficiencies?.silverAmount ?? 0,
          copperAmount: p.copperAmount ?? p.proficiencies?.copperAmount ?? (state as any).proficiencies?.copperAmount ?? 0,
        },
        spellcasting: p.spellcasting ?? (state as any).spellcasting ?? { cantrips: [], spells: [], slots: {} },
        equipment: {
          ...((state as any).equipment ?? {}),
          equipmentList: deduplicateEquipmentList(
            p.equipmentList ?? p.equipment?.equipmentList ?? (state as any).equipment?.equipmentList ?? []
          ),
          manualEquipment: p.manualEquipment ?? p.equipment?.manualEquipment ?? (state as any).equipment?.manualEquipment ?? false,
        },
        equipmentList: deduplicateEquipmentList(
          p.equipmentList ?? p.equipment?.equipmentList ?? (state as any).equipment?.equipmentList ?? []
        ),
        goldAmount: p.goldAmount ?? p.proficiencies?.goldAmount ?? (state as any).proficiencies?.goldAmount ?? 10,
        silverAmount: p.silverAmount ?? p.proficiencies?.silverAmount ?? (state as any).proficiencies?.silverAmount ?? 0,
        copperAmount: p.copperAmount ?? p.proficiencies?.copperAmount ?? (state as any).proficiencies?.copperAmount ?? 0,
        maxHP: p.maxHP ?? state.maxHP,
        currentHP: p.currentHP ?? state.currentHP,
        tempHP: p.tempHP ?? state.tempHP,
        armorClass: p.armorClass ?? state.armorClass,
        hpBonus: p.hpBonus ?? state.hpBonus,
        manualSkills: p.manualSkills ?? p.skills?.manualSkills ?? state.manualSkills ?? false,
        manualProficiencies: p.manualProficiencies ?? p.proficiencies?.manualProficiencies ?? state.manualProficiencies ?? false,
        manualEquipment: p.manualEquipment ?? p.equipment?.manualEquipment ?? state.manualEquipment ?? false,
        manualAbilityScores: p.manualAbilityScores ?? state.manualAbilityScores ?? false,
        manualHP: p.manualHP ?? state.manualHP ?? false,
        customFeatures: p.customFeatures ?? state.customFeatures ?? [],
        importedPdfBytes: p.importedPdfBytes ?? state.importedPdfBytes,
        importedMetadata: p.importedMetadata ?? state.importedMetadata,
        accomplishmentPointsRemaining: p.accomplishmentPointsRemaining ?? p.importedMetadata?.accomplishmentPointsRemaining ?? state.accomplishmentPointsRemaining,
        bgFreeRemaining: p.bgFreeRemaining ?? p.importedMetadata?.bgFreeRemaining ?? state.bgFreeRemaining,
        aoFreeRemaining: p.aoFreeRemaining ?? p.importedMetadata?.aoFreeRemaining ?? state.aoFreeRemaining,
        freeSkillPointsRemaining: p.freeSkillPointsRemaining ?? p.importedMetadata?.freeSkillPointsRemaining ?? state.freeSkillPointsRemaining,
        isImported: p.isImported ?? state.isImported ?? false,
      };
    }
    case 'SET_CAMPAIGN_POWER_LEVEL':
      return {
        ...state,
        campaignPowerLevel: action.payload,
      };
    case 'SET_IDENTITY': {
      const nextIdentity = {
        ...state.identity,
        ...action.payload,
      };
      return {
        ...state,
        characterName: nextIdentity.characterName ?? '',
        playerName: nextIdentity.playerName ?? '',
        identity: nextIdentity,
      };
    }
    case 'SET_RACE': {
      const nextRace = {
        ...state.race,
        ...action.payload,
      };
      const raceName = nextRace.race;
      let subraceName = nextRace.subrace;
      const raceDataObj = RACES.find((r) => r.name === raceName);
      if (raceDataObj) {
        const isValidSubrace = raceDataObj.subraces?.some((sub) => sub.name === subraceName);
        if (!isValidSubrace) {
          subraceName = '';
          nextRace.subrace = '';
        }
      }
      return {
        ...state,
        race: nextRace,
        subrace: subraceName,
        raceState: {
          race: raceName,
          subrace: subraceName,
        },
        manualRaces: nextRace.manualRaces ?? state.manualRaces,
      };
    }
    case 'SET_BACKGROUND':
      return {
        ...state,
        background: {
          ...DEFAULT_BACKGROUND,
          ...action.payload,
        },
      };
    case 'SET_CUSTOM_BACKGROUND':
      return {
        ...state,
        customBackground: {
          ...DEFAULT_BACKGROUND,
          ...state.customBackground,
          ...action.payload,
        },
      };
    case 'SET_CHARACTERISTICS':
      return {
        ...state,
        importedMetadata: undefined,
        accomplishmentPointsRemaining: undefined,
        baseCharacteristics: {
          ...state.baseCharacteristics,
          ...action.payload,
        },
      };
    case 'SET_AO':
      return {
        ...state,
        importedMetadata: undefined,
        accomplishmentPointsRemaining: undefined,
        ao: {
          ...state.ao,
          ...action.payload,
        },
      };
    case 'SET_SKILLS': {
      const updatedSkills = {
        ...state.skills,
        ...action.payload,
      };
      return {
        ...state,
        importedMetadata: undefined,
        accomplishmentPointsRemaining: undefined,
        freeSkillPointsRemaining: undefined,
        bgFreeRemaining: undefined,
        aoFreeRemaining: undefined,
        skills: updatedSkills,
        skillRanks: updatedSkills.skillRanks,
        manualSkills: updatedSkills.manualSkills ?? state.manualSkills,
      };
    }
    case 'SET_PROFICIENCIES': {
      const updatedProf = {
        ...((state as any).proficiencies ?? {}),
        ...action.payload,
      };
      return {
        ...state,
        importedMetadata: undefined,
        accomplishmentPointsRemaining: undefined,
        proficiencies: updatedProf,
        manualProficiencies: updatedProf.manualProficiencies ?? state.manualProficiencies,
        goldAmount: updatedProf.goldAmount ?? state.goldAmount,
        silverAmount: updatedProf.silverAmount ?? state.silverAmount,
        copperAmount: updatedProf.copperAmount ?? state.copperAmount,
      } as any;
    }
    case 'SET_SPELLCASTING':
      return {
        ...state,
        spellcasting: {
          ...((state as any).spellcasting ?? {}),
          ...action.payload,
        },
      } as any;
    case 'SET_EQUIPMENT': {
      const updatedEquip = {
        ...((state as any).equipment ?? {}),
        ...action.payload,
      };
      const rawList = (action.payload as any).equipmentList ?? updatedEquip.equipmentList ?? (state as any).equipmentList;
      const cleanList = deduplicateEquipmentList(rawList);
      return {
        ...state,
        equipment: {
          ...updatedEquip,
          equipmentList: cleanList,
        },
        equipmentList: cleanList,
        manualEquipment: updatedEquip.manualEquipment ?? state.manualEquipment,
      } as any;
    }
    case 'SET_MANUAL_SCORES':
      return {
        ...state,
        manualAbilityScores: action.payload,
      };
    case 'LEVEL_UP': {
      const options = action.payload ?? { hpChoice: 'average' };
      const nextState = levelUp(state, ORIGINS, { ...options, racesData: RACES });
      return {
        ...state,
        ...nextState,
      };
    }
    case 'SET_STATE': {
      const next = {
        ...state,
        ...action.payload,
      };
      if (action.payload.manualEquipment !== undefined) {
        next.equipment = {
          ...(next.equipment ?? {}),
          manualEquipment: Boolean(action.payload.manualEquipment),
        };
      }
      if (action.payload.manualProficiencies !== undefined) {
        next.proficiencies = {
          ...(next.proficiencies ?? {}),
          manualProficiencies: Boolean(action.payload.manualProficiencies),
        };
      }
      if (action.payload.manualSkills !== undefined) {
        next.skills = {
          ...(next.skills ?? {}),
          manualSkills: Boolean(action.payload.manualSkills),
        };
      }
      return next;
    }
    case 'RESET':
      return DEFAULT_CHARACTER;
    default:
      return state;
  }
}
