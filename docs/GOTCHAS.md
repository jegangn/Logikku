# Gotchas

> Append-only log of pitfalls we've actually hit. Each entry: short title, date, what bit us, the fix.

## Setup

### `--no-src-dir=false` is ambiguous — 2026-05-11
Vite always uses `src/` at root, so the original Next.js-era flag is moot under the current stack.

### Vitest 4 needs `defineConfig` from `vitest/config`, not `vite` — 2026-05-11
Putting a `test` field on a `vite.config.ts` that imports `defineConfig` from `'vite'` fails typecheck:
`Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'.`
Fix: `import { defineConfig } from 'vitest/config'`.

### Vitest picks up Playwright `.spec.ts` files by default — 2026-05-11
Vitest's default include glob is `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which catches `e2e/*.spec.ts`. Playwright's `test()` then errors because it's not running under Playwright. Fix: `test.include` and `test.exclude` in vitest config.

### TS 6 deprecates `baseUrl` — 2026-05-11
`paths` works without `baseUrl` in TS 6 — paths are resolved relative to the tsconfig itself. Just remove `baseUrl`.

---

## Engine

### Techniques must iterate `grid.constraints[*].regions`, never `classicRegions(shape)` — 2026-05-11
For the engine to remain variant-pluggable, technique implementations must walk `grid.constraints[*].regions` (via the `regionsOf(grid)` helper in `_technique.ts`). Hardcoding `classicRegions(shape)` works for Phase 0 but silently breaks once X-Diagonal, Hyper, Jigsaw etc. add their own regions. Caught while writing Hidden Single.

### A technique can short-circuit a later one if fixtures don't isolate the pattern — 2026-05-11
First-match-wins iteration order means a Pointing test that places candidates carelessly may trigger a Row Hidden Single or Naked Pair before Claiming fires. Build fixtures that ONLY admit the pattern under test, even if that means manually erasing candidates in unrelated cells.

### Hidden Subset of size N must filter to digits appearing in 2..N cells — 2026-05-11
Including digits with exactly 1 candidate cell in a region would overlap with `hiddenSingle` (Tier 1). Excluding solved cells (`cell.value !== null`) and digits already placed in the region is also required — `propagate` does not always clear candidates before a technique runs.

### Bilocation graph construction in Simple Coloring — 2026-05-11
The bipartite color trap (two same-color cells share a peer) is impossible *within* the bilocation graph itself (any cycle in a bipartite graph is even). Same-color collisions only happen through non-bilocation peer relations — i.e. two cells in the same row/col/box but in a region where the digit has >2 candidates. Don't try to find the contradiction by re-walking the bilocation edges.

### X-Wing fixture construction — 2026-05-11
Stray candidates placed in cover columns can themselves form a different X-Wing that fires first. Fix: rows you want EXCLUDED from the X-Wing must have either ≥3 candidates for the digit (fail the `cols.length <= size` filter) or exactly 1 candidate (fail the `>= 2` filter).

### Vitest coverage requires `@vitest/coverage-v8` and the Node runtime — 2026-05-11
Running `bun --bun vitest --coverage` reports 0% because Bun's runtime bypasses V8's coverage hooks. Use `bunx vitest run --coverage` (Node runtime) or alias to a separate script. Also: install `@vitest/coverage-v8` as a dev dep — it's not bundled with Vitest 4.

## UI

_(empty)_

## PWA / iPad

_(empty)_

## Generation

### Diabolical band requires advanced techniques (or strict digging) to populate — 2026-05-11
With the Phase-0 grader, "diabolical" SE=9.0 is reserved for puzzles that defeat all Tier-1–4 techniques and require backtracking. Random-dig-with-symmetry produces puzzles that overwhelmingly solve via techniques, so the acceptance rate for diabolical is ~0. Phase 1 ships 4 bands (easy, medium, hard, expert); diabolical is deferred to a future phase that either (a) adds advanced techniques to the grader and re-categorizes the existing expert puzzles, or (b) implements aggressive digging that intentionally produces 17-clue starting positions.

