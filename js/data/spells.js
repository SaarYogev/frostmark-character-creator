const SPELLS_BY_SCHOOL = {
  Abjuration: {
    0: ['Blade Ward', 'Resistance'],
    1: ['Absorb Elements', 'Alarm', 'Ceremony', 'Elemental Armor', 'Mage Armor', 'Protection From Soul Aspects', 'Repelling Ward', 'Sanctuary', 'Shield', 'Snare'],
    2: ['Aid', 'Arcane Lock', 'Intellect Fortress', 'Lesser Restoration', 'Warding Bond'],
    3: ['Aversion of Soul Aspects', 'Beacon of Hope', 'Counterspell', 'Dispel Magic', 'Freedom of Movement', 'Glyph of Warding', 'Pass Without A Trace', 'Protection From Conditions', 'Protection From Energy'],
    4: ['Aura of Life', 'Banishment', 'Death Ward', 'Private Sanctum', 'Resilient Sphere', 'Stoneskin'],
    5: ['Antilife Shell', 'Greater Restoration', 'Protection From Arcane', 'Soul Aspect Binding'],
    6: ['Contingency', 'Forbiddance', 'Globe of Invulnerability', 'Guards and Wards', 'Platinum Shield', 'Primordial Ward'],
    7: ['Forcecage', 'Symbol'],
    8: ['Antimagic Field', 'Exclusory Aura', 'Mind Blank'],
    9: ['Imprisonment', 'Invulnerability', 'Prismatic Wall']
  },
  Conjuration: {
    0: ['Acid Splash', 'Create Bonfire', 'Mage Hand', 'Poison Spray', 'Sword Burst'],
    1: ["Arms of An'her", 'Entangle', 'Find Familiar', 'Fog Cloud', 'Hail of Thorns', 'Ice Knife', 'Unseen Servant'],
    2: ['Create or Destroy Food and Water', 'Dust Devil', 'Find Steed', 'Flaming Sphere', 'Misty Step', 'Web'],
    3: ['Call Lightning', 'Conjure Animals', 'Conjure Barrage', "Hunger of An'her", "Iola's Tower", 'Sleet Storm', 'Stinking Cloud', 'Tidal Wave'],
    4: ['Black Tentacles', 'Conjure Woodland Beings', 'Dimension Door', 'Faithful Hound', 'Find Greater Steed', 'Grasping Vine', 'Guardian of Faith', 'Watery Sphere'],
    5: ['Cloudkill', 'Conjure Elemental', 'Conjure Volley', 'Infernal Calling', 'Insect Plague', 'Teleportation Circle', 'Tree Stride'],
    6: ['Conjure Fey', 'Realmwalker', 'Transport via Plants', 'Wall of Thorns', 'Word of Recall'],
    7: ['Conjure Celestial', 'Magnificent Mansion', 'Realm Shift', 'Teleport', 'Temple of the Gods'],
    8: ['Incendiary Cloud', 'Mighty Fortress', 'Tsunami'],
    9: ['Gate', 'Storm of Vengeance', 'Wish']
  },
  Divination: {
    0: ['Guidance', 'True Strike'],
    1: ['Comprehend Languages', 'Detect Magic', 'Detect Poison and Disease', 'Detect Soul Aspect', "Hunter's Mark", 'Identify'],
    2: ['Augury', 'Beast Bond', 'Detect Thoughts', 'Locate Animals or Plants', 'Locate Object', 'Mind Spike', 'See Invisibility'],
    3: ['Clairvoyance', 'Tongues'],
    4: ['Arcane Eye', 'Divination', 'Locate Creature'],
    5: ['Commune', 'Commune with Nature', 'Contact Other Realms', 'Legend Lore', 'Scrying', 'Telepathic Bond'],
    6: ['Find Path', 'True Seeing'],
    9: ['Foresight']
  },
  Enchantment: {
    0: ['Vicious Mockery'],
    1: ['Animal Connection', 'Animal Messenger', 'Bane', 'Bless', 'Charm Person', 'Command', 'Heroism', 'Hex', 'Hideous Laughter', 'Sleep'],
    2: ['Calm Emotions', 'Crown of Madness', 'Enthrall', 'Hold Person', 'Suggestion', 'Zone of Truth'],
    3: ['Enemies Abound', 'Fast Friends'],
    4: ['Charm Monster', 'Compulsion', 'Confusion', 'Dominate Beast'],
    5: ['Dominate Person', 'Geas', 'Hold', 'Modify Memory', 'Psychic Blast'],
    6: ['Mass Suggestion', 'Irresistible Dance'],
    7: ['Coptic Word of Pain'],
    8: ['Antipathy/Sympathy', 'Coptic Word of Stun', 'Dominate Monster', 'Feeblemind'],
    9: ['Coptic Word of Death']
  },
  Evocation: {
    0: ['Elemental Blade', 'Fire Bolt', 'Force Blast', 'Frostbite', 'Lights', 'Shocking Grasp', 'Thunderclap'],
    1: ['Burning Hands', 'Continual Flame', 'Earth Tremor', 'Faerie Fire', 'Hellish Rebuke', 'Magic Missile', 'Thunderwave'],
    2: ['Acid Arrow', 'Darkness', 'Flame Blade', 'Gust of Wind', 'Moonbeam', 'Scorching Ray', 'Shatter', 'Snowball Swarm', 'Spiritual Weapon', 'The Scorcher', 'Warding Wind'],
    3: ['Daylight', 'Lightning Bolt', 'Minute Meteors', 'Sending', 'Tiny Hut', 'Wall of Water', 'Wind Wall'],
    4: ['Fireball', 'Ice Storm', 'Storm Sphere', 'Vitriolic Sphere', 'Wall of Fire'],
    5: ['Arcane Hand', 'Cone of Cold', 'Dawn', 'Destructive Wave', 'Flame Strike', 'Maelstrom', 'Wall Force', 'Wall of Stone'],
    6: ['Blade Barrier', 'Chain Lightning', 'Freezing Sphere', 'Gravity Fissure', 'Sunbeam', 'Wall of Ice'],
    7: ['Coptic Word of Soul Blasting', 'Crown of Stars', 'Fire Storm', 'Prismatic Spray', 'Sword of Force', 'Whirlwind'],
    8: ['Dark Star', 'Earthquake', 'Maddening Darkness', 'Sunburst'],
    9: ['Meteor Swarm']
  },
  Illusion: {
    0: ['Minor Illusion'],
    1: ['Color Spray', 'Disguise Self', 'Magic Mouth', 'Silent Image'],
    2: ['Blur', 'Invisibility', 'Nondetection', 'Mirror Image', 'Phantasmal Force', 'Shadow Blade', 'Silence'],
    3: ['Fear', 'Hypnotic Pattern', 'Major Image', 'Phantom Steed'],
    4: ['Greater Invisibility', 'Hallucinatory Terrain', 'Phantasmal Killer'],
    5: ['Creation', 'Dream', 'Mislead', 'Seeming'],
    6: ['Programmed Illusion'],
    7: ['Mental Prison', 'Mirage Arcane', 'Project Image', 'Simulacrum'],
    8: ['Glibness', 'Illusory Dragon'],
    9: ['Weird']
  },
  Transmutation: {
    0: ['Druidcraft', 'Gust', 'Mending', 'Message', 'Mold Earth', 'Prestidigitation', 'Primal Savagery', 'Shape Water', 'Shillelagh', 'Thaumaturgy'],
    1: ['Expeditious Retreat', 'Feather Fall', 'Goodberry', 'Jump', 'Longstrider', 'Magnify Gravity'],
    2: ['Alter Self', 'Barkskin', 'Darkvision', 'Earthen Grasp', 'Enhance Ability', 'Enlarge/Reduce', 'Heat Metal', 'Knock', 'Levitate', 'Magic Weapon', 'Spider Climb', 'Spike Growth'],
    3: ['Blink', 'Divine Weapon', 'Elemental Weapon', 'Erupting Earth', 'Flame Arrows', 'Fly', 'Gaseous Form', 'Haste', 'Meld into Stone', 'Plant Growth', 'Slow', 'Water Breathing', 'Water Walk'],
    4: ['Control Water', 'Elemental Bane', 'Fabricate', 'Giant Insect', 'Polymorph', 'Stone Shape'],
    5: ['Animate Object', 'Awaken', 'Control Winds', 'Passwall', 'Telekinesis', 'Transmute Rock'],
    6: ['Bones of the Earth', 'Disintegrate', 'Flesh to Stone', 'Move Earth', 'Wind Walk'],
    7: ['Etherealness', 'Regenerate', 'Reverse Gravity', 'Sequester'],
    8: ['Animal Shapes', 'Control Weather'],
    9: ['Shapechange', 'True Polymorph']
  },
  Vismancy: {
    0: ['Chill Touch', 'Sacred Flame', 'Spare the Dying'],
    1: ['Armor of Life', 'Cure Wounds', 'Gentle Repose', 'Guiding Bolt', 'Healing Word', 'Inflict Wounds', 'Ray of Sickness'],
    2: ['Blindness/Deafness', 'Prayer of Healing', 'Ray of Enfeeblement'],
    3: ['Animate Dead', 'Bestow Curse', 'Mass Healing Word', 'Revivify', 'Speak With Dead', 'Vampiric Touch'],
    4: ['Blight', 'Shadows of Djosqet'],
    5: ['Contagion', 'Danse Macabre', 'Hallow', 'Mass Cure Wounds', 'Necrotic Wave', 'Raise Dead'],
    6: ['Circle of Death', 'Create Undead', 'Eyebite', 'Heal', 'Harm'],
    7: ['Finger of Death', 'Resurrection'],
    8: ['Clone'],
    9: ['Coptic Word of Healing', 'Mass Heal', 'True Resurrection']
  }
};

export const CANTRIPS = [...new Set(
  Object.values(SPELLS_BY_SCHOOL).flatMap(levels => levels[0] ?? [])
)].sort((a, b) => a.localeCompare(b));

export const SPELLS = Object.entries(SPELLS_BY_SCHOOL).flatMap(([school, levels]) =>
  Object.entries(levels)
    .filter(([level]) => Number(level) > 0)
    .flatMap(([level, names]) =>
      names.map(name => ({
        name,
        level: Number(level),
        school,
        desc: `${school} spell`
      }))
    )
);

export const SPELLCASTING_POTENTIAL_LIMITS = {
  1: { Minor: 20, Moderate: 40, Major: 60 },
  2: { Minor: 20, Moderate: 40, Major: 60 },
  3: { Minor: 20, Moderate: 40, Major: 60 },
  4: { Minor: 20, Moderate: 40, Major: 60 },
  5: { Minor: 20, Moderate: 40, Major: 60 },
  6: { Minor: 20, Moderate: 40, Major: 60 },
  7: { Minor: 20, Moderate: 40, Major: 60 },
  8: { Minor: 20, Moderate: 40, Major: 60 },
  9: { Minor: 20, Moderate: 40, Major: 60 }
};
