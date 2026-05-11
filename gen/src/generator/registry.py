"""Variant → generator function map. Phase 1 ships Classic only; later phases
register their generators here.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Iterator

from .classic import GeneratedPuzzle, generate_classic
from .grader_bridge import GraderBridge

GeneratorFn = Callable[..., Iterator[GeneratedPuzzle]]


REGISTRY: dict[str, GeneratorFn] = {
    "classic": generate_classic,
}


def get_generator(variant: str) -> GeneratorFn:
    if variant not in REGISTRY:
        raise KeyError(f"variant '{variant}' has no generator registered yet")
    return REGISTRY[variant]


def list_variants() -> list[str]:
    return sorted(REGISTRY.keys())
