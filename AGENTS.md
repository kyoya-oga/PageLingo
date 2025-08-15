# Repository Guidelines

## Project Structure & Module Organization
- Source lives in `src/`; group by feature (e.g., `src/editor/`, `src/i18n/`).
- Tests live in `tests/`, mirroring `src/` (e.g., `tests/editor/…`).
- Static assets go in `assets/` (images, fonts) and docs in `docs/`.
- Example configuration: `.env.example` checked in; `.env` ignored.

## Build, Test, and Development Commands
- Install: `make setup` (recommended). If unavailable, initialize your toolchain (e.g., `npm install` for JS/TS or `python -m venv .venv && pip install -r requirements.txt` for Python).
- Develop: `make dev` — run a local watcher/server.
- Test: `make test` — run the full test suite with coverage.
- Build: `make build` — produce a production build or distributable.
- Lint/Format: `make lint` / `make fmt`.

Tip: If the repository lacks a `Makefile`, add these targets to wrap your stack’s native commands (e.g., `npm run dev`, `pytest`, `ruff`, `prettier`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces; UTF-8; Unix line endings.
- Names: files and dirs `kebab-case` or `snake_case`; classes `PascalCase`; functions/vars `camelCase` (JS/TS) or `snake_case` (Python).
- Formatting: use an auto-formatter. JS/TS: Prettier; Python: Black. Commit only formatted code.
- Linting: JS/TS: ESLint; Python: Ruff. Fix or justify warnings.

## Testing Guidelines
- Framework: choose per language (e.g., Vitest/Jest for JS/TS, Pytest for Python).
- Structure: mirror `src/`; name tests `*.test.ts` or `test_*.py`.
- Coverage: target ≥80% lines; include edge cases and error paths.
- Run locally via `make test`; add snapshots/artifacts to `tests/__snapshots__/` if applicable.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (e.g., `feat: add glossary panel`). Keep small and focused.
- PRs: include purpose, linked issues, clear before/after notes, and screenshots for UI. Add test coverage for changes. Update docs and `.env.example` when config changes.
- Reviews: request at least one maintainer; address feedback with follow-up commits (avoid force-push after review unless requested).

## Security & Configuration Tips
- Never commit secrets. Use `.env` and keep an up-to-date `.env.example`.
- Validate and sanitize any user-provided content. Add dependency updates separately and monitor advisories.
