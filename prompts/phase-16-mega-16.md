# Phase 16 — Mega 16×16

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 22 Mega 16×16.
> Prereqs: Phase 15. This phase further exercises the variable-grid invariant.

## Goal

Classic Sudoku on a 16×16 grid with 4×4 boxes. Digits 0–9 + A–F (hex display).

## Deliverables

- Verify `classic.ts` works at N=16 with 4×4 boxes. Stress-test the parametric solver.
- `gen/src/generator/classic.py` invoked with `--size 16 --box-rows 4 --box-cols 4`. Expect minutes per puzzle.
- Banks at `src/puzzles/mega-16/` — fewer puzzles (≥ 30 per band) due to generation cost.
- Input pad: 16-digit pad. Render hex glyphs (0–9, A–F) with a slightly smaller font.
- UI grid auto-fits the 16×16; verify on iPad portrait and landscape — landscape only is acceptable if portrait makes cells unreadable. Decide based on iPad readability test.
- Tests at N=16 for solver + grader.

## Out of scope

Variant select UI.

## Acceptance criteria

- [ ] Mega banks generated (small but real).
- [ ] iPad rendering is readable (decide orientation lock and document).
- [ ] No regression in the 9×9 / 6×6 variants.

## Output format

Standard, plus screenshots of the 16×16 grid on iPad portrait & landscape with the decision on orientation lock.
