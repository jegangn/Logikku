# Variants — Rules & Overlays

> **Status:** Stub. Each section lists the rule, the constraint kind, overlay needs, and generator notes. Implementation lives in `src/engine/constraints/<kind>.ts`. Cross-ref: `docs/ARCHITECTURE.md`, `prompts/phase-NN-*.md`.

| # | Variant | Phase | Constraint kind | Grid sizes |
|---|---|---|---|---|
| 1 | Classic | 0 | `classic` | 9×9 |
| 2 | X / Diagonal | 6 | `x-diagonal` | 9×9 |
| 3 | Hyper / Windoku | 7 | `hyper`, `windoku` | 9×9 |
| 4 | Anti-Knight | 8 | `anti-knight` | 9×9 |
| 5 | Anti-King | 8 | `anti-king` | 9×9 |
| 6 | Non-Consecutive | 8 | `non-consecutive` | 9×9 |
| 7 | Jigsaw | 9 | `jigsaw` | 9×9 |
| 8 | Even-Odd | 9 | `even-odd` | 9×9 |
| 9 | Mini 6×6 | 10 | `classic` (size=6) | 6×6 |
| 10 | Kropki | 10 | `kropki` | 9×9, 6×6 |
| 11 | XV | 10 | `xv` | 9×9 |
| 12 | Greater Than | 10 | `greater-than` | 9×9, 6×6 |
| 13 | Thermometer | 11 | `thermometer` | 9×9 |
| 14 | Arrow | 12 | `arrow` | 9×9 |
| 15 | Killer | 13 | `killer` | 9×9 |
| 16 | Little Killer | 14 | `little-killer` | 9×9 |
| 17 | Sandwich | 14 | `sandwich` | 9×9 |
| 18 | Skyscraper | 14 | `skyscraper` | 9×9 |
| 19 | Palindrome | 15 | `palindrome` | 9×9 |
| 20 | Renban | 15 | `renban` | 9×9 |
| 21 | German Whispers | 15 | `german-whispers` | 9×9 |
| 22 | Mega 16×16 | 16 | `classic` (size=16) | 16×16 |
| 23 | Samurai | 17 | composition of 5 × `classic` | 5 × 9×9 |

---

## 1. Classic

**Rule:** Standard 9×9 Sudoku. Each row, column, and 3×3 box contains 1–9 exactly once.
**Constraint:** `classic` — emits row/col/box regions for size N.
**Overlay:** none (base grid).
**Generator:** Z3 random fill → solve uniqueness → dig with symmetry mask.

## 2. X / Diagonal

**Rule:** Classic plus both main diagonals contain 1–9.
**Constraint:** `x-diagonal` — two extra regions (NW-SE, NE-SW).
**Overlay:** subtle tinted diagonals.
**Generator:** extend Classic with diagonal Z3 clauses.

## 3. Hyper / Windoku

**Rule:** Classic plus four extra 3×3 "windows" (rows 2-4 cols 2-4, 2-4/6-8, 6-8/2-4, 6-8/6-8) each containing 1–9.
**Constraint:** `hyper` (or `windoku`).
**Overlay:** four lightly-tinted boxes.
**Generator:** extend Classic with 4 extra region constraints.

## 4. Anti-Knight

**Rule:** Classic + no two cells a chess-knight's-move apart share a digit.
**Constraint:** `anti-knight` — pairwise inequality across knight offsets.
**Overlay:** none, but UI shows knight hint on long-press.
**Generator:** extend Classic with anti-knight Z3 clauses.

## 5. Anti-King

**Rule:** Classic + no two cells a king's-move apart share a digit (effectively no-touch).
**Constraint:** `anti-king`.
**Overlay:** none.
**Generator:** extend Classic with king-adjacency clauses.

## 6. Non-Consecutive

**Rule:** Classic + orthogonally adjacent cells cannot differ by exactly 1.
**Constraint:** `non-consecutive`.
**Overlay:** none.
**Generator:** extend Classic with `|a - b| ≠ 1` over edges.

## 7. Jigsaw

**Rule:** Replace the nine 3×3 boxes with nine irregular polyomino regions (each 9 cells, contiguous), each containing 1–9.
**Constraint:** `jigsaw` — accepts a `regions` parameter defining the polyominoes.
**Overlay:** thicker borders around polyomino edges.
**Generator:** generate polyomino partition first, then puzzle.

## 8. Even-Odd

**Rule:** Classic + some cells are marked "even-only" (must be 2/4/6/8) and others "odd-only" (1/3/5/7/9).
**Constraint:** `even-odd` — per-cell parity restrictions.
**Overlay:** even cells filled with light grey square; odd cells with circle.
**Generator:** Classic + random parity markings, verify unique.

## 9. Mini 6×6

