# Phase 17c — Samurai Generator + Banks Design

> **Status:** Approved 2026-05-20. Drives the implementation plan for Sub-project 17c.
> **Scope:** Python generator + bridge extensions + bank generation + e2e for the Samurai variant.
> **Part of:** Phase 17 (Samurai), decomposed into 17a (engine + state, shipped), 17b (cruciform UI, shipped), 17c (this).

## Goal

Replace the hand-crafted samurai demo with real generated banks across all 7 difficulty bands. Build the Python generator + a `tools/grade.ts` extension that exposes 17a's samurai solver/grader to the Python side. Plumbing + starter banks ship inside 17c; mass generation runs in background via a follow-up script (Phase 16 pattern).

## Non-goals

- Capacitor / iCloud (Phase 21).
- Variant-select UI changes (Phase 18).
- Engine changes beyond a small randomization extension to `samuraiBacktrackingSolve`.
- A new generator protocol — additive only.
- Z3-py dependency — not used.

## Scope decisions (locked)

| Decision | Choice |
|---|---|
| Bank scope | Tooling + starter (5/band × 7 bands = 35 puzzles, committed) + background followup to 225 target. |
| Solved-board source | Extend `tools/grade.ts` with a `solve_samurai_empty` action; reuse 17a's samurai backtracker (with new randomized flag). |
| Difficulty bands | Full 7 (`very-easy`, `easy`, `medium`, `hard`, `tough`, `expert`, `diabolical`). |
| Per-band targets | Tiered: 50/50/50/30/20/15/10. |
| Ship timing | Plumbing + starter ship in 17c. Followup script fills banks over hours/days in background. |

## Architecture

```
┌─ tools/grade.ts (extended) ──────────────────────────────────────┐
│  • Action 'grade' learns samurai: parses samuraiGivens, builds   │
│    SamuraiBoard, calls gradeSamurai + samuraiBacktrackingSolve   │
│    (maxSolutions=2) for uniqueness → returns                     │
│    {ok, unique, se, hardestTier, steps, techniqueOnly}.          │
│  • New action 'solve_samurai_empty': randomized backtracking on  │
│    empty board, returns one solved 5×81-string layout.           │
└──────────────────────────────────────────────────────────────────┘
                              ↑↓ JSON over stdin/stdout
┌─ gen/src/generator/grader_bridge.py (extended) ──────────────────┐
│  • grade_samurai(samurai_givens) → dict                          │
│  • solve_samurai_empty(seed) → list[str]  (length 5, 81 chars)   │
└──────────────────────────────────────────────────────────────────┘
                              ↑
┌─ gen/src/generator/samurai.py (new) ─────────────────────────────┐
│  • SAMURAI_DIFFICULTY_BANDS — 7 bands w/ (se_lo, se_hi, max_rem) │
│  • generate_samurai(count, difficulty, seed, bridge) → iterator  │
└──────────────────────────────────────────────────────────────────┘
                              ↓ uses
┌─ gen/src/generator/samurai_digger.py (new) ──────────────────────┐
│  • dig_samurai(solved, rng, bridge, max_removals, symmetry)      │
│  • SHARED_CELL_MAP (precomputed from SAMURAI_LAYOUT)              │
└──────────────────────────────────────────────────────────────────┘
                              ↓ emits
┌─ gen/out/samurai/<band>.jsonl (gitignored) ──────────────────────┐
│  • One PuzzleRecord JSON object per line; tail-f friendly        │
└──────────────────────────────────────────────────────────────────┘
                              ↓ promote
┌─ src/puzzles/samurai/<band>.json (committed) ────────────────────┐
│  • JSON array consumed by src/puzzles/index.ts                   │
│  • Replaces the hand-crafted demo easy.json                      │
└──────────────────────────────────────────────────────────────────┘

┌─ gen/scripts/phase17_banks.sh (new — starter) ───────────────────┐
│  5 puzzles per band × 7 bands. Synchronous, ~5–15 min.            │
└──────────────────────────────────────────────────────────────────┘
┌─ gen/scripts/phase17_banks_followup.sh (new — background) ───────┐
│  Fills bands to 50/50/50/30/20/15/10. Run after 17c ships.       │
└──────────────────────────────────────────────────────────────────┘

┌─ src/engine/solver/samuraiSolver.ts (small 17a extension) ───────┐
│  • samuraiBacktrackingSolve gains { randomized?, seed? }.        │
│    Seeded mulberry32 RNG shuffles value-choice order per branch. │
└──────────────────────────────────────────────────────────────────┘

┌─ e2e/samurai.spec.ts (extended) ─────────────────────────────────┐
│  • New: real bank has >50 visible given cells.                   │
│  • New: tapping a given cell + digit press is a no-op.           │
└──────────────────────────────────────────────────────────────────┘
```

