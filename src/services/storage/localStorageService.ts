import { CharacterState } from '../../types/Character';
import { SavedCharacterMeta, CharacterStorageItem } from './types';

const LOCAL_CHARACTERS_KEY = 'frostmark_local_characters_v1';
const DRAFT_CHARACTER_KEY = 'frostmark_draft_character_v1';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export function extractCharacterMeta(state: CharacterState, id: string, storageType: 'cloud' | 'local' = 'local'): SavedCharacterMeta {
  const name = state.identity?.characterName || (state as any).characterName || 'Unnamed Character';
  const level = state.identity?.level ?? (state as any).level ?? 1;
  let race = '—';
  if (typeof state.race === 'string') {
    race = state.race;
  } else if (state.race?.race) {
    race = state.race.race;
  }

  return {
    id,
    characterName: name,
    race,
    level,
    updatedAt: new Date().toISOString(),
    storageType,
  };
}

export function listLocalCharacters(): SavedCharacterMeta[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(LOCAL_CHARACTERS_KEY);
    if (!raw) return [];
    const items: Record<string, CharacterStorageItem> = JSON.parse(raw);
    return Object.values(items)
      .map((item) => item?.meta)
      .filter((meta): meta is SavedCharacterMeta => Boolean(meta));
  } catch (err) {
    console.error('Failed to list local characters:', err);
    return [];
  }
}

export function saveCharacterLocally(state: CharacterState, existingId?: string): SavedCharacterMeta {
  const id = existingId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const meta = extractCharacterMeta(state, id, 'local');
  const item: CharacterStorageItem = { meta, data: state };

  try {
    const storage = getStorage();
    if (storage) {
      const raw = storage.getItem(LOCAL_CHARACTERS_KEY);
      const store: Record<string, CharacterStorageItem> = raw ? JSON.parse(raw) : {};
      store[id] = item;
      storage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(store));
    }
  } catch (err) {
    console.error('Failed to save character locally:', err);
  }

  return meta;
}

export function loadCharacterLocally(id: string): CharacterState | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(LOCAL_CHARACTERS_KEY);
    if (!raw) return null;
    const store: Record<string, CharacterStorageItem> = JSON.parse(raw);
    return store[id]?.data || null;
  } catch (err) {
    console.error('Failed to load character locally:', err);
    return null;
  }
}

export function deleteLocalCharacter(id: string): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const raw = storage.getItem(LOCAL_CHARACTERS_KEY);
    if (!raw) return;
    const store: Record<string, CharacterStorageItem> = JSON.parse(raw);
    delete store[id];
    storage.setItem(LOCAL_CHARACTERS_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to delete local character:', err);
  }
}

export function saveDraftLocally(state: CharacterState): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(DRAFT_CHARACTER_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save draft locally:', err);
  }
}

export function loadDraftLocally(): CharacterState | null {
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(DRAFT_CHARACTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to load draft locally:', err);
    return null;
  }
}
