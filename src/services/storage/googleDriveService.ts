import { CharacterState } from '../../types/Character';
import { SavedCharacterMeta } from './types';
import { extractCharacterMeta } from './localStorageService';

const DRIVE_FILE_PREFIX = 'frostmark_char_';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

let accessToken: string | null = null;
let tokenClient: any = null;

export function getStoredAccessToken(): string | null {
  return accessToken || sessionStorage.getItem('frostmark_gdrive_token');
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('frostmark_gdrive_token', token);
  } else {
    sessionStorage.removeItem('frostmark_gdrive_token');
  }
}

export function isGoogleSignedIn(): boolean {
  return Boolean(getStoredAccessToken());
}

export function initGoogleAuth(onTokenReceived?: (token: string) => void): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();

    if ((window as any).google?.accounts?.oauth2) {
      setupTokenClient(onTokenReceived);
      return resolve();
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setupTokenClient(onTokenReceived);
      resolve();
    };
    document.head.appendChild(script);
  });
}

function setupTokenClient(onTokenReceived?: (token: string) => void) {
  const clientId = GOOGLE_CLIENT_ID || (window as any).__FROSTMARK_GOOGLE_CLIENT_ID__;
  if (!clientId || !(window as any).google?.accounts?.oauth2) return;

  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    callback: (resp: GoogleTokenResponse) => {
      if (resp.access_token) {
        setAccessToken(resp.access_token);
        if (onTokenReceived) onTokenReceived(resp.access_token);
      }
    },
  });
}

export function requestGoogleSignIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      const clientId = GOOGLE_CLIENT_ID || (window as any).__FROSTMARK_GOOGLE_CLIENT_ID__;
      if (!clientId) {
        return reject(new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID.'));
      }
      setupTokenClient((token) => resolve(token));
    } else {
      tokenClient.callback = (resp: GoogleTokenResponse) => {
        if (resp.error) return reject(new Error(resp.error));
        if (resp.access_token) {
          setAccessToken(resp.access_token);
          resolve(resp.access_token);
        }
      };
    }
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOutGoogle(): void {
  setAccessToken(null);
}

function getHeaders() {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive.');
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listDriveCharacters(): Promise<SavedCharacterMeta[]> {
  const headers = getHeaders();
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%20contains%20'${DRIVE_FILE_PREFIX}'%20and%20trashed%3Dfalse&fields=files(id,name,modifiedTime,appProperties)`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 401) {
      signOutGoogle();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Failed to list Google Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map((f) => {
    const props = f.appProperties || {};
    const fallbackName = f.name?.replace(DRIVE_FILE_PREFIX, '')?.replace('.json', '') || 'Unnamed Character';
    return {
      id: f.id,
      driveFileId: f.id,
      characterName: props.characterName || fallbackName,
      race: props.race || '—',
      level: parseInt(props.level || '1', 10),
      updatedAt: f.modifiedTime || new Date().toISOString(),
      storageType: 'cloud',
    };
  });
}

export async function saveToDriveAppData(state: CharacterState, driveFileId?: string): Promise<SavedCharacterMeta> {
  const headers = getHeaders();
  const baseMeta = extractCharacterMeta(state, driveFileId || '', 'cloud');
  const fileName = `${DRIVE_FILE_PREFIX}${baseMeta.characterName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
  
  const metadata = {
    name: fileName,
    parents: driveFileId ? undefined : ['appDataFolder'],
    appProperties: {
      characterName: baseMeta.characterName,
      race: baseMeta.race,
      level: String(baseMeta.level),
    },
  };

  const fileContent = JSON.stringify(state, null, 2);
  const boundary = 'frostmark_boundary_multipart';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const method = driveFileId ? 'PATCH' : 'POST';
  const url = driveFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=multipart&fields=id,name,modifiedTime,appProperties`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,appProperties`;

  const res = await fetch(url, {
    method,
    headers: {
      ...headers,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    if (res.status === 401) {
      signOutGoogle();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Failed to save to Google Drive: ${res.statusText}`);
  }

  const result = await res.json();
  return {
    ...baseMeta,
    id: result.id,
    driveFileId: result.id,
    updatedAt: result.modifiedTime || new Date().toISOString(),
  };
}

export async function loadFromDriveAppData(driveFileId: string): Promise<CharacterState> {
  const headers = getHeaders();
  const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 401) {
      signOutGoogle();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Failed to load character from Google Drive: ${res.statusText}`);
  }

  return await res.json();
}

export async function deleteFromDriveAppData(driveFileId: string): Promise<void> {
  const headers = getHeaders();
  const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}`;

  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok && res.status !== 404) {
    if (res.status === 401) {
      signOutGoogle();
      throw new Error('Google Drive session expired. Please sign in again.');
    }
    throw new Error(`Failed to delete character from Google Drive: ${res.statusText}`);
  }
}