### Guiding principles

1. **Reuse 17a's engine through the bridge.** The Python side never re-implements samurai logic.
2. **One generator pattern, two callers.** Starter and followup both invoke `generate_samurai` — only `-n` and seed differ.
3. **Bank file format unchanged.** `samurai/<band>.json` is the same `PuzzleRecord[]` shape 17b validated.
4. **Additive, backward-compatible bridge protocol.** Existing classic / variant generators are untouched.

## Components

### `tools/grade.ts` (extended)

Adds two paths to the existing JSON handler. **Backward compatible.**

**Grade path** (new branch):
```ts
if (payload.variant === 'samurai') {
  if (!Array.isArray(payload.samuraiGivens) || payload.samuraiGivens.length !== 5) {
    return { ok: false, error: "samurai requires samuraiGivens (5 × 81 chars)" }
  }
  const board = buildSamuraiFromGivens(payload.samuraiGivens)
  const grade = gradeSamurai(board)
  const bt = samuraiBacktrackingSolve(board, { maxSolutions: 2 })
  return {
    ok: true,
    unique: bt.solutionCount === 1,
    se: grade.se,
    hardestTier: grade.hardestTier,
    steps: grade.stepsBySubgrid.reduce((s, arr) => s + arr.length, 0),
    techniqueOnly: grade.se < 9.0,
  }
}
```

`buildSamuraiFromGivens` is a small helper (~20 lines) inside grade.ts, mirroring `freshSamuraiBoardFromGivens` from the game store. Local to grade.ts so the engine doesn't have to export it.

**Solve action** (new top-level branch):
```ts
if (payload.action === 'solve_samurai_empty') {
  const board = createSamuraiBoard()
  const result = samuraiBacktrackingSolve(board, {
    maxSolutions: 1,
    randomized: true,
    seed: payload.seed ?? 0,
  })
  if (!result.hasSolution) return { ok: false }
  return {
    ok: true,
    samuraiGivens: result.solvedBoard.grids.map(serializePuzzle),
  }
}
```

`SamuraiBacktrackResult` from 17a gains a `solvedBoard?: SamuraiBoard` field populated when `hasSolution=true && maxSolutions=1`. (Today it returns counts only; this is a minor 17a extension co-located with the randomization change.)

### `src/engine/solver/samuraiSolver.ts` — randomization extension

Add to `SamuraiBacktrackOptions`:
```ts
readonly randomized?: boolean
readonly seed?: number
```

Add `solvedBoard?: SamuraiBoard` to `SamuraiBacktrackResult`. Populate only when `maxSolutions === 1` and a solution was found.

Inside the MRV loop, when `randomized=true`, shuffle the candidate value list via a tiny seeded RNG before iterating. Use mulberry32 (no deps, ~10 lines). Inline the RNG in `samuraiSolver.ts`.

### `gen/src/generator/grader_bridge.py` (extended)

Add:
```python
def grade_samurai(self, samurai_givens: list[str]) -> dict:
    payload = {"variant": "samurai", "samuraiGivens": samurai_givens}
    return self._send_and_recv(payload)

def solve_samurai_empty(self, seed: int) -> list[str]:
    payload = {"action": "solve_samurai_empty", "seed": seed}
    result = self._send_and_recv(payload)
    if not result.get("ok"):
        raise RuntimeError("samurai solve failed")
    return result["samuraiGivens"]
```

Refactor the existing `grade()` to delegate to `_send_and_recv` so both methods share the protocol path (timeout + restart + retry-once).

**Tunables:**
- `RESTART_EVERY` becomes a constructor parameter; default 3000 for classic, generator passes 1000 for samurai.
- New `grade_timeout_s: float = 60.0` constructor param. Implemented via a `threading.Timer` killing the subprocess if `readline()` hangs.

