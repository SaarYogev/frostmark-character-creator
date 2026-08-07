# Implementation Plan: React+TypeScript Migration

## Objective
Migrate pure JS character creator app to React+TypeScript with latest best practices, maintaining GitHub Pages static site compatibility.

## Architecture Decisions
- **State Management**: Single reducer via `useReducer` (no Redux, no Context API beyond the single CharacterContext)
- **Data Layer**: TOML files loaded via Vite plugin (races.toml, backgrounds.toml, etc.)
- **Routing**: Step-based navigation via Layout component sidebar tabs
- **Styling**: CSS modules/global CSS (no CSS-in-JS)
- **Testing**: Vitest + React Testing Library

## Module Migration Order (Sequential)
1. ✅ **Identity** - IdentityForm.tsx, types, tests
2. ✅ **Race** - RaceSelector.tsx, TOML data, types, tests  
3. 🔄 **Background** - BackgroundSelector.tsx (IN PROGRESS - component exists, tests failing)
4. ⏳ **Abilities** - Ability score allocation
5. ⏳ **AO (Archetype/Origin)** - Primary/secondary archetype selection
6. ⏳ **Skills** - Skill point allocation
7. ⏳ **Proficiencies** - Weapon/armor/tool proficiencies
8. ⏳ **Spell Slots** - Slot allocation per level
9. ⏳ **Spellcasting** - Spell selection and management
10. ⏳ **Equipment** - Starting equipment selection
11. ⏳ **Finishing** - Final review and character sheet
12. ⏳ **PDF Export** - Character sheet PDF generation

## Current State

### Completed
- ✅ React+TS scaffold (Vite, tsconfig, vite.config.ts)
- ✅ CharacterContext with useReducer for global state
- ✅ Layout component with sidebar navigation
- ✅ Identity module (IdentityForm.tsx, 15 tests passing)
- ✅ Race module (RaceSelector.tsx, TOML data, 15 tests passing)
- ✅ AGENTS.md documentation for subagent communication
- ✅ All 33 tests passing (Identity + Race)
- ✅ Build successful

### In Progress - Background Module
- ✅ BackgroundSelector.tsx component created
- ✅ Background.ts types created
- ✅ Component integrated into App.tsx (step 2)
- ❌ Tests failing (4/4)
  - Issue: useCharacter() returns `{ state, dispatch }` not `{ character, dispatch }`
  - Component uses `character.background?.name` but should use `state.background?.name`
  - Need to fix destructuring in BackgroundSelector.tsx
- ❌ Build passes but tests fail

### Blocked
- Background tests need fixing before proceeding to Abilities module

## Technical Details

### Data Files
- `js/data/races.toml` → `js/data/races.js` + `js/data/races.d.ts`
- `js/data/backgrounds.js` (already exists as JS module)
- `js/data/spells.toml` (future)

### Key Components
- `src/contexts/CharacterContext.tsx` - Global state provider
- `src/components/Layout.tsx` - Sidebar navigation + main content
- `src/components/App.tsx` - Step routing
- `src/components/IdentityForm.tsx` - Step 0
- `src/components/RaceSelector.tsx` - Step 1
- `src/components/BackgroundSelector.tsx` - Step 2 (needs fix)

### Test Pattern (from RaceSelector.test.tsx)
- Use `renderWithProvider` wrapper
- Test card rendering, selection, details display
- Test subrace/choice handling
- Test custom form and manual overrides
## Critical Notes for Subagents
- Always use  flag when sending messages via 
- Fix BackgroundSelector destructuring:  returns  not 
- Never use  for selects without matching  on labels

## Critical Notes for Subagents
- Always use  flag when sending messages via 
- Fix BackgroundSelector destructuring:  returns  not 
- Never use  for selects without matching  on labels

## Critical Notes for Subagents
- Always use `--enter` flag when sending messages via `orca terminal send`
- Fix BackgroundSelector destructuring: `useCharacter()` returns `{ state, dispatch }` not `{ character, dispatch }`
- Never use `getByLabelText` for selects without matching `htmlFor` on labels
