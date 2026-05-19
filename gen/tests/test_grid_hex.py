from __future__ import annotations

import pytest

from generator.grid import CLASSIC_16, grid_to_string, string_to_grid


def test_classic_16_shape():
    assert CLASSIC_16.size == 16
    assert CLASSIC_16.box_rows == 4
    assert CLASSIC_16.box_cols == 4


def test_grid_to_string_emits_hex_for_10_to_16():
    grid = [[0] * 16 for _ in range(16)]
    grid[0][0] = 10  # A
    grid[0][1] = 12  # C
    grid[0][2] = 16  # G
    grid[0][3] = 9
    s = grid_to_string(grid)
    assert s[0] == "A"
    assert s[1] == "C"
    assert s[2] == "G"
    assert s[3] == "9"
    assert len(s) == 256


def test_string_to_grid_parses_hex_at_size_16():
    s = "A" + "0" * 255
    g = string_to_grid(s, CLASSIC_16)
    assert g[0][0] == 10
    s2 = "G" + "0" * 255
    g2 = string_to_grid(s2, CLASSIC_16)
    assert g2[0][0] == 16
    s3 = "g" + "0" * 255
    g3 = string_to_grid(s3, CLASSIC_16)
    assert g3[0][0] == 16


def test_string_to_grid_rejects_out_of_range_hex():
    s = "H" + "0" * 255
    with pytest.raises(ValueError, match="H"):
        string_to_grid(s, CLASSIC_16)


def test_round_trip_at_size_16():
    grid = [[((r * 16 + c) % 16) + 1 for c in range(16)] for r in range(16)]
    s = grid_to_string(grid)
    back = string_to_grid(s, CLASSIC_16)
    assert back == grid


def test_string_to_grid_rejects_hex_letter_at_size_9():
    # Hex letters are only valid when shape.size > 9. On a 9x9 they must
    # fall through to the "invalid digit" path.
    from generator.grid import CLASSIC_9
    s = "A" + "0" * 80
    with pytest.raises(ValueError, match="A"):
        string_to_grid(s, CLASSIC_9)