### `gen/src/generator/samurai_digger.py` (new)

```python
SHARED_CELL_MAP: dict[tuple[int, int, int], tuple[int, int, int]]
# Precomputed at module load from SAMURAI_LAYOUT mirror in Python.
# Keys/values: (gridIdx, r, c). center cell (1,1) maps to (1, 7, 7) [NW partner].
# Cells not in any overlap: not in the map.

def dig_samurai(
    solved: list[str],
    rng: Random,
    bridge: GraderBridge,
    max_removals: int,
    symmetry: str = "rotational",
) -> list[str]:
    state = list(solved)
    cells = [(g, r, c) for g in range(5) for r in range(9) for c in range(9)]
    rng.shuffle(cells)
    removed = 0
    for (g, r, c) in cells:
        if removed >= max_removals: break
        targets = _pair_rotational(g, r, c) if symmetry == "rotational" else [(g, r, c)]
        targets = _expand_to_shared(targets)
        if all(_cell_at(state, t) == "0" for t in targets): continue
        before = list(state)
        for t in targets: state[t[0]] = _set_cell(state[t[0]], t[1], t[2], "0")
        result = bridge.grade_samurai(state)
        if not result.get("ok") or not result.get("unique"):
            state = before
            continue
        removed += sum(1 for t in targets if _cell_at(before, t) != "0")
    return state

def _pair_rotational(g: int, r: int, c: int) -> list[tuple[int, int, int]]:
    pair = (g, 8 - r, 8 - c)
    return [(g, r, c)] if pair == (g, r, c) else [(g, r, c), pair]

def _expand_to_shared(cells: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    out: list[tuple[int, int, int]] = []
    seen: set[tuple[int, int, int]] = set()
    for cell in cells:
        if cell in seen: continue
        seen.add(cell)
        out.append(cell)
        partner = SHARED_CELL_MAP.get(cell)
        if partner is not None and partner not in seen:
            seen.add(partner)
            out.append(partner)
    return out
```

### `gen/src/generator/samurai.py` (new)

```python
# max_removals targets per band. Samurai has 405 cells total (5 × 81 minus
# 4 × 9 shared duplicates). Per-sub-grid givens roughly scale like classic
# 9×9 (very-easy ~40, diabolical ~17), so cruciform max_removals = 405 -
# (givens_per_sub × 5) approx. Empirically tuned during the starter run.
SAMURAI_DIFFICULTY_BANDS: dict[str, tuple[float, float, int]] = {
    "very-easy": (0.0, 1.4, 200),
    "easy":      (1.5, 2.4, 230),
    "medium":    (2.5, 3.9, 260),
    "hard":      (4.0, 5.9, 285),
    "tough":     (6.0, 6.4, 295),
    "expert":    (6.5, 7.9, 305),
    "diabolical":(8.0, 99.9,320),
}

def generate_samurai(
    count: int,
    difficulty: str,
    seed: int,
    bridge: GraderBridge,
    progress_every: int = 1,
) -> Iterator[GeneratedPuzzle]:
    if difficulty not in SAMURAI_DIFFICULTY_BANDS:
        raise ValueError(f"unknown samurai band: {difficulty}")
    se_lo, se_hi, max_removals = SAMURAI_DIFFICULTY_BANDS[difficulty]
    rng = Random(seed)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    emitted = 0
    attempts = 0
    consecutive_failures = 0
    while emitted < count:
        attempts += 1
        try:
            solved = bridge.solve_samurai_empty(seed=rng.randint(0, 2**31 - 1))
            dug = dig_samurai(solved, rng, bridge, max_removals)
            result = bridge.grade_samurai(dug)
        except RuntimeError as err:
            consecutive_failures += 1
            if consecutive_failures > 100:
                raise RuntimeError(f"100 consecutive bridge failures: {err}")
            continue
        consecutive_failures = 0
        if not result.get("ok") or not result.get("unique"): continue
        se = float(result["se"])
        if difficulty == "diabolical":
            if result.get("techniqueOnly"): continue
        else:
            if not result.get("techniqueOnly"): continue
        if se < se_lo or se > se_hi: continue
        emitted += 1
        if emitted % progress_every == 0 or emitted == count:
            print(
                f"  [samurai/{difficulty}] {emitted}/{count} "
                f"(attempts: {attempts}, accept: {emitted / attempts:.1%})",
                flush=True,
            )
        yield GeneratedPuzzle(
            id=f"samurai-{difficulty}-{seed}-{emitted:04d}",
            variant="samurai",
            size=9,
            givens="",
            samurai_givens=tuple(dug),
            difficulty=difficulty,
            se=se,
            hardest_tier=int(result["hardestTier"]),
            steps=int(result["steps"]),
            generated_at=timestamp,
        )
```

