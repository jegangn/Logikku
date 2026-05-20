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

### Mini 6x6 SE bands cap at tier-1 — 2026-05-13
A 6x6 grid is too small for most tier-2+ techniques (naked/hidden pairs, X-Wing, etc.) to apply, so 95%+ of generated puzzles solve via tier-1 only and land in SE 1.0-2.4. Original mini-6 difficulty bands copied the classic 9x9 ranges (easy 1.5-2.4, medium 2.5-3.9, hard 4.0+) and `medium` had effectively zero acceptance — generator hung past 5 minutes on `--n 50 -d medium`. Fix: split the tier-1 range across easy/medium and push tier-2+ into a single `hard` band: easy=(1.0, 1.7), medium=(1.8, 2.4), hard=(2.5, 7.9). Acceptance is ~100% / ~100% / ~3% respectively — usable.

### Variable grid size: every CLASSIC_9 reference is a Mini 6x6 bug — 2026-05-13
Phase 0 used `CLASSIC_9` as a default shape across the engine, generator, and store. Phase 10's Mini 6x6 forced the whole stack to derive shape from the variant. New helper `shapeForVariant(variant)` in `gameStore` maps `'mini-6' -> CLASSIC_6`; `tools/grade.ts` accepts a `size` field in the request JSON. `InputPad` now accepts `size` and renders N digits instead of hardcoding 9. Keyboard handler in `Play` rejects digit keys above `gridSize`. Future variants with non-classic shapes (Mega 16x16, Samurai) will follow the same pattern.

### Strict-Kropki / strict-XV makes generation almost free — 2026-05-13
Under strict semantics (absence-of-mark implies neither relation holds), the dot/mark mask placed from the solution acts as a *very* heavy constraint. Hard-band acceptance for Kropki was 3.7% (~27 attempts/puzzle) on first try — comparable to classic 9x9. We can dig aggressively without breaking uniqueness. Soft-Kropki (absence = unknown) would be much slower; we explicitly chose strict semantics in the engine.

### Thermometer search blows up with too many / too long paths — 2026-05-13
First attempt: 6 paths of length 3-7 per puzzle. The pure-Python backtracker handles up to ~3 paths comfortably, but cascading "successor must be > d / predecessor must be < d" eliminations on every placement compounds across paths. With 6 paths totalling 30+ constrained cells, `random_solved` and `count_solutions` both slow to ~30s/attempt. Fix: trim to 4 paths of length 3-5 per puzzle (THERMO_PATHS_PER_PUZZLE=4, THERMO_MAX_LEN=5 in gen/src/generator/thermometer.py). Resulting attempt time is ~10ms, accept rate >25% even on hard band.

### Thermometer SE bands cap at tier-1 — 2026-05-13
Same shape as Mini 6x6: thermometer marks are strong tier-1-effective eliminations (length-based bounds + monotonicity sweeps), so most generated puzzles solve at SE 1.0-2.4. Tier-2+ techniques rarely fire on thermometer puzzles because the path bounds alone usually crack them. Fix: gate easy/medium/hard by max_removals (36 / 46 / 54) and accept the full tier-1 SE range. Bank counts trimmed to 40/35/25.

### Killer cage combination filter pins every SE at 2.4 — 2026-05-14
A sweep of 60 freshly-dug killer puzzles across max_removals = 40 / 50 / 60 / 70 / 80 returned SE=2.4 for ALL of them — every killer puzzle generated solves via tier-1 techniques alone (naked / hidden single chained against the cage combo filter). Reason: the constraint's `enumerateCageCombos` inside `propagate()` collapses cage candidate sets so aggressively that tier-2+ patterns almost never get to fire. Same problem as Mini 6x6 / Thermometer / Arrow. Fix: five density-gated bands all using SE (1.0, 2.4) — easy=45, medium=55, hard=65, expert=73, diabolical=81 max_removals. The "diabolical" label is aspirational — hard / expert / diabolical end up at similar givens counts (~24-25) because the digger stops removing once uniqueness breaks regardless of max_removals. Bank labelling is preserved for routing parity with other variants; the actual puzzle hardness across the three sparse bands varies more by cage layout than by givens density. Improving this needs either (a) richer killer techniques whose tier > 1 (locked-cage subsets that ALSO eliminate from peers), (b) a non-tier-1 step counter for ratings, or (c) a different SE scale tuned for variants with strong propagators.

