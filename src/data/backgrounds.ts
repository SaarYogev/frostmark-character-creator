export interface BackgroundData {
  name: string;
  skills?: string[];
  gold: number;
  equipment?: string;
  trait?: string;
  desc?: string;
  freeSkillPoints?: number;
  builtInRanks?: Record<string, number>;
  restrictSkills?: string[];
}

export const BACKGROUNDS: BackgroundData[] = [
  {
    name: 'Artist/Crafter',
    skills: ['Academics', 'Arts & Craft', 'Perception', 'Manipulation'],
    gold: 15,
    equipment: 'A set of artisan tools (your choice), a sketch book, common clothes, 15 gp',
    trait: 'Masterpiece',
    desc: 'You are skilled at creating art or useful tools.',
    freeSkillPoints: 3
  },
  {
    name: 'Bounty Hunter',
    skills: ['Athletics', 'Investigation', 'Perception', 'Survival'],
    gold: 10,
    equipment: 'A set of manacles, a bounty ledger, outdoor clothes, 10 gp',
    trait: 'Ear to the Ground',
    desc: 'You track down targets for coin.'
  },
  {
    name: 'Charlatan',
    skills: ['Deception', 'Manipulation', 'Subtlety', 'Persuasion'],
    gold: 15,
    equipment: 'A set of fine clothes, a disguise kit, false documentation, 15 gp',
    trait: 'False Identity',
    desc: 'You excel at deception and misdirection.'
  },
  {
    name: 'Criminal',
    skills: ['Deception', 'Subtlety', 'Stealth', 'Athletics'],
    gold: 15,
    equipment: 'A crowbar, a set of dark common clothes with a hood, 15 gp',
    trait: 'Criminal Contact',
    desc: 'You have a history of breaking the law.',
    freeSkillPoints: 5,
    restrictSkills: ['Athletics', 'Deception', 'Perception', 'Subtlety', 'Stealth']
  },
  {
    name: 'Cultist',
    skills: ['Occult', 'Deception', 'Subtlety', 'Religion'],
    gold: 10,
    equipment: 'Vestments of your cult, a dark hood, a sacrificial dagger, 10 gp',
    trait: 'Occult Knowledge',
    desc: 'You belong to a secret group serving a dark power.'
  },
  {
    name: 'Entertainer',
    skills: ['Arts & Craft', 'Persuasion', 'Manipulation', 'Athletics'],
    gold: 15,
    equipment: 'A musical instrument, common clothes, costume, 15 gp',
    trait: 'By Popular Demand',
    desc: 'You thrive in front of an audience.'
  },
  {
    name: 'Far Traveler',
    skills: ['Perception', 'Survival', 'Academics', 'Persuasion'],
    gold: 10,
    equipment: 'Travel clothes, maps of your homeland, a small token of home, 10 gp',
    trait: 'All Eyes on You',
    desc: 'You come from a foreign realm.'
  },
  {
    name: 'Gladiator',
    skills: ['Athletics', 'Leadership', 'Perception', 'Survival'],
    gold: 10,
    equipment: 'An inexpensive arena weapon, an emblem of your gladiator rank, 10 gp',
    trait: 'By Popular Demand',
    desc: 'You fought for entertainment in arenas.'
  },
  {
    name: 'Hermit',
    skills: ['Medicine', 'Survival', 'Occult', 'Perception'],
    gold: 5,
    equipment: 'A scroll case full of notes, a winter blanket, common clothes, herbalism kit, 5 gp',
    trait: 'Discovery',
    desc: 'You lived in seclusion for a formative period of your life.'
  },
  {
    name: 'Knight / Order Member',
    skills: ['Athletics', 'Leadership', 'Persuasion', 'Academics'],
    gold: 10,
    equipment: 'A signet ring, a scroll of pedigree, fine clothes, 10 gp',
    trait: 'Position of Privilege',
    desc: 'You belong to a recognized order or noble knightly house.'
  },
  {
    name: 'Mercenary',
    skills: ['Athletics', 'Perception', 'Survival', 'Leadership'],
    gold: 10,
    equipment: 'An emblem of your mercenary company, uniform clothes, 10 gp',
    trait: 'Mercenary Life',
    desc: 'You fought in wars for payment.'
  },
  {
    name: 'Merchant',
    skills: ['Persuasion', 'Deception', 'Investigation', 'Academics'],
    gold: 25,
    equipment: 'A set of fine clothes, a mule and cart, merchant ledger, 25 gp',
    trait: 'Commercial Connection',
    desc: 'You buy and sell goods across regions.'
  },
  {
    name: 'Noble',
    skills: ['Leadership', 'Persuasion', 'Academics', 'Deception'],
    gold: 25,
    equipment: 'A set of fine clothes, a signet ring, a scroll of pedigree, 25 gp',
    trait: 'Position of Privilege',
    desc: 'You were born into wealth and title.'
  },
  {
    name: 'Outlander',
    skills: ['Athletics', 'Survival', 'Perception', 'Animal Handling'],
    gold: 10,
    equipment: 'A staff, a hunting trap, a trophy from an animal, traveler clothes, 10 gp',
    trait: 'Wanderer',
    desc: 'You grew up in the wilds away from civilization.'
  },
  {
    name: 'Scholar',
    skills: ['Academics', 'Occult', 'Medicine', 'Investigation'],
    gold: 10,
    equipment: 'A bottle of ink, a quill, a small knife, a letter from a dead colleague, common clothes, 10 gp',
    trait: 'Researcher',
    desc: 'You spent years studying lore and ancient texts.',
    freeSkillPoints: 4
  },
  {
    name: 'Sailor',
    skills: ['Athletics', 'Perception', 'Survival', 'Subtlety'],
    gold: 10,
    equipment: '50 feet of silk rope, a lucky charm, common clothes, 10 gp',
    trait: 'Ship’s Passage',
    desc: 'You sailed the seas aboard ships.'
  },
  {
    name: 'Scout',
    skills: ['Stealth', 'Perception', 'Survival', 'Athletics'],
    gold: 10,
    equipment: 'A set of traveler clothes, a hunting knife, a map case, 10 gp',
    trait: 'Natural Explorer',
    desc: 'You scouted ahead for armies or adventuring bands.'
  },
  {
    name: 'Soldier',
    skills: ['Athletics', 'Leadership', 'Survival', 'Perception'],
    gold: 10,
    equipment: 'An insignia of rank, a trophy from a fallen enemy, common clothes, 10 gp',
    trait: 'Military Rank',
    desc: 'You served in an organized military force.'
  },
  {
    name: 'Military Engineer',
    skills: ['Academics', 'Arts & Craft', 'Athletics', 'Perception'],
    gold: 15,
    equipment: 'Engineer tools, blueprint case, common clothes, 15 gp',
    trait: 'Siege Craft',
    desc: 'You served in military operations focusing on fortifications and siege machinery.',
    freeSkillPoints: 1
  },
  {
    name: 'Urchin',
    skills: ['Subtlety', 'Stealth', 'Deception', 'Perception'],
    gold: 10,
    equipment: 'A small knife, a map of your hometown, a pet mouse, common clothes, 10 gp',
    trait: 'City Secrets',
    desc: 'You grew up poor on the city streets.'
  }
];
