export const RACES = [
  {
    name: 'Dwarf',
    stats: { Brawn: 1, Vitality: 2 },
    speed: 5,
    size: 'Medium',
    languages: ['Ancient Markish', 'Dwarvish'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' },
      { name: 'Dwarven Resilience', desc: 'Advantage on saving throws against poison, resistance against poison damage' },
      { name: 'Dwarven Combat Training', desc: 'Proficiency with battleaxe, handaxe, light hammer, and warhammer' }
    ],
    subraces: [
      {
        name: 'Mountain Dwarf',
        stats: { Brawn: 1 },
        traits: [{ name: 'Dwarven Armor Training', desc: 'Proficiency with light and medium armor' }]
      },
      {
        name: 'Hill Dwarf',
        stats: { Resolve: 1 },
        traits: [{ name: 'Dwarven Toughness', desc: 'Max HP increases by 1, and increases by 1 every level-up' }]
      }
    ]
  },
  {
    name: 'Elf',
    stats: { Dexterity: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Elvish'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' },
      { name: 'Keen Senses', desc: '2 skill points in Perception' },
      { name: 'Fey Aspect', desc: 'Advantage against charm, magic cannot put to sleep' },
      { name: 'Trance', desc: '4 hours trance instead of 8 hours sleep' }
    ],
    subraces: [
      {
        name: 'Garden',
        stats: { Intelligence: 1 },
        traits: [
          { name: 'Mental Acumen', desc: '4 skill points in Academics, Arts & Craft, Medicine, or Occult' },
          { name: 'Cantrip', desc: '1 cantrip from the spell list as Soul Mastery' }
        ]
      },
      {
        name: 'Wood',
        stats: { choice: ['Cunning', 'Composure'], value: 1 },
        speed: 7,
        traits: [
          { name: 'Mask of the Wild', desc: 'Hide when lightly obscured by natural phenomena' },
          { name: 'Woodland Athleticism', desc: 'Climbing speed equal to walking speed, +1 skill point in Athletics' }
        ]
      }
    ]
  },
  {
    name: 'Genasi',
    stats: { Vitality: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Primordial'],
    traits: [],
    subraces: [
      {
        name: 'Air Genasi',
        stats: { Dexterity: 1 },
        traits: [
          { name: 'Unending Breath', desc: 'Hold breath indefinitely while not incapacitated' },
          { name: 'Mingle with the Wind', desc: 'Cast Levitate once per long rest' }
        ]
      },
      {
        name: 'Earth Genasi',
        stats: { Brawn: 1 },
        traits: [
          { name: 'Earth Walk', desc: 'No extra movement cost for difficult terrain of earth/stone' },
          { name: 'Merge with Stone', desc: 'Cast Pass Without Trace once per long rest' }
        ]
      },
      {
        name: 'Fire Genasi',
        stats: { Resolve: 1 },
        traits: [
          { name: 'Fire Resistance', desc: 'Resistance to fire damage' },
          { name: 'Reach to the Blaze', desc: 'Cast Create Bonfire. Burning Hands once per long rest at lvl 3' }
        ]
      },
      {
        name: 'Water Genasi',
        stats: { Composure: 1 },
        traits: [
          { name: 'Acid Resistance', desc: 'Resistance to acid damage' },
          { name: 'Amphibious', desc: 'Breathe air and water' },
          { name: 'Call to the Wave', desc: 'Cast Shape Water. Create/Destroy Food/Water at lvl 3' }
        ]
      }
    ]
  },
  {
    name: 'Gnome',
    stats: { Intelligence: 2 },
    speed: 5,
    size: 'Small',
    languages: ['Ancient Markish', 'Gnomish'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' },
      { name: 'Gnome’s Cunning', desc: 'Advantage on all Composure and Resolve saves against magic' }
    ],
    subraces: [
      {
        name: 'Forest Gnome',
        stats: { Dexterity: 1 },
        traits: [
          { name: 'Beast Whisperer', desc: 'Cast Animal Connection once per long rest' },
          { name: 'Natural Illusionist', desc: 'Cast Minor Illusion' }
        ]
      },
      {
        name: 'Rock Gnome',
        stats: { Vitality: 1 },
        traits: [
          { name: 'Artificer’s Lore', desc: 'Double proficiency bonus on Academics: History checks for magic items/devices' },
          { name: 'Tinker', desc: 'Construct clockwork devices. +2 skill points in Academics: Tinkering' }
        ]
      }
    ]
  },
  {
    name: 'Goliath',
    stats: { Brawn: 2, Vitality: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Giant', 'Ancient Markish'],
    traits: [
      { name: 'Natural Athlete', desc: '2 skill points in Athletics' },
      { name: 'Stone’s Endurance', desc: 'Reduce damage taken by 1d12 + Vitality modifier (once per short rest)' },
      { name: 'Powerful Build', desc: 'Count as one size larger for carrying/pushing/dragging' },
      { name: 'Mountain Born', desc: 'Acclimated to high altitude, cold climates. Cold resistance' }
    ],
    subraces: []
  },
  {
    name: 'Half-elf',
    stats: { Manipulation: 2, flexiblePoints: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Elvish'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' },
      { name: 'Fey Aspect', desc: 'Advantage against charm, magic cannot put to sleep' },
      { name: 'Skill Versatility', desc: 'Gain 4 skill points' }
    ],
    subraces: []
  },
  {
    name: 'Halfling',
    stats: { Dexterity: 2 },
    speed: 5,
    size: 'Small',
    languages: ['Ancient Markish', 'Halfling'],
    traits: [
      { name: 'Lucky', desc: 'Reroll 1s on attacks, checks, and saves' },
      { name: 'Brave', desc: 'Advantage against frightened save' },
      { name: 'Halfling Nimbleness', desc: 'Move through space of creatures larger than you' }
    ],
    subraces: [
      {
        name: 'Lightfoot',
        stats: { Manipulation: 1 },
        traits: [{ name: 'Naturally Stealthy', desc: 'Hide behind creatures at least one size larger than you' }]
      },
      {
        name: 'Stout',
        stats: { Vitality: 1 },
        traits: [{ name: 'Stout Resilience', desc: 'Advantage against poison save, resistance to poison damage' }]
      }
    ]
  },
  {
    name: 'Half-Orc',
    stats: { Brawn: 2, Vitality: 1, Resolve: 2, Composure: -2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Orcish'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' },
      { name: 'Menacing', desc: 'Count as at least rank 2 in Deception/Persuasion for Intimidation checks. Rank 5 if at rank 4' },
      { name: 'Relentless Endurance', desc: 'Drop to 1 HP instead of 0 once per long rest' },
      { name: 'Savage Attacks', desc: 'Roll one extra damage die on critical melee hits' }
    ],
    subraces: []
  },
  {
    name: 'Tiefling',
    stats: { Cunning: 1, Presence: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Infernal'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' }
    ],
    subraces: [
      { name: 'Amaknuphis', stats: { Resolve: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Necrotic resistance' }, { name: 'Infernal Legacy', desc: 'Chill Touch. Suggestion at lvl 3. Ray of Enfeeblement at lvl 5' }] },
      { name: 'Bazilius', stats: { Manipulation: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Poison resistance' }, { name: 'Infernal Legacy', desc: 'Poison Spray. Blur at lvl 3. Invisibility at lvl 5' }] },
      { name: 'Djosqet', stats: { Intelligence: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Cold resistance' }, { name: 'Infernal Legacy', desc: 'Frostbite. Armor of Life at lvl 3. Enhance Ability at lvl 5' }] },
      { name: 'Galene', stats: { Brawn: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Lightning resistance' }, { name: 'Tempest Strike', desc: 'Imbue melee attack with 1d6 thunder damage once per long rest' }] },
      { name: 'Hori', stats: { Presence: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Advantage on charm and frighten saves' }, { name: 'Infernal Legacy', desc: 'Prestidigitation. Enthrall at lvl 3. Alter Self at lvl 5' }] },
      { name: 'Melanthiosia', stats: { Dexterity: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Fire resistance' }, { name: 'Infernal Legacy', desc: 'Thaumaturgy. Hellish Rebuke at lvl 3. Darkness at lvl 5' }] },
      { name: 'Mennem', stats: { Vitality: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Advantage on Vitality saving throws' }, { name: 'Infernal Legacy', desc: 'Guidance. Augury at lvl 3. Locate Object at lvl 5' }] }
    ]
  },
  {
    name: 'Dragonborn',
    stats: { Brawn: 2, Presence: 1, Resolve: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'Draconic'],
    traits: [
      { name: 'Darkvision', desc: '12m dim light sight' }
    ],
    subraces: [
      { name: 'Black', stats: {}, traits: [{ name: 'Acid Resistance', desc: 'Resistance to acid' }, { name: 'Draconic Breath', desc: '1x6m line Acid (Dex save)' }] },
      { name: 'Blue', stats: {}, traits: [{ name: 'Lightning Resistance', desc: 'Resistance to lightning' }, { name: 'Draconic Breath', desc: '1x6m line Lightning (Dex save)' }] },
      { name: 'Brass', stats: {}, traits: [{ name: 'Fire Resistance', desc: 'Resistance to fire' }, { name: 'Draconic Breath', desc: '1x6m line Fire (Dex save)' }] },
      { name: 'Bronze', stats: {}, traits: [{ name: 'Lightning Resistance', desc: 'Resistance to lightning' }, { name: 'Draconic Breath', desc: '1x6m line Lightning (Dex save)' }] },
      { name: 'Copper', stats: {}, traits: [{ name: 'Acid Resistance', desc: 'Resistance to acid' }, { name: 'Draconic Breath', desc: '1x6m line Acid (Dex save)' }] },
      { name: 'Gold', stats: {}, traits: [{ name: 'Fire Resistance', desc: 'Resistance to fire' }, { name: 'Draconic Breath', desc: '3m cone Fire (Dex save)' }] },
      { name: 'Green', stats: {}, traits: [{ name: 'Poison Resistance', desc: 'Resistance to poison' }, { name: 'Draconic Breath', desc: '3m cone Poison (Vit save)' }] },
      { name: 'Red', stats: {}, traits: [{ name: 'Fire Resistance', desc: 'Resistance to fire' }, { name: 'Draconic Breath', desc: '3m cone Fire (Vit save)' }] },
      { name: 'Silver', stats: {}, traits: [{ name: 'Cold Resistance', desc: 'Resistance to cold' }, { name: 'Draconic Breath', desc: '3m cone Cold (Vit save)' }] },
      { name: 'White', stats: {}, traits: [{ name: 'Cold Resistance', desc: 'Resistance to cold' }, { name: 'Draconic Breath', desc: '3m cone Cold (Vit save)' }] }
    ]
  },
  {
    name: 'Human',
    stats: { Brawn: 1, Dexterity: 1, Vitality: 1, Intelligence: 1, Cunning: 1, Resolve: 1, Presence: 1, Manipulation: 1, Composure: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'choice'],
    traits: [
      { name: 'Human Spirit', desc: '+1 to all characteristics, high adaptability' }
    ],
    subraces: []
  }
];