### Killer digger doesn't know about cages — 2026-05-14
`gen/src/generator/digger.py` runs against the classic-Sudoku uniqueness oracle (`count_solutions`), not the killer-aware one. So during digging the polyomino sum constraints aren't enforced — the digger over-removes and the final TS-grader's `backtrackingSolve` (which DOES know cages) rejects ~25% of puzzles for non-uniqueness in the diabolical band. That's fine: rejection just costs one attempt. Making the Python solver cage-aware would be tens of lines but would only marginally improve attempt rate. Trade-off accepted.

### Outside-clue variants need extra SVG margin — 2026-05-14
Little-Killer / Sandwich / Skyscraper render clue labels OUTSIDE the cell grid. The board's existing viewBox was `0..gridSize*cellSize` — clamping anything we draw outside. Fix: `Board.tsx` accepts an `outsideClues` prop and, when set, expands the viewBox to `-margin..gridSize*cellSize+margin` (margin = 0.6 * cellSize). The shared `OutsideClueOverlay` then positions labels in the margin via negative coordinates (top/left) or coordinates beyond `gridSize*cellSize` (bottom/right). Little-Killer also draws a small diagonal arrow next to its label using direction-aware unit vectors.

### Outside-clue variants pin SE at 2.4 — 2026-05-14
Same shape as Killer / Mini-6 / Thermometer / Arrow: little-killer diagonals, sandwich sums, and skyscraper visibility constraints all give the TS grader enough information that puzzles solve via tier-1 techniques (naked / hidden single) plus the constraint's own bounds. Even hard / expert / diabolical bands generate at SE 2.4. We density-gate via `max_removals` (40 / 50 / 58-60 / 66-70 / 81) and document that the labels are about givens-density rather than technique difficulty. Acceptance dips to ~30-50% on the sparser bands because the classic-only digger over-removes (TS grader catches non-uniqueness post-hoc).

### Constraint metadata via typed widening — 2026-05-14
For Killer we used `NamedRegion.sum` to round-trip cage targets through the `Grid -> constraint -> region` channel. For Phase-14 outside-clue variants, each constraint instead exposes a typed `diagonals` / `lines` property on the returned constraint object (widened return type, e.g. `LittleKillerConstraint extends Constraint`). Techniques access it via `constraint.kind === 'little-killer'` type narrowing. Cleaner than stashing in `id` strings or NamedRegion metadata, and works fine because the Constraint interface in `types.ts` is open (TS happily widens it on return).

### Palindrome paths from a random solved grid have ~1% acceptance — 2026-05-14
A random length-3 orthogonal walk in a classic solved grid has roughly 1/9 ≈ 11% chance of being palindromic (endpoints share a digit). For length 4 (two mirror pairs) that drops to ~1.2%, length 5 the same. With 3 paths per puzzle the joint probability is harsh — first attempt at 4 paths × length 3-5 ran at 0.1% acceptance (2300+ attempts for 3 puzzles). Trim: PATHS_PER_PUZZLE=3, PATH_MAX_LEN=4. Acceptance climbs to ~0.8%. Length-3 paths dominate the output because length-4 needs both mirror pairs to match. Renban and German Whispers don't have this problem (constraint is local, not symmetric).

### Path-variant banks pin SE at 2.4 — 2026-05-14
Same shape as Killer / Mini-6 / Thermometer / Arrow / outside-clue variants: palindrome, renban, and german-whispers all give the TS grader enough information that puzzles solve via tier-1 techniques alone. Density-gate via `max_removals` (40 / 50 / 58 / 66 / 81) across the 5 bands and document that "diabolical" is about givens-sparsity, not technique difficulty.

### Palindrome hard+ acceptance collapses to 0.02-0.1% — 2026-05-17
Easy / medium palindrome accept at ~0.8% (3 paths × length 3-4 with mirror-pair matching). Hard / expert / diabolical drop to 0.02-0.1% because the classic-only digger over-removes givens that the TS grader's palindrome-aware solver then rejects for non-uniqueness — far more aggressively than renban/whispers (whose constraints are local, not symmetric). Phase 15 ships palindrome at trimmed counts (easy/medium 110, hard 50, expert 30, diabolical 20) — wall-clock to fill hard+ at 110 each would be days. Renban and Whispers fill 110/band across all 5 bands fine. Future fix: make the Python digger palindrome-aware before removing endpoints whose mirror is already empty.