**Rule:** Classic on 6×6 with 2×3 boxes. Digits 1–6.
**Constraint:** `classic` with `size=6, box=[2,3]`.
**Overlay:** none.
**Generator:** Classic generator parameterized to N=6.

## 10. Kropki

**Rule:** Classic + white dot between cells means consecutive (|a−b|=1); black dot means ratio 1:2. Absence of dot = neither (in "strict Kropki") or unknown (in "soft Kropki" — pick strict for purity).
**Constraint:** `kropki` — edge constraints.
**Overlay:** small dots on cell borders.
**Generator:** Classic + place dots from solved grid, verify unique with strict-Kropki absence-of-dot rule.

## 11. XV

**Rule:** Classic + V between two cells sums to 5, X sums to 10. Strict variant: unmarked edges sum to neither.
**Constraint:** `xv`.
**Overlay:** X/V glyphs on edges.
**Generator:** analogous to Kropki.

## 12. Greater Than

**Rule:** Classic + inequality arrows between adjacent cells.
**Constraint:** `greater-than` — directed edge constraints.
**Overlay:** small arrows on cell borders.
**Generator:** Classic + inequality clauses.

## 13. Thermometer

**Rule:** Cells along a "thermometer" (bulb → tip) strictly increase.
**Constraint:** `thermometer` — one constraint per thermometer path.
**Overlay:** SVG bulb + line through cell centers.
**Generator:** generate thermometers as random monotone paths, then puzzle.

## 14. Arrow

**Rule:** A circled cell equals the sum of digits along its arrow path.
**Constraint:** `arrow` — head cell = sum(tail cells).
**Overlay:** SVG arrow with terminal circle.
**Generator:** generate arrow paths, then puzzle.

## 15. Killer

**Rule:** Cells partitioned into "cages" (irregular polyominoes); each cage shows a target sum; no digit repeats within a cage. Cages do not respect box boundaries.
**Constraint:** `killer` — per-cage region + sum.
**Overlay:** dashed border + small target-sum number in corner.
**Generator:** start from solved grid, partition into cages with size 1–9, label sums. Often largest phase.
**Techniques:** Cage 45 (row/col/box sums to 45), naked-cage subsets, innie/outie.

## 16. Little Killer

**Rule:** Outside-the-grid arrows give the sum of diagonals they point along.
**Constraint:** `little-killer`.
**Overlay:** outside-grid arrow + sum.
**Generator:** Classic + add outside arrow sums.

## 17. Sandwich

**Rule:** Outside number = sum of digits between 1 and 9 in that row/column.
**Constraint:** `sandwich`.
**Overlay:** outside-row/column number.
**Generator:** Classic + clue computation.

## 18. Skyscraper

**Rule:** Outside number = count of "buildings" visible from that direction (taller blocks shorter).
**Constraint:** `skyscraper`.
**Overlay:** outside-row/column number.
**Generator:** Classic + clue computation.

## 19. Palindrome

**Rule:** Cells along a marked path read the same forwards and backwards.
**Constraint:** `palindrome` — symmetry pair equality.
**Overlay:** grey curve through cells.
**Generator:** place random palindrome paths, then puzzle.

## 20. Renban

**Rule:** Cells along a marked path form a consecutive-digit set (any order). E.g. {3,4,5,6}.
**Constraint:** `renban`.
**Overlay:** purple curve through cells.
**Generator:** place renban paths, then puzzle.

## 21. German Whispers

**Rule:** Adjacent cells along a path differ by at least 5.
**Constraint:** `german-whispers`.
**Overlay:** green curve through cells.
**Generator:** place whisper paths, then puzzle.

## 22. Mega 16×16

**Rule:** Classic on 16×16 with 4×4 boxes. Digits 1–16 (or 0–9 + A–F).
**Constraint:** `classic` with `size=16, box=[4,4]`.
**Overlay:** none. Note: input pad needs hex layout.
**Generator:** Classic generator at N=16. Much slower; expect minutes per puzzle.

## 23. Samurai

**Rule:** Five overlapping 9×9 grids: center grid + four corner grids each sharing the corner 3×3 box with the center. Each sub-grid is a Classic Sudoku; shared boxes appear in both.
**Constraint:** composition — five `classic` constraint sets with shared-cell coupling.
**Overlay:** cruciform layout; sub-grid borders thicker.
**Generator:** generate center grid; constrain corner grids to match shared box; solve uniqueness across the 369 cells.

---

## UI conventions across variants

- Variant select screen shows a sample puzzle preview thumbnail.
- First-play of any variant shows a 2-screen rule explainer (skippable, never shown again).
- Conflict highlighting respects all active constraints, not just classic.
- Pencil-mark autoclean is opt-in per variant (some variants benefit, others not).
