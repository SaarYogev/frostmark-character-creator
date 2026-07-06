export const CANTRIPS = [
  'Chill Touch',
  'Poison Spray',
  'Frostbite',
  'Prestidigitation',
  'Thaumaturgy',
  'Guidance',
  'Create Bonfire',
  'Shape Water',
  'Animal Connection',
  'Minor Illusion',
  'Light',
  'Sacred Flame',
  'Shocking Grasp',
  'Mage Hand',
  'Ray of Frost',
  'Fire Bolt',
  'Blade Ward',
  'True Strike'
];

export const SPELLS = [
  // Level 1 (10 Potential)
  { name: 'Burning Hands', level: 1, desc: '3m cone of fire (1d6/level)' },
  { name: 'Shield', level: 1, desc: '+5 to AV when hit' },
  { name: 'Mage Armor', level: 1, desc: 'Set unarmored base AV to 13 + prof' },
  { name: 'Cure Wounds', level: 1, desc: 'Heal 1d8 + spellcasting mod' },
  { name: 'Healing Word', level: 1, desc: 'Heal 1d4 + spellcasting mod as bonus action' },
  { name: 'Magic Missile', level: 1, desc: 'Create 3 darts dealing 1d4+1 force damage each' },
  { name: 'Thunderwave', level: 1, desc: '1.5m cube thunder damage and push' },
  { name: 'Sleep', level: 1, desc: 'Put 5d8 HP of creatures to sleep' },
  { name: 'Charm Person', level: 1, desc: 'Charm 1 humanoid' },
  { name: 'Faerie Fire', level: 1, desc: 'Outline targets in light, grants advantage to hit' },

  // Level 2 (20 Potential)
  { name: 'Suggestion', level: 2, desc: 'Influence course of activity for 1 target' },
  { name: 'Blur', level: 2, desc: 'Enemies have disadvantage to hit you' },
  { name: 'Invisibility', level: 2, desc: 'Make target invisible' },
  { name: 'Armor of Life', level: 2, desc: 'Gain temporary health points' },
  { name: 'Enhance Ability', level: 2, desc: 'Grant advantage on chosen characteristic checks' },
  { name: 'Darkness', level: 2, desc: 'Spread magical darkness in 4.5m radius' },
  { name: 'Augury', level: 2, desc: 'Receive omen about actions taken' },
  { name: 'Locate Object', level: 2, desc: 'Sence direction to specified object' },
  { name: 'Hold Person', level: 2, desc: 'Paralyze a humanoid target' },
  { name: 'Misty Step', level: 2, desc: 'Teleport 9m to unoccupied space' },
  { name: 'Spiritual Weapon', level: 2, desc: 'Create floating weapon that attacks' },
  { name: 'Lesser Restoration', level: 2, desc: 'Cure blindness, deafness, disease, or poison' },

  // Level 3 (30 Potential)
  { name: 'Fireball', level: 3, desc: 'Explosion deals 8d6 fire damage in 6m radius' },
  { name: 'Lightning Bolt', level: 3, desc: 'Line deals 8d6 lightning damage' },
  { name: 'Counterspell', level: 3, desc: 'Cancel a spell cast by target' },
  { name: 'Dispel Magic', level: 3, desc: 'End magical effects on target' },
  { name: 'Revivify', level: 3, desc: 'Return dead body to life with 1 HP' },
  { name: 'Spirit Guardians', level: 3, desc: 'Summon spirits to damage/slow enemies' },
  { name: 'Fly', level: 3, desc: 'Grant flying speed of 18m' }
];
export const SPELLCASTING_POTENTIAL_LIMITS = {
  // Level: [Minor Potential, Moderate Potential, Major Potential]
  1: { Minor: 20, Moderate: 40, Major: 60 },
  2: { Minor: 20, Moderate: 40, Major: 60 },
  3: { Minor: 20, Moderate: 40, Major: 60 },
  4: { Minor: 20, Moderate: 40, Major: 60 },
  5: { Minor: 20, Moderate: 40, Major: 60 }
};
