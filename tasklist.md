# Task List: React+TypeScript Migration

## 🎯 Current Sprint: Background Module Completion

### Immediate (Blocking)
- [ ] **Fix BackgroundSelector.tsx destructuring** - Change `const { character, dispatch } = useCharacter()` to `const { state, dispatch } = useCharacter()` and use `state.background?.name` (HIGH)
- [ ] **Run build** - Verify build passes after fix (HIGH)
- [ ] **Run Background tests** - All 4 tests must pass (HIGH)
- [ ] **Commit Background module** - Once tests pass (MEDIUM)

### Next Sprint: Abilities Module
- [ ] Create AbilityScoreSelector.tsx component
- [ ] Create Ability types (if needed)
- [ ] Add to App.tsx routing (step 3)
- [ ] Write tests following RaceSelector pattern
- [ ] Verify build + tests pass

### Subsequent Modules (In Order)
- [ ] AO (Archetype/Origin) Selector
- [ ] Skills Selector  
- [ ] Proficiencies Selector
- [ ] Spell Slots Allocator
- [ ] Spellcasting Manager
- [ ] Equipment Selector
- [ ] Finishing/Review Step
- [ ] PDF Export Integration

## 📋 Completed Tasks

### Infrastructure
- [x] React+TS scaffold (Vite, tsconfig, vite.config.ts)
- [x] CharacterContext with useReducer
- [x] Layout component with sidebar tabs
- [x] AGENTS.md documentation

### Identity Module
- [x] IdentityForm.tsx component
- [x] Identity types
- [x] 15 tests passing

### Race Module
- [x] RaceSelector.tsx component
- [x] TOML data (races.toml)
- [x] Race types
- [x] 15 tests passing

### Background Module (Partial)
- [x] BackgroundSelector.tsx component (created, needs fix)
- [x] Background.ts types
- [x] App.tsx integration (step 2)
- [x] BackgroundSelector.test.tsx (created, 4 failing)

## 🐛 Known Issues

1. **BackgroundSelector.tsx** - Wrong destructuring: `useCharacter()` returns `{ state, dispatch }`, not `{ character, dispatch }`
   - Line: `const { character, dispatch } = useCharacter();`
   - Should be: `const { state, dispatch } = useCharacter();`
   - Usage: `character.background?.name` → `state.background?.name`

2. **Background Tests** - 4/4 failing due to above issue
   - `renders all background cards`
   - `selects a background when clicked`
   - `shows background details when selected`
   - `handles custom background` (if exists)

## 📝 Notes for Next Agent

- Follow RaceSelector.tsx pattern EXACTLY for all new modules
- Use `const { state, dispatch } = useCharacter();` pattern
- No `onNext` props - navigation handled by Layout sidebar
- No "Next" buttons in components
- Card-based selection with `selected` CSS class
- Tests should mirror RaceSelector.test.tsx structure
- Always run `npm run build` and `npm test` before committing
## 📝 Notes for Next Agent (CRITICAL)

- Follow RaceSelector.tsx pattern EXACTLY for all new modules
- Use `const { state, dispatch } = useCharacter();` pattern (NOT `{ character, dispatch }`)
- No `onNext` props - navigation handled by Layout sidebar
- No "Next" buttons in components
- Card-based selection with `selected` CSS class
- Tests should mirror RaceSelector.test.tsx structure
- Always run `npm run build` and `npm test` before committing
- **ALWAYS use `--enter` flag when sending messages via orca terminal send** to trigger execution
- If using getByLabelText, ensure labels have matching htmlFor attributes
