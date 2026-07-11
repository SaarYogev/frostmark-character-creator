# AGENTS.md

## Key Commands
- `npm run dev`: Starts development server (Vite)
- `npm run build`: Builds production output
- `npm run deploy`: Deploys to GitHub Pages (requires `gh-pages` installed)
- `npm run test`: Runs tests (Vitest)

## Architecture
- Main logic in `/js/logic/` directory
- Data stored in TOML files (`spells.toml`, `races.js`, etc.)
- PDF generation handled by `pdf.js` and `pdf-lib` dependency

## Non-Obvious Steps
- Always run `npm run build` before `deploy` to process TOML files
- PDF assets require proper rendering in `dist/index.html`
- TOML data must be reloaded after editing in development

## Gotchas
- `gh-pages` requires `dist/` directory structure
- TOML file changes won't hot-reload in dev without rebuild
- PDF generation may fail if `pdf-lib` version changes