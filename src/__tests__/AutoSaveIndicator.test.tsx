import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AutoSaveIndicator } from '../components/AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  it('renders saving state with spinner text', () => {
    render(<AutoSaveIndicator status="saving" isCloud={false} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('renders saved state with checkmark', () => {
    render(<AutoSaveIndicator status="saved" isCloud={true} />);
    expect(screen.getByText('Saved (Cloud ☁️)')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<AutoSaveIndicator status="error" isCloud={false} />);
    expect(screen.getByText('Save Error')).toBeInTheDocument();
  });
});
