export const RACES = [
  {
    name: 'Dwarf',
    stats: { Vitality: 2 },
    speed: 5,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Dwarven'],
    traits: [
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' },
      { name: 'Dwarven Resilience', desc: 'Advantage on saving throws against poison, resistance against poison damage' },
      { name: 'Crafty', desc: 'Gain 2 skill points in Arts & Craft for a craft of your choice' },
      { name: 'Sturdy Pace', desc: 'Your 5m speed cannot be reduced by wearing heavy armor' }
    ],
    subraces: [
      {
        name: 'Mountain Dwarf',
        stats: { Brawn: 2 },
        traits: [{ name: 'Forge Familiarity', desc: 'Resistance to fire damage, and you do not suffer exhaustion from forge heat or desert daytime heat' }]
      },
      {
        name: 'Hill Dwarf',
        stats: { Cunning: 2 },
        traits: [{ name: 'Dwarven Toughness', desc: 'Max HP increases by 1 and by 1 again whenever you gain a level. You have advantage on saves to resist being shoved or knocked prone; if an effect forces you to move 2m or more, you move only half that distance' }]
      }
    ]
  },
  {
    name: 'Elf',
    stats: { Dexterity: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Elvish'],
    traits: [
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' },
      { name: 'Keen Senses', desc: '2 skill points in Perception' },
      { name: 'Fey Aspect', desc: 'Advantage on saving throws against being charmed, and magic cannot put you to sleep' },
      { name: 'Trance', desc: 'Meditate semiconsciously for 4 hours instead of sleeping; this gives the same benefit humans get from 8 hours of sleep' }
    ],
    subraces: [
      {
        name: 'Garden',
        stats: { Intelligence: 1 },
        traits: [
          { name: 'Mental Acumen', desc: 'Gain 4 skill points assigned as you choose among Academics, Arts & Craft, Medicine, and Occult' },
          { name: 'Cantrip', desc: 'Cast one cantrip of your choice from the spell list as Soul Mastery' }
        ]
      },
      {
        name: 'Wood',
        stats: { choice: ['Cunning', 'Composure'], value: 1 },
        speed: 7,
        traits: [
          { name: 'Fleet of Foot', desc: 'Your base walking speed is 7m' },
          { name: 'Mask of the Wild', desc: 'You can attempt to hide when only lightly obscured by foliage, heavy rain, falling snow, mist, or other natural phenomena' },
          { name: 'Woodland Athleticism', desc: 'Gain a climbing speed equal to your movement speed, and gain 1 skill point in Athletics' }
        ]
      }
    ]
  },
  {
    name: 'Genasi',
    stats: { Vitality: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Primordial dialect'],
    traits: [],
    subraces: [
      {
        name: 'Air Genasi',
        stats: { Dexterity: 1 },
        traits: [
          { name: 'Unending Breath', desc: 'Hold breath indefinitely while not incapacitated' },
          { name: 'Mingle with the Wind', desc: 'Cast Levitate as Soul Mastery once per long rest' }
        ]
      },
      {
        name: 'Earth Genasi',
        stats: { Brawn: 1 },
        traits: [
          { name: 'Earth Walk', desc: 'No extra movement cost for difficult terrain of earth/stone' },
          { name: 'Merge with Stone', desc: 'Cast Pass Without Trace as Soul Mastery once per long rest' }
        ]
      },
      {
        name: 'Fire Genasi',
        stats: { Resolve: 1 },
        traits: [
          { name: 'Fire Resistance', desc: 'Resistance to fire damage' },
          { name: 'Reach to the Blaze', desc: 'Cast Create Bonfire as Soul Mastery. At total level 3, cast Burning Hands as a 1st-level spell as Soul Mastery once per long rest' }
        ]
      },
      {
        name: 'Water Genasi',
        stats: { Composure: 1 },
        traits: [
          { name: 'Acid Resistance', desc: 'Resistance to acid damage' },
          { name: 'Amphibious', desc: 'Breathe air and water' },
          { name: 'Swimming Speed', desc: 'You have a 6m swimming speed' },
          { name: 'Call to the Wave', desc: 'Cast Shape Water as Soul Mastery. At total level 3, cast Create or Destroy Food and Water as a 2nd-level spell as Soul Mastery once per long rest' }
        ]
      }
    ]
  },
  {
    name: 'Gnome',
    stats: { Intelligence: 2 },
    speed: 5,
    size: 'Small',
    languages: ['Ancient Markish', 'home Realm language', 'Gnomish'],
    traits: [
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' },
      { name: 'Gnome’s Cunning', desc: 'Advantage on all Composure and Resolve saves against magic' }
    ],
    subraces: [
      {
        name: 'Forest Gnome',
        stats: { Dexterity: 1 },
        traits: [
          { name: 'Beast Whisperer', desc: 'Cast Animal Connection as Soul Mastery once per long rest' },
          { name: 'Natural Illusionist', desc: 'Cast Minor Illusion as Soul Mastery' }
        ]
      },
      {
        name: 'Rock Gnome',
        stats: { Vitality: 1 },
        traits: [
          { name: 'Artificer’s Lore', desc: 'On Academics: History checks related to magic items, alchemical objects, or technological devices, add twice your proficiency bonus instead of the normal proficiency bonus' },
          { name: 'Tinker', desc: 'Gain 2 skill points in Academics (Tinkering). With Tinker’s Tools, spend 1 hour and 10 gp of materials to build a Tiny clockwork toy, fire starter, or music box. It has AV 5 and 1 HP, stops after 24 hours unless repaired for 1 hour, can be dismantled as an action, and you can keep up to 3 active' }
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
    languages: ['Ancient Markish', 'home Realm language', 'Halfling'],
    traits: [
      { name: 'Lucky', desc: 'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, reroll it and use the new roll' },
      { name: 'Brave', desc: 'Advantage on saving throws against being frightened' },
      { name: 'Halfling Nimbleness', desc: 'You can move through the space of any creature larger than you' }
    ],
    subraces: [
      {
        name: 'Lightfoot',
        stats: { Manipulation: 1 },
        traits: [{ name: 'Naturally Stealthy', desc: 'You can attempt to hide while obscured only by a creature at least one size larger than you' }]
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
    name: 'Malakhim',
    stats: { Presence: 2 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Celestial'],
    traits: [
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' },
      { name: 'Celestial Resistance', desc: 'Resistance to radiant damage' },
      { name: 'Healing Hands', desc: 'As an action, touch a creature to restore health points equal to your total level, once per long rest' }
    ],
    subraces: [
      {
        name: 'Acheren',
        stats: { Composure: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action. Choose two saving throws; against effects that deal damage and require those saves, take no damage on a success and half damage on a failure. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Cassya',
        stats: { Dexterity: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action and conjure celestial armor. During it, gain +1 AV and +2 to all saving throws. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Hanimaat',
        stats: { Intelligence: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action. Once during it, when an ally within 12m takes damage from one source, use your reaction to take that damage instead and gain resistance to it. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Hazius',
        stats: { Cunning: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action and activate a 2m healing aura. Allies ending their turn in the aura regain 1d4 HP. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Nemaneres',
        stats: { Brawn: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action. Gain advantage on Resolve and Composure saving throws and cast Zone of Truth as Soul Mastery with a 1-minute duration. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Sephem',
        stats: { Manipulation: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action and conjure spectral wings, gaining a 6m flying speed. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Zakdian',
        stats: { Vitality: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action and shed bright light in a 2m radius plus dim light for 2m more. At the end of each of your turns, you and each creature within 2m take radiant damage equal to half your level, rounded up. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      },
      {
        name: 'Redemption Malakhim',
        stats: { Resolve: 1 },
        traits: [
          { name: 'Radiant Soul', desc: 'At total level 3, transform for 1 minute as an action and conjure spectral wings. When you transform, visible creatures within 2m must pass a Resolve save against DV 8 + proficiency bonus + Resolve modifier or be frightened of you until the end of your next turn. Once per turn, add radiant damage equal to half your total level, rounded up, to one target you damage with an attack or spell. Usable once per long rest' }
        ]
      }
    ]
  },
  {
    name: 'Tiefling',
    stats: { Cunning: 1, Presence: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Infernal'],
    traits: [
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' }
    ],
    subraces: [
      { name: 'Amaknuphis', stats: { Resolve: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Resistance to necrotic damage' }, { name: 'Infernal Legacy', desc: 'Cast Chill Touch as Soul Mastery. At total level 3, cast Suggestion as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Ray of Enfeeblement as Soul Mastery once per long rest' }] },
      { name: 'Bazilius', stats: { Manipulation: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Resistance to poison damage' }, { name: 'Infernal Legacy', desc: 'Cast Poison Spray as Soul Mastery. At total level 3, cast Blur as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Invisibility as Soul Mastery once per long rest' }] },
      { name: 'Djosqet', stats: { Intelligence: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Resistance to cold damage' }, { name: 'Infernal Legacy', desc: 'Cast Frostbite as Soul Mastery. At total level 3, cast Armor of Life as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Enhance Ability as Soul Mastery once per long rest' }] },
      { name: 'Galene', stats: { Brawn: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Resistance to lightning damage' }, { name: 'Tempest Strike', desc: 'Once per long rest, add 1d6 thunder damage to an unarmed or melee weapon attack. This becomes 2d6 and 2 uses at total level 5, 3d6 and 3 uses at total level 11, and 4d6 and 4 uses at total level 17. Once per long rest, treat one hit against an object as a critical hit' }] },
      { name: 'Hori', stats: { Presence: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Advantage on saves against charm and frightened' }, { name: 'Infernal Legacy', desc: 'Cast Prestidigitation as Soul Mastery. At total level 3, cast Enthrall as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Alter Self as Soul Mastery once per long rest' }] },
      { name: 'Melanthiosia', stats: { Dexterity: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Resistance to fire damage' }, { name: 'Infernal Legacy', desc: 'Cast Thaumaturgy as Soul Mastery. At total level 3, cast Hellish Rebuke as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Darkness as Soul Mastery once per long rest' }] },
      { name: 'Mennem', stats: { Vitality: 1 }, traits: [{ name: 'Hellish Resistance', desc: 'Advantage on Vitality saving throws' }, { name: 'Infernal Legacy', desc: 'Cast Guidance as Soul Mastery. At total level 3, cast Augury as a 2nd-level spell as Soul Mastery once per long rest. At total level 5, cast Locate Object as Soul Mastery once per long rest' }] }
    ]
  },
  {
    name: 'Dragonborn',
    stats: { Brawn: 2, Presence: 1, Resolve: 1 },
    speed: 6,
    size: 'Medium',
    languages: ['Ancient Markish', 'home Realm language', 'Draconic'],
    traits: [
      { name: 'Damage Resistance', desc: 'Resistance to the damage type dealt by your Draconic Breath' },
      { name: 'Darkvision', desc: 'See in dim light within 12m as bright light, and darkness as dim light; only shades of gray in darkness' },
      { name: 'Draconic Breath', desc: 'Once per short or long rest, use an action to breathe elemental energy. Creatures in the area make the listed save, taking 2d6 damage on a failure or half on a success. DV = 8 + Vitality modifier + proficiency bonus. Damage increases to 3d6 at total level 6, 4d6 at total level 11, and 5d6 at total level 16' }
    ],
    subraces: [
      { name: 'Black', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Acid damage in a 1m by 6m line; targets make Dexterity saves' }] },
      { name: 'Blue', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Lightning damage in a 1m by 6m line; targets make Dexterity saves' }] },
      { name: 'Brass', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Fire damage in a 1m by 6m line; targets make Dexterity saves' }] },
      { name: 'Bronze', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Lightning damage in a 1m by 6m line; targets make Dexterity saves' }] },
      { name: 'Copper', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Acid damage in a 1m by 6m line; targets make Dexterity saves' }] },
      { name: 'Gold', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Fire damage in a 3m cone; targets make Dexterity saves' }] },
      { name: 'Green', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Poison damage in a 3m cone; targets make Vitality saves' }] },
      { name: 'Red', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Fire damage in a 3m cone; targets make Vitality saves' }] },
      { name: 'Silver', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Cold damage in a 3m cone; targets make Vitality saves' }] },
      { name: 'White', stats: {}, traits: [{ name: 'Draconic Breath Type', desc: 'Cold damage in a 3m cone; targets make Vitality saves' }] }
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
