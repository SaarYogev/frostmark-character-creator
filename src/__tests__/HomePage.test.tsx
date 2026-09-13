import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from '../components/HomePage';
import { saveCharacterLocally } from '../services/storage/localStorageService';
import { DEFAULT_CHARACTER } from '../types/Character';

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders homepage title and create new character button', () => {
    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();

    render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    expect(screen.getByText('Frostmark RPG')).toBeInTheDocument();
    expect(screen.getByText('Character Management Vault')).toBeInTheDocument();
    expect(screen.getByText('Operating in Local Guest Mode')).toBeInTheDocument();

    const createBtn = screen.getByText('➕ Create New Character');
    fireEvent.click(createBtn);
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('renders only the warning banner cloud connection button and not the blue header button when signed out', () => {
    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();

    render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    expect(screen.queryByText(/Sign in with Google Drive/i)).not.toBeInTheDocument();
    expect(screen.getByText('Connect Cloud Backup')).toBeInTheDocument();
  });

  it('renders import button in header and card update buttons for existing characters', () => {
    saveCharacterLocally(
      {
        ...DEFAULT_CHARACTER,
        characterName: 'Aeloria',
        identity: { characterName: 'Aeloria', level: 1 } as any,
        race: 'Elf' as any,
      },
      'char_aeloria_1'
    );

    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();

    render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    expect(screen.getByText('📥 Import Sheet (PDF / JSON)')).toBeInTheDocument();
    expect(screen.getByText('Aeloria')).toBeInTheDocument();
    expect(screen.getByText('🆙 Level Up')).toBeInTheDocument();
    expect(screen.getByText('📥 Update')).toBeInTheDocument();
  });
});

