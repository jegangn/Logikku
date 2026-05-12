"""Variant constraint region definitions for the offline generator.

Each module here exposes a function returning `extra_regions`: a list of
frozensets of (r, c) coordinates. The solver consults these on top of the
classic row/col/box peer set when filling and uniqueness-checking grids.
"""
