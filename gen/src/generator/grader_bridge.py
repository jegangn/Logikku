"""Long-running grader subprocess wrapping the TS engine.

Spawns `bun tools/grade.ts` once and communicates over stdin/stdout, so we
amortize Node startup cost across thousands of puzzles.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
BUN_PATH = Path(os.environ.get("USERPROFILE", os.path.expanduser("~"))) / ".bun" / "bin" / "bun.exe"
GRADE_SCRIPT = REPO_ROOT / "tools" / "grade.ts"


class GraderBridge:
    def __init__(
        self,
        bun: Path | str | None = None,
        script: Path | str | None = None,
        *,
        restart_every: int = 3000,
        grade_timeout_s: float = 60.0,
    ):
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
        self._call_count = 0
        self._restart_every = restart_every
        self._grade_timeout_s = grade_timeout_s

    def __enter__(self) -> "GraderBridge":
        self._spawn()
        return self

    def _spawn(self, *, max_attempts: int = 5) -> None:
        last_err: BaseException | None = None
        for i in range(max_attempts):
            try:
                self._proc = subprocess.Popen(
                    [str(self._bun), "run", str(self._script)],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    cwd=str(REPO_ROOT),
                    text=True,
                    bufsize=1,
                )
                self._call_count = 0
                return
            except OSError as err:
                last_err = err
                time.sleep(0.5 + 0.5 * i)
        raise RuntimeError(f"grader subprocess refused to spawn: {last_err}")

    def _restart(self) -> None:
        try:
            if self._proc:
                try:
                    if self._proc.stdin:
                        self._proc.stdin.close()
                except Exception:
                    pass
                try:
                    if self._proc.stdout:
                        self._proc.stdout.close()
                except Exception:
                    pass
                self._proc.kill()
                self._proc.wait(timeout=5)
        except Exception:
            pass
        self._proc = None
        # Give Windows a moment to release pipe handles before re-spawning.
        time.sleep(0.25)
        self._spawn()

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

    def _send_and_recv(self, payload: dict) -> dict:
        if not self._proc or not self._proc.stdin or not self._proc.stdout:
            raise RuntimeError("GraderBridge not entered")
        line = json.dumps(payload, separators=(",", ":")) + "\n"
        if self._call_count >= self._restart_every:
            print(
                f"grader: preemptive restart after {self._call_count} calls",
                file=sys.stderr,
                flush=True,
            )
            self._restart()
        watchdog: threading.Timer | None = None
        for attempt in range(2):
            try:
                if not self._proc or not self._proc.stdin or not self._proc.stdout:
                    raise RuntimeError("grader subprocess not running")
                # Arm the watchdog: if readline() hangs past the timeout, kill the
                # subprocess so we fall through to the restart-and-retry branch.
                proc_local = self._proc
                watchdog = threading.Timer(self._grade_timeout_s, lambda: proc_local.kill())
                watchdog.daemon = True
                watchdog.start()
                self._proc.stdin.write(line)
                self._proc.stdin.flush()
                out = self._proc.stdout.readline()
                watchdog.cancel()
                if not out:
                    raise RuntimeError("grader subprocess returned no data")
                self._call_count += 1
                return json.loads(out)
            except (OSError, RuntimeError) as err:
                if watchdog is not None:
                    watchdog.cancel()
                if attempt >= 1:
                    raise
                print(
                    f"grader subprocess died ({err}); restarting and retrying once",
                    file=sys.stderr,
                    flush=True,
                )
                self._restart()
        raise RuntimeError("unreachable")

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
        cages: list[dict] | None = None,
        little_killer_clues: list[dict] | None = None,
        sandwich_clues: list[dict] | None = None,
        skyscraper_clues: list[dict] | None = None,
        paths: list[dict] | None = None,
    ) -> dict:
        needs_json = (
            regions is not None
            or parity_mask is not None
            or edges is not None
            or thermometers is not None
            or arrows is not None
            or cages is not None
            or little_killer_clues is not None
            or sandwich_clues is not None
            or skyscraper_clues is not None
            or paths is not None
            or size is not None
        )
        if not needs_json:
            # Fast path: tab-separated for classic-shaped requests.
            if not self._proc or not self._proc.stdin or not self._proc.stdout:
                raise RuntimeError("GraderBridge not entered")
            line = f"{variant}\t{puzzle}\n"
            for attempt in range(2):
                try:
                    self._proc.stdin.write(line)
                    self._proc.stdin.flush()
                    out = self._proc.stdout.readline()
                    if not out:
                        raise RuntimeError("grader subprocess returned no data")
                    self._call_count += 1
                    return json.loads(out)
                except (OSError, RuntimeError) as err:
                    if attempt >= 1:
                        raise
                    print(
                        f"grader subprocess died ({err}); restarting and retrying once",
                        file=sys.stderr,
                        flush=True,
                    )
                    self._restart()
            raise RuntimeError("unreachable")
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
        if cages is not None:
            payload["cages"] = cages
        if little_killer_clues is not None:
            payload["littleKillerClues"] = little_killer_clues
        if sandwich_clues is not None:
            payload["sandwichClues"] = sandwich_clues
        if skyscraper_clues is not None:
            payload["skyscraperClues"] = skyscraper_clues
        if paths is not None:
            payload["paths"] = paths
        return self._send_and_recv(payload)

    def grade_samurai(self, samurai_givens: list[str]) -> dict:
        return self._send_and_recv({"variant": "samurai", "samuraiGivens": samurai_givens})

    def solve_samurai_empty(self, seed: int) -> list[str]:
        result = self._send_and_recv({"action": "solve_samurai_empty", "seed": seed})
        if not result.get("ok"):
            raise RuntimeError(f"samurai solve failed: {result}")
        givens = result.get("samuraiGivens")
        if not isinstance(givens, list) or len(givens) != 5:
            raise RuntimeError(f"samurai solve returned malformed payload: {result}")
        return givens
