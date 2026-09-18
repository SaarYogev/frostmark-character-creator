import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import { ARMOR, WEAPONS } from '../data/equipment';
import { ABILITIES } from '../data/abilities';
import { CharacterState, DEFAULT_CHARACTER } from '../types/Character';
import { AbilityItem } from '../types/AO';
import { deduplicateEquipmentList } from './equipmentUtils';

function safeGetText(form: any, fieldName: string): string {
  try {
    const field = form.getField(fieldName);
    if (field instanceof PDFTextField || typeof (field as any).getText === 'function') {
      return ((field as any).getText() ?? '').trim();
    }
    return '';
  } catch {
    /* Silent catch handles field names that do not exist in specific template revisions */
    return '';
  }
}

function safeIsChecked(form: any, fieldName: string): boolean {
  try {
    const field = form.getField(fieldName);
    if (field instanceof PDFCheckBox || typeof (field as any).isChecked === 'function') {
      return (field as any).isChecked() === true;
    }
    return false;
  } catch {
    /* Silent catch handles checkbox names that do not exist in specific template revisions */
    return false;
  }
}

function parseInteger(val: string, fallback = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/[^0-9\-]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? fallback : parsed;
}

const SAVE_FIELD_MAP: Record<string, { text: string; check: string }> = {
  Brawn: { text: 'Brawn Save', check: 'Brawn Save Check' },
  Dexterity: { text: 'Dex Save', check: 'Dex Save Check' },
  Vitality: { text: 'Vita Save', check: 'Vit Save Check' },
  Intelligence: { text: 'Int Save', check: 'Int Save Check' },
  Cunning: { text: 'Cun Save', check: 'Cun Save Check' },
  Resolve: { text: 'Reso Save', check: 'Reso Save Check' },
  Presence: { text: 'Presence Save', check: 'Presc Save Check' },
  Manipulation: { text: 'Mani Save', check: 'Mani Save Check' },
  Composure: { text: 'Comp Save', check: 'Comp Save Check' },
};

