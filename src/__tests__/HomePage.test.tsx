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
});

