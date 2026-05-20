"""Variant → generator function map. Phase 1 ships Classic only; later phases
register their generators here.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Iterator

from .anti_king import ANTI_KING_DIFFICULTY_BANDS, generate_anti_king
from .anti_knight import ANTI_KNIGHT_DIFFICULTY_BANDS, generate_anti_knight
from .arrow import ARROW_DIFFICULTY_BANDS, generate_arrow
from .classic import DIFFICULTY_BANDS as CLASSIC_BANDS
from .classic import GeneratedPuzzle, generate_classic
from .even_odd import EVEN_ODD_DIFFICULTY_BANDS, generate_even_odd
from .german_whispers import (
    GERMAN_WHISPERS_DIFFICULTY_BANDS,
    generate_german_whispers,
)
from .grader_bridge import GraderBridge
from .greater_than import GT_DIFFICULTY_BANDS, generate_greater_than
from .hyper import HYPER_DIFFICULTY_BANDS, generate_hyper
from .jigsaw import JIGSAW_DIFFICULTY_BANDS, generate_jigsaw
from .killer import KILLER_DIFFICULTY_BANDS, generate_killer
from .kropki import KROPKI_DIFFICULTY_BANDS, generate_kropki
from .little_killer import (
    LITTLE_KILLER_DIFFICULTY_BANDS,
    generate_little_killer,
)
from .mega import MEGA_DIFFICULTY_BANDS, generate_mega
from .mini import MINI_DIFFICULTY_BANDS, generate_mini
from .non_consecutive import (
    NON_CONSECUTIVE_DIFFICULTY_BANDS,
    generate_non_consecutive,
)
from .palindrome import PALINDROME_DIFFICULTY_BANDS, generate_palindrome
from .renban import RENBAN_DIFFICULTY_BANDS, generate_renban
from .samurai import SAMURAI_DIFFICULTY_BANDS, generate_samurai
from .sandwich import SANDWICH_DIFFICULTY_BANDS, generate_sandwich
from .skyscraper import SKYSCRAPER_DIFFICULTY_BANDS, generate_skyscraper
from .thermometer import THERMO_DIFFICULTY_BANDS, generate_thermometer
from .x_diagonal import X_DIFFICULTY_BANDS, generate_x_diagonal
from .xv import XV_DIFFICULTY_BANDS, generate_xv

GeneratorFn = Callable[..., Iterator[GeneratedPuzzle]]


REGISTRY: dict[str, GeneratorFn] = {
    "classic": generate_classic,
    "x-diagonal": generate_x_diagonal,
    "hyper": generate_hyper,
    "anti-knight": generate_anti_knight,
    "anti-king": generate_anti_king,
    "non-consecutive": generate_non_consecutive,
    "jigsaw": generate_jigsaw,
    "even-odd": generate_even_odd,
    "mini-6": generate_mini,
    "mega-16": generate_mega,
    "kropki": generate_kropki,
    "xv": generate_xv,
    "greater-than": generate_greater_than,
    "thermometer": generate_thermometer,
    "arrow": generate_arrow,
    "killer": generate_killer,
    "little-killer": generate_little_killer,
    "sandwich": generate_sandwich,
    "skyscraper": generate_skyscraper,
    "palindrome": generate_palindrome,
    "renban": generate_renban,
    "samurai": generate_samurai,
    "german-whispers": generate_german_whispers,
}


BANDS_BY_VARIANT: dict[str, dict[str, tuple[float, float, int]]] = {
    "classic": CLASSIC_BANDS,
    "x-diagonal": X_DIFFICULTY_BANDS,
    "hyper": HYPER_DIFFICULTY_BANDS,
    "anti-knight": ANTI_KNIGHT_DIFFICULTY_BANDS,
    "anti-king": ANTI_KING_DIFFICULTY_BANDS,
    "non-consecutive": NON_CONSECUTIVE_DIFFICULTY_BANDS,
    "jigsaw": JIGSAW_DIFFICULTY_BANDS,
    "even-odd": EVEN_ODD_DIFFICULTY_BANDS,
    "mini-6": MINI_DIFFICULTY_BANDS,
    "mega-16": MEGA_DIFFICULTY_BANDS,
    "kropki": KROPKI_DIFFICULTY_BANDS,
    "xv": XV_DIFFICULTY_BANDS,
    "greater-than": GT_DIFFICULTY_BANDS,
    "thermometer": THERMO_DIFFICULTY_BANDS,
    "arrow": ARROW_DIFFICULTY_BANDS,
    "killer": KILLER_DIFFICULTY_BANDS,
    "little-killer": LITTLE_KILLER_DIFFICULTY_BANDS,
    "sandwich": SANDWICH_DIFFICULTY_BANDS,
    "skyscraper": SKYSCRAPER_DIFFICULTY_BANDS,
    "palindrome": PALINDROME_DIFFICULTY_BANDS,
    "renban": RENBAN_DIFFICULTY_BANDS,
    "samurai": SAMURAI_DIFFICULTY_BANDS,
    "german-whispers": GERMAN_WHISPERS_DIFFICULTY_BANDS,
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