export async function importFromPDF(
  pdfBytes: Uint8Array | ArrayBuffer,
  racesData: any[] = RACES,
  backgroundsData: any[] = BACKGROUNDS,
  originsData: any[] = ORIGINS
): Promise<CharacterState> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const charName = safeGetText(form, 'CHARACTER NAME');
  const playerName = safeGetText(form, 'PLAYER NAME');
  const raceRaw = safeGetText(form, 'RACE');
  const bgRaw = safeGetText(form, 'BACKGROUND');
  const aoLevelRaw = safeGetText(form, 'AOs  LEVEL');

  let race = 'Human';
  let subrace = '';
  if (raceRaw) {
    const subraceMatch = raceRaw.match(/^(.*?)\s*\((.*?)\)$/);
    if (subraceMatch) {
      race = subraceMatch[1].trim();
      subrace = subraceMatch[2].trim();
    } else {
      race = raceRaw.trim();
    }
  }

  let backgroundName = bgRaw || 'Scholar';
  let primaryAO = '';
  let secondaryAO = '';
  let level = 1;

  if (aoLevelRaw) {
    const levelMatch = aoLevelRaw.match(/\(Level\s+(\d+)\)/i);
    if (levelMatch) {
      level = parseInt(levelMatch[1], 10) || 1;
    }
    const aoPart = aoLevelRaw.replace(/\(Level\s+\d+\)/i, '').trim();
    if (aoPart.includes('/')) {
      const parts = aoPart.split('/').map((s) => s.trim());
      primaryAO = parts[0] || '';
      secondaryAO = parts[1] || '';
    } else if (aoPart && aoPart !== 'None' && aoPart !== '—') {
      primaryAO = aoPart;
    }
  }

  const age = safeGetText(form, 'Appearance Age');
  const height = safeGetText(form, 'Appearance Height');
  const weight = safeGetText(form, 'Appearance Weight');
  const appearanceNotes = safeGetText(form, 'Appearance Additional');
  const personalityBackstory = safeGetText(form, 'Personality and Backstory');

  const characteristics: Record<string, number> = {};
  CHARACTERISTICS.forEach((c) => {
    const textScore =
      safeGetText(form, `${c.key} Ability Score`) ||
      safeGetText(form, c.key) ||
      safeGetText(form, `${c.key} Score`);
    characteristics[c.key] = parseInteger(textScore, 10);
  });

  const savingThrowsProficient: Record<string, boolean> = {};
  CHARACTERISTICS.forEach((c) => {
    const mapping = SAVE_FIELD_MAP[c.key];
    const isProf =
      (mapping && safeIsChecked(form, mapping.check)) ||
      safeIsChecked(form, `${c.key} Save Checkbox`) ||
      safeIsChecked(form, `${c.key} Save Check`);
    savingThrowsProficient[c.key] = isProf;
  });

  const skillRanks: Record<string, number> = {};
  SKILLS.forEach((sk) => {
    let rank = 0;
    for (let i = 5; i >= 1; i--) {
      if (
        safeIsChecked(form, `${sk.key} ${i}`) ||
        safeIsChecked(form, `${sk.name} ${i}`)
      ) {
        rank = i;
        break;
      }
    }
    if (rank > 0) {
      skillRanks[sk.name] = rank;
    }
  });

  const academicsEntries: { name: string; rank: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const label = safeGetText(form, `Aca ${i} label`);
    if (label) {
      let rank = 1;
      for (let r = 5; r >= 1; r--) {
        if (safeIsChecked(form, `Aca ${i} ${r}`)) {
          rank = r;
          break;
        }
      }
      academicsEntries.push({ name: label, rank });
    }
  }

  const maxHPText = safeGetText(form, 'Max HP') || safeGetText(form, 'HP Max');
  const currentHPText = safeGetText(form, 'Current HP');
  const tempHPText = safeGetText(form, 'Temp HP');
  const speedText = safeGetText(form, 'Speed');
  const acText = safeGetText(form, 'Armor Class');
  const totalHDText = safeGetText(form, 'Total HD');
  const hdText = safeGetText(form, 'HD');
  const initiativeText = safeGetText(form, 'Initiative');

  const maxHP = parseInteger(maxHPText, 10);
  const currentHP = currentHPText ? parseInteger(currentHPText, maxHP) : maxHP;
  const tempHP = parseInteger(tempHPText, 0);
  const armorClass = acText ? parseInteger(acText, 10) : undefined;
  const speed = speedText ? parseInteger(speedText, 6) : 6;
  const initiativeBonus = initiativeText ? parseInteger(initiativeText, 0) : undefined;

  const equipmentList: any[] = [];

  for (let i = 1; i <= 4; i++) {
    const wName = safeGetText(form, `Weapon ${i}`);
    if (wName) {
      const hit = safeGetText(form, `Weapon ${i} Hit`);
      const range = safeGetText(form, `Weapon ${i} Range`);
      const damage = safeGetText(form, `Weapon ${i} Damage`);
      const matched = WEAPONS.find((w) => w.name.toLowerCase() === wName.toLowerCase());
      equipmentList.push({
        name: matched ? matched.name : wName,
        isWeapon: true,
        isCustom: !matched,
        hit: hit || '+0',
        range: range || (matched ? matched.properties : ''),
        damage: damage || (matched ? matched.damage : ''),
        properties: matched ? matched.properties : (range || ''),
        cost: matched ? matched.cost : undefined,
        weight: matched ? matched.weight : undefined,
        equipped: true,
        quantity: 1,
      });
    }
  }

  for (let i = 1; i <= 6; i++) {
    const rawDefName = safeGetText(form, `Defenses ${i}`);
    if (rawDefName) {
      const avText = safeGetText(form, `Defense ${i} AV`);
      const defType = safeGetText(form, `Defense ${i} Type`);
      let av = avText ? parseInteger(avText, 0) : undefined;
      let category = defType;

      const avMatch = rawDefName.match(/(?:AV|AC)[:\s]*(\d+)/i) || rawDefName.match(/\((\d+)\)/);
      if (av === undefined && avMatch) {
        av = parseInt(avMatch[1], 10);
      }

      if (!category) {
        if (/shield/i.test(rawDefName)) category = 'Shield';
        else if (/heavy/i.test(rawDefName)) category = 'Heavy';
        else if (/medium/i.test(rawDefName)) category = 'Medium';
        else if (/light/i.test(rawDefName)) category = 'Light';
        else category = 'Medium';
      }

      const cleanName = rawDefName.replace(/\s*\([^)]*\)/g, '').trim() || rawDefName;
      const knownArmor = ARMOR.find((a) => cleanName.toLowerCase().includes(a.name.toLowerCase()));

      if (av === undefined && knownArmor) {
        av = knownArmor.av;
        if (!defType) category = knownArmor.category;
      }

      equipmentList.push({
        name: cleanName,
        isArmor: true,
        av,
        baseAC: av,
        category,
        cost: knownArmor?.cost,
        weight: knownArmor?.weight,
        equipped: true,
      });
    }
  }

  for (let i = 1; i <= 21; i++) {
    const itemName = safeGetText(form, `Item ${i}`);
    if (itemName) {
      const itemWeight = safeGetText(form, `Item ${i} weight`);
      const matchedWeapon = WEAPONS.find((w) => w.name.toLowerCase() === itemName.toLowerCase());
      const matchedArmor = ARMOR.find((a) => itemName.toLowerCase().includes(a.name.toLowerCase()));

      if (matchedWeapon) {
        const existingWeapon = equipmentList.find(
          (e) => (e.isWeapon || e.name) && e.name.toLowerCase() === matchedWeapon.name.toLowerCase()
        );
        if (existingWeapon) {
          if ((existingWeapon.weight == null || existingWeapon.weight === '') && itemWeight) {
            existingWeapon.weight = parseInteger(itemWeight, 0);
          }
        } else {
          equipmentList.push({
            name: matchedWeapon.name,
            isWeapon: true,
            damage: matchedWeapon.damage,
            properties: matchedWeapon.properties,
            cost: matchedWeapon.cost,
            weight: itemWeight ? parseInteger(itemWeight, 0) : matchedWeapon.weight,
            quantity: 1,
          });
        }
      } else if (matchedArmor) {
        const existingArmor = equipmentList.find(
          (e) => (e.isArmor || e.name) && (e.name.toLowerCase() === matchedArmor.name.toLowerCase() || e.name.toLowerCase() === itemName.toLowerCase())
        );
        if (existingArmor) {
          if ((existingArmor.weight == null || existingArmor.weight === '') && itemWeight) {
            existingArmor.weight = parseInteger(itemWeight, 0);
          } else if (existingArmor.weight == null && matchedArmor.weight != null) {
            existingArmor.weight = matchedArmor.weight;
          }
          if (!existingArmor.cost && matchedArmor.cost) {
            existingArmor.cost = matchedArmor.cost;
          }
        } else {
          equipmentList.push({
            name: itemName,
            isArmor: true,
            av: matchedArmor.av,
            baseAC: matchedArmor.av,
            category: matchedArmor.category,
            cost: matchedArmor.cost,
            weight: itemWeight ? parseInteger(itemWeight, 0) : matchedArmor.weight,
            quantity: 1,
          });
        }
      } else {
        const existingItem = equipmentList.find(
          (e) => e.name && e.name.toLowerCase() === itemName.trim().toLowerCase()
        );
        if (existingItem) {
          if ((existingItem.weight == null || existingItem.weight === '') && itemWeight) {
            existingItem.weight = parseInteger(itemWeight, 0);
          }
        } else {
          equipmentList.push({
            name: itemName,
            weight: itemWeight ? parseInteger(itemWeight, 0) : undefined,
            isOther: true,
            quantity: 1,
          });
        }
      }
    }
  }

  const attunedFieldCandidates = [
    ['Attuned Item', 'Attuned Item 1'],
    ['Attuned Item2', 'Attuned Item 2'],
    ['Attuned Item3', 'Attuned Item 3'],
  ];

  for (const candidates of attunedFieldCandidates) {
    let attName = '';
    for (const name of candidates) {
      attName = safeGetText(form, name);
      if (attName) break;
    }
    if (attName) {
      equipmentList.push({
        name: attName,
        isOther: true,
        attuned: true,
      });
    }
  }

  const finalEquipmentList = deduplicateEquipmentList(equipmentList);

  const goldAmount = parseInteger(safeGetText(form, 'Gold Pieces'), 0);
  const silverAmount = parseInteger(safeGetText(form, 'Silver Pieces'), 0);
  const copperAmount = parseInteger(safeGetText(form, 'Copper Pieces'), 0);

  const cantrips: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const cName = safeGetText(form, `Cantrip ${i}`);
    if (cName) cantrips.push(cName);
  }

  const spells: { name: string; level: number }[] = [];
  const slots: Record<number, number> = {};
  const souls: Record<number, number> = {};

  for (let lvl = 1; lvl <= 9; lvl++) {
    const slotTotal = safeGetText(form, `Level ${lvl} slot total`) || safeGetText(form, `Level ${lvl} Slots Total`);
    if (slotTotal) {
      slots[lvl] = parseInteger(slotTotal, 0);
    }
    const slotSouls = safeGetText(form, `Level ${lvl} slot souls`);
    if (slotSouls) {
      souls[lvl] = parseInteger(slotSouls, 0);
    }
    for (let slot = 1; slot <= 11; slot++) {
      const sName =
        safeGetText(form, `Level ${lvl} Slot ${slot}`) ||
        safeGetText(form, `Level ${lvl} Spell ${slot}`);
      if (sName) {
        spells.push({ name: sName, level: lvl });
      }
    }
  }

  const potentialText = safeGetText(form, 'Potential') || safeGetText(form, 'Potential Total');
  const potentialGained = potentialText ? parseInteger(potentialText, 0) : undefined;

  const ess1 = safeGetText(form, 'Essential Abilities 1');
  const ess2 = safeGetText(form, 'Essential Abilities 2');
  const col1 = safeGetText(form, 'Additional Abilities column 1');
  const col2 = safeGetText(form, 'Additional Abilities column 2');

  const customFeatures: any[] = [];
  const customAbilities: AbilityItem[] = [];
  const levelSelections: Record<number, { primaryAbility?: string; secondaryAbility?: string }> = {};

  const parseAbilityText = (rawText: string, isEssential: boolean) => {
    if (!rawText) return;
    const blocks = rawText.split('\n\n').map((b) => b.trim()).filter(Boolean);

    for (const block of blocks) {
      /*
       * Match structured headers formatted as: === Name (Origin · Lv.X) === or === Name ===
       */
      const headerMatch = block.match(/^===\s*(.+?)(?:\s*\((.*?)\s*·\s*Lv\.(\d+)\))?\s*===\s*\n?([\s\S]*)$/);
      if (headerMatch) {
        const abilityName = headerMatch[1].trim();
        const originName = (headerMatch[2] || primaryAO || 'Devotion').trim();
        const abilityLvl = headerMatch[3] ? parseInt(headerMatch[3], 10) : 1;
        const desc = (headerMatch[4] || '').trim();

        const premade = ABILITIES.find((a) => a.name.toLowerCase() === abilityName.toLowerCase());
        const targetLvl = premade ? premade.level : abilityLvl;
        const abilityId = premade ? premade.id : `custom-${abilityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        if (!premade) {
          customAbilities.push({
            id: abilityId,
            name: abilityName,
            origin: originName,
            level: targetLvl,
            selection: 'Custom',
            desc,
            short_desc: desc,
            full_desc: desc,
          } as any);
        }

        if (!levelSelections[targetLvl]) {
          levelSelections[targetLvl] = {};
        }

        if (!levelSelections[targetLvl].primaryAbility) {
          levelSelections[targetLvl].primaryAbility = abilityId;
        } else if (!levelSelections[targetLvl].secondaryAbility) {
          levelSelections[targetLvl].secondaryAbility = abilityId;
        }

        /*
         * Retain block in customFeatures so custom text or notes are fully queryable and never lost
         */
        customFeatures.push(block);
      } else if (isEssential) {
        /*
         * Essential ability without strict === header: attempt matching against premade abilities
         */
        const firstLine = block.split('\n')[0].trim();
        const cleanName = firstLine.replace(/[:\-].*$/, '').trim();
        const premade = ABILITIES.find((a) => a.name.toLowerCase() === cleanName.toLowerCase());
        if (premade) {
          const targetLvl = premade.level || 1;
          if (!levelSelections[targetLvl]) {
            levelSelections[targetLvl] = {};
          }
          if (!levelSelections[targetLvl].primaryAbility) {
            levelSelections[targetLvl].primaryAbility = premade.id;
          } else if (!levelSelections[targetLvl].secondaryAbility) {
            levelSelections[targetLvl].secondaryAbility = premade.id;
          }
        }
        customFeatures.push(block);
      } else {
        customFeatures.push(block);
      }
    }
  };

  parseAbilityText(ess1, true);
  parseAbilityText(ess2, true);
  parseAbilityText(col1, false);
  parseAbilityText(col2, false);

  const profsBlock =
    safeGetText(form, 'Lang/profs column') ||
    safeGetText(form, 'Other Proficiencies & Languages');
  const languages: string[] = [];
  const weaponProficiencies: string[] = [];
  const armorProficiencies: Record<string, boolean> = {
    Light: false,
    Medium: false,
    Heavy: false,
    Shields: false,
  };

  if (profsBlock) {
    const lines = profsBlock.split('\n');
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.startsWith('languages:')) {
        const langs = line.substring(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(Boolean);
        languages.push(...langs);
      } else if (lower.startsWith('weapons:')) {
        const weaps = line.substring(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(Boolean);
        weaponProficiencies.push(...weaps);
      } else if (lower.startsWith('armor:')) {
        const armors = line.substring(line.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(Boolean);
        armors.forEach((a) => {
          if (/light/i.test(a)) armorProficiencies.Light = true;
          if (/medium/i.test(a)) armorProficiencies.Medium = true;
          if (/heavy/i.test(a)) armorProficiencies.Heavy = true;
          if (/shield/i.test(a)) armorProficiencies.Shields = true;
        });
      }
    });
  }

  const selectedAOs: string[] = [];
  if (primaryAO) selectedAOs.push(primaryAO);
  if (secondaryAO && !selectedAOs.includes(secondaryAO)) {
    selectedAOs.push(secondaryAO);
  }

  const importedState: any = {
    ...DEFAULT_CHARACTER,
    characterName: charName,
    playerName: playerName,
    race,
    subrace,
    background: backgroundName,
    primaryAO: primaryAO || 'Devotion',
    secondaryAO,
    selectedAOs,
    level,
    maxHP,
    currentHP,
    tempHP,
    armorClass,
    speed,
    goldAmount,
    silverAmount,
    copperAmount,
    potentialGained,
    baseCharacteristics: { ...characteristics },
    characteristics: { ...characteristics },
    finalCharacteristics: { ...characteristics },
    skillRanks,
    academicsEntries,
    savingThrowsProficient,
    armorProficiencies,
    weaponProficiencies,
    languages,
    equipmentList: finalEquipmentList,
    combat: {
      maxHP,
      currentHP,
      tempHP,
      armorClass,
      speed,
      totalHD: totalHDText || undefined,
      hd: hdText || undefined,
      initiativeBonus,
    },
    spellcasting: {
      cantrips,
      spells,
      slots,
      souls,
    },
    customFeatures,
    manualSkills: false,
    manualProficiencies: false,
    manualEquipment: false,
    manualAbilityScores: false,
    manualHP: false,
    manualSpells: false,
    identity: {
      characterName: charName,
      playerName: playerName,
      campaignPowerLevel: 'Heroic',
      level,
      personalityBackstory,
      appearance: {
        age,
        height,
        weight,
      },
    },
    raceState: {
      race,
      subrace,
    },
    ao: {
      primaryAO: primaryAO || 'Devotion',
      secondaryAO,
      selectedAOs,
      customAbilities,
      levelSelections,
    },
    skills: {
      skillRanks,
      academicsEntries,
      artsCraftEntries: [],
      manualSkills: false,
    },
    proficiencies: {
      savingThrowsProficient,
      armorProficiencies,
      weaponProficiencies,
      languages,
      goldAmount,
      silverAmount,
      copperAmount,
      manualProficiencies: false,
    },
    equipment: {
      equipmentList: finalEquipmentList,
      manualEquipment: false,
    },
    importedPdfBytes: pdfBytes instanceof Uint8Array ? new Uint8Array(pdfBytes) : new Uint8Array(pdfBytes),
  };

  return importedState as CharacterState;
}
