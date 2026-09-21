export interface Step {
  id: string;
  title: string;
  icon: string;
}

export const STEPS: Step[] = [
  { id: 'identity', title: 'Identity', icon: '🎭' },
  { id: 'race', title: 'Race & Subrace', icon: '🌍' },
  { id: 'background', title: 'Background', icon: '📖' },
  { id: 'abilities', title: 'Ability Scores', icon: '💪' },
  { id: 'ability-origins', title: 'Ability Origins', icon: '✨' },
  { id: 'skills', title: 'Skills', icon: '🎯' },
  { id: 'proficiencies', title: 'Proficiencies & AP', icon: '🛡️' },
  { id: 'spellslots', title: 'Spell Slots', icon: '⚡' },
  { id: 'spellcasting', title: 'Spell Selection', icon: '🔮' },
  { id: 'equipment', title: 'Equipment', icon: '⚔️' },
  { id: 'finishing', title: 'Finishing Touches', icon: '✅' },
];

export type StepId = Step['id'];

/**
 * Returns the visible builder steps depending on the character level and edit mode.
 * Level 1 displays all steps for full character creation.
 * Level 2+ focuses on progression steps (Identity, AO, Skills, Proficiencies, Spell Slots, Spell Selection, Finishing)
 * while hiding one-time creation steps (Race, Background, Base Ability Scores, Equipment) unless showAllSteps is enabled.
 */
export function getStepsForLevel(level: number = 1, showAllSteps: boolean = false): Step[] {
  if (showAllSteps || level <= 1) {
    return STEPS;
  }
  const levelUpStepIds: StepId[] = [
    'identity',
    'ability-origins',
    'skills',
    'proficiencies',
    'spellslots',
    'spellcasting',
    'finishing',
  ];
  return STEPS.filter((step) => levelUpStepIds.includes(step.id));
}
