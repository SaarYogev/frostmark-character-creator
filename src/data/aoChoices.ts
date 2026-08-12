export interface AOChoiceDefinition {
  abilityName: string;
  label: string;
  type: 'single' | 'multi';
  maxChoices?: number;
  options: string[];
  resourceImpact?: {
    type: 'skill_points' | 'stat_modifier' | 'resistance' | 'spells' | 'custom';
    details?: Record<string, any>;
  };
}

export const AO_CHOICES: Record<string, AOChoiceDefinition> = {
  'Charmer': {
    abilityName: 'Charmer',
    label: 'Key Attribute for Protective Pomp',
    type: 'single',
    options: ['Presence', 'Manipulation'],
    resourceImpact: { type: 'stat_modifier' }
  },
  'Connoisseur': {
    abilityName: 'Connoisseur',
    label: 'Consistent Expertise Spells',
    type: 'multi',
    maxChoices: 2,
    options: ['Spell Choice 1', 'Spell Choice 2']
  },
  'Extension of the Soul (Embodiment of Triumph)': {
    abilityName: 'Extension of the Soul (Embodiment of Triumph)',
    label: 'Mastery Weapons',
    type: 'multi',
    maxChoices: 2,
    options: ['Ranged Mastery Weapon', 'Melee Mastery Weapon']
  },
  'Divine Smite': {
    abilityName: 'Divine Smite',
    label: 'Smite Favorite Damage Type',
    type: 'single',
    options: ['Fire', 'Radiant', 'Acid', 'Poison', 'Lightning', 'Necrotic', 'Force', 'Thunder', 'Bludgeoning', 'Cold', 'Slashing', 'Piercing', 'Psychic']
  },
  'Absorbed Soul Aspect': {
    abilityName: 'Absorbed Soul Aspect',
    label: 'Absorbed Soul Aspects (Choose 2)',
    type: 'multi',
    maxChoices: 2,
    options: [
      'Agonizing Blast',
      'Arcane Sight',
      'Armor of Shadows',
      'Beast Speech',
      'Beguiling Influence',
      'Book of Ancient Rituals',
      'Bountiful Recovery',
      'Embrace of Dithore',
      'Enhanced Pact Weapon',
      'Eyes of An’her',
      'Eyes of Sokari',
      'Force Spear',
      'Gaze of Two Minds',
      'Jinx of Imenta',
      'Lunar Trance',
      'Mask of Many Faces',
      'Misty Visions',
      'Repelling Blast',
      'Spear of Torpor',
      'Vigor of Labda',
      'Voice of the Master',
      'Aggravating Jinx'
    ],
    resourceImpact: { type: 'custom' }
  },
  'Pact Boon': {
    abilityName: 'Pact Boon',
    label: 'Patron Pact Boon',
    type: 'single',
    options: ['Blade', 'Bond', 'Tome', 'Stellar Bond']
  },
  'Survival Instincts': {
    abilityName: 'Survival Instincts',
    label: 'Choose 2 Skills (+2 skill points each, max rank 5)',
    type: 'multi',
    maxChoices: 2,
    options: ['Animal Handling', 'Athletics', 'Medicine', 'Perception', 'Survival'],
    resourceImpact: { type: 'skill_points', details: { points: 2, maxRank: 5 } }
  },
  'Child of the Natural World (Natural Harbinger)': {
    abilityName: 'Child of the Natural World (Natural Harbinger)',
    label: 'Harbinger Environment Aura',
    type: 'single',
    options: ['Arid', 'Ocean', 'Arctic']
  },
  'Animalistic Virtue (Beast Channeller)': {
    abilityName: 'Animalistic Virtue (Beast Channeller)',
    label: 'Animal Virtue',
    type: 'single',
    options: ['Lumbering', 'Flying', 'Running']
  },
  'Soul of the Wild (Natural Harbinger)': {
    abilityName: 'Soul of the Wild (Natural Harbinger)',
    label: 'Environmental Resistance',
    type: 'single',
    options: ['Arid (Fire Resistance)', 'Ocean (Lightning Resistance)', 'Arctic (Cold Resistance)'],
    resourceImpact: { type: 'resistance' }
  },
  'Beast Bond (Beast Channeller)': {
    abilityName: 'Beast Bond (Beast Channeller)',
    label: 'Beast Bond Feature',
    type: 'single',
    options: ['Lumbering', 'Flying', 'Running']
  },
  'Force of Nature (Natural Harbinger)': {
    abilityName: 'Force of Nature (Natural Harbinger)',
    label: 'Force of Nature Reaction',
    type: 'single',
    options: ['Arid', 'Ocean', 'Arctic']
  },
  'Favored Enemy': {
    abilityName: 'Favored Enemy',
    label: 'Favored Creature Type',
    type: 'single',
    options: ['animal', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'human', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead']
  },
  'Hunter’s Prey (Hunter)': {
    abilityName: 'Hunter’s Prey (Hunter)',
    label: 'Hunter’s Prey Feature',
    type: 'single',
    options: ['Colossus Slayer', 'Giant Killer', 'Horde Breaker']
  },
  'Greater Favored Enemy': {
    abilityName: 'Greater Favored Enemy',
    label: 'Second Favored Creature Type',
    type: 'single',
    options: ['animal', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'human', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead']
  },
  'Relentless Chaser (Hunter)': {
    abilityName: 'Relentless Chaser (Hunter)',
    label: 'Relentless Chaser Option',
    type: 'single',
    options: ['Volley', 'Whirlwind Strike']
  },
  'Superior Elusive Stalker (Hunter)': {
    abilityName: 'Superior Elusive Stalker (Hunter)',
    label: 'Superior Defense Option',
    type: 'single',
    options: ['Evasion', 'Stand Against the Tide', 'Uncanny Dodge']
  },
  'Threaten': {
    abilityName: 'Threaten',
    label: 'Soul Oath Decrees',
    type: 'single',
    options: ['Aegis', 'Aspiration', 'Chivalry']
  },
  'Oaths': {
    abilityName: 'Oaths',
    label: 'Soul Oath Decrees',
    type: 'single',
    options: ['Aegis', 'Aspiration', 'Chivalry']
  },
  'Braggadocio (Aspiration)': {
    abilityName: 'Braggadocio (Aspiration)',
    label: 'Persuasion Check Characteristic',
    type: 'single',
    options: ['Brawn', 'Dexterity', 'Vitality', 'Intelligence', 'Cunning', 'Resolve', 'Presence', 'Manipulation', 'Composure']
  },
  'Dictate of Order (Titan)': {
    abilityName: 'Dictate of Order (Titan)',
    label: 'True Giant Heritage',
    type: 'single',
    options: ['Cloud Titan', 'Fire Titan', 'Frost Titan', 'Hill Titan', 'Stone Titan', 'Storm Titan'],
    resourceImpact: { type: 'spells' }
  },
  'Metamagic': {
    abilityName: 'Metamagic',
    label: 'Choose 2 Metamagic Options',
    type: 'multi',
    maxChoices: 2,
    options: ['Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell', 'Heightened Spell', 'Hunting Spell', 'Quickened Spell', 'Primordial Spell', 'Subtle Spell', 'Twinned Spell']
  },
  'Elemental Affinity (Draconic)': {
    abilityName: 'Elemental Affinity (Draconic)',
    label: 'Draconic Ancestry',
    type: 'single',
    options: ['Black (Acid)', 'Blue (Lightning)', 'Brass (Fire)', 'Bronze (Lightning)', 'Copper (Acid)', 'Gold (Fire)', 'Green (Poison)', 'Red (Fire)', 'Silver (Cold)', 'White (Cold)']
  },
  'Improved Magical Upgrade': {
    abilityName: 'Improved Magical Upgrade',
    label: 'Upgrade Choice',
    type: 'single',
    options: ['+1 to an Ability Score', '20/30 Potential', 'Skill Points', 'Additional Feat', 'Accomplishment Points']
  },
  'Ability Score Improvement or Feat': {
    abilityName: 'Ability Score Improvement or Feat',
    label: 'Ability Score Increase or Feat Choice',
    type: 'single',
    options: [
      '+2 Brawn',
      '+2 Dexterity',
      '+2 Vitality',
      '+2 Intelligence',
      '+2 Cunning',
      '+2 Resolve',
      '+2 Presence',
      '+2 Manipulation',
      '+2 Composure',
      '+1 to Two Ability Scores',
      'Feat'
    ],
    resourceImpact: { type: 'stat_modifier' }
  }
};

export function getAOChoiceDefinition(abilityName: string, abilityDesc?: string): AOChoiceDefinition | undefined {
  // 1. Prioritize dynamic extraction from specific level ability description
  if (abilityDesc && (abilityDesc.includes('Gain one of your choices:') || abilityDesc.includes('Gain one of the following:'))) {
    const lines = abilityDesc.split('\n');
    const headerIdx = lines.findIndex(l => l.includes('Gain one of your choices:') || l.includes('Gain one of the following:'));
    if (headerIdx !== -1) {
      const parsedOptions = lines.slice(headerIdx + 1)
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
      if (parsedOptions.length > 0) {
        return {
          abilityName,
          label: 'Upgrade Choice',
          type: 'single',
          options: parsedOptions
        };
      }
    }
  }

  // 2. Exact match in registered curated choices
  if (AO_CHOICES[abilityName]) return AO_CHOICES[abilityName];

  // 3. Match partial name if exact match fails
  const entry = Object.entries(AO_CHOICES).find(([key]) =>
    abilityName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(abilityName.toLowerCase())
  );
  if (entry) return entry[1];

  // 4. Fallback for any Ability Score / ASI choice
  if (abilityName.includes('Ability Score') || abilityName.includes('ASI')) {
    return {
      abilityName,
      label: 'Ability Score Increase or Feat Choice',
      type: 'single',
      options: [
        '+2 Brawn',
        '+2 Dexterity',
        '+2 Vitality',
        '+2 Intelligence',
        '+2 Cunning',
        '+2 Resolve',
        '+2 Presence',
        '+2 Manipulation',
        '+2 Composure',
        '+1 to Two Ability Scores',
        'Feat'
      ],
      resourceImpact: { type: 'stat_modifier' }
    };
  }

  // 5. Fallback for any Upgrade ability
  if (abilityName.includes('Upgrade')) {
    return {
      abilityName,
      label: 'Upgrade Choice',
      type: 'single',
      options: [
        'One point to use in the Accomplishment section or to store for later purchase in the same section',
        '10 Potential',
        'Two points to use in the Accomplishment section or to store for later purchase in the same section',
        '20 Potential'
      ]
    };
  }

  return undefined;
}