### Long Windows grader runs accumulate pipe / GC pressure — 2026-05-17
A single `bun tools/grade.ts` subprocess handling 50k+ grade calls eventually stalls on stdio writes on Windows. Cause is opaque (Windows pipe buffering + bun GC + V8 long-lived strings interacting badly). Fix: `GraderBridge` now preemptively kills and respawns the subprocess every `RESTART_EVERY = 3000` calls, with a 250ms sleep before respawn to let Windows release pipe handles. Restart cost is ~200ms — negligible at the 3000-call cadence. Without this, the diabolical bank fill would die ~3 hours in.

### ESLint multi-tsconfigRootDir error from in-repo worktrees — 2026-05-17
`bun run lint` emits `No tsconfigRootDir was set, and multiple candidate TSConfigRootDirs are present` and points at `.claude/worktrees/<name>` paths. Cause: Claude Code worktrees live under `.claude/worktrees/` inside the project root and each has its own `tsconfig.json`, so the TS-ESLint parser sees multiple root candidates per file. Fix: add `.claude/**`, `dev-dist/**`, `coverage/**` to `globalIgnores` in `eslint.config.js`. Also caught `dev-dist/` and `coverage/` were being linted by accident — those are build/test output, not source.

### Mega 16×16 — SE 1.0-1.4 is unreachable — 2026-05-19
At N=16 every tier-1 puzzle grades to SE=2.4. The grader's `computeSE` formula is `lo + (hi - lo) * min(1, hardSteps/12)`. On a 16×16 with even 20 holes, there are 80+ tier-1 steps before the puzzle solves — `hardSteps/12` saturates at 1, so SE always lands at the band's upper bound (2.4 for tier 1). Empirical sweep: 70 puzzles across max_removals=60/100/140 all came back at SE=2.4 except a few high-density ones (140 holes) that hit tier 2-3. Consequence: Mega ships 4 bands instead of 5 — "very-easy" (SE 1.0-1.4) is dropped from `MEGA_DIFFICULTY_BANDS`. Easy band lower bound is 2.0 (any tier-1 puzzle).

### Mega 16×16 — only easy bank shipped at Phase 16 — 2026-05-19
`MEGA_DIFFICULTY_BANDS` defines easy / medium / hard / expert. Only `easy` (max_removals=100, SE 2.0-2.4) generates at workable speed: 100% acceptance, ~1s per puzzle, 50 puzzles in under a minute. Medium / hard / expert require `max_removals >=140` to push the puzzle past tier 1, but at that density the TS grader's per-call time grows to minutes and acceptance into the target SE band drops below 10%. A 50-puzzle medium run was attempted in Phase 16 and died silently after 15+ minutes with 0 emits. Banks for the harder bands are deferred to a separate generation pass (commented in `gen/scripts/phase16_banks.sh`). The variant ships with 50 easy puzzles — playable, validated by 6 e2e tests across chromium + iPad device profiles.

### Mega 16×16 — PYTHONPATH=src is mandatory for the CLI — 2026-05-19
`cd gen && .venv/bin/python -m generator gen ...` fails with `No module named generator` unless `PYTHONPATH=src` is set first. The `gen/scripts/phase*_banks.sh` scripts all set it; standalone invocations (smoke tests, ad-hoc CLI calls) need to set it manually. Two diagnostic runs in Phase 16 silently produced 0-byte output because this was missing — the failure mode is empty stdout/stderr because Python prints the error to stderr but our `2>&1` captures it only after `python` exits, by which time the file write is already empty.

### Mega 16×16 — tools/grade.ts needed a size=16 dispatch — 2026-05-19
Easy to miss: `tools/grade.ts` is the bun grader bridge, separate from `src/state/gameStore.ts`. Its `shapeForRequest` defaults to `CLASSIC_9` unless the variant or size matches an explicit branch, and its `constraintsForRequest` switch rejects unknown variants with a JSON error. Adding a new size needs BOTH: (a) `shapeForRequest` returns `CLASSIC_16` when `req.size === 16 || req.variant === 'mega-16'`, (b) `mega-16` is added to the existing `classic`/`mini-6` case group in `constraintsForRequest` (it uses plain classic constraints at size 16, no extra rules). Caught during Phase 16 smoke testing — the grader said `unknown variant: mega-16` after Step 2 of Task 2 but before the constraintsForRequest fix.

