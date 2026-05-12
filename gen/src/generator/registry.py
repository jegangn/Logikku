"""Variant → generator function map. Phase 1 ships Classic only; later phases
register their generators here.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Iterator

from .anti_king import ANTI_KING_DIFFICULTY_BANDS, generate_anti_king
from .anti_knight import ANTI_KNIGHT_DIFFICULTY_BANDS, generate_anti_knight
from .classic import DIFFICULTY_BANDS as CLASSIC_BANDS
from .classic import GeneratedPuzzle, generate_classic
from .grader_bridge import GraderBridge
from .hyper import HYPER_DIFFICULTY_BANDS, generate_hyper
from .non_consecutive import (
    NON_CONSECUTIVE_DIFFICULTY_BANDS,
    generate_non_consecutive,
)
from .x_diagonal import X_DIFFICULTY_BANDS, generate_x_diagonal

GeneratorFn = Callable[..., Iterator[GeneratedPuzzle]]


REGISTRY: dict[str, GeneratorFn] = {
    "classic": generate_classic,
    "x-diagonal": generate_x_diagonal,
    "hyper": generate_hyper,
    "anti-knight": generate_anti_knight,
    "anti-king": generate_anti_king,
    "non-consecutive": generate_non_consecutive,
}


BANDS_BY_VARIANT: dict[str, dict[str, tuple[float, float, int]]] = {
    "classic": CLASSIC_BANDS,
    "x-diagonal": X_DIFFICULTY_BANDS,
    "hyper": HYPER_DIFFICULTY_BANDS,
    "anti-knight": ANTI_KNIGHT_DIFFICULTY_BANDS,
    "anti-king": ANTI_KING_DIFFICULTY_BANDS,
    "non-consecutive": NON_CONSECUTIVE_DIFFICULTY_BANDS,
}


def get_generator(variant: str) -> GeneratorFn:
    if variant not in REGISTRY:
        raise KeyError(f"variant '{variant}' has no generator registered yet")
    return REGISTRY[variant]


def bands_for(variant: str) -> dict[str, tuple[float, float, int]]:
    if variant not in BANDS_BY_VARIANT:
        raise KeyError(f"variant '{variant}' has no difficulty bands")
    return BANDS_BY_VARIANT[variant]


def list_variants() -> list[str]:
    return sorted(REGISTRY.keys())
