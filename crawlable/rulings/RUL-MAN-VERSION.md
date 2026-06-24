---
id: RUL-MAN-VERSION
status: open
kind: version_identity
raised_by: ["all manual-sourced nodes and tables (_doc_conflicts)"]
source: representation/underwriting_manual/document.json → version_identity
---

# RUL-MAN-VERSION — Manual version identity (3.0 vs 4.0)

## Conflict
The manual states two different version numbers. Every node/table compiled from the manual
stamps `source.version: "3.0"` because that is what is literally printed on the page the
quote is read from; this ledger entry holds the discrepancy so "3.0" is never mistaken for a
settled fact.

## Source variants (verbatim)
- **"4.0"** — `cover_verbatim`: "VERSIÓN 4.0"; `change_table_verbatim`: "VERSIÓN: 4.0".
- **"3.0"** — `document_info_table_verbatim`: "Código MAN-015 / Nro. de Versión 3.0 / Fecha de
  Validación 02/06/2025 / Fecha de Inicio de Vigencia 01/06/2020"; `page_headers_verbatim`:
  "Versión 3.0 (en todas las páginas de contenido)".

## Affected
Every `crawlable/graph/*.json` node and `crawlable/tables.json` table sourced from the manual
(`source.version = "3.0"` + file-level `_doc_conflicts → RUL-MAN-VERSION`).

## Data-currency risk (raised by the Layer-E tier review, verifier V1)
This is **not merely a cosmetic identity stamp**. The 4.0 change table lists changes to **3.1.3 / 3.3
Autoridades de Suscripción**, **"Incremento de límites de suscripción"** (the Bs. 3.480.000 capacity),
and **franquicia Empresas** — all values the crawler *ships*, read off pages stamped "Versión 3.0".
So the body's authority / capacity / franquicia numbers may be **pre-4.0 (stale)**. Treat any such
value as provisional until the version is ruled. (Tier confirmed DOC-LEVEL by 3/3; surfaced once per
result as `document_provenance` → this entry. This note enriches the warning, it does not resolve it.)

## Recommended resolution (NON-BINDING — D-P2)
Treat **4.0** as the canonical published version (cover + change table are the authored
front-matter; the "3.0" headers/info-table read like an un-updated template, consistent with
change-log entries dated through 04/06/2025). Confirm with the document owner (Suscripción,
Marco Rada) before stamping. *Advisory only — not applied; nodes remain "3.0" until ruled.*

## Resolution (filled when ruled)
_chosen_version:_ — · _ruled_by:_ — · _date:_ — · _rationale:_ —
