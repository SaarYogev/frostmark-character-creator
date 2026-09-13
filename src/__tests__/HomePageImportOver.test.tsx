import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomePage } from '../components/HomePage';
import { saveCharacterLocally, listLocalCharacters, loadCharacterLocally } from '../services/storage/localStorageService';
import { DEFAULT_CHARACTER } from '../types/Character';

describe('HomePage: Importing over existing characters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('updates an existing character when name matches on global import with confirmation', async () => {
    const originalMeta = saveCharacterLocally(
      {
        ...DEFAULT_CHARACTER,
        characterName: 'Thorin',
        identity: { characterName: 'Thorin', level: 1 } as any,
        race: 'Dwarf' as any,
      },
      'char_thorin_existing'
    );

    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    const fileInput = container.querySelector('#homepage-file-input') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const updatedData = {
      ...DEFAULT_CHARACTER,
      characterName: 'Thorin',
      level: 2,
      identity: { characterName: 'Thorin', level: 2 },
      maxHP: 25,
      goldAmount: 100,
    };
    const file = new File([JSON.stringify(updatedData)], 'Thorin_Updated.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onSelectCharacter).toHaveBeenCalled();
    });

    const characters = listLocalCharacters();
    expect(characters.length).toBe(1);
    expect(characters[0].id).toBe(originalMeta.id);
    expect(characters[0].level).toBe(2);

    const updatedSaved = loadCharacterLocally(originalMeta.id);
    expect(updatedSaved?.maxHP).toBe(25);
    expect(updatedSaved?.goldAmount).toBe(100);
  });

  it('updates target character directly when using card-level update button', async () => {
    const originalMeta = saveCharacterLocally(
      {
        ...DEFAULT_CHARACTER,
        characterName: 'Aeloria',
        identity: { characterName: 'Aeloria', level: 1 } as any,
        race: 'Elf' as any,
      },
      'char_aeloria_card'
    );

    const onSelectCharacter = vi.fn();
    const onCreateNew = vi.fn();

    const { container } = render(<HomePage onSelectCharacter={onSelectCharacter} onCreateNew={onCreateNew} />);

    const updateBtn = screen.getByText('📥 Update');
    fireEvent.click(updateBtn);

    const targetedInput = container.querySelector('#homepage-targeted-file-input') as HTMLInputElement;
    expect(targetedInput).toBeInTheDocument();

    const updatedData = {
      ...DEFAULT_CHARACTER,
      characterName: 'Aeloria',
      level: 2,
      identity: { characterName: 'Aeloria', level: 2 },
      maxHP: 18,
      copperAmount: 50,
    };
    const file = new File([JSON.stringify(updatedData)], 'Aeloria_Updated.json', { type: 'application/json' });

    fireEvent.change(targetedInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSelectCharacter).toHaveBeenCalled();
    });

    const characters = listLocalCharacters();
    expect(characters.length).toBe(1);
    expect(characters[0].id).toBe(originalMeta.id);

    const updatedSaved = loadCharacterLocally(originalMeta.id);
    expect(updatedSaved?.maxHP).toBe(18);
    expect(updatedSaved?.copperAmount).toBe(50);
  });
});
