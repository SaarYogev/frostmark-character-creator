import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveCharacterLocally,
  loadCharacterLocally,
  listLocalCharacters,
  deleteLocalCharacter,
  saveDraftLocally,
  loadDraftLocally,
} from '../services/storage/localStorageService';
import { DEFAULT_CHARACTER } from '../types/Character';

describe('localStorageService', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    vi.stubGlobal('localStorage', mockStorage);
    if (typeof window !== 'undefined') {
      vi.stubGlobal('window', { ...window, localStorage: mockStorage });
    }
  });

  it('saves and loads a character locally', () => {
    const testState = {
      ...DEFAULT_CHARACTER,
      identity: { characterName: 'Thorin Oakenshield', level: 3 },
      race: 'Dwarf',
    };

    const meta = saveCharacterLocally(testState);
    expect(meta.characterName).toBe('Thorin Oakenshield');
    expect(meta.race).toBe('Dwarf');
    expect(meta.level).toBe(3);

    const loaded = loadCharacterLocally(meta.id);
    expect(loaded).toBeDefined();
    expect(loaded?.identity?.characterName).toBe('Thorin Oakenshield');
  });

  it('lists saved local characters', () => {
    saveCharacterLocally({ ...DEFAULT_CHARACTER, identity: { characterName: 'Hero 1' } });
    saveCharacterLocally({ ...DEFAULT_CHARACTER, identity: { characterName: 'Hero 2' } });

    const list = listLocalCharacters();
    expect(list.length).toBe(2);
    expect(list.map((c) => c.characterName)).toContain('Hero 1');
    expect(list.map((c) => c.characterName)).toContain('Hero 2');
  });

  it('deletes a local character', () => {
    const meta = saveCharacterLocally({ ...DEFAULT_CHARACTER, identity: { characterName: 'To Be Deleted' } });
    expect(listLocalCharacters().length).toBe(1);

    deleteLocalCharacter(meta.id);
    expect(listLocalCharacters().length).toBe(0);
    expect(loadCharacterLocally(meta.id)).toBeNull();
  });

  it('saves and loads draft state', () => {
    const draftState = { ...DEFAULT_CHARACTER, identity: { characterName: 'Draft Hero' } };
    saveDraftLocally(draftState);

    const loaded = loadDraftLocally();
    expect(loaded?.identity?.characterName).toBe('Draft Hero');
  });
});

describe('googleDriveService token persistence', () => {
  let driveStore: Record<string, string> = {};

  beforeEach(async () => {
    driveStore = {};
    const mockStorage = {
      getItem: (key: string) => driveStore[key] || null,
      setItem: (key: string, value: string) => {
        driveStore[key] = value;
      },
      removeItem: (key: string) => {
        delete driveStore[key];
      },
      clear: () => {
        driveStore = {};
      },
    };

    vi.stubGlobal('localStorage', mockStorage);
    if (typeof window !== 'undefined') {
      vi.stubGlobal('window', { ...window, localStorage: mockStorage });
    }
    const { signOutGoogle } = await import('../services/storage/googleDriveService');
    signOutGoogle();
  });

  it('persists Google token in localStorage so new tabs are automatically connected', async () => {
    const { isGoogleSignedIn, setAccessToken, getStoredAccessToken } = await import('../services/storage/googleDriveService');
    expect(isGoogleSignedIn()).toBe(false);

    setAccessToken('mock_oauth_token_123');
    expect(isGoogleSignedIn()).toBe(true);
    expect(getStoredAccessToken()).toBe('mock_oauth_token_123');
    expect(driveStore['frostmark_gdrive_token']).toBe('mock_oauth_token_123');
  });

  it('removes token from localStorage upon sign out', async () => {
    const { isGoogleSignedIn, setAccessToken, signOutGoogle, getStoredAccessToken } = await import('../services/storage/googleDriveService');
    setAccessToken('mock_oauth_token_123');
    expect(isGoogleSignedIn()).toBe(true);

    signOutGoogle();
    expect(isGoogleSignedIn()).toBe(false);
    expect(getStoredAccessToken()).toBeNull();
    expect(driveStore['frostmark_gdrive_token']).toBeUndefined();
  });
});

