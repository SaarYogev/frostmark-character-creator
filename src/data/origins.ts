export interface OriginData {
  name: string;
  hd: number;
  extraSkills: number;
  spellcasting: 'Minor' | 'Moderate' | 'Major';
  desc: string;
}

export const ORIGINS: OriginData[] = [
  {
    name: 'Artistry',
    hd: 8,
    extraSkills: 2,
    spellcasting: 'Moderate',
    desc: 'You channel your magic and skills through song, performance, or creation.'
  },
  {
    name: 'Devotion',
    hd: 8,
    extraSkills: 0,
    spellcasting: 'Major',
    desc: 'You serve an Enneade with complete faith, receiving divine spellcasting power.'
  },
  {
    name: 'Discipline',
    hd: 12,
    extraSkills: 0,
    spellcasting: 'Minor',
    desc: 'You harness extreme physical training and inner focus for martial capability.'
  },
  {
    name: 'Divine Oath',
    hd: 10,
    extraSkills: 0,
    spellcasting: 'Moderate',
    desc: 'You swear a sacred vow to an Enneade, shielding others and smiting foes.'
  },
  {
    name: 'Finesse',
    hd: 10,
    extraSkills: 2,
    spellcasting: 'Minor',
    desc: 'You utilize quick strikes, agility, and rogue-like skill versatility.'
  },
  {
    name: 'Occult Student',
    hd: 6,
    extraSkills: 1,
    spellcasting: 'Major',
    desc: 'You study the arcane mysteries, learning spells through intensive academic research.'
  },
  {
    name: 'Pact',
    hd: 10,
    extraSkills: 0,
    spellcasting: 'Moderate',
    desc: 'You made a deal with a powerful entity, receiving magical secrets in exchange.'
  },
  {
    name: 'Power',
    hd: 12,
    extraSkills: 0,
    spellcasting: 'Minor',
    desc: 'Pure martial strength and endurance, pushing through physical limits.'
  },
  {
    name: 'Predator',
    hd: 10,
    extraSkills: 1,
    spellcasting: 'Minor',
    desc: 'You hunt prey using instinct, track craft, and primal survival skills.'
  },
  {
    name: 'Stewardship',
    hd: 8,
    extraSkills: 1,
    spellcasting: 'Moderate',
    desc: 'You act as a guardian of nature or communities, balancing magic and duty.'
  },
  {
    name: 'Tactics',
    hd: 10,
    extraSkills: 1,
    spellcasting: 'Minor',
    desc: 'You direct battlefield movement, analyze enemy weaknesses, and lead allies.'
  },
  {
    name: 'Wild Magic',
    hd: 6,
    extraSkills: 0,
    spellcasting: 'Major',
    desc: 'Uncontrolled chaotic magic flows naturally through your bloodline.'
  }
];
