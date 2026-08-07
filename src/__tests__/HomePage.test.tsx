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
});
