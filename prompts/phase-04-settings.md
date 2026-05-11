# Phase 4 — Settings, Themes, Strict Mode, Stats, Backup/Restore

> Read first: `CLAUDE.md`, `docs/ARCHITECTURE.md` § Storage, § State management, § Backup/restore JSON schema.
> Prereqs: Phase 3.

## Goal

Ship the settings surface: theme switching, strict mode (lock in wrong digits), conflict-highlight toggle, sound off (permanently), backup/restore JSON, and a stats panel.

## Deliverables

### Settings store (`src/state/settingsStore.ts`)

- Fields: `theme: 'light' | 'dark' | 'system'`, `strictMode: boolean`, `highlightConflicts: boolean`, `highlightPeers: boolean`, `pencilAutoClean: boolean`.
- Persisted via Phase 3 `db.ts`.

### Settings UI (`src/ui/pages/Settings.tsx`)

- Toggle rows for each setting. Large iPad-friendly switches.
- "Backup my progress" → `download backup.json` with all games + settings + stats (per schema in `docs/ARCHITECTURE.md`).
- "Restore from file" → file picker; on success, prompt destructive-confirm, then replace state.
- Clear-all-data button with double-confirm.

### Themes

- Two themes only: light + dark. Tailwind `dark:` variants; `prefers-color-scheme` honored when set to "system".
- Theme applied at `<html>` via `data-theme` attribute.

### Strict mode

- When on: entering a value that violates a constraint locks the entry in (cannot erase) for 5 seconds, with a subtle shake animation. Used for "no take-backsies" play.

### Stats page (`src/ui/pages/Stats.tsx`)

- Per variant + difficulty: count completed, best time, average time.
- Reset stats button (separate confirm).

### Tests

- `settingsStore.test.ts`.
- Snapshot-style test for backup JSON schema.
- `e2e/backup.spec.ts` — write a backup, clear data, restore, assert state matches.

## Out of scope

- PWA polish (Phase 5).
- Variant-specific stats (the structure must accommodate them; no UI work yet).
- i18n strings (Phase 19) — keep all UI strings in `src/i18n/en.ts` so Phase 19 has one file to extract from.

## Acceptance criteria

- [ ] Theme toggle works without page reload.
- [ ] Backup JSON validates against the schema; restore is idempotent.
- [ ] Strict mode prevents erasing a wrong-locked entry for 5s.
- [ ] Tests green; no engine imports of React.

## Output format

Files added/modified, test counts, screenshot of Settings page on iPad device profile, open questions.
