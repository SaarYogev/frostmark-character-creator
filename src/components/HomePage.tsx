import React, { useEffect, useState } from 'react';
import { SavedCharacterMeta } from '../services/storage/types';
import { listLocalCharacters, deleteLocalCharacter, loadCharacterLocally } from '../services/storage/localStorageService';
import {
  isGoogleSignedIn,
  requestGoogleSignIn,
  signOutGoogle,
  listDriveCharacters,
  loadFromDriveAppData,
  deleteFromDriveAppData,
  initGoogleAuth,
} from '../services/storage/googleDriveService';
import { handleExportPDF } from '../utils/exportHelpers';
import { CharacterState, DEFAULT_CHARACTER } from '../types/Character';

interface HomePageProps {
  onSelectCharacter: (state: CharacterState, meta?: SavedCharacterMeta) => void;
  onCreateNew: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onSelectCharacter, onCreateNew }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [localChars, setLocalChars] = useState<SavedCharacterMeta[]>([]);
  const [cloudChars, setCloudChars] = useState<SavedCharacterMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const allCharacters = [...cloudChars, ...localChars];

  return (
    <div className="homepage-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
      {/* Top Header Navigation */}
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          width: '100%',
          gap: '2rem',
          flexWrap: 'wrap',
          marginBottom: '2.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img src={`${import.meta.env.BASE_URL}frostmark-logo.png`} alt="Frostmark Logo" style={{ height: '52px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Frostmark RPG</h1>
            <p style={{ margin: 0, color: '#a0a5c0', fontSize: '0.92rem' }}>Character Management Vault</p>
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          {isSignedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.25)' }}>
                ☁️ Google Drive Connected
              </span>
              <button className="btn btn-secondary" onClick={handleSignOut} style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleSignIn} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 1.1rem', fontSize: '0.92rem' }}>
              🔑 Sign in with Google Drive
            </button>
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
            padding: '1rem 1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <div>
              <strong style={{ color: '#facc15' }}>Operating in Local Guest Mode</strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#d1d5db' }}>
                Characters created without signing into Google are saved strictly in this browser. They are not backed up to cloud storage and will be lost if browser cache is cleared.
              </p>
            </div>
          </div>
          <button className="btn btn-accent" onClick={handleSignIn} style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
            Connect Cloud Backup
          </button>
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
          justify: 'space-between',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          marginBottom: '1.75rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Your Characters ({allCharacters.length})</h2>
        <button
          className="btn btn-primary"
          id="btn-create-new-character"
          onClick={onCreateNew}
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem', fontWeight: 600, marginLeft: 'auto' }}
        >
          ➕ Create New Character
        </button>
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
                  onClick={() => handleExportSheet(meta)}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                  title="Download Printable Character Sheet"
                >
                  📄 Download Character Sheet
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
    </div>
  );
};
