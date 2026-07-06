export const WEAPONS = [
  { name: 'Dagger', cost: '2 gp', damage: '1d4 piercing', weight: '0.5 kg', properties: 'Finesse, light, thrown (range 6/18m)' },
  { name: 'Shortsword', cost: '10 gp', damage: '1d6 slashing', weight: '1 kg', properties: 'Finesse, light' },
  { name: 'Longsword', cost: '15 gp', damage: '1d8 slashing', weight: '1.5 kg', properties: 'Versatile (1d10)' },
  { name: 'Rapier', cost: '25 gp', damage: '1d8 piercing', weight: '1 kg', properties: 'Finesse' },
  { name: 'Greatsword', cost: '50 gp', damage: '2d6 slashing', weight: '3 kg', properties: 'Heavy, two-handed' },
  { name: 'Mace', cost: '5 gp', damage: '1d6 bludgeoning', weight: '2 kg', properties: '-' },
  { name: 'Spear', cost: '1 gp', damage: '1d6 piercing', weight: '1.5 kg', properties: 'Thrown (range 6/18m), versatile (1d8)' },
  { name: 'Battleaxe', cost: '10 gp', damage: '1d8 slashing', weight: '2 kg', properties: 'Versatile (1d10)' },
  { name: 'Warhammer', cost: '15 gp', damage: '1d8 bludgeoning', weight: '1.5 kg', properties: 'Versatile (1d10)' },
  { name: 'Halberd', cost: '20 gp', damage: '1d10 slashing', weight: '3 kg', properties: 'Heavy, reach, two-handed' },
  { name: 'Shortbow', cost: '25 gp', damage: '1d6 piercing', weight: '1 kg', properties: 'Ammunition (range 24/96m), two-handed' },
  { name: 'Longbow', cost: '50 gp', damage: '1d8 piercing', weight: '1 kg', properties: 'Ammunition (range 45/180m), heavy, two-handed' },
  { name: 'Light Crossbow', cost: '25 gp', damage: '1d8 piercing', weight: '2.5 kg', properties: 'Ammunition (range 24/96m), loading, two-handed' },
  { name: 'Heavy Crossbow', cost: '50 gp', damage: '1d10 piercing', weight: '9 kg', properties: 'Ammunition (range 30/120m), heavy, loading, two-handed' },
  { name: 'Hand Crossbow', cost: '75 gp', damage: '1d6 piercing', weight: '1.5 kg', properties: 'Ammunition (range 9/36m), light, loading' }
];

export const ARMOR = [
  { name: 'Padded', category: 'Light', cost: '5 gp', av: 11, mod: 'Dex', maxMod: null, stealth: 'Disadvantage', weight: 4 },
  { name: 'Leather', category: 'Light', cost: '10 gp', av: 11, mod: 'Dex', maxMod: null, stealth: 'Normal', weight: 5 },
  { name: 'Reinforced Leather', category: 'Light', cost: '45 gp', av: 12, mod: 'Dex', maxMod: null, stealth: 'Normal', weight: 7 },
  
  { name: 'Hide', category: 'Medium', cost: '10 gp', av: 12, mod: 'Dex', maxMod: 2, stealth: 'Normal', weight: 6 },
  { name: 'Chain Shirt', category: 'Medium', cost: '50 gp', av: 13, mod: 'Dex', maxMod: 2, stealth: 'Normal', weight: 10 },
  { name: 'Scale Mail', category: 'Medium', cost: '50 gp', av: 14, mod: 'Dex', maxMod: 2, stealth: 'Disadvantage', weight: 24 },
  { name: 'Breastplate', category: 'Medium', cost: '400 gp', av: 14, mod: 'Dex', maxMod: 2, stealth: 'Normal', weight: 10 },
  { name: 'Half-Plate', category: 'Medium', cost: '750 gp', av: 15, mod: 'Dex', maxMod: 2, stealth: 'Disadvantage', weight: 20 },
  
  { name: 'Ring Mail', category: 'Heavy', cost: '30 gp', av: 14, mod: null, maxMod: 0, stealth: 'Disadvantage', weight: 20 },
  { name: 'Chain Mail', category: 'Heavy', cost: '75 gp', av: 16, mod: null, maxMod: 0, brawnMin: 13, stealth: 'Disadvantage', weight: 25 },
  { name: 'Splint', category: 'Heavy', cost: '200 gp', av: 17, mod: null, maxMod: 0, brawnMin: 15, stealth: 'Disadvantage', weight: 30 },
  { name: 'Plate', category: 'Heavy', cost: '1500 gp', av: 18, mod: null, maxMod: 0, brawnMin: 15, stealth: 'Disadvantage', weight: 35 },
  
  { name: 'Shield', category: 'Shield', cost: '10 gp', av: 2, mod: null, maxMod: null, stealth: 'Normal', weight: 3 }
];
