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
