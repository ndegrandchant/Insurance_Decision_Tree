#!/usr/bin/env python3
"""Generate a static viewer for the project's preserved source problems.

The viewer is intentionally generated from the authoritative ledger and
representation metadata, not hand-curated, so it can be regenerated after rulings
change.
"""

from __future__ import annotations

import ast
import html
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "conflicts_view.html"


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    raw = text[4:end].strip().splitlines()
    meta: dict[str, object] = {}
    for line in raw:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value in {"true", "false"}:
            parsed: object = value == "true"
        elif value.startswith("["):
            try:
                parsed = ast.literal_eval(value)
            except Exception:
                parsed = value
        else:
            parsed = value.strip('"')
        meta[key.strip()] = parsed
    return meta, text[end + 5 :]


def section(body: str, heading: str) -> str:
    pattern = rf"^## {re.escape(heading)}[^\n]*\n(?P<body>.*?)(?=^## |\Z)"
    match = re.search(pattern, body, flags=re.M | re.S)
    return match.group("body").strip() if match else ""


def first_heading(body: str) -> str:
    match = re.search(r"^#\s+(.+)$", body, flags=re.M)
    return match.group(1).strip() if match else "(untitled)"


def build_ruling_items() -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for path in sorted((ROOT / "crawlable" / "rulings").glob("RUL-*.md")):
        text = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        rel = path.relative_to(ROOT).as_posix()
        title = first_heading(body)
        item = {
            "id": meta.get("id", path.stem),
            "status": meta.get("status", "unknown"),
            "kind": meta.get("kind", "unknown"),
            "blocking": bool(meta.get("blocking", False)),
            "raised_by": meta.get("raised_by", []),
            "source": meta.get("source", ""),
            "title": title,
            "conflict": section(body, "Conflict"),
            "variants": section(body, "Source variants") or section(body, "Source variant"),
            "behaviour": section(body, "Behaviour"),
            "interaction": section(body, "Interaction worth noting (cross-process)"),
            "recommended": section(body, "Recommended resolution"),
            "file": rel,
            "category": "ledger",
        }
        items.append(item)
    return items


def build_structural_items() -> list[dict[str, object]]:
    doc_path = ROOT / "representation" / "underwriting_manual" / "document.json"
    data = json.loads(doc_path.read_text(encoding="utf-8"))
    items: list[dict[str, object]] = []
    for inc in data.get("structural_inconsistencies", []):
        detail = inc.get("detail", "")
        additional = inc.get("additional")
        if additional:
            detail = f"{detail}\n\nAdditional: {additional}"
        items.append(
            {
                "id": inc.get("id", "INC-MAN"),
                "status": "recorded",
                "kind": inc.get("type", "structural_inconsistency"),
                "blocking": False,
                "raised_by": ["representation/underwriting_manual/document.json"],
                "source": "representation/underwriting_manual/document.json → structural_inconsistencies",
                "title": f"{inc.get('id', 'INC-MAN')} — {inc.get('type', 'structural inconsistency')}",
                "conflict": detail,
                "variants": "",
                "behaviour": "",
                "interaction": "",
                "recommended": "Recorded in Part 1 as a source/document defect; not resolved in the representation.",
                "file": "representation/underwriting_manual/document.json",
                "category": "structural",
            }
        )
    return items


