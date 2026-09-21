import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { SKILLS, CHARACTERISTICS } from '../data/constants';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import { ARMOR, WEAPONS, findArmorData } from '../data/equipment';
import { ABILITIES } from '../data/abilities';
import { CharacterState, DEFAULT_CHARACTER } from '../types/Character';
import { AbilityItem } from '../types/AO';
import { DEFAULT_RACE_STATE } from '../types/Race';
import { DEFAULT_BACKGROUND } from '../types/Background';
import { getRacialStatBonuses } from './state';
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

  let importedMetadata: {
    version?: number;
    accomplishmentPointsRemaining?: number;
    accomplishmentPointsLimit?: number;
    bgFreeRemaining?: number;
    aoFreeRemaining?: number;
    freeSkillPointsRemaining?: number;
  } | undefined = undefined;

  try {
    const subject = pdfDoc.getSubject();
    if (subject && subject.startsWith('FrostmarkMetadata:')) {
      importedMetadata = JSON.parse(subject.slice('FrostmarkMetadata:'.length));
    } else {
      const keywords = pdfDoc.getKeywords();
      const metaKeyword = keywords?.find((k) => k.startsWith('FrostmarkMetadata:'));
      if (metaKeyword) {
        importedMetadata = JSON.parse(metaKeyword.slice('FrostmarkMetadata:'.length));
      }
    }
  } catch {
    /* Silent catch handles third-party or manually edited PDFs lacking metadata */
  }

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

  let backgroundName = bgRaw || '';
  if (!backgroundName && Array.isArray(backgroundsData)) {
    const allAbilityText = `${safeGetText(form, 'Essential Abilities 1')}\n${safeGetText(form, 'Essential Abilities 2')}\n${safeGetText(form, 'Additional Abilities column 1')}\n${safeGetText(form, 'Additional Abilities column 2')}`;
    for (const bg of backgroundsData) {
      if (bg.trait && new RegExp(`===\\s*${bg.trait}\\s*===|^${bg.trait}:|\\b${bg.trait}\\b`, 'i').test(allAbilityText)) {
        backgroundName = bg.name;
        break;
      }
    }
  }
  if (!backgroundName) {
    backgroundName = 'Scholar';
  }
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

  const selectedAOs: string[] = [];
  if (primaryAO) selectedAOs.push(primaryAO);
  if (secondaryAO && !selectedAOs.includes(secondaryAO)) {
    selectedAOs.push(secondaryAO);
  }

  const matchedBackground = Array.isArray(backgroundsData)
    ? backgroundsData.find((b: any) => b.name?.toLowerCase() === backgroundName.toLowerCase())
    : undefined;
  const resolvedBackground = matchedBackground
    ? { ...matchedBackground }
    : { ...DEFAULT_BACKGROUND, name: backgroundName };

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

  const racialBonuses = getRacialStatBonuses({ race, subrace }, racesData);
  const baseCharacteristics: Record<string, number> = {};
  CHARACTERISTICS.forEach((c) => {
    const finalVal = characteristics[c.key] ?? 10;
    const bonus = racialBonuses[c.key] ?? 0;
    baseCharacteristics[c.key] = finalVal - bonus;
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
      const knownArmor = findArmorData(cleanName);

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
      const matchedArmor = findArmorData(itemName);

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

  const raceTraitNames = new Set<string>();
  if (Array.isArray(racesData)) {
    for (const r of racesData) {
      if (r.traits && Array.isArray(r.traits)) {
        for (const t of r.traits) {
          if (t?.name) raceTraitNames.add(t.name.toLowerCase().trim());
        }
      }
      if (r.subraces && Array.isArray(r.subraces)) {
        for (const sr of r.subraces) {
          if (sr.traits && Array.isArray(sr.traits)) {
            for (const t of sr.traits) {
              if (t?.name) raceTraitNames.add(t.name.toLowerCase().trim());
            }
          }
        }
      }
    }
  }

  const backgroundTraitNames = new Set<string>();
  if (Array.isArray(backgroundsData)) {
    for (const bg of backgroundsData) {
      if (bg?.trait) {
        backgroundTraitNames.add(bg.trait.toLowerCase().trim());
      }
    }
  }

  const customFeatures: any[] = [];
  const customAbilities: AbilityItem[] = [];
  const levelSelections: Record<number, { primaryAO?: string; secondaryAO?: string; primaryAbility?: string; secondaryAbility?: string }> = {};

  const assignAbilityToSlot = (
    abilityId: string,
    origin: string,
    targetLvl: number,
    preferredSlot?: 'Primary' | 'Secondary',
    allowOverflow = false
  ): { assignedLevel: number; assignedSlot: 'Primary' | 'Secondary' } | null => {
    let lvl = targetLvl;
    if (!levelSelections[lvl]) {
      levelSelections[lvl] = {};
    }

    let slot: 'Primary' | 'Secondary' | null = null;
    if (preferredSlot === 'Primary') {
      if (!levelSelections[lvl].primaryAbility) {
        slot = 'Primary';
      } else if (!levelSelections[lvl].secondaryAbility) {
        slot = 'Secondary';
      }
    } else if (preferredSlot === 'Secondary') {
      if (!levelSelections[lvl].secondaryAbility) {
        slot = 'Secondary';
      } else if (!levelSelections[lvl].primaryAbility) {
        slot = 'Primary';
      }
    } else {
      if (!levelSelections[lvl].primaryAbility) {
        slot = 'Primary';
      } else if (!levelSelections[lvl].secondaryAbility) {
        slot = 'Secondary';
      }
    }

    if (!slot) {
      for (let l = 1; l <= level; l++) {
        if (!levelSelections[l]) {
          levelSelections[l] = {};
        }
        if (!levelSelections[l].primaryAbility) {
          lvl = l;
          slot = 'Primary';
          break;
        } else if (!levelSelections[l].secondaryAbility) {
          lvl = l;
          slot = 'Secondary';
          break;
        }
      }
    }

    if (!slot && allowOverflow) {
      lvl = Math.max(level, lvl) + 1;
      levelSelections[lvl] = {};
      slot = 'Primary';
    }

    if (!slot) {
      return null;
    }

    if (slot === 'Primary') {
      levelSelections[lvl].primaryAbility = abilityId;
      if (origin) {
        levelSelections[lvl].primaryAO = origin;
      }
    } else {
      levelSelections[lvl].secondaryAbility = abilityId;
      if (origin) {
        levelSelections[lvl].secondaryAO = origin;
      }
    }

    if (origin) {
      if (!primaryAO) {
        primaryAO = origin;
      } else if (!secondaryAO && origin.toLowerCase() !== primaryAO.toLowerCase()) {
        secondaryAO = origin;
      }
      if (!selectedAOs.some((ao) => ao.toLowerCase() === origin.toLowerCase())) {
        selectedAOs.push(origin);
      }
    }

    return { assignedLevel: lvl, assignedSlot: slot };
  };

  const parseAbilityText = (rawText: string, isEssential: boolean, defaultSlot?: 'Primary' | 'Secondary') => {
    if (!rawText) return;
    const blocks = rawText.split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean);

    for (const block of blocks) {
      const headerMatch = block.match(/^===\s*(.+?)(?:\s*\((.*?)\s*·\s*Lv\.(\d+)\))?\s*===\s*\n?([\s\S]*)$/);
      let candidateName = '';
      let originInHeader: string | undefined;
      let levelInHeader: number | undefined;
      let desc = '';
      let hasAbilityHeader = false;

      if (headerMatch) {
        candidateName = headerMatch[1].trim();
        originInHeader = headerMatch[2]?.trim();
        levelInHeader = headerMatch[3] ? parseInt(headerMatch[3], 10) : undefined;
        desc = (headerMatch[4] || '').trim();
        hasAbilityHeader = true;
      } else {
        const colonMatch = block.match(/^([^:\n]+)[:\-]\s*([\s\S]*)$/);
        if (colonMatch) {
          candidateName = colonMatch[1].trim();
          desc = (colonMatch[2] || '').trim();
        } else if (isEssential) {
          const firstLine = block.split(/\r?\n/)[0].trim();
          candidateName = firstLine.replace(/[:\-].*$/, '').trim();
          desc = block.substring(firstLine.length).trim();
        } else {
          /* Plain text blocks without header or key-value format represent miscellaneous journal notes */
          customFeatures.push(block);
          continue;
        }
      }

      const nameLower = candidateName.toLowerCase();

      /* Race and background traits are dynamically reconstructed by data modules and must not be imported as abilities */
      if (raceTraitNames.has(nameLower) || backgroundTraitNames.has(nameLower)) {
        continue;
      }

      /* Explicit miscellaneous note headers are preserved as campaign notes rather than AO abilities */
      if (/^(?:notes?|misc|miscellaneous|campaign notes?|session notes?|backstory)$/i.test(candidateName)) {
        customFeatures.push(block);
        continue;
      }

      const premade =
        ABILITIES.find((a) => {
          if (a.name.toLowerCase() !== nameLower) return false;
          if (originInHeader && a.origin.toLowerCase() !== originInHeader.toLowerCase()) return false;
          return true;
        }) || ABILITIES.find((a) => a.name.toLowerCase() === nameLower);

      if (premade) {
        const targetLvl = levelInHeader ?? premade.level ?? 1;
        const origin = premade.origin || originInHeader || primaryAO || 'Devotion';
        assignAbilityToSlot(premade.id, origin, targetLvl, defaultSlot, true);
        continue;
      }

      if (hasAbilityHeader || isEssential) {
        const targetLvl = levelInHeader ?? 1;
        const origin = originInHeader || primaryAO || 'Custom';
        const abilityId = `custom-${candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const assignment = assignAbilityToSlot(abilityId, origin, targetLvl, defaultSlot, true);
        if (assignment) {
          customAbilities.push({
            id: abilityId,
            name: candidateName,
            origin,
            level: assignment.assignedLevel,
            selection: assignment.assignedSlot,
            desc,
            short_desc: desc,
            full_desc: desc,
          } as any);
        }
        continue;
      }

      if (candidateName.length > 0) {
        const targetLvl = levelInHeader ?? 1;
        const origin = originInHeader || primaryAO || 'Custom';
        const abilityId = `custom-${candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        const assignment = assignAbilityToSlot(abilityId, origin, targetLvl, defaultSlot, false);
        if (assignment) {
          customAbilities.push({
            id: abilityId,
            name: candidateName,
            origin,
            level: assignment.assignedLevel,
            selection: assignment.assignedSlot,
            desc,
            short_desc: desc,
            full_desc: desc,
          } as any);
          continue;
        }
      }

      customFeatures.push(block);
    }
  };

  parseAbilityText(ess1, true, 'Primary');
  parseAbilityText(ess2, true, 'Secondary');
  parseAbilityText(col1, false);
  parseAbilityText(col2, false);

  /* Level progression logic requires each level selection record to retain explicit AO origins to prevent orphaned abilities */
  for (const lvlStr of Object.keys(levelSelections)) {
    const lvl = Number(lvlStr);
    const sel = levelSelections[lvl];
    if (!sel.primaryAO && primaryAO) {
      sel.primaryAO = primaryAO;
    }
    if (!sel.secondaryAO && (secondaryAO || primaryAO)) {
      sel.secondaryAO = secondaryAO || primaryAO;
    }
  }

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

  const hasManualHP = Boolean(maxHPText);
  const hasOutOfRangeBaseStats = Object.values(baseCharacteristics).some(
    (score) => score < 6 || score > 17
  );

  const importedState: any = {
    ...DEFAULT_CHARACTER,
    characterName: charName,
    playerName: playerName,
    race: {
      ...DEFAULT_RACE_STATE,
      race,
      subrace,
    },
    subrace,
    background: resolvedBackground,
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
    baseCharacteristics: { ...baseCharacteristics },
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
    customAbilities,
    levelSelections,
    manualSkills: false,
    manualProficiencies: false,
    manualEquipment: false,
    manualAbilityScores: hasOutOfRangeBaseStats,
    manualHP: hasManualHP,
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
        description: appearanceNotes,
        notes: appearanceNotes,
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
    isImported: true,
    importedPdfBytes: pdfBytes instanceof Uint8Array ? new Uint8Array(pdfBytes) : new Uint8Array(pdfBytes),
    importedMetadata,
    accomplishmentPointsRemaining: importedMetadata?.accomplishmentPointsRemaining,
    bgFreeRemaining: importedMetadata?.bgFreeRemaining,
    aoFreeRemaining: importedMetadata?.aoFreeRemaining,
    freeSkillPointsRemaining: importedMetadata?.freeSkillPointsRemaining,
  };

  return importedState as CharacterState;
}
