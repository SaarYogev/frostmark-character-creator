// Point-buy cost map for characteristics.
// Starts at 10 (0 points cost). Increments and decrements follow Frostmark rules.
export const POINT_BUY_COSTS = {
  6: -5,
  7: -3,
  8: -2,
  9: -1,
  10: 0,
  11: 1,
  12: 2,
  13: 3,
  14: 4,
  15: 5,
  16: 7,
  17: 9
};

export const CHARACTERISTICS = [
  { key: 'Brawn', short: 'Br', type: 'Physical', desc: 'Offensive physical strength' },
  { key: 'Dexterity', short: 'Dex', type: 'Physical', desc: 'Finesse physical control' },
  { key: 'Vitality', short: 'Vit', type: 'Physical', desc: 'Defensive physical endurance' },
  { key: 'Intelligence', short: 'Int', type: 'Mental', desc: 'Offensive mental power' },
  { key: 'Cunning', short: 'Cun', type: 'Mental', desc: 'Finesse mental sharpness' },
  { key: 'Resolve', short: 'Res', type: 'Mental', desc: 'Defensive mental willpower' },
  { key: 'Presence', short: 'Pre', type: 'Social', desc: 'Offensive social charisma' },
  { key: 'Manipulation', short: 'Man', type: 'Social', desc: 'Finesse social influence' },
  { key: 'Composure', short: 'Com', type: 'Social', desc: 'Defensive social stability' }
];

export const SKILL_RANK_BONUSES = {
  1: (prof) => Math.ceil(prof / 2),
  2: (prof) => prof,
  3: (prof) => Math.ceil(prof * 1.5),
  4: (prof) => prof * 2,
  5: (prof) => Math.ceil(prof * 2.5)
};

export const SKILL_RANK_CUMULATIVE_COSTS = {
  1: 1,
  2: 2,
  3: 4,
  4: 6,
  5: 9
};

// Saving throw proficiency purchase costs.
export const SAVE_PROFICIENCY_COSTS = {
  Brawn: 1,
  Dexterity: 2,
  Vitality: 2,
  Intelligence: 1,
  Cunning: 1,
  Resolve: 2,
  Presence: 1,
  Manipulation: 1,
  Composure: 2
};

export const ARMOR_PROFICIENCY_COSTS = {
  Light: 1,
  Medium: 2, // 1 to upgrade from Light
  Heavy: 3,  // 1 to upgrade from Medium
  Shields: 1
};

export const WEAPON_PROFICIENCY_COSTS = {
  Handpicked2: 1,
  Groups1pt: ['Axes', 'Bows', 'Crossbows'],
  Groups2pt: ['Fell-Handed', 'Finesse', 'Bows & Crossbows'],
  Groups3pt: ['Blades', 'Bludgeons', 'Heavy', 'Light', 'Primitive', 'Ranged', 'Spears', 'Thrown']
};

export const MONEY_AP_COST = {
  goldPerAP: 25
};

export const SKILLS = [
  { name: 'Animal Handling', stats: ['Cunning', 'Presence'], key: 'AH' },
  { name: 'Perception', stats: ['Intelligence', 'Composure'], key: 'Perc' },
  { name: 'Athletics', stats: ['Brawn', 'Dexterity'], key: 'Ath' },
  { name: 'Persuasion', stats: ['Intelligence', 'Composure'], key: 'Persu' },
  { name: 'Deception', stats: ['Presence', 'Manipulation'], key: 'Decep' },
  { name: 'Subtlety', stats: ['Dexterity', 'Cunning'], key: 'Sub' },
  { name: 'Empathy', stats: ['Manipulation', 'Composure'], key: 'Emp' },
  { name: 'Stealth', stats: ['Dexterity', 'Cunning'], key: 'Stealth' },
  { name: 'Investigation', stats: ['Cunning', 'Cunning'], key: 'Inv' }, // Investigation uses Cun
  { name: 'Survival', stats: ['Intelligence', 'Cunning'], key: 'Surv' },
  { name: 'Leadership', stats: ['Presence', 'Manipulation'], key: 'Lead' },
  { name: 'Medicine', stats: ['Intelligence', 'Cunning'], key: 'Med' },
  { name: 'Occult', stats: ['Intelligence', 'Cunning'], key: 'Occ' }
];

export const ACADEMICS_FIELDS = [
  'History',
  'Nature',
  'Religion',
  'Magic',
  'Geography',
  'Politics',
  'Tinkering',
  'Society'
];