### Mega 16×16 — pencil-mark layout switches by gridSize, not candidate count — 2026-05-19
`Cell.tsx` takes a new required `gridSize: number` prop and picks 3×3 vs 4×4 slot layout based on `gridSize > 9`, not based on `candidates.size > 9`. Important because a 16×16 cell with only one remaining candidate (say digit 12 = 'C') should still render that 'C' at the slot position corresponding to digit 12 (slot row 2, col 3), preserving muscle memory. Driving layout off candidate count would relocate marks as candidates get eliminated — confusing.

### Mega 16×16 — iPad orientation decision pending user test — 2026-05-19
Phase 16 ships with no orientation lock. Board auto-fits both portrait and landscape via the existing `aspect-square w-full max-w-[min(92vw,640px)]` constraint. At 640px / 16 cells the per-cell touch target is ~40px — borderline iOS 44px guideline. iPad readability and tap accuracy still need a manual smoke test by the user (Task 15). If portrait is unusable, follow-up: add an orientation lock or a one-time rotate hint and update this entry.

### Phase 17a — Samurai engine + state — 2026-05-20

Five overlapping 9×9 grids modeled as `SamuraiBoard` (5 × `Grid<9>` plus a
`sharedCells` map). Architectural notes worth knowing before 17b/17c:

- **Wrap, don't generalize.** `techniqueSolve` and `backtrackingSolve`
  remain Grid-only. New `samuraiTechniqueSolve` and `samuraiBacktrackingSolve`
  iterate per-sub-grid and sync shared cells. Avoiding a generic refactor
  kept the 20+ existing variants regression-free (354/354 unit tests
  still passing after the gameStore discriminated-union refactor).

- **State is now a tagged union.** `state.board: { kind: 'grid', grid } |
  { kind: 'samurai', board } | null`. Every consumer that touched
  `state.grid` directly was rewritten to dispatch on `kind`. The
  `selectGrid(state)` shim returns the Grid when grid-shaped, else null
  — used by `Play.tsx` and similar consumers that only handle classic
  variants today. Future work must continue this discipline; `assertNever`
  falls through every switch.

- **Duplicate + sync for shared cells.** A value placed in an overlap is
  stored in both sub-grids that contain it. `setValueShared` is the only
  correct write path; direct `setValue` on a sub-grid bypasses the sync
  and breaks `samuraiConsistencyCheck`. The grader runs per-sub-grid SE
  and takes the max — "puzzle is as hard as its hardest sub-grid".

- **Cruciform layout is hard-coded.** `SAMURAI_LAYOUT` defines the
  standard center-plus-4-corners topology with each corner's
  `cornerBox` overlapping the center's `centerBox`. Non-standard
  Samurai variants (e.g. Sumo Samurai) would require revisiting
  `computeSharedCells`. The 5 sub-grids are indexed [center, NW, NE,
  SW, SE]; `samuraiSharedLocations` does an O(72) linear scan, which
  is fine at 36 entries.

- **Selection model extended for samurai.** `state.selected` is now
  `Coord | { gridIdx, coord } | null`. Existing classic actions pass a
  plain `Coord` and check `'gridIdx' in sel` to skip the samurai shape;
  samurai actions require the tagged form. `Play.tsx` was narrowed
  manually to `Coord | null` since it doesn't yet handle samurai
  (17b will).

- **History hydration is reset on samurai save/load.** Per-entry replay
  of `samurai-value` / `samurai-erase` from the saved-game payload is
  intentionally deferred — the UI (17b) drives when it matters and we
  hadn't built that exercise yet at this checkpoint. The board itself
  round-trips cleanly via `serializeGameForSave` / `hydrate`.

- **Storage discriminator is optional, not migrated.** `SavedGame.kind?:
  'grid' | 'samurai'` was added as optional; legacy records without
  `kind` are treated as `'grid'`. No IndexedDB schema bump — existing
  classic saves load unchanged. New writes always stamp `kind`.

## 2026-05-20 — Phase 17b cruciform UI

