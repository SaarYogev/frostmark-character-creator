import { IdentityState, DEFAULT_IDENTITY } from './Identity';
import { RaceState, DEFAULT_RACE_STATE } from './Race';
import { Background, DEFAULT_BACKGROUND } from './Background';
import { BACKGROUNDS } from '../data/backgrounds';
import { BaseCharacteristics, DEFAULT_BASE_CHARACTERISTICS } from './Ability';
import { AOState, DEFAULT_AO_STATE } from './AO';
import { SkillsState, DEFAULT_SKILLS_STATE } from './Skills';

export interface CharacterState {
  campaignPowerLevel: 'Mundane' | 'Heroic' | 'Champion';
  identity: IdentityState;
  race: RaceState;
  background: Background;
  customBackground?: Background;
  baseCharacteristics: BaseCharacteristics;
  ao: AOState;
  skills: SkillsState;
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
  | { type: 'SET_STATE'; payload: Record<string, unknown> }
  | { type: 'LOAD_STATE'; payload: CharacterState }
  | { type: 'RESET' };

export function characterReducer(state: CharacterState, action: CharacterAction): CharacterState {
  switch (action.type) {
    case 'LOAD_STATE': {
      const p = action.payload as any;
      if (!p) return state;

      const raceName = typeof p.race === 'object' ? p.race?.race ?? state.race?.race : p.race ?? state.race?.race ?? 'Elf';
      const subraceName = typeof p.subrace === 'string' ? p.subrace : p.race?.subrace ?? state.race?.subrace ?? '';
      const bgName = typeof p.background === 'object' ? p.background?.name ?? (state.background as any)?.name : p.background ?? (state.background as any)?.name ?? 'Scholar';
      const primaryAO = p.primaryAO ?? p.ao?.primaryAO ?? state.ao?.primaryAO ?? '';
      const secondaryAO = p.secondaryAO ?? p.ao?.secondaryAO ?? state.ao?.secondaryAO ?? '';
      const selectedAOs = p.selectedAOs ?? p.ao?.selectedAOs ?? state.ao?.selectedAOs ?? (primaryAO ? [primaryAO] : []);
      const levelSelections = p.levelSelections ?? p.ao?.levelSelections ?? state.ao?.levelSelections ?? {};

      return {
        ...state,
        ...p,
        campaignPowerLevel: p.campaignPowerLevel ?? p.identity?.campaignPowerLevel ?? state.campaignPowerLevel ?? 'Heroic',
        identity: {
          ...state.identity,
          characterName: p.characterName ?? p.identity?.characterName ?? state.identity?.characterName ?? '',
          playerName: p.playerName ?? p.identity?.playerName ?? state.identity?.playerName ?? '',
          campaignPowerLevel: p.campaignPowerLevel ?? p.identity?.campaignPowerLevel ?? state.identity?.campaignPowerLevel ?? 'Heroic',
          level: p.level ?? p.identity?.level ?? state.identity?.level ?? 1,
          personalityBackstory: p.personalityBackstory ?? p.identity?.personalityBackstory ?? state.identity?.personalityBackstory ?? '',
          appearance: p.appearance ?? p.identity?.appearance ?? state.identity?.appearance ?? { age: '', height: '', weight: '' },
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
        background: (typeof p.background === 'object' && p.background?.freeSkillPoints !== undefined)
          ? p.background
          : BACKGROUNDS.find(b => b.name === bgName) ?? {
              ...DEFAULT_BACKGROUND,
              name: bgName,
            },
        customBackground: p.customBackground ?? p.background?.customBackground ?? state.customBackground,
        baseCharacteristics: p.baseCharacteristics ?? state.baseCharacteristics ?? DEFAULT_BASE_CHARACTERISTICS,
        ao: {
          ...state.ao,
          primaryAO,
          secondaryAO,
          selectedAOs,
          customPrimaryAO: p.customPrimaryAO ?? p.ao?.customPrimaryAO ?? state.ao?.customPrimaryAO,
          customSecondaryAO: p.customSecondaryAO ?? p.ao?.customSecondaryAO ?? state.ao?.customSecondaryAO,
          customAOs: p.customAOs ?? p.ao?.customAOs ?? state.ao?.customAOs ?? [],
          levelSelections,
        },
        skills: {
          ...state.skills,
          skillRanks: p.skillRanks ?? p.skills?.skillRanks ?? state.skills?.skillRanks ?? {},
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
        },
        spellcasting: p.spellcasting ?? (state as any).spellcasting ?? { cantrips: [], spells: [], slots: {} },
        equipment: {
          ...((state as any).equipment ?? {}),
          equipmentList: p.equipmentList ?? p.equipment?.equipmentList ?? (state as any).equipment?.equipmentList ?? [],
          manualEquipment: p.manualEquipment ?? p.equipment?.manualEquipment ?? (state as any).equipment?.manualEquipment ?? false,
        },
      };
    }
    case 'SET_CAMPAIGN_POWER_LEVEL':
      return {
        ...state,
        campaignPowerLevel: action.payload,
      };
    case 'SET_IDENTITY':
      return {
        ...state,
        identity: {
          ...state.identity,
          ...action.payload,
        },
      };
    case 'SET_RACE':
      return {
        ...state,
        race: {
          ...state.race,
          ...action.payload,
        },
      };
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
        baseCharacteristics: {
          ...state.baseCharacteristics,
          ...action.payload,
        },
      };
    case 'SET_AO':
      return {
        ...state,
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
        skills: updatedSkills,
        skillRanks: updatedSkills.skillRanks,
        manualSkills: updatedSkills.manualSkills,
      };
    }
    case 'SET_PROFICIENCIES':
      return {
        ...state,
        proficiencies: {
          ...((state as any).proficiencies ?? {}),
          ...action.payload,
        },
      } as any;
    case 'SET_SPELLCASTING':
      return {
        ...state,
        spellcasting: {
          ...((state as any).spellcasting ?? {}),
          ...action.payload,
        },
      } as any;
    case 'SET_EQUIPMENT':
      return {
        ...state,
        equipment: {
          ...((state as any).equipment ?? {}),
          ...action.payload,
        },
        equipmentList: (action.payload as any).equipmentList ?? (state as any).equipmentList,
      } as any;
    case 'SET_STATE':
      return {
        ...state,
        ...action.payload,
      };
    case 'RESET':
      return DEFAULT_CHARACTER;
    default:
      return state;
  }
}
