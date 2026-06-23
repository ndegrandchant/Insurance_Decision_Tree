#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reconcile the Daños Propios + Robo Parcial coverage slice against its seed source ids."""

import json
import os
from collections import OrderedDict

ROOT = os.path.dirname(os.path.abspath(__file__))

SOURCE_IDS = OrderedDict(
    [
        ("Sección III Daños Propios", [
            "seccion[3].clausula[1]",
            "seccion[3].clausula[2]",
            "seccion[3].clausula[3].taller_libre_eleccion",
            "seccion[3].clausula[3].conversion_perdida_total",
            "seccion[3].clausula[3].infraseguro_sobreseguro_proformas",
            "seccion[3].clausula[4].umbral_reposicion",
            "seccion[3].clausula[4].partes_no_disponibles",
            "seccion[3].clausula[4].diferencia_importacion",
            "seccion[3].clausula[5].a",
            "seccion[3].clausula[5].b",
            "seccion[3].clausula[5].c",
        ]),
        ("Sección V Robo Parcial", [
            "seccion[5].clausula[1]",
            "seccion[5].clausula[1].intento_robo",
            "seccion[5].clausula[1].cobertura_robo",
            "seccion[5].clausula[1].robo_consumado",
            "seccion[5].clausula[1].partes_verificadas",
            "seccion[5].clausula[1].partes_fijadas",
            "seccion[5].clausula[2].limite_eventos_llanta",
            "seccion[5].clausula[3].umbral_reposicion",
            "seccion[5].clausula[4].taller_libre_eleccion",
            "seccion[5].clausula[4].conversion_perdida_total",
            "seccion[5].clausula[4].infraseguro_sobreseguro_proformas",
            "seccion[5].clausula[4].partes_no_disponibles",
            "seccion[5].clausula[4].diferencia_importacion",
            "seccion[5].clausula[5].a",
            "seccion[5].clausula[5].b",
            "seccion[5].clausula[5].c",
            "seccion[5].clausula[5].d",
        ]),
        ("Obligaciones siniestro", [
            "obligaciones_siniestro.a",
            "obligaciones_siniestro.b",
            "obligaciones_siniestro.b.excepcion_menor_1000",
            "obligaciones_siniestro.c",
            "obligaciones_siniestro.c.excepcion_menor_1000",
            "obligaciones_siniestro.d",
            "obligaciones_siniestro.e",
            "obligaciones_siniestro.f",
            "obligaciones_siniestro.g",
            "obligaciones_siniestro.h",
            "obligaciones_siniestro.i",
            "obligaciones_siniestro.j",
        ]),
        ("Exclusiones generales / linkage", [
            "exclusiones_generales.basicas.alcoholemia",
            "exclusiones_generales.basicas.drogas_medicacion",
            "exclusiones_generales.basicas.confiscacion",
            "exclusiones_generales.basicas.robo_hurto_partes_motos",
            "exclusiones_generales.orden_publico",
            "exclusiones_generales.otras.hechos_intencionales",
            "exclusiones_generales.otras.conduccion_no_autorizada",
            "exclusiones_generales.otras.vias_no_autorizadas",
            "link.extraterritorialidad_2027",
            "link.talleres_2045_2053",
            "2045",
            "2053",
        ]),
    ]
)


def source_ids_from_origin(origin):
    raw = str(origin.get("source_id", ""))
    return [part.strip() for part in raw.split(";") if part.strip()]


converted, reference, ledger = {}, {}, {}
for name in os.listdir(os.path.join(ROOT, "graph_coverage")):
    if not name.endswith(".json"):
        continue
    data = json.load(open(os.path.join(ROOT, "graph_coverage", name), encoding="utf-8"))
    for node in data.get("nodes", []):
        target = ledger if node.get("conflict", {}).get("status") == "open" else converted
        for source_id in source_ids_from_origin(node.get("_origin", {})):
            target[source_id] = node["id"]
    for ref in data.get("reference_elements", []):
        reference[ref["source_id"]] = ref.get("status", "reference")

manifest = OrderedDict()
errors = []
for group, ids in SOURCE_IDS.items():
    manifest[group] = {}
    for source_id in ids:
        if source_id in converted:
            status, note = "converted", converted[source_id]
        elif source_id in ledger:
            status, note = "ledger", ledger[source_id]
        elif source_id in reference:
            status, note = "reference", reference[source_id]
        else:
            status, note = "missing", None
            errors.append(f"{group}: {source_id}")
        manifest[group][source_id] = {"status": status, "note": note}

json.dump(manifest, open(os.path.join(ROOT, "coverage_slice_manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

lines = ["# COVERAGE_SLICE_REPORT.md — Daños Propios + Robo Parcial reconciliation", ""]
for group, rows in manifest.items():
    counts = {status: sum(1 for row in rows.values() if row["status"] == status) for status in ("converted", "ledger", "reference", "missing")}
    lines.append(f"## {group}")
    lines.append(f"- converted: {counts['converted']} · ledger: {counts['ledger']} · reference: {counts['reference']} · missing: {counts['missing']}")
    for source_id, row in rows.items():
        lines.append(f"- `{source_id}` — **{row['status']}**" + (f" → {row['note']}" if row["note"] else ""))
    lines.append("")
open(os.path.join(ROOT, "COVERAGE_SLICE_REPORT.md"), "w", encoding="utf-8").write("\n".join(lines))

total = sum(len(v) for v in SOURCE_IDS.values())
accounted = total - len(errors)
print(f"coverage_reconcile.py — accounted {accounted}/{total}")
if errors:
    for error in errors:
        print("  MISSING", error)
    raise SystemExit(1)
print("GREEN — 0 missing source ids")
