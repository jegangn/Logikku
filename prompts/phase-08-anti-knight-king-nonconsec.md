# Phase 8 — Anti-Knight + Anti-King + Non-Consecutive (bundle)

> Read first: `CLAUDE.md`, `docs/VARIANTS.md` § 4 Anti-Knight, § 5 Anti-King, § 6 Non-Consecutive.
> Prereqs: Phase 7.

## Goal

Three "pairwise constraint" variants that share generator and solver infrastructure. Bundling reduces duplication.

## Deliverables

- `src/engine/constraints/anti-knight.ts`, `anti-king.ts`, `non-consecutive.ts` — full impls. All three express themselves as **pair-inequality** constraints over specified cell-offset sets; share a `PairInequalityConstraint` base in `src/engine/constraints/_base/`.
- Solver technique: "Forbidden-Pair Elimination" — eliminates a candidate from cell B when cell A is fixed and (A,B) violates a pair constraint.
- Generators at `gen/src/generator/{anti_knight,anti_king,non_consecutive}.py`; banks for each at `src/puzzles/<variant>/`.
- Overlays: none for these three (rules apply globally; no per-cell visual). Onboarding (Phase 18) explains them.
- Tests: per variant; one shared base test for `PairInequalityConstraint`.

## Out of scope

Variant select UI (Phase 18).

## Acceptance criteria

- [ ] Three banks per variant.
- [ ] Conflict highlight respects the rule (Anti-Knight: enter a duplicate digit at a knight's move → conflict).
- [ ] No regression.

## Output format

Standard. Note any cases where bundling caused friction so we can adjust future bundling decisions.
