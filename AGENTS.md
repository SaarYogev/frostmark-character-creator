# AGENTS.md

> [!CRITICAL]
> **STRICT RULE**: NEVER touch or edit TOML files directly under any circumstances. TOML files are auto-generated resources. Always modify application code or ingest scripts (`scripts/ingest_abilities.js`, etc.) and re-run ingest/build scripts to update TOML data.

## Key Commands
- `npm run dev`: Starts development server (Vite)
- `npm run build`: Builds production output
- `npm run deploy`: Deploys to GitHub Pages (requires `gh-pages` installed)
- `npm run test`: Runs tests (Vitest)

## Subagent Communication
- To send a task to a subagent terminal: `orca terminal send --terminal <handle> --text "<message>" --enter`
  - The `--enter` flag is CRITICAL - it appends Enter which makes opencode process the message as a prompt
  - Without `--enter`, the text is just displayed but not executed
  - Always verify the terminal received the message by checking with `orca terminal read --terminal <handle>`
- To create a new opencode terminal in active worktree: `orca terminal create --worktree active --command "opencode" --title "<name>"`
- To check terminal status: `orca terminal list` or `orca terminal read --terminal <handle>`

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

## Token Efficiency & Large Data Handling
- **Never `view_file` the full `spells.toml` or `spells.js`**: `src/data/toml/spells.toml` alone is ~360 KB (~90,000 tokens). Reading it directly into working context causes every subsequent tool step to re-send that entire payload, generating millions of tokens per turn. Use targeted `grep_search`, `node -e` queries, or narrow line ranges when inspecting entries.
- **Isolate Ingest & Wiki Scraping Scripts**: When running wiki scraping scripts (`scripts/enrich_spells.js`, `scripts/ingest_abilities.js`), execute them as background or terminal processes that log brief summary statistics instead of dumping raw HTML pages (~300 KB each) or full data diffs into the chat transcript.
- **Do Not Dump Full Character State / JSON Dumps**: For character state debugging, extract only the specific slice under test (e.g. `character.spells` or `character.stats`) instead of viewing entire serialization outputs.