### `gen/src/generator/classic.py` — `GeneratedPuzzle` extension

Add field:
```python
samurai_givens: tuple[str, ...] | None = None
```

`to_dict()`:
```python
if self.samurai_givens is not None:
    out["samuraiGivens"] = list(self.samurai_givens)
```

For samurai records, `givens` is the empty string. Existing classic + variant generators don't set `samurai_givens` so they're unaffected.

### `gen/src/generator/registry.py`

```python
from .samurai import SAMURAI_DIFFICULTY_BANDS, generate_samurai
REGISTRY["samurai"] = generate_samurai
BANDS_BY_VARIANT["samurai"] = SAMURAI_DIFFICULTY_BANDS
```

### `gen/src/generator/cli.py` — CLI tolerance for samurai

The `gen` command currently passes a bridge and shape to each generator. Samurai doesn't need a shape (always 5 × 9×9). Existing call signature accepts `**kwargs` — verify and adjust if necessary so samurai-specific arguments slot in.

The `promote` command works unchanged: it reads JSONL and writes JSON arrays. Samurai records flow through verbatim.

### `gen/scripts/phase17_banks.sh` (new — starter)

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-starter.log

run() {
  local band=$1
  local seed=$2
  echo "=== samurai / $band (n=5 seed=$seed) ===" | tee -a logs/phase17-starter.log
  $PYTHON -u -m generator gen samurai -n 5 -d "$band" \
    --out "out/samurai/$band.jsonl" --seed "$seed" 2>&1 | tee -a logs/phase17-starter.log
}

run very-easy  30
run easy       31
run medium     32
run hard       33
run tough      34
run expert     35
run diabolical 36

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-starter.log

echo "PHASE17_STARTER_DONE" | tee -a logs/phase17-starter.log
```

### `gen/scripts/phase17_banks_followup.sh` (new — background)

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
export PATH="/c/Users/JeganGN/.bun/bin:$PATH"
export PYTHONPATH=src
PYTHON=.venv/bin/python

mkdir -p out/samurai logs
: > logs/phase17-followup.log

# Append to existing JSONLs from the starter run.
run() {
  local band=$1
  local n=$2
  local seed=$3
  echo "=== samurai / $band (n=$n seed=$seed) ===" | tee -a logs/phase17-followup.log
  $PYTHON -u -m generator gen samurai -n "$n" -d "$band" \
    --out "out/samurai/$band.jsonl" --append --seed "$seed" 2>&1 | tee -a logs/phase17-followup.log
}

# Targets minus starter (5 already in each).
run very-easy  45 40
run easy       45 41
run medium     45 42
run hard       25 43
run tough      15 44
run expert     10 45
run diabolical  5 46

$PYTHON -m generator promote --src out/samurai --dest ../src/puzzles/samurai 2>&1 | tee -a logs/phase17-followup.log

echo "PHASE17_FOLLOWUP_DONE" | tee -a logs/phase17-followup.log
```

Requires a new `--append` flag on `gen` that opens the output file in append mode rather than truncating. Existing `write_bank` always truncates — extend with `append: bool = False`.

### Bank files

After starter: `src/puzzles/samurai/{very-easy,easy,medium,hard,tough,expert,diabolical}.json` each contain 5 records.

The old hand-crafted `src/puzzles/samurai/easy.json` is overwritten by the starter's output.

After followup: same files contain 50/50/50/30/20/15/10 records.

### `e2e/samurai.spec.ts` — new cases

