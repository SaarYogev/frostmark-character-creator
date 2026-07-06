export const BACKGROUNDS = [
  {
    name: 'Artist/Crafter',
    skills: ['Academics', 'Arts & Craft', 'Perception', 'Manipulation'],
    gold: 15,
    equipment: 'A set of artisan tools (your choice), a sketch book, common clothes, 15 gp',
    trait: 'Masterpiece',
    desc: 'You are skilled at creating art or useful tools.'
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
    desc: 'You have a history of breaking the law.'
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
    name: 'Guard',
    skills: ['Athletics', 'Perception', 'Investigation', 'Leadership'],
    gold: 10,
    equipment: 'A guard uniform, a whistle, a lantern, 10 gp',
    trait: 'Watcher\'s Eye',
    desc: 'You served as a local guard protecting property and people.'
  },
  {
    name: 'Hermit',
    skills: ['Medicine', 'Survival', 'Occult', 'Perception'],
    gold: 5,
    equipment: 'A scroll case filled with notes, a winter blanket, herbalist kit, 5 gp',
    trait: 'Discovery',
    desc: 'You lived in seclusion for years.'
  },
  {
    name: 'Hunter',
    skills: ['Athletics', 'Perception', 'Survival', 'Stealth'],
    gold: 10,
    equipment: 'A skinning knife, animal traps, traveler clothes, 10 gp',
    trait: 'Tracker\'s Senses',
    desc: 'You hunt wild game for food and hides.'
  },
  {
    name: 'Military Engineer',
    originRestriction: 'Malgrave',
    skills: ['Academics', 'Arts & Craft'],
    gold: 10,
    equipment: 'Memorabilia from the field, two sets of tools, common clothes, 10 gp',
    trait: 'My Religion is Efficiency',
    desc: 'When building something, you can decrease material weight, time, or coin cost by 25%. Starts with Academics (Engineering) rank 2, Arts & Craft (choice) rank 2, and 1 extra skill point.'
  },
  {
    name: 'Noble',
    skills: ['Academics', 'Persuasion', 'Leadership', 'Manipulation'],
    gold: 25,
    equipment: 'Fine clothes, a signet ring, scroll of pedigree, 25 gp',
    trait: 'Position of Privilege',
    desc: 'You belong to a wealthy and influential lineage.'
  },
  {
    name: 'Outlander',
    skills: ['Athletics', 'Survival', 'Perception', 'Animal Handling'],
    gold: 10,
    equipment: 'A staff, a hunting trap, traveler clothes, 10 gp',
    trait: 'Wanderer',
    desc: 'You grew up in the wild, far from cities.'
  },
  {
    name: 'Priest',
    skills: ['Religion', 'Medicine', 'Persuasion', 'Leadership'],
    gold: 15,
    equipment: 'A holy symbol, vestments, prayer book, common clothes, 15 gp',
    trait: 'Temple Services',
    desc: 'You are dedicated to the worship of an Enneade.'
  },
  {
    name: 'Scholar',
    originRestriction: 'Anywhere but Beornhelm',
    skills: ['Academics', 'Investigation', 'Medicine', 'Perception'],
    gold: 10,
    equipment: 'A bottle of black ink, a quill, a small knife, common clothes, a belt pouch containing 10 gp',
    trait: 'Inquiry',
    desc: 'You spent years scouring manuscripts and studying scrolls.'
  },
  {
    name: 'Sailor',
    skills: ['Athletics', 'Perception', 'Survival', 'Subtlety'],
    gold: 10,
    equipment: 'A belaying pin, silk rope, traveler clothes, 10 gp',
    trait: 'Ship\'s Passage',
    desc: 'You worked on ships traversing the elemental seas.'
  },
  {
    name: 'Sacred Arms Agent',
    originRestriction: 'Crowhill',
    skills: [],
    gold: 10,
    equipment: 'Two tools or kits of your choice, common clothes, traveler\'s clothes, fine clothes, 10 gp',
    trait: 'Plucked from all Paths of Life',
    desc: 'Distribute 4 skill points freely for your agent path. While in service, you have comfortable income and jurisdiction in Applegate and Crowhill; permission is required in Armathain, and Beornhelm is hostile.'
  },
  {
    name: 'Soldier',
    skills: ['Athletics', 'Perception', 'Intimidation', 'Leadership'],
    gold: 10,
    equipment: 'An insignia of rank, trophy from a fallen enemy, set of bone dice, common clothes, 10 gp',
    trait: 'Military Rank',
    desc: 'You served in a military force or mercenary band.'
  },
  {
    name: 'Trader',
    skills: ['Persuasion', 'Manipulation', 'Academics', 'Perception'],
    gold: 20,
    equipment: 'Scale and weights, trader ledgers, common clothes, 20 gp',
    trait: 'Merchant Network',
    desc: 'You buy and sell goods for profit.'
  },
  {
    name: 'Unassuming',
    skills: ['Stealth', 'Subtlety', 'Deception', 'Empathy'],
    gold: 10,
    equipment: 'Extremely plain common clothes, small keep-sake, 10 gp',
    trait: 'Blend In',
    desc: 'You look so average that people forget you easily.'
  },
  {
    name: 'Urchin',
    skills: ['Subtlety', 'Stealth', 'Perception', 'Deception'],
    gold: 10,
    equipment: 'A small knife, map of your city, pet mouse, common clothes, 10 gp',
    trait: 'City Secrets',
    desc: 'You grew up on the streets, surviving day-to-day.'
  }
];