def js_string(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def esc(value: object) -> str:
    if isinstance(value, (list, tuple)):
        value = ", ".join(str(v) for v in value)
    return html.escape(str(value))


def render_item(item: dict[str, object]) -> str:
    fields = [
        ("Raised by", item["raised_by"]),
        ("Source", item["source"]),
        ("File", item["file"]),
    ]
    optional_sections = [
        ("Conflict", item.get("conflict", "")),
        ("Source Variants", item.get("variants", "")),
        ("Behavior", item.get("behaviour", "")),
        ("Interaction", item.get("interaction", "")),
        ("Recommended Resolution", item.get("recommended", "")),
    ]
    meta_rows = "\n".join(
        f"<div><span>{esc(label)}</span><p>{esc(value)}</p></div>" for label, value in fields if value
    )
    sections = "\n".join(
        f"<section><h3>{esc(label)}</h3><pre>{esc(value)}</pre></section>"
        for label, value in optional_sections
        if value
    )
    blocking = "<strong class=\"blocking\">blocking</strong>" if item.get("blocking") else ""
    return f"""
    <article class="card" data-kind="{esc(item['kind'])}" data-status="{esc(item['status'])}" data-category="{esc(item['category'])}" data-search="{esc(json.dumps(item, ensure_ascii=False).lower())}">
      <div class="card-top">
        <div>
          <p class="eyebrow">{esc(item['category'])}</p>
          <h2>{esc(item['title'])}</h2>
        </div>
        <div class="badges">
          <span>{esc(item['status'])}</span>
          <span>{esc(item['kind'])}</span>
          {blocking}
        </div>
      </div>
      <div class="meta">{meta_rows}</div>
      <div class="sections">{sections}</div>
    </article>
    """


def build_html(items: list[dict[str, object]]) -> str:
    counts = Counter(str(item["kind"]) for item in items)
    categories = Counter(str(item["category"]) for item in items)
    kinds = sorted(counts)
    statuses = sorted({str(item["status"]) for item in items})
    cards = "\n".join(render_item(item) for item in items)
    kind_options = "\n".join(f'<option value="{esc(kind)}">{esc(kind)} ({counts[kind]})</option>' for kind in kinds)
    status_options = "\n".join(f'<option value="{esc(status)}">{esc(status)}</option>' for status in statuses)
    category_pills = " ".join(f"<span>{esc(cat)}: {num}</span>" for cat, num in sorted(categories.items()))
    kind_pills = " ".join(f"<span>{esc(kind)}: {num}</span>" for kind, num in counts.most_common())

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LBC Automotores — Source Problems Viewer</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #1c2329;
      --muted: #5b6874;
      --line: #d7dde2;
      --paper: #fbfcfd;
      --panel: #ffffff;
      --accent: #0f766e;
      --warn: #9f1239;
      --soft: #eef6f5;
      --chip: #f1f4f7;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
    }}
    header {{
      padding: 28px clamp(18px, 4vw, 48px) 18px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }}
    h1 {{ margin: 0 0 8px; font-size: clamp(28px, 4vw, 44px); letter-spacing: 0; }}
    header p {{ max-width: 980px; color: var(--muted); margin: 0; }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      padding: 18px clamp(18px, 4vw, 48px);
    }}
    .metric {{
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 14px;
      border-radius: 8px;
    }}
    .metric strong {{ display: block; font-size: 28px; }}
    .metric span {{ color: var(--muted); }}
    .controls {{
      position: sticky;
      top: 0;
      z-index: 3;
      display: grid;
      grid-template-columns: minmax(200px, 1fr) 220px 220px;
      gap: 10px;
      padding: 14px clamp(18px, 4vw, 48px);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: rgba(251,252,253,.96);
      backdrop-filter: blur(8px);
    }}
    input, select {{
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 10px 12px;
      font: inherit;
      background: #fff;
      color: var(--ink);
    }}
    .pills {{
      padding: 0 clamp(18px, 4vw, 48px) 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .pills span {{
      background: var(--chip);
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 10px;
      white-space: nowrap;
    }}
    main {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
      gap: 14px;
      padding: 0 clamp(18px, 4vw, 48px) 42px;
    }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
    }}
    .card-top {{
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }}
    .eyebrow {{
      margin: 0 0 4px;
      color: var(--accent);
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 700;
    }}
    h2 {{
      margin: 0;
      font-size: 18px;
      line-height: 1.25;
      letter-spacing: 0;
    }}
    .badges {{
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
      min-width: 120px;
    }}
    .badges span, .badges strong {{
      background: var(--soft);
      color: var(--accent);
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }}
    .badges .blocking {{ background: #fff1f2; color: var(--warn); }}
    .meta {{
      display: grid;
      gap: 7px;
      margin: 13px 0;
      padding: 10px 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }}
    .meta div {{ display: grid; grid-template-columns: 90px 1fr; gap: 10px; }}
    .meta span {{ color: var(--muted); font-size: 12px; text-transform: uppercase; font-weight: 700; }}
    .meta p {{ margin: 0; color: var(--ink); overflow-wrap: anywhere; }}
    section {{ margin-top: 12px; }}
    h3 {{ margin: 0 0 6px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0; }}
    pre {{
      margin: 0;
      padding: 10px;
      border-radius: 7px;
      background: #f6f8fa;
      border: 1px solid #e8edf2;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }}
    .hidden {{ display: none; }}
    @media (max-width: 760px) {{
      .controls {{ grid-template-columns: 1fr; position: static; }}
      .card-top {{ display: block; }}
      .badges {{ justify-content: flex-start; margin-top: 10px; }}
      .meta div {{ grid-template-columns: 1fr; gap: 2px; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>Source Problems Viewer</h1>
    <p>Generated from <code>crawlable/rulings/*.md</code> plus manual structural inconsistencies in <code>representation/underwriting_manual/document.json</code>. Open rulings are not resolved here; this view shows what the project preserves and escalates.</p>
  </header>
  <div class="summary">
    <div class="metric"><strong>{len(items)}</strong><span>total displayed items</span></div>
    <div class="metric"><strong>{categories.get('ledger', 0)}</strong><span>open ruling-ledger items</span></div>
    <div class="metric"><strong>{categories.get('structural', 0)}</strong><span>manual structural/source defects</span></div>
    <div class="metric"><strong>{sum(1 for item in items if item.get('blocking'))}</strong><span>blocking conflict nodes</span></div>
  </div>
  <div class="pills">{category_pills}</div>
  <div class="pills">{kind_pills}</div>
  <div class="controls">
    <input id="search" placeholder="Search id, title, source text, file...">
    <select id="kind"><option value="">All kinds</option>{kind_options}</select>
    <select id="status"><option value="">All statuses</option>{status_options}</select>
  </div>
  <main id="cards">{cards}</main>
  <script>
    const search = document.querySelector("#search");
    const kind = document.querySelector("#kind");
    const status = document.querySelector("#status");
    const cards = [...document.querySelectorAll(".card")];
    function filterCards() {{
      const q = search.value.trim().toLowerCase();
      const k = kind.value;
      const s = status.value;
      for (const card of cards) {{
        const okSearch = !q || card.dataset.search.includes(q);
        const okKind = !k || card.dataset.kind === k;
        const okStatus = !s || card.dataset.status === s;
        card.classList.toggle("hidden", !(okSearch && okKind && okStatus));
      }}
    }}
    search.addEventListener("input", filterCards);
    kind.addEventListener("change", filterCards);
    status.addEventListener("change", filterCards);
  </script>
</body>
</html>
"""


def main() -> None:
    items = build_ruling_items() + build_structural_items()
    OUT.write_text(build_html(items), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} with {len(items)} items")


if __name__ == "__main__":
    main()
