from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Shape:
    size: int
    box_rows: int
    box_cols: int


CLASSIC_9 = Shape(size=9, box_rows=3, box_cols=3)
CLASSIC_6 = Shape(size=6, box_rows=2, box_cols=3)
CLASSIC_16 = Shape(size=16, box_rows=4, box_cols=4)


ExtraRegions = list[frozenset[tuple[int, int]]]
Offsets = list[tuple[int, int]]
ThermoPath = list[tuple[int, int]]
ThermoPaths = list[ThermoPath]


def peers_of(
    r: int,
    c: int,
    shape: Shape,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    use_classic_box: bool = True,
) -> list[tuple[int, int]]:
    n = shape.size
    out: set[tuple[int, int]] = set()
    for cc in range(n):
        if cc != c:
            out.add((r, cc))
    for rr in range(n):
        if rr != r:
            out.add((rr, c))
    if use_classic_box:
        br = (r // shape.box_rows) * shape.box_rows
        bc = (c // shape.box_cols) * shape.box_cols
        for rr in range(br, br + shape.box_rows):
            for cc in range(bc, bc + shape.box_cols):
                if (rr, cc) != (r, c):
                    out.add((rr, cc))
    if extra_regions:
        for region in extra_regions:
            if (r, c) not in region:
                continue
            for pr, pc in region:
                if (pr, pc) != (r, c):
                    out.add((pr, pc))
    if extra_same_offsets:
        for dr, dc in extra_same_offsets:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) != (r, c):
                out.add((nr, nc))
    return sorted(out)


ORTHOGONAL_NEIGHBOURS: tuple[tuple[int, int], ...] = (
    (-1, 0),
    (1, 0),
    (0, -1),
    (0, 1),
)


def orthogonal_neighbours(
    r: int, c: int, shape: Shape
) -> list[tuple[int, int]]:
    n = shape.size
    out: list[tuple[int, int]] = []
    for dr, dc in ORTHOGONAL_NEIGHBOURS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < n and 0 <= nc < n:
            out.append((nr, nc))
    return out


def empty_grid(shape: Shape) -> list[list[int]]:
    return [[0] * shape.size for _ in range(shape.size)]


def grid_to_string(grid: list[list[int]]) -> str:
    out: list[str] = []
    for row in grid:
        for v in row:
            if v == 0:
                out.append("0")
            elif v <= 9:
                out.append(str(v))
            else:
                # 10..16 -> 'A'..'G' (mirrors TS serializePuzzle)
                out.append(chr(55 + v))
    return "".join(out)


def string_to_grid(s: str, shape: Shape) -> list[list[int]]:
    if len(s) != shape.size * shape.size:
        raise ValueError(
            f"puzzle string length {len(s)} != expected {shape.size * shape.size}"
        )
    grid = empty_grid(shape)
    for i, ch in enumerate(s):
        if ch in "0.":
            continue
        code = ord(ch)
        if 49 <= code <= 57:  # '1'..'9'
            digit = code - 48
        elif shape.size > 9 and 65 <= code <= 90:  # 'A'..'Z'
            digit = code - 55
        elif shape.size > 9 and 97 <= code <= 122:  # 'a'..'z'
            digit = code - 87
        else:
            raise ValueError(f"invalid digit '{ch}' at index {i}")
        if digit < 1 or digit > shape.size:
            raise ValueError(f"'{ch}' (digit {digit}) out of range 1..{shape.size} at index {i}")
        grid[i // shape.size][i % shape.size] = digit
    return grid


def initial_candidates(
    grid: list[list[int]],
    shape: Shape,
    extra_regions: ExtraRegions | None = None,
    extra_same_offsets: Offsets | None = None,
    non_consecutive: bool = False,
    use_classic_box: bool = True,
    thermometers: ThermoPaths | None = None,
) -> list[list[set[int]]]:
    n = shape.size
    cands = [[set(range(1, n + 1)) for _ in range(n)] for _ in range(n)]
    if thermometers:
        # Cell at position k of a length-L path must be in [k+1, n-(L-1-k)].
        # If the same cell appears in multiple thermos (unusual but legal),
        # intersect the bounds.
        for path in thermometers:
            L = len(path)
            for k, (r, c) in enumerate(path):
                lo = k + 1
                hi = n - (L - 1 - k)
                allowed = set(range(lo, hi + 1))
                cands[r][c] &= allowed
    for r in range(n):
        for c in range(n):
            v = grid[r][c]
            if v != 0:
                cands[r][c] = set()
                for pr, pc in peers_of(
                    r,
                    c,
                    shape,
                    extra_regions,
                    extra_same_offsets,
                    use_classic_box=use_classic_box,
                ):
                    cands[pr][pc].discard(v)
                if non_consecutive:
                    for nr, nc in orthogonal_neighbours(r, c, shape):
                        if 1 <= v - 1:
                            cands[nr][nc].discard(v - 1)
                        if v + 1 <= n:
                            cands[nr][nc].discard(v + 1)
    return cands


def thermo_index(
    thermometers: ThermoPaths,
) -> dict[tuple[int, int], list[tuple[int, int]]]:
    """For each cell, list of (path_index, position_in_path) entries."""
    idx: dict[tuple[int, int], list[tuple[int, int]]] = {}
    for pi, path in enumerate(thermometers):
        for k, (r, c) in enumerate(path):
            idx.setdefault((r, c), []).append((pi, k))
    return idx
