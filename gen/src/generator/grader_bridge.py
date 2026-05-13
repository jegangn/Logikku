"""Long-running grader subprocess wrapping the TS engine.

Spawns `bun tools/grade.ts` once and communicates over stdin/stdout, so we
amortize Node startup cost across thousands of puzzles.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
BUN_PATH = Path(os.environ.get("USERPROFILE", os.path.expanduser("~"))) / ".bun" / "bin" / "bun.exe"
GRADE_SCRIPT = REPO_ROOT / "tools" / "grade.ts"


class GraderBridge:
    def __init__(self, bun: Path | str | None = None, script: Path | str | None = None):
        self._bun = Path(bun) if bun else BUN_PATH
        self._script = Path(script) if script else GRADE_SCRIPT
        if not self._bun.exists():
            for cand in ("bun", "bun.exe"):
                from shutil import which
                p = which(cand)
                if p:
                    self._bun = Path(p)
                    break
        if not self._bun.exists():
            raise FileNotFoundError(f"bun not found at {self._bun}")
        if not self._script.exists():
            raise FileNotFoundError(f"grade.ts not found at {self._script}")
        self._proc: subprocess.Popen[str] | None = None

    def __enter__(self) -> "GraderBridge":
        self._proc = subprocess.Popen(
            [str(self._bun), "run", str(self._script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=sys.stderr,
            cwd=str(REPO_ROOT),
            text=True,
            bufsize=1,
        )
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def close(self) -> None:
        if self._proc and self._proc.poll() is None:
            try:
                if self._proc.stdin:
                    self._proc.stdin.close()
            except Exception:
                pass
            try:
                self._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._proc.kill()

    def grade(
        self,
        puzzle: str,
        variant: str = "classic",
        *,
        size: int | None = None,
        regions: list[list[int]] | None = None,
        parity_mask: str | None = None,
        edges: list[dict] | None = None,
        thermometers: list[dict] | None = None,
        arrows: list[dict] | None = None,
    ) -> dict:
        if not self._proc or not self._proc.stdin or not self._proc.stdout:
            raise RuntimeError("GraderBridge not entered")
        needs_json = (
            regions is not None
            or parity_mask is not None
            or edges is not None
            or thermometers is not None
            or arrows is not None
            or size is not None
        )
        if needs_json:
            payload: dict = {"variant": variant, "puzzle": puzzle}
            if size is not None:
                payload["size"] = size
            if regions is not None:
                payload["regions"] = regions
            if parity_mask is not None:
                payload["parityMask"] = parity_mask
            if edges is not None:
                payload["edges"] = edges
            if thermometers is not None:
                payload["thermometers"] = thermometers
            if arrows is not None:
                payload["arrows"] = arrows
            self._proc.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
        else:
            self._proc.stdin.write(f"{variant}\t{puzzle}\n")
        self._proc.stdin.flush()
        line = self._proc.stdout.readline()
        if not line:
            raise RuntimeError("grader subprocess returned no data")
        return json.loads(line)