**`BoardCellsLayer` extraction is the one-time DRY win.** `Board.tsx` and `SamuraiBoardView.tsx` now share the inner cell-rendering machinery. The extracted component is pure — it takes derived state (selectedCoord, selectedValue, peerSet, conflictSet) and renders. All derivation stays in the parent. This lets `SamuraiBoardView` compute per-sub-grid view-state from a single global selection without `Board.tsx` having to know anything about samurai.

**Selection state is a discriminated union, the view derives.** Per Phase 17a, `state.selected` is `Coord | {gridIdx, coord} | null`. `Play.tsx` reads `selectedRaw` and narrows in two places: classic gets `Coord | null` via the `!('gridIdx' in selectedRaw)` guard; samurai gets the wide shape via `'gridIdx' in selectedRaw`. `SamuraiBoardView` re-narrows per sub-grid via `samuraiSharedLocations`. The duplicate narrowing is intentional — each consumer derives only what it needs.

**Paint order matters for visual cleanliness.** Corners (gridIdx 1–4) paint first; center (0) paints last. The 3×3 overlap regions belong to BOTH a corner box and a center box; without ordering, the corner's heavy box lines would peek through the center's box lines. With this order, the center's heavy lines win, and the cruciform reads as one connected board.

**SVG axis convention bit us in `SUB_GRID_POSITIONS`.** `x` increases rightward, `y` increases downward. NE corner sits at `(12, 0)` (top-right), SW corner at `(0, 12)` (bottom-left). The initial plan code had these swapped — a hint that the table needs the `// top-right`, `// bottom-left` comments to survive future edits.

**Mirror conflicts at the view layer, not the engine.** `samuraiConflicts` returns intra-sub-grid conflicts only (e.g., "0,1,1" when center row 1 has two of the same digit). The view needs the conflict highlight on the shared partner cell too — otherwise NW (7,7) shows clean while center (1,1) shows red. `SamuraiBoardView.computeSubGridState` mirrors a conflicted shared cell into the partner sub-grid's `conflictSet`. The engine stays semantically pure; the visual mirroring is a UI concern.

**`CELL_SIZE=30` is a trade-off.** Yields 21×30 = 630 px side, which fits the iPad landscape ~768 px short axis with room for the InputPad. Below Apple's 44 px touch-target guideline. Acceptable for an iPad puzzle UI; revisit only if the iPad smoke uncovers tap accuracy issues. If we bump to 36 px, the board becomes 756 px square — still fits 1024 px landscape but crowds the pad.

**Orientation lock is UI-only, not navigation.** Rotating the iPad doesn't unmount the game; the matchMedia hook toggles which child renders. State (selection, board values, history) survives every rotation. The user can play landscape → rotate to portrait (see prompt) → rotate back → resume from the same cell. Tested in `Play.samurai.test.tsx`.

**`textContent` is unreliable on SVG Cell groups; use `aria-label` instead.** The integration test for Backspace originally used `expect(cell.textContent).not.toMatch(/7/)`. After erase, the engine restores all candidates (1..9), and Cell.tsx renders each candidate as a separate `<text>` element inside the same `<g>`. So `textContent` aggregates to `"123456789"` — which matches `/7/`. Switched to `expect(cell.getAttribute('aria-label')).toMatch(/empty/)` (and `/entered 7/` for the digit test). This is the semantically correct check anyway — assert on the accessibility hook, not the visual aggregation.

**Demo fixture uses (4,4) givens only.** The middle-middle cell (r=4, c=4) is in box (1,1) of any 9×9 grid, which never overlaps with another sub-grid (overlaps live in corner boxes (0,0), (0,2), (2,0), (2,2)). One given per sub-grid at (4,4) trivially passes `samuraiConsistencyCheck`. Real banks land in 17c.

**Manual iPad smoke checklist (run on real device before declaring 17b shipped):**
- Open `/play?variant=samurai&difficulty=easy` in iPad Safari.
- Portrait: rotate prompt visible, readable text.
- Landscape: cruciform fills the short axis; InputPad fits to the right.
- Tap a shared cell (e.g. center 1,1 or NW 7,7): both light up.
- Enter a digit via keyboard or pad: both cells show it; classic peers in both sub-grids drop the candidate.
- Pencil-mark on a shared cell: marks appear in both.
- Undo/redo across mixed shared/unshared placements.
- Background Safari, reopen: state restored.
- Rotate during play: prompt appears, rotate back, same selection.