```ts
test('real bank puzzle shows visible given cells', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givens = await page.locator('[data-given="true"]').count()
  expect(givens).toBeGreaterThan(50)
})

test('given cell rejects user input', async ({ page }) => {
  await page.setViewportSize(LANDSCAPE)
  await page.goto(URL)
  await expect(page.getByTestId('samurai-board')).toBeVisible()
  const givenCell = page.locator('[data-given="true"]').first()
  const labelBefore = await givenCell.getAttribute('aria-label')
  await givenCell.click()
  await page.keyboard.press('9')
  await expect(givenCell).toHaveAttribute('aria-label', labelBefore!)
})
```

### Deliberately NOT components

- No Capacitor / iCloud work.
- No new variant-select UI (Phase 18).
- No `tools/grade.ts` protocol redesign — only additive.
- No Z3-py dependency.
- No engine changes beyond the randomization + solvedBoard fields on `samuraiBacktrackingSolve`.

## Data flow

### Single puzzle generation (one iteration of `generate_samurai`)

```
generate_samurai(count=5, difficulty='easy', seed=42, bridge)
  → rng = Random(42)
  → loop until emitted == count:
      • solved_seed = rng.randint(...)
      • solved = bridge.solve_samurai_empty(seed=solved_seed)
            (JSON over stdin → tools/grade.ts → samuraiBacktrackingSolve
             with randomized=true, seed=solved_seed → 5×81-char array)
      • dug = dig_samurai(solved, rng, bridge, max_removals)
            (iterative removal with uniqueness check via bridge.grade_samurai)
      • result = bridge.grade_samurai(dug)
            (returns ok, unique, se, hardestTier, steps, techniqueOnly)
      • filter: unique, band-matched SE, technique mode matches difficulty
      • emitted += 1; yield GeneratedPuzzle(...)
```

### End-to-end bank flow

```
phase17_banks.sh
  → python -m generator gen samurai -n 5 -d easy --out out/samurai/easy.jsonl --seed 30
       • write_bank appends JSON-per-line; flush per record (crash-safe)
  → ... repeat for each band ...
  → python -m generator promote --src out/samurai --dest src/puzzles/samurai
       • Each <band>.jsonl → <band>.json (single JSON array)
  → src/puzzles/samurai/<band>.json now contain real puzzles
  → Vite's import.meta.glob picks them up at module load
  → pickPuzzle('samurai', 'easy', seed) returns a generated record
  → Play.tsx → loadPuzzle({ samuraiGivens }) → cruciform renders
```

### Followup script

Appends to the same JSONL files (rather than truncating) so a long-running generation can be killed and resumed without losing prior emits. Each run promotes the cumulative JSONL into the runtime JSON.

## Error handling

### Bridge subprocess

- **Existing restart-on-pipe-drop pattern** preserved.
- **RESTART_EVERY** becomes a constructor parameter; samurai generator passes 1000 (down from 3000 default).
- **New per-call timeout** (`grade_timeout_s: float = 60.0`) via `threading.Timer` killing the subprocess if `readline()` hangs.

### Generator-level

- `unique=False` — common. Handled inside the digger, not propagated.
- `RuntimeError` from bridge — caught, attempt abandoned, counted. After 100 consecutive throws, generator raises.
- SE out of band — common at higher bands. Counted in progress log.
- Diabolical = `techniqueOnly === false`. Other bands require `techniqueOnly === true`.
- `solve_samurai_empty` returning `ok=False` — should be impossible for empty 9×9 samurai. If it happens, raise immediately.

### tools/grade.ts

- Malformed JSON payload → `{ ok: false, error: ... }`. Existing behavior.
- Samurai overlap consistency violation → `{ ok: false, error: 'overlap mismatch ...' }`.
- Solver iteration cap hit → `{ ok: false }`. Treated as failed attempt.

### Digger

- All targets already empty — skip.
- Removal would orphan a clue — the uniqueness check naturally rejects.
- Symmetry partner is the same cell (center cell at (4,4)) — handled by `_pair_rotational`.

### Bank packaging

- Empty JSONL → empty `[]` array. App throws `"empty bank"` at `pickPuzzle` — correct failure.
- Malformed JSONL line → `promote` raises with the bad line number. Manual fix required.
- Wrong `samuraiGivens` shape lands in JSON → caught by `assertRecord` at app module load. `bun run build` fails.

### Out of scope

- Network errors (no network).
- Cross-OS path quirks beyond what Phase 16 already handles.

## Testing

