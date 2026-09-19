import { ARMOR, WEAPONS, findArmorData } from '../data/equipment';

export function lookupCatalogWeight(name: unknown): number | string | undefined {
  if (typeof name !== 'string') {
    return undefined;
  }

  const cleanName = name.trim().toLowerCase();
  if (!cleanName) {
    return undefined;
  }

  const armorMatch = findArmorData(cleanName);
  if (armorMatch && armorMatch.weight != null) {
    return armorMatch.weight;
  }

  const weaponMatch = WEAPONS.find((w) => w.name.toLowerCase() === cleanName);
  if (weaponMatch && weaponMatch.weight != null) {
    return weaponMatch.weight;
  }

  return undefined;
}

export function calculateItemCompleteness(item: any): number {
  if (!item || typeof item !== 'object') {
    return 0;
  }

  let score = 0;
  if (item.name) {
    score += 1;
  }
  if (item.weight != null && item.weight !== '') {
    score += 5;
  }
  if (item.isArmor || item.av != null || item.category) {
    score += 4;
  }
  if (item.isWeapon || item.damage) {
    score += 4;
  }
  if (item.equipped != null) {
    score += 2;
  }
  if (item.cost) {
    score += 1;
  }
  if (item.quantity != null) {
    score += 1;
  }
  if (item.properties) {
    score += 1;
  }
  if (item.isOther) {
    score -= 1;
  }

  return score;
}

export function mergeEquipmentItem(existing: any, incoming: any): any {
  if (!existing && !incoming) {
    return {};
  }
  if (!existing) {
    return { ...incoming };
  }
  if (!incoming) {
    return { ...existing };
  }

  const existingScore = calculateItemCompleteness(existing);
  const incomingScore = calculateItemCompleteness(incoming);

  const primary = incomingScore > existingScore ? incoming : existing;
  const secondary = primary === incoming ? existing : incoming;

  const merged = { ...secondary, ...primary };

  if ((merged.weight == null || merged.weight === '') && secondary.weight != null && secondary.weight !== '') {
    merged.weight = secondary.weight;
  }

  if (existing.isArmor || incoming.isArmor) {
    merged.isArmor = true;
    delete merged.isOther;
  }

  if (existing.isWeapon || incoming.isWeapon) {
    merged.isWeapon = true;
    delete merged.isOther;
  }

  if (merged.weight == null || merged.weight === '') {
    const catalogWeight = lookupCatalogWeight(merged.name);
    if (catalogWeight != null) {
      merged.weight = catalogWeight;
    }
  }

  if (typeof existing.quantity === 'number' && typeof incoming.quantity === 'number') {
    merged.quantity = Math.max(existing.quantity, incoming.quantity);
  }

  return merged;
}

export function deduplicateEquipmentList(rawList: any[]): any[] {
  if (!Array.isArray(rawList)) {
    return [];
  }

  const itemMap = new Map<string, any>();
  const unnamedItems: any[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const rawName = typeof item.name === 'string' ? item.name : String(item.name ?? '');
    const name = rawName.trim();
    if (!name) {
      unnamedItems.push(item);
      continue;
    }

    const key = name.toLowerCase();
    if (itemMap.has(key)) {
      const existing = itemMap.get(key);
      itemMap.set(key, mergeEquipmentItem(existing, item));
    } else {
      let enriched = { ...item };
      if (enriched.weight == null || enriched.weight === '') {
        const catalogWeight = lookupCatalogWeight(key);
        if (catalogWeight != null) {
          enriched.weight = catalogWeight;
        }
      }
      itemMap.set(key, enriched);
    }
  }

  return [...itemMap.values(), ...unnamedItems];
}
