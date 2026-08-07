import { CharacterState } from '../../types/Character';

export interface SavedCharacterMeta {
  id: string;
  characterName: string;
  race: string;
  level: number;
  updatedAt: string;
  storageType: 'cloud' | 'local';
  driveFileId?: string;
}

export type StorageStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CharacterStorageItem {
  meta: SavedCharacterMeta;
  data: CharacterState;
}
