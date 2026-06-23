from __future__ import annotations

import os
import time

from . import services


def main() -> None:
    interval = int(os.environ.get("FOLLOWUP_SCHEDULER_INTERVAL_SECONDS", "300"))
    print(f"followup scheduler started; interval={interval}s", flush=True)
    while True:
        try:
            result = services.run_followup_scheduler(role="system")
            print(
                f"followup scheduler run: created={result.get('created_count')} due={len(result.get('due') or [])}",
                flush=True,
            )
        except Exception as exc:  # keep the worker alive; failures are visible in container logs.
            print(f"followup scheduler error: {exc}", flush=True)
        time.sleep(max(30, interval))


if __name__ == "__main__":
    main()
