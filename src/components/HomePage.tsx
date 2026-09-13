import React, { useEffect, useState, useRef } from 'react';
import { SavedCharacterMeta } from '../services/storage/types';
import {
  listLocalCharacters,
  deleteLocalCharacter,
  loadCharacterLocally,
  saveCharacterLocally,
} from '../services/storage/localStorageService';
import {
  isGoogleSignedIn,
  requestGoogleSignIn,
  signOutGoogle,
  listDriveCharacters,
  loadFromDriveAppData,
  deleteFromDriveAppData,
  saveToDriveAppData,
  initGoogleAuth,
} from '../services/storage/googleDriveService';
import { handleExportPDF } from '../utils/exportHelpers';
import { CharacterState, DEFAULT_CHARACTER } from '../types/Character';
import { importFromPDF } from '../logic/pdfImport';
import { RACES } from '../data/races';
import { BACKGROUNDS } from '../data/backgrounds';
import { ORIGINS } from '../data/origins';
import { AboutModal } from './AboutModal';
import { InfoIcon, GitHubIcon } from './Icons';

interface HomePageProps {
  onSelectCharacter: (
    state: CharacterState,
    meta?: SavedCharacterMeta,
    options?: { initialStep?: number; openLevelUp?: boolean }
  ) => void;
  onCreateNew: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectCharacter, onCreateNew }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [localChars, setLocalChars] = useState<SavedCharacterMeta[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetFileInputRef = useRef<HTMLInputElement>(null);
  const [targetCharacterMeta, setTargetCharacterMeta] = useState<SavedCharacterMeta | null>(null);
  const [cloudChars, setCloudChars] = useState<SavedCharacterMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  useEffect(() => {
    initGoogleAuth(() => {
      setIsSignedIn(isGoogleSignedIn());
      loadCharacters();
    });
    setIsSignedIn(isGoogleSignedIn());
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    setLoading(true);
    setErrorMsg(null);

    const locals = listLocalCharacters();
    setLocalChars(locals);

    if (isGoogleSignedIn()) {
      try {
        const clouds = await listDriveCharacters();
        setCloudChars(clouds);
      } catch (err: any) {
        console.error('Drive list error:', err);
        setErrorMsg(err.message || 'Failed to load cloud characters from Google Drive.');
      }
    } else {
      setCloudChars([]);
    }

    setLoading(false);
  };

  const handleSignIn = async () => {
    try {
      setErrorMsg(null);
      await requestGoogleSignIn();
      setIsSignedIn(true);
      await loadCharacters();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(err.message || 'Google Sign-In failed.');
    }
  };

  const handleSignOut = () => {
    signOutGoogle();
    setIsSignedIn(false);
    setCloudChars([]);
  };

  const handleLoadCharacter = async (meta: SavedCharacterMeta) => {
    try {
      let state: CharacterState | null = null;
      if (meta.storageType === 'cloud' && meta.driveFileId) {
        state = await loadFromDriveAppData(meta.driveFileId);
      } else {
        state = loadCharacterLocally(meta.id);
      }

      if (state) {
        onSelectCharacter(state, meta);
      } else {
        alert('Could not find character data.');
      }
    } catch (err: any) {
      alert('Error loading character: ' + err.message);
    }
  };

  const handleDeleteCharacter = async (meta: SavedCharacterMeta) => {
    if (!window.confirm(`Are you sure you want to delete "${meta.characterName}"?`)) return;

    try {
      if (meta.storageType === 'cloud' && meta.driveFileId) {
        await deleteFromDriveAppData(meta.driveFileId);
      } else {
        deleteLocalCharacter(meta.id);
      }
      await loadCharacters();
    } catch (err: any) {
      alert('Error deleting character: ' + err.message);
    }
  };

  const handleExportSheet = async (meta: SavedCharacterMeta) => {
    try {
      let state: CharacterState | null = null;
      if (meta.storageType === 'cloud' && meta.driveFileId) {
        state = await loadFromDriveAppData(meta.driveFileId);
      } else {
        state = loadCharacterLocally(meta.id);
      }

      if (state) {
        handleExportPDF(state);
      } else {
        alert('Could not load character state to generate sheet.');
      }
    } catch (err: any) {
      alert('Error generating printable character sheet: ' + err.message);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    if (typeof file.text === 'function') {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file as text'));
      reader.readAsText(file);
    });
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    if (typeof file.arrayBuffer === 'function') {
      return file.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file as arrayBuffer'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseImportFile = async (file: File): Promise<CharacterState> => {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      return await importFromPDF(arrayBuffer, RACES, BACKGROUNDS, ORIGINS);
    }
    const text = await readFileAsText(file);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid character data structure.');
    }
    return parsed;
  };

  const saveImportedCharacter = async (
    importedState: CharacterState,
    targetMeta?: SavedCharacterMeta
  ): Promise<SavedCharacterMeta> => {
    if (targetMeta) {
      if (targetMeta.storageType === 'cloud' && targetMeta.driveFileId && isGoogleSignedIn()) {
        try {
          return await saveToDriveAppData(importedState, targetMeta.driveFileId);
        } catch {
          return saveCharacterLocally(importedState, targetMeta.id);
        }
      }
      return saveCharacterLocally(importedState, targetMeta.id);
    }

    if (isGoogleSignedIn()) {
      try {
        return await saveToDriveAppData(importedState);
      } catch {
        return saveCharacterLocally(importedState);
      }
    }
    return saveCharacterLocally(importedState);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedState = await parseImportFile(file);
      const importedName = (importedState.characterName || importedState.identity?.characterName || '').trim();

      const existingMatch = importedName
        ? allCharacters.find((c) => c.characterName.trim().toLowerCase() === importedName.toLowerCase())
        : undefined;

      let targetToOverwrite: SavedCharacterMeta | undefined;
      if (existingMatch) {
        const shouldOverwrite = window.confirm(
          `A character named "${existingMatch.characterName}" (Level ${existingMatch.level}) is already saved.\n\n` +
          `Do you want to update and overwrite "${existingMatch.characterName}" with this imported sheet?\n\n` +
          `• Click OK to overwrite the existing character.\n` +
          `• Click Cancel to save as a new separate character.`
        );
        if (shouldOverwrite) {
          targetToOverwrite = existingMatch;
        }
      }

      const meta = await saveImportedCharacter(importedState, targetToOverwrite);
      await loadCharacters();
      onSelectCharacter(importedState, meta, targetToOverwrite ? { initialStep: 4, openLevelUp: true } : undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('Failed to import character: ' + message);
    } finally {
      e.target.value = '';
    }
  };

  const handleTriggerUpdateCharacter = (meta: SavedCharacterMeta) => {
    setTargetCharacterMeta(meta);
    targetFileInputRef.current?.click();
  };

  const handleTargetedImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = targetCharacterMeta;
    if (!file || !target) return;

    try {
      const importedState = await parseImportFile(file);
      const meta = await saveImportedCharacter(importedState, target);
      await loadCharacters();
      setTargetCharacterMeta(null);
      onSelectCharacter(importedState, meta, { initialStep: 4, openLevelUp: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to update ${target.characterName}: ` + message);
    } finally {
      e.target.value = '';
    }
  };

  const handleLevelUpCharacter = async (meta: SavedCharacterMeta) => {
    try {
      let state: CharacterState | null = null;
      if (meta.storageType === 'cloud' && meta.driveFileId) {
        state = await loadFromDriveAppData(meta.driveFileId);
      } else {
        state = loadCharacterLocally(meta.id);
      }

      if (state) {
        onSelectCharacter(state, meta, { initialStep: 4, openLevelUp: true });
      } else {
        alert('Could not find character data.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('Error loading character for level up: ' + message);
    }
  };

  const allCharacters = [...cloudChars, ...localChars];

  return (
    <div className="homepage-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
      {/* Top Header Navigation */}
      <header
        className="homepage-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginBottom: '2.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="homepage-brand" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <img src={`${import.meta.env.BASE_URL}frostmark-logo.png`} alt="Frostmark Logo" style={{ height: '52px', maxWidth: '100%', objectFit: 'contain' }} />
          <div style={{ minWidth: '200px' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>Frostmark RPG</h1>
            <p style={{ margin: 0, color: '#a0a5c0', fontSize: '0.92rem' }}>Character Management Vault</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            className="btn btn-secondary icon-btn-round"
            id="btn-open-about"
            onClick={() => setIsAboutOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              padding: 0,
              borderRadius: '8px',
            }}
            title="About Frostmark RPG"
            aria-label="About Frostmark RPG"
          >
            <InfoIcon size={18} />
          </button>
          <a
            href="https://github.com/SaarYogev/frostmark-character-creator"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary icon-btn-round"
            id="btn-open-github"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              padding: 0,
              borderRadius: '8px',
              textDecoration: 'none',
            }}
            title="GitHub Repository"
            aria-label="GitHub Repository"
          >
            <GitHubIcon size={18} />
          </a>
          {isSignedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.25)' }}>
                ☁️ Google Drive Connected
              </span>
              <button className="btn btn-secondary" onClick={handleSignOut} style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Guest Mode Warning Banner (if not logged in) */}
      {!isSignedIn && (
        <div
          className="guest-warning-banner"
          style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#facc15', fontSize: '1.05rem', display: 'block', marginBottom: '0.35rem' }}>
                Operating in Local Guest Mode
              </strong>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#d1d5db', lineHeight: 1.5 }}>
                Characters created without signing into Google are saved strictly in this browser. They are not backed up to cloud storage and will be lost if browser cache is cleared.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button className="btn btn-accent" onClick={handleSignIn} style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', padding: '0.55rem 1.2rem' }}>
              Connect Cloud Backup
            </button>
          </div>
        </div>
      )}


      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            color: '#f87171',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Action Banner & New Character Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Your Characters ({allCharacters.length})</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".pdf,.json"
            style={{ display: 'none' }}
            id="homepage-file-input"
          />
          <input
            type="file"
            ref={targetFileInputRef}
            onChange={handleTargetedImportFile}
            accept=".pdf,.json"
            style={{ display: 'none' }}
            id="homepage-targeted-file-input"
          />
          <button
            className="btn btn-secondary"
            id="btn-import-character"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}
          >
            📥 Import Sheet (PDF / JSON)
          </button>
          <button
            className="btn btn-primary"
            id="btn-create-new-character"
            onClick={onCreateNew}
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', fontWeight: 600 }}
          >
            ➕ Create New Character
          </button>
        </div>
      </div>

      {/* Characters List / Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#a0a5c0' }}>Loading characters...</div>
      ) : allCharacters.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            background: 'var(--bg-elevated, rgba(255, 255, 255, 0.03))',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
          }}
        >
          <p style={{ fontSize: '1.1rem', color: '#a0a5c0', marginBottom: '1rem' }}>No saved characters found.</p>
          <button className="btn btn-primary" onClick={onCreateNew}>
            Create Your First Character
          </button>
        </div>
      ) : (
        <div
          className="character-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {allCharacters.map((meta) => (
            <div
              key={meta.id}
              className="character-card"
              style={{
                background: 'var(--bg-elevated, rgba(255, 255, 255, 0.04))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '1rem',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>{meta.characterName}</h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      background: meta.storageType === 'cloud' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                      color: meta.storageType === 'cloud' ? '#60a5fa' : '#9ca3af',
                      border: `1px solid ${meta.storageType === 'cloud' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                    }}
                  >
                    {meta.storageType === 'cloud' ? '☁️ Cloud' : '💻 Local'}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#a0a5c0', display: 'flex', gap: '1rem' }}>
                  <span>Race: <strong>{meta.race}</strong></span>
                  <span>Level: <strong>{meta.level}</strong></span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.4rem' }}>
                  Last updated: {new Date(meta.updatedAt).toLocaleDateString()}
                </div>
              </div>

              {/* Card Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleLoadCharacter(meta)}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleLevelUpCharacter(meta)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  title="Level Up Character"
                >
                  🆙 Level Up
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleTriggerUpdateCharacter(meta)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  title={`Import updated sheet to overwrite ${meta.characterName}`}
                >
                  📥 Update
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExportSheet(meta)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  title="Download Printable Character Sheet"
                >
                  📄 Sheet
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDeleteCharacter(meta)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#f87171' }}
                  title="Delete Character"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};
