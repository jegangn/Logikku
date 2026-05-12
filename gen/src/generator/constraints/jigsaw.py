"""Polyomino partition for Jigsaw Sudoku.

Start with the classic 3x3 box partition (always valid) and apply random
boundary swaps that preserve each piece's size and contiguity. Reliable and
produces visibly-irregular pieces after enough swaps.
"""

from __future__ import annotations

import random

from ..grid import Shape

NEIGHBOURS: tuple[tuple[int, int], ...] = ((-1, 0), (1, 0), (0, -1), (0, 1))


def _frontier(
    piece: set[tuple[int, int]],
    assigned: set[tuple[int, int]],
    shape: Shape,
) -> list[tuple[int, int]]:
    n = shape.size
    out: set[tuple[int, int]] = set()
    for r, c in piece:
        for dr, dc in NEIGHBOURS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in assigned:
                out.add((nr, nc))
    return sorted(out)


def _is_contiguous(piece: set[tuple[int, int]]) -> bool:
    if not piece:
        return False
    seed = next(iter(piece))
    visited: set[tuple[int, int]] = set()
    stack = [seed]
    while stack:
        cell = stack.pop()
        if cell in visited:
            continue
        visited.add(cell)
        r, c = cell
        for dr, dc in NEIGHBOURS:
            n = (r + dr, c + dc)
            if n in piece and n not in visited:
                stack.append(n)
    return visited == piece


def _classic_box_partition(shape: Shape) -> list[set[tuple[int, int]]]:
    pieces: list[set[tuple[int, int]]] = []
    for br in range(0, shape.size, shape.box_rows):
        for bc in range(0, shape.size, shape.box_cols):
            piece = {
                (r, c)
                for r in range(br, br + shape.box_rows)
                for c in range(bc, bc + shape.box_cols)
            }
            pieces.append(piece)
    return pieces


def _try_boundary_swap(
    pieces: list[set[tuple[int, int]]],
    cell_to_piece: dict[tuple[int, int], int],
    rng: random.Random,
    shape: Shape,
) -> bool:
    """Attempt a single random size-preserving swap between two pieces.
    Returns True if a swap was applied."""
    n = shape.size
    # Collect boundary cells: a cell is on the boundary if it has a neighbour
    # in a different piece.
    boundary: list[tuple[int, int]] = []
    for r in range(n):
        for c in range(n):
            p = cell_to_piece[(r, c)]
            for dr, dc in NEIGHBOURS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n and cell_to_piece[(nr, nc)] != p:
                    boundary.append((r, c))
                    break
    rng.shuffle(boundary)
    for x in boundary:
        px = cell_to_piece[x]
        # Try moving x to a neighbouring piece py, balancing by moving some
        # boundary cell y of py back to px.
        neighbour_pieces: set[int] = set()
        xr, xc = x
        for dr, dc in NEIGHBOURS:
            nr, nc = xr + dr, xc + dc
            if 0 <= nr < n and 0 <= nc < n:
                npiece = cell_to_piece[(nr, nc)]
                if npiece != px:
                    neighbour_pieces.add(npiece)
        for py in neighbour_pieces:
            # Candidate y cells: in py, adjacent to a cell in px (other than x).
            candidates_y: list[tuple[int, int]] = []
            for y in pieces[py]:
                if y == x:
                    continue
                yr, yc = y
                for dr, dc in NEIGHBOURS:
                    nr, nc = yr + dr, yc + dc
                    if 0 <= nr < n and 0 <= nc < n and cell_to_piece[(nr, nc)] == px:
                        candidates_y.append(y)
                        break
            rng.shuffle(candidates_y)
            for y in candidates_y:
                # Apply swap tentatively.
                pieces[px].remove(x)
                pieces[px].add(y)
                pieces[py].remove(y)
                pieces[py].add(x)
                if _is_contiguous(pieces[px]) and _is_contiguous(pieces[py]):
                    cell_to_piece[x] = py
                    cell_to_piece[y] = px
                    return True
                # Revert.
                pieces[px].add(x)
                pieces[px].discard(y)
                pieces[py].add(y)
                pieces[py].discard(x)
    return False


def random_polyomino_partition(
    shape: Shape, rng: random.Random, swap_count: int = 80
) -> list[list[tuple[int, int]]]:
    """Return a 9-piece jigsaw partition. Starts from the classic 3x3 box
    partition and applies `swap_count` random boundary swaps. Always succeeds
    because each swap is rejected (and another tried) if it would break
    contiguity, but the base classic partition is itself valid."""
    pieces = _classic_box_partition(shape)
    cell_to_piece: dict[tuple[int, int], int] = {}
    for i, piece in enumerate(pieces):
        for cell in piece:
            cell_to_piece[cell] = i
    applied = 0
    safety = swap_count * 20
    while applied < swap_count and safety > 0:
        safety -= 1
        if _try_boundary_swap(pieces, cell_to_piece, rng, shape):
            applied += 1
    return [sorted(p) for p in pieces]


def regions_from_partition(
    partition: list[list[tuple[int, int]]],
) -> list[frozenset[tuple[int, int]]]:
    return [frozenset(piece) for piece in partition]


def partition_to_flat(
    partition: list[list[tuple[int, int]]], size: int
) -> list[list[int]]:
    """Convert [(r,c), ...] pieces to flat indices for serialisation."""
    return [[r * size + c for r, c in piece] for piece in partition]