### Grader SE formula must match user-facing difficulty labels — 2026-05-11
Original `tier * 1.5 + 0.5` was too aggressive: tier-1-only puzzles graded as SE 3.0 = medium, leaving "easy" band empty and breaking the generator. Replaced with banded formula: tier 1 → 1.0–2.4 (easy/very-easy), tier 2 → 2.7–3.9 (medium), tier 3 → 4.1–5.9 (hard), tier 4 → 6.1–7.9 (expert).

### Click's Unicode arrow doesn't survive Windows cp1252 stdout — 2026-05-11
`click.echo("... → ...")` raises `UnicodeEncodeError` on Windows even with `PYTHONIOENCODING=utf-8` if the parent process inherits cp1252. Use plain ASCII (`->`) in CLI output or call `click.echo(..., color=False)` after configuring sys.stdout reconfigure.

### `python -m generator.cli` needs PYTHONPATH=src when not installed — 2026-05-11
`pyproject.toml` sets `pythonpath = ["src"]` under `[tool.pytest.ini_options]` which works only for pytest. Plain `python -m` needs `PYTHONPATH=src` prefix, or do `pip install -e .` to install the package editably.

### z3-solver has no Python 3.14 wheel (Nov 2025); cmake build fails on Windows — 2026-05-11
Pure-Python backtracker is faster anyway for 9×9 Classic. Defer Z3 to a variant phase (Killer cages are the strongest candidate for SAT encoding).

### X-Sudoku diagonal-aware peers via `extra_regions`, not a new constraint type — 2026-05-12
Refactored `peers_of`, `initial_candidates`, `random_solved`, `count_solutions`, and `dig` to take an optional `extra_regions: list[frozenset[(r,c)]]`. Each region whose membership includes the cell is unioned into the peer set. Cleaner than a per-variant peer function — the next variant (Hyper, Anti-Knight via offsets) just provides its regions. Anti-knight will need a different shape (offset-based, not region-based), so don't over-generalize this until Phase 8.

### TS-side grader needs a variant prefix on stdin lines — 2026-05-12
The long-running `tools/grade.ts` originally hardcoded `[classicConstraint]`. Now reads `<variant>\t<puzzle>` per line and looks up the constraint set via a small switch. Bare puzzle strings still parse as classic for backward compat. Python `GraderBridge.grade(puzzle, variant="classic")` writes the prefix.

### Diagonal hidden single is redundant with hidden single but useful for labeling — 2026-05-12
`hiddenSingle` already iterates `regionsOf(grid)` which includes diagonal regions from the x-diagonal constraint. So it already "finds" diagonal singles automatically. The dedicated `diagonalHiddenSingle` technique adds a distinct id/label so graded steps can be attributed to the diagonal scope. Tier is 1 (same as the generic version), runs first in `ALL_TECHNIQUES` so diagonal-decisive placements get the diagonal label.

### Hyper / Windoku reuses the same extra_regions pipeline as X — 2026-05-12
No new technique needed: existing locked-candidates / pair logic generalises to any region set because techniques iterate `regionsOf(grid)`. The hyper constraint adds 4 `kind: 'window'` regions; conflict detection, hidden-single deduction, and the backtracker all pick them up automatically. The constraint itself only needs to handle window-peer elimination (already a built-in pattern from X-Sudoku).

### Hyper "medium" SE band is similarly narrow but for a different reason — 2026-05-12
X-Sudoku medium acceptance is ~0.5% because diagonals add a deep tier-1 channel. Hyper medium acceptance is ~0.3% for the symmetric reason: four 3x3 windows add four extra row-/col-/box-like channels, so most dug puzzles either solve at tier 1 or jump to tier 3+. Tier-2-only (Locked Candidates) zone is thin. Same pragmatic fix: ship a smaller medium bank.

### Pytest stalls when run alongside an active GraderBridge — 2026-05-12
`test_bridge.py` spawns its own `bun tools/grade.ts`. Running pytest concurrently with a `python -m generator gen` that's also using a GraderBridge causes both bun processes to fight for stdio buffers, and pytest's bridge test hangs indefinitely. Either run pytest before kicking off generation, or wait for generation to fully finish.

