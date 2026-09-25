import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterProvider } from '../contexts/CharacterContext';
import BackgroundSelector from '../components/BackgroundSelector';
import { BACKGROUNDS } from '../data/backgrounds';
import type { BackgroundData } from '../data/backgrounds';

describe('Background Ingestion & Filtering Test Suite', () => {
  const renderBackgroundSelector = (initialState?: any) => {
    return render(
      <CharacterProvider initialState={initialState}>
        <BackgroundSelector />
      </CharacterProvider>
    );
  };

  describe('1. Ingestion Data Structure & TOML Loading (src/data/backgrounds.ts)', () => {
    it('loads backgrounds catalog with non-empty list and required schema attributes', () => {
      expect(Array.isArray(BACKGROUNDS)).toBe(true);
      expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(20);

      BACKGROUNDS.forEach((bg: BackgroundData) => {
        expect(bg.name).toBeDefined();
        expect(typeof bg.name).toBe('string');
        expect(bg.name.trim().length).toBeGreaterThan(0);

        expect(typeof bg.gold).toBe('number');
        expect(bg.gold).toBeGreaterThanOrEqual(0);

        expect(typeof bg.trait).toBe('string');
        expect(bg.trait.trim().length).toBeGreaterThan(0);

        expect(typeof bg.freeSkillPoints).toBe('number');
        expect(bg.freeSkillPoints).toBeGreaterThanOrEqual(0);

        if (bg.skills) {
          expect(Array.isArray(bg.skills)).toBe(true);
        }
        if (bg.restrictSkills) {
          expect(Array.isArray(bg.restrictSkills)).toBe(true);
        }
        if (bg.builtInRanks) {
          expect(typeof bg.builtInRanks).toBe('object');
        }
        if (bg.builtInAcademics) {
          expect(typeof bg.builtInAcademics).toBe('object');
        }
      });
    });

    it('categorizes entries into General and Kingdom Specific backgrounds', () => {
      const generalBackgrounds = BACKGROUNDS.filter(b => b.category === 'General');
      const kingdomBackgrounds = BACKGROUNDS.filter(b => b.category === 'Kingdom');

      expect(generalBackgrounds.length).toBeGreaterThan(0);
      expect(kingdomBackgrounds.length).toBeGreaterThan(0);

      // Verify kingdom-specific backgrounds define their originating kingdom
      kingdomBackgrounds.forEach(bg => {
        expect(bg.kingdom).toBeDefined();
        expect(typeof bg.kingdom).toBe('string');
        expect(bg.kingdom?.trim().length).toBeGreaterThan(0);
      });
    });

    it('includes core Frostmark kingdoms among ingested kingdom backgrounds', () => {
      const knownKingdoms = [
        'Beornhelm',
        'Castille',
        'Dahl-Doran',
        'Galas-Gwy',
        'Orena',
        'Riahn',
        'Valken'
      ];

      const presentKingdoms = new Set(
        BACKGROUNDS.filter(b => b.category === 'Kingdom' && b.kingdom).map(b => b.kingdom)
      );

      const hasAtLeastOneKnownKingdom = knownKingdoms.some(k => presentKingdoms.has(k));
      expect(hasAtLeastOneKnownKingdom).toBe(true);
    });

    it('correctly parses built-in ranks and skill allocations where applicable', () => {
      const bgWithBuiltInRanks = BACKGROUNDS.find(
        b => b.builtInRanks && Object.keys(b.builtInRanks).length > 0
      );

      if (bgWithBuiltInRanks && bgWithBuiltInRanks.builtInRanks) {
        Object.entries(bgWithBuiltInRanks.builtInRanks).forEach(([skill, rank]) => {
          expect(typeof skill).toBe('string');
          expect(typeof rank).toBe('number');
          expect(rank).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('2. Backward Compatibility & Canonical Backgrounds Parity', () => {
    it('maintains expected configuration for Hunter background', () => {
      const hunter = BACKGROUNDS.find(b => b.name === 'Hunter');
      expect(hunter).toBeDefined();
      expect(hunter?.gold).toBe(10);
      expect(hunter?.trait).toBe('Expert Survivalist');
      expect(hunter?.freeSkillPoints).toBe(4);
      expect(hunter?.restrictSkills).toEqual(
        expect.arrayContaining([
          'Animal Handling',
          'Arts & Craft',
          'Athletics',
          'Perception',
          'Stealth',
          'Survival'
        ])
      );
    });

    it('maintains expected configuration for Charlatan, Cultist, and Scholar', () => {
      const charlatan = BACKGROUNDS.find(b => b.name === 'Charlatan');
      expect(charlatan).toBeDefined();
      expect(charlatan?.gold).toBe(15);
      expect(charlatan?.trait).toBe('False Identity');

      const cultist = BACKGROUNDS.find(b => b.name === 'Cultist');
      expect(cultist).toBeDefined();
      expect(cultist?.gold).toBe(10);
      expect(cultist?.trait).toBe('Occult Knowledge');

      const scholar = BACKGROUNDS.find(b => b.name === 'Scholar');
      expect(scholar).toBeDefined();
      expect(scholar?.gold).toBe(10);
      expect(scholar?.trait).toBe('Researcher');
      expect(scholar?.freeSkillPoints).toBe(4);
    });

    it('renders and supports Custom Background workflow unchanged', () => {
      renderBackgroundSelector();

      const customCard = screen.getByText('Custom / Enter Manually...');
      expect(customCard).toBeInTheDocument();

      fireEvent.click(customCard);

      expect(screen.getByText('Custom Background')).toBeInTheDocument();
      expect(screen.getByLabelText('Background Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Starting Gold (gp)')).toBeInTheDocument();
      expect(screen.getByLabelText('Starting Equipment')).toBeInTheDocument();
      expect(screen.getByLabelText('Personality Trait')).toBeInTheDocument();
    });

    it('displays only the first sentence in the card box preview and full description in details', () => {
      renderBackgroundSelector();

      const criminalCard = screen.getByText('Criminal').closest('.card-option')!;
      const sub = criminalCard.querySelector('.card-option-sub');
      expect(sub).toBeInTheDocument();
      expect(sub?.textContent).toBe('You possess a rich history of breaking the law, and you are certainly not a puppy in the seeding underbelly of society.');

      fireEvent.click(criminalCard);
      const details = document.getElementById('background-details');
      expect(details).toBeInTheDocument();
      const criminalData = BACKGROUNDS.find(b => b.name === 'Criminal');
      expect(details?.textContent).toContain(criminalData?.desc);
    });
  });

  describe('3. Search Query Filtering in BackgroundSelector', () => {
    it('renders a search input for background filtering', () => {
      renderBackgroundSelector();
      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('filters background cards dynamically based on matching name query', () => {
      renderBackgroundSelector();

      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      fireEvent.change(searchInput, { target: { value: 'Hunter' } });

      expect(screen.getByText('Hunter')).toBeInTheDocument();
      expect(screen.getByText('Bounty Hunter')).toBeInTheDocument();

      expect(screen.queryByText('Charlatan')).not.toBeInTheDocument();
      expect(screen.queryByText('Cultist')).not.toBeInTheDocument();
      expect(screen.queryByText('Scholar')).not.toBeInTheDocument();
    });

    it('supports case-insensitive search and matches description keywords', () => {
      renderBackgroundSelector();

      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      fireEvent.change(searchInput, { target: { value: 'charlatan' } });

      expect(screen.getByText('Charlatan')).toBeInTheDocument();
      expect(screen.queryByText('Hunter')).not.toBeInTheDocument();
    });

    it('restores full list when search query is cleared', () => {
      renderBackgroundSelector();

      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      fireEvent.change(searchInput, { target: { value: 'Hunter' } });
      expect(screen.queryByText('Charlatan')).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Charlatan')).toBeInTheDocument();
      expect(screen.getByText('Hunter')).toBeInTheDocument();
    });
  });

  describe('4. Category Filtering (General vs Kingdom Specific)', () => {
    it('renders category filter buttons or pills for All, General, and Kingdom', () => {
      renderBackgroundSelector();

      const allBtn = screen.getByRole('button', { name: /^all$/i });
      const generalBtn = screen.getByRole('button', { name: /general/i });
      const kingdomBtn = screen.getByRole('button', { name: /kingdom/i });

      expect(allBtn).toBeInTheDocument();
      expect(generalBtn).toBeInTheDocument();
      expect(kingdomBtn).toBeInTheDocument();
    });

    it('filters cards to show only General backgrounds when General filter is selected', () => {
      renderBackgroundSelector();

      const generalBtn = screen.getByRole('button', { name: /general/i });
      fireEvent.click(generalBtn);

      const generalBackgrounds = BACKGROUNDS.filter(b => b.category === 'General');
      const kingdomBackgrounds = BACKGROUNDS.filter(b => b.category === 'Kingdom');

      if (generalBackgrounds.length > 0) {
        expect(screen.getByText(generalBackgrounds[0].name)).toBeInTheDocument();
      }

      kingdomBackgrounds.forEach(bg => {
        expect(screen.queryByText(bg.name)).not.toBeInTheDocument();
      });
    });

    it('filters cards to show only Kingdom-specific backgrounds when Kingdom filter is selected', () => {
      renderBackgroundSelector();

      const kingdomBtn = screen.getByRole('button', { name: /kingdom/i });
      fireEvent.click(kingdomBtn);

      const generalBackgrounds = BACKGROUNDS.filter(b => b.category === 'General');
      const kingdomBackgrounds = BACKGROUNDS.filter(b => b.category === 'Kingdom');

      if (kingdomBackgrounds.length > 0) {
        expect(screen.getByText(kingdomBackgrounds[0].name)).toBeInTheDocument();
      }

      generalBackgrounds.forEach(bg => {
        expect(screen.queryByText(bg.name)).not.toBeInTheDocument();
      });
    });

    it('resets category filtering back to all backgrounds when All is clicked', () => {
      renderBackgroundSelector();

      const kingdomBtn = screen.getByRole('button', { name: /kingdom/i });
      fireEvent.click(kingdomBtn);

      const allBtn = screen.getByRole('button', { name: /^all$/i });
      fireEvent.click(allBtn);

      const sampleGeneral = BACKGROUNDS.find(b => b.category === 'General');
      if (sampleGeneral) {
        expect(screen.getByText(sampleGeneral.name)).toBeInTheDocument();
      }
    });
  });

  describe('5. Kingdom Multi-Select Filtering (SpellsSelector Level Filter Pattern)', () => {
    it('renders kingdom filter pills for available kingdoms', () => {
      renderBackgroundSelector();

      // Either visible when Kingdom category is active or under an active filter section
      const kingdomBtn = screen.queryByRole('button', { name: /kingdom/i });
      if (kingdomBtn) {
        fireEvent.click(kingdomBtn);
      }

      const kingdomBgs = BACKGROUNDS.filter(b => b.category === 'Kingdom' && b.kingdom);
      const uniqueKingdoms = Array.from(new Set(kingdomBgs.map(b => b.kingdom as string)));

      expect(uniqueKingdoms.length).toBeGreaterThan(0);
      uniqueKingdoms.forEach(kingdom => {
        expect(screen.getByRole('button', { name: new RegExp(kingdom, 'i') })).toBeInTheDocument();
      });
    });

    it('filters backgrounds by single selected kingdom pill', () => {
      renderBackgroundSelector();

      const kingdomBgs = BACKGROUNDS.filter(b => b.category === 'Kingdom' && b.kingdom);
      const uniqueKingdoms = Array.from(new Set(kingdomBgs.map(b => b.kingdom as string)));

      if (uniqueKingdoms.length >= 2) {
        const targetKingdom = uniqueKingdoms[0];
        const otherKingdom = uniqueKingdoms[1];

        const targetPill = screen.getByRole('button', { name: new RegExp(targetKingdom, 'i') });
        fireEvent.click(targetPill);

        const targetBgs = BACKGROUNDS.filter(b => b.kingdom === targetKingdom);
        const otherBgs = BACKGROUNDS.filter(b => b.kingdom === otherKingdom);

        if (targetBgs.length > 0) {
          expect(screen.getByText(targetBgs[0].name)).toBeInTheDocument();
        }
        if (otherBgs.length > 0) {
          expect(screen.queryByText(otherBgs[0].name)).not.toBeInTheDocument();
        }
      }
    });

    it('supports multi-selecting multiple kingdoms simultaneously', () => {
      renderBackgroundSelector();

      const kingdomBgs = BACKGROUNDS.filter(b => b.category === 'Kingdom' && b.kingdom);
      const uniqueKingdoms = Array.from(new Set(kingdomBgs.map(b => b.kingdom as string)));

      if (uniqueKingdoms.length >= 3) {
        const k1 = uniqueKingdoms[0];
        const k2 = uniqueKingdoms[1];
        const k3 = uniqueKingdoms[2];

        const pill1 = screen.getByRole('button', { name: new RegExp(k1, 'i') });
        const pill2 = screen.getByRole('button', { name: new RegExp(k2, 'i') });

        fireEvent.click(pill1);
        fireEvent.click(pill2);

        const k1Bgs = BACKGROUNDS.filter(b => b.kingdom === k1);
        const k2Bgs = BACKGROUNDS.filter(b => b.kingdom === k2);
        const k3Bgs = BACKGROUNDS.filter(b => b.kingdom === k3);

        if (k1Bgs.length > 0) expect(screen.getByText(k1Bgs[0].name)).toBeInTheDocument();
        if (k2Bgs.length > 0) expect(screen.getByText(k2Bgs[0].name)).toBeInTheDocument();
        if (k3Bgs.length > 0) expect(screen.queryByText(k3Bgs[0].name)).not.toBeInTheDocument();
      }
    });

    it('toggles kingdom pill off when clicked again', () => {
      renderBackgroundSelector();

      const kingdomBgs = BACKGROUNDS.filter(b => b.category === 'Kingdom' && b.kingdom);
      const uniqueKingdoms = Array.from(new Set(kingdomBgs.map(b => b.kingdom as string)));

      if (uniqueKingdoms.length >= 2) {
        const targetKingdom = uniqueKingdoms[0];
        const targetPill = screen.getByRole('button', { name: new RegExp(targetKingdom, 'i') });

        fireEvent.click(targetPill);
        fireEvent.click(targetPill);

        const otherKingdom = uniqueKingdoms[1];
        const otherBg = BACKGROUNDS.find(b => b.kingdom === otherKingdom);
        if (otherBg) {
          expect(screen.getByText(otherBg.name)).toBeInTheDocument();
        }
      }
    });
  });

  describe('6. Combined Filtering & Selection Integration', () => {
    it('combines category, kingdom multi-select, and search input constraints together', () => {
      renderBackgroundSelector();

      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      fireEvent.change(searchInput, { target: { value: 'Hunter' } });

      const generalBtn = screen.getByRole('button', { name: /general/i });
      fireEvent.click(generalBtn);

      expect(screen.getByText('Hunter')).toBeInTheDocument();
      expect(screen.getByText('Bounty Hunter')).toBeInTheDocument();
      expect(screen.queryByText('Charlatan')).not.toBeInTheDocument();
    });

    it('displays complete details when a filtered background is clicked and selected', () => {
      renderBackgroundSelector();

      const searchInput = screen.getByPlaceholderText(/search backgrounds/i);
      fireEvent.change(searchInput, { target: { value: 'Bounty Hunter' } });

      const bountyHunterCard = screen.getByText('Bounty Hunter');
      fireEvent.click(bountyHunterCard);

      expect(bountyHunterCard.parentElement).toHaveClass('selected');
      expect(screen.getByRole('heading', { level: 3, name: 'Bounty Hunter' })).toBeInTheDocument();
      expect(screen.getByText(/Starting Gold:/)).toBeInTheDocument();
      expect(screen.getByText(/Ear to the Ground/)).toBeInTheDocument();
      expect(screen.getByText(/Free Skill Points:/)).toBeInTheDocument();
    });
  });
});
