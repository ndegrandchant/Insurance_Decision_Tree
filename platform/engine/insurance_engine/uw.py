import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Optional

from .catalog import engine_spec
from .paths import CRAWLABLE_ROOT, REPO_ROOT

CRAWLER_DIR = CRAWLABLE_ROOT / "crawler"
if str(CRAWLER_DIR) not in sys.path:
    sys.path.insert(0, str(CRAWLER_DIR))

from crawl import Crawler  # type: ignore  # verified local engine, not a fork


class UWEngine:
    """Adapter over crawlable/crawler/crawl.py.

    The platform owns orchestration and presentation only. This class deliberately
    delegates execution to the existing crawler so API semantics match the repo.
    """

    def __init__(self) -> None:
        self.spec = engine_spec("uw")
        self._crawler = Crawler()

    def run(self, facts: dict[str, Any], start: Optional[str] = None) -> dict[str, Any]:
        if not isinstance(facts, dict):
            raise TypeError("Los hechos de suscripción deben ser un objeto indexado por los ids de crawlable/facts.json")
        return self._crawler.crawl(facts, start=start or "root.process_router")

    def facts(self) -> dict[str, Any]:
        return json.loads(self.spec.facts_path.read_text(encoding="utf-8"))["facts"]

    def nodes(self) -> dict[str, Any]:
        return self._crawler.nodes

    def validate(self) -> dict[str, Any]:
        proc = subprocess.run(
            [sys.executable, str(self.spec.validator_path)],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        return {
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }

    def run_demo_cases(self) -> dict[str, Any]:
        proc = subprocess.run(
            [sys.executable, str(CRAWLABLE_ROOT / "crawler" / "run_cases.py")],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        return {
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }
