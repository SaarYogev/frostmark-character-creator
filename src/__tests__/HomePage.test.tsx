import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HomePage } from '../components/HomePage';

describe('HomePage', () => {
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

    // Should NOT have the blue "Sign in with Google Drive" button in the header
    expect(screen.queryByText(/Sign in with Google Drive/i)).not.toBeInTheDocument();

    // Should have the single yellow "Connect Cloud Backup" button in warning banner
    expect(screen.getByText('Connect Cloud Backup')).toBeInTheDocument();
  });

  it('prompts to overwrite when importing character matching existing name, level, and race', async () => {
    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const existingChar = {
      id: 'local_test_123',
      meta: {
        id: 'local_test_123',
        characterName: 'Valeros',
        race: 'Human',
        level: 1,
        updatedAt: new Date().toISOString(),
        storageType: 'local',
      },
      data: {
        characterName: 'Valeros',
        level: 1,
        race: 'Human',
      },
    };
    localStorage.setItem('frostmark_local_characters_v1', JSON.stringify({ [existingChar.id]: existingChar }));

    render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    expect(screen.getByText('Valeros')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const fileContent = JSON.stringify({
      characterName: 'Valeros',
      level: 1,
      race: 'Human',
    });
    const file = new File([fileContent], 'Valeros.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('A character named "Valeros" (Level 1, Human) already exists')
      );
      expect(onSelectCharacter).toHaveBeenCalledWith(
        expect.objectContaining({ characterName: 'Valeros' }),
        expect.objectContaining({ id: 'local_test_123' })
      );
    });

    confirmSpy.mockRestore();
  });
});

