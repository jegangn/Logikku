from generator.grid import CLASSIC_9, grid_to_string, peers_of, string_to_grid


def test_peers_of_center_returns_20_unique_cells():
    peers = peers_of(4, 4, CLASSIC_9)
    assert len(peers) == 20
    assert len(set(peers)) == 20
    assert (4, 4) not in peers


def test_string_round_trip():
    s = "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
    grid = string_to_grid(s, CLASSIC_9)
    assert grid_to_string(grid) == s
    assert grid[0][0] == 5
    assert grid[0][2] == 0


def test_string_rejects_wrong_length():
    import pytest

    with pytest.raises(ValueError):
        string_to_grid("123", CLASSIC_9)