### Pair-inequality constraints need a non-region conflict path — 2026-05-12
Anti-Knight/Anti-King flag a pair as "no shared digit", and Non-Consecutive flags "differ by 1". Both express forbidden pairs, not "all distinct within a region". Modelling each pair as a 2-cell region works for same-digit-forbidden (anti-knight, anti-king) but breaks down for the |a-b|=1 predicate — that's not a region rule. We added an optional `findConflicts(grid): Coord[]` method to the `Constraint` interface and made `computeConflicts` (Board) + `cellConflicts` (gameStore strict-mode) call both region-iteration AND `findConflicts`. Cleanest extension point for future predicate-based variants (Greater-Than will likely use the same hook).

### `setValue` propagates classic peers only — pair constraints fix it via a technique — 2026-05-12
`grid.setValue` in TS uses `peersOf` which is row/col/box only. Anti-knight peers don't get their candidates updated on placement. Rather than rebuild `setValue` to consult all constraints (expensive, error-prone), we added a `forbidden-pair-elimination` tier-1 technique that walks pair-inequality constraints and emits removals. Runs first in `ALL_TECHNIQUES` so naked-single/hidden-single see updated candidates.

### Anti-King orthogonal offsets are redundant with classic — keep them anyway in TS, drop them in Python — 2026-05-12
Anti-King is "no two cells a king's move apart share a digit". Orthogonal king moves (1 up/down/left/right) ARE classic row/col peers, so adding them to anti-king's offset list is redundant. In the TS engine I left all 8 offsets (lets the constraint declare its full rule and double-work is idempotent). In the Python generator I dropped them to 4 diagonals (smaller `extra_same_offsets` = faster backtracker fill).

### Dense pair-inequality constraints make digging brutally slow — 2026-05-12
Anti-Knight adds 8 extra same-digit peers per cell. Every `count_solutions` call during `dig` has to explore a much smaller candidate space, so each uniqueness check is slow AND fewer holes preserve uniqueness. At max_removals=50 (hard band), throughput drops to roughly 1 emitted puzzle per minute solo — emergent from the constraint's structure, not a bug. Phase 8 ships smaller hard/expert banks (~15 / ~10 each) because the cost-per-puzzle is real. Future variants with similarly dense pair constraints should expect this and cap targets, not chase 50/band.

### Generator parallelism is roughly a wash under CPU contention — 2026-05-12
Tried running 3 variants in parallel (anti-knight + anti-king + non-consecutive). Each gen spawns its own bun grader subprocess. With 6 active processes (3 python + 3 bun) on 8 cores, each runs at ~30% of its single-process speed. Aggregate throughput is roughly the same as serial, and per-band wall clock is 3x longer. Serial is simpler to monitor and not meaningfully slower. Phase 8 ended up running sequentially via `gen/scripts/phase8_banks.sh`.

### Jigsaw bank generation blocked by stdlib backtracker — 2026-05-13
The pure-Python backtracker (`gen/src/generator/solver.py`) is fast on classic 3×3 box partitions and on the variants that build on them. On irregular jigsaw polyominoes the same backtracker thrashes: pieces that span 5+ rows give the MRV heuristic poor pruning and `random_solved` doesn't return within minutes even with a handful of swaps from the classic-box partition. Constraint engine, overlay, gameStore wiring, and `tools/grade.ts` are all in place for jigsaw — only bank generation is blocked. Re-attempt needs either (a) hidden-single propagation inside `_backtrack_fill`, (b) Z3-solver (currently no Python 3.14 / Windows wheel), or (c) generating the solved grid via classic and then finding a 9-coloring that matches a contiguous partition. Phase 9 ships Even-Odd only; Jigsaw banks are a follow-up.

### Constraint-aware peers needed for jigsaw correctness — 2026-05-13
Phase 0..8 had a hidden assumption: `peersOf(coord, shape)` returns the classic row + col + 3×3 box. The TS engine's `setValue` used this, which is correct for any variant where the box partition stays classic (X-Diagonal, Hyper, the pair-inequality trio — all stack ON TOP of classic). Jigsaw is the first variant where boxes are REPLACED. Added `peersFromConstraints(coord, grid)` that derives peers from `grid.constraints[*].regions`, falling back to classic peers when no constraints are attached. `setValue` and `gameStore.input` now both use it. Also added `recomputeCandidates(grid)` that resets candidate sets and re-applies elim from constraints — for solver paths where `parsePuzzle`'s classic peer-elim is wrong (jigsaw, even-odd recompute).
