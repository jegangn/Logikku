"""Click CLI entrypoint."""

from __future__ import annotations

import json
from pathlib import Path

import click

from .classic import DIFFICULTY_BANDS, write_bank
from .grader_bridge import GraderBridge
from .registry import bands_for, get_generator, list_variants


@click.group()
def cli() -> None:
    """Logikku puzzle generator."""


@cli.command()
@click.argument("variant")
@click.option("--count", "-n", type=int, required=True, help="Puzzles per band.")
@click.option(
    "--difficulty",
    "-d",
    type=click.Choice(sorted(DIFFICULTY_BANDS.keys())),
    help="Single difficulty band; omit with --all.",
)
@click.option("--all", "all_bands", is_flag=True, help="Generate all 5 bands.")
@click.option("--seed", "-s", type=int, default=42)
@click.option("--out", type=click.Path(path_type=Path), help="Output JSONL file (single band).")
@click.option(
    "--out-dir",
    type=click.Path(path_type=Path),
    help="Output directory (used with --all).",
)
@click.option(
    "--append",
    is_flag=True,
    help="Append to existing JSONL output instead of truncating.",
)
def gen(
    variant: str,
    count: int,
    difficulty: str | None,
    all_bands: bool,
    seed: int,
    out: Path | None,
    out_dir: Path | None,
    append: bool,
) -> None:
    """Generate puzzles for a variant."""
    if variant not in list_variants():
        raise click.UsageError(f"variant '{variant}' has no generator (have: {list_variants()})")
    generator = get_generator(variant)

    if all_bands:
        if not out_dir:
            raise click.UsageError("--all requires --out-dir")
        bands = sorted(bands_for(variant).keys())
        with GraderBridge() as grader:
            total = 0
            for band in bands:
                click.echo(f"== {variant}/{band} ==")
                path = out_dir / f"{band}.jsonl"
                emitted = write_bank(
                    path,
                    generator(
                        count=count,
                        difficulty=band,
                        seed=seed,
                        grader=grader,
                    ),
                    append=append,
                )
                click.echo(f"  wrote {emitted} -> {path}")
                total += emitted
        click.echo(f"Total: {total} puzzles across {len(bands)} bands.")
        return

    if not difficulty:
        raise click.UsageError("either --difficulty or --all is required")
    if not out:
        raise click.UsageError("--out is required when not using --all")
    with GraderBridge() as grader:
        emitted = write_bank(
            out,
            generator(count=count, difficulty=difficulty, seed=seed, grader=grader),
            append=append,
        )
    click.echo(f"wrote {emitted} -> {out}")


@cli.command()
@click.option(
    "--src",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    required=True,
    help="Source directory containing JSONL banks (e.g. gen/out/classic).",
)
@click.option(
    "--dest",
    type=click.Path(file_okay=False, path_type=Path),
    required=True,
    help="Destination directory for JSON arrays (e.g. src/puzzles/classic).",
)
def promote(src: Path, dest: Path) -> None:
    """Convert JSONL banks to JSON arrays in the app's src/puzzles/."""
    dest.mkdir(parents=True, exist_ok=True)
    total = 0
    for jsonl_path in sorted(src.glob("*.jsonl")):
        items: list[dict] = []
        with jsonl_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                items.append(json.loads(line))
        json_path = dest / f"{jsonl_path.stem}.json"
        with json_path.open("w", encoding="utf-8", newline="\n") as f:
            json.dump(items, f, separators=(",", ":"))
            f.write("\n")
        click.echo(f"promoted {len(items):4d} -> {json_path}")
        total += len(items)
    click.echo(f"Total: {total} puzzles.")


if __name__ == "__main__":
    cli()