### Python (`gen/tests/`)

**`test_samurai.py` (new)**
- `_pair_rotational` returns the correct partner (incl. self-pair at (4,4)).
- `_expand_to_shared`: center cells in shared boxes expand to corner partners; non-shared cells unchanged.
- `dig_samurai` with a mock bridge that always returns `unique=True`: state shrinks ~max_removals after one pass.
- `dig_samurai` with a mock bridge that returns `unique=False`: no removal.
- `dig_samurai` symmetry: every removed non-center cell has its rotational partner also removed.
- `SAMURAI_DIFFICULTY_BANDS` covers all 7 user-facing labels.

**`test_samurai_integration.py` (new — `@pytest.mark.slow`)**
- `generate_samurai(count=1, difficulty='easy', seed=1, bridge=real)` produces 1 valid puzzle.

**`test_bridge.py` (extended)**
- `grade_samurai` round-trips a known-good fixture.
- `solve_samurai_empty(seed=1)` returns 5 strings of length 81; deterministic given seed.
- Malformed samurai payload (length 4) → `ok: false`.
- Overlap-mismatch samurai → `ok: false`.

### TypeScript

**`tools/grade.test.ts` (new)** — vitest config glob extended to `tools/**/*.test.ts`.
- Spawn the grader subprocess; send demo samurai payload; assert response shape.
- Send `solve_samurai_empty(seed=1)`; assert 5 × 81-char output.
- Send malformed (length-4) samurai; assert `ok: false`.
- Send overlap-mismatch samurai; assert `ok: false`.

**`src/engine/solver/samuraiSolver.test.ts` (extended)**
- Default (`randomized=false`): identical results across calls.
- `randomized=true, seed=1`: returns a valid solved board, deterministic across calls with same seed.
- `randomized=true, seed=1` vs `seed=2`: different boards.
- Solved board passes `samuraiConsistencyCheck` + `samuraiIsComplete`.

### Vitest regression

- All 60 existing test files green.
- `src/puzzles/samurai.test.ts` still passes after real banks replace the demo.
- The 9 existing e2e cases in `e2e/samurai.spec.ts` still pass against generated puzzles.

### e2e (`e2e/samurai.spec.ts` — 2 new cases)

- "real bank puzzle shows visible given cells" — >50 cells with `data-given="true"`.
- "given cell rejects user input" — tap-then-digit on a given cell is a no-op.

### Manual smoke (post-starter promotion)

- Confirm visible givens at `/play?variant=samurai&difficulty=easy`.
- Try other bands; confirm density looks right (fewer givens at higher SE).
- Confirm undo/redo end-to-end.

### Verification gate for 17c

- [ ] `bun run typecheck` clean.
- [ ] `bun run lint` clean.
- [ ] `bun run test:run` green (all engine + UI + puzzles + new grade.ts tests).
- [ ] `bun run build` succeeds.
- [ ] `python -m pytest gen/tests/ -q` green (slow tests skipped).
- [ ] `e2e/samurai.spec.ts` all 11 cases pass on iPad device profile.
- [ ] Starter bank generates 35 puzzles in under 15 minutes.
- [ ] Every starter bank file passes `samuraiConsistencyCheck` when loaded.

## Acceptance criteria

- [ ] `tools/grade.ts` accepts `variant: 'samurai'` and `action: 'solve_samurai_empty'`.
- [ ] `gen/src/generator/grader_bridge.py` exposes `grade_samurai` and `solve_samurai_empty`.
- [ ] `gen/src/generator/samurai.py` + `samurai_digger.py` exist and are registered in `registry.py`.
- [ ] `gen/scripts/phase17_banks.sh` runs end-to-end and promotes banks into `src/puzzles/samurai/`.
- [ ] `gen/scripts/phase17_banks_followup.sh` exists and supports `--append`.
- [ ] `src/puzzles/samurai/{very-easy,easy,medium,hard,tough,expert,diabolical}.json` exist with ≥5 records each.
- [ ] `src/engine/solver/samuraiSolver.ts` `SamuraiBacktrackOptions` gains `randomized?`, `seed?`; result gains `solvedBoard?`.
- [ ] All new vitest + Python + e2e tests green.
- [ ] typecheck, lint, build all clean.
- [ ] GOTCHAS entry committed.
