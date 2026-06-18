#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawlable/crawler/run_cases.py — Phase-0 demonstration cases.

Two entry modes:
  • ELIGIBILITY cases enter at the Standard gate (process already determined) — the four
    required outcomes (clean accept, clean decline, liftable exception both ways) + referrals,
    refer_authority, and missing-fact escalation.
  • ROUTER cases enter at root.process_router — routing, continuation into a built process,
    and the precedence escalation (incl. the genuine LBC|Auto Automática-vs-Estándar overlap).
Plus the S2 bracket lookup (clean + flagged-overlap) and one full audit trail.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # print UTF-8 regardless of locale (avoids UnicodeEncodeError on —/✓/→/accents)

from crawl import Crawler, bracket_lookup

c = Crawler()

# Eligibility payload (process = Standard given). is_public_tender/is_mass_grouping/channel are
# read by X20/X22; the rest are exclusion attributes. No router-only facts needed at the gate.
elig = {
    "is_public_tender": False, "is_mass_grouping": False, "channel": "directas",
    "vehicle_class": "liviano", "segment": "comercial",
    "is_contractor_equipment": False, "has_plates": True,
    "is_competition_offroad": False, "has_body_modifications": False,
    "is_rail_vehicle": False, "is_rental": False, "is_learning_vehicle": False,
    "vehicle_age_years": 5, "circula_fuera_pais_actividad_regular": False,
    "capacidad_original_mayor_8": False, "valor_asegurado": 90000,
    "servicio_publico_pasajeros": False, "is_convertible_lona": False,
    "is_armored": False, "is_bomberos_policia_ejercito": False, "is_ambulance": False,
    "has_foreign_plates": False, "is_brevet_policy": False,
    "suscriptor": "Manuel Sauma", "cantidad_vehiculos": 1,
    "has_rc": False, "has_ap": False, "is_enlatado": False,
}
def E(**ov):
    d = dict(elig); d.update(ov); return d

GATE = "standard.elig.gate_tipo_vehiculo"
ELIG_CASES = [
    ("1. clean accept (comercial liviano)", E(), GATE),
    ("2. clean decline (competición — X05)", E(is_competition_offroad=True), GATE),
    ("3. liftable exc. LIFT YES (antiguo renovación 30a ≤40 — X12.a)", E(vehicle_age_years=30, is_renewal=True), GATE),
    ("4. liftable exc. LIFT NO (antiguo nueva, marca no permitida — X12.b)", E(vehicle_age_years=25, is_renewal=False, model_year=1985, vehicle_brand="Ferrari"), GATE),
    ("5. refer_process handoff: rent-a-car petroleras → Case UW (X10)", E(is_rental=True, rented_to_petroleum=True), GATE),
    ("6. refer_authority (VA 800k, importador no autorizado — X15)", E(valor_asegurado=800000, importer="OtroImportador"), GATE),
    ("7. high-value ELIGIBLE (VA 800k, importador Toyosa — X15)", E(valor_asegurado=800000, importer="Toyosa"), GATE),
    ("8. ESCALATE missing fact (VA 800k, importador ausente)", E(valor_asegurado=800000), GATE),
    ("9. decline consumer heavy (camión Consumer — X02)", E(segment="consumer", vehicle_class="camion", is_heavy=True, tonnage_tn=5), GATE),
    ("10. lift YES minibús (capacidad reducida + AP solo conductor — X07)", E(vehicle_class="minibus", design_modified_capacity=True, capacity_was_reduced=True, ap_coverage="solo_conductor"), GATE),
]

# Router payload (process not yet determined).
rbase = {**elig, "product": "otro", "client_type": "empresa", "requests_standard_deviation": False}
def R(**ov):
    d = dict(rbase); d.update(ov); return d

ROUTER_CASES = [
    ("R1. ESCALATE precedence — LBC|Auto es Automática (R-060) Y Estándar (R-011)", R(product="lbc_auto")),
    ("R2. refer_process Automática (LBC|Auto Por Kilometraje, enlatado)", R(product="lbc_auto_kilometraje")),
    ("R3. route → Estándar y resuelve (Moto Protección, moto 150cc benigna)", R(product="moto_proteccion", vehicle_class="motocicleta", cilindrada_cc=150, es_moto_lujo_o_competicion=False)),
    ("R4. refer_process Licitaciones (licitación pública)", R(is_public_tender=True)),
    ("R5. refer_process Masiva (agrupación masiva)", R(is_mass_grouping=True)),
    ("R6. ESCALATE precedence (licitación Y masiva a la vez)", R(is_public_tender=True, is_mass_grouping=True)),
]

def fired_path(audit):
    out = [f"{s['node']}[{s['result']}]" for s in audit if s.get("result") != "advance"]
    return " → ".join(out) if out else "(sin pasos decisivos)"

def show(name, res):
    print(f"\n● {name}")
    line = f"    OUTCOME: {res['outcome']}"
    if res.get("process"): line += f"  (proceso {res['process']}, nodo {res.get('terminal_node')})"
    print(line)
    if res.get("referral_target"): print(f"    referral_target: {res['referral_target']}")
    if res.get("needs_authority"): print(f"    needs_authority: {res['needs_authority']}")
    if res.get("rate_action"): print(f"    rate_action: {res['rate_action']}")
    if res.get("note"): print(f"    note: {res['note']}")
    if res["outcome"] == "ESCALATE":
        e = res["escalation"]
        print(f"    reason: {e['reason']}  @ {e['at_node']}")
        if e.get("blocking_fact"): print(f"    blocking_fact: {e['blocking_fact']} (on_missing={e.get('on_missing')}) — “{e.get('fact_prompt')}”")
        print(f"    message: {e['message']}")
        if e.get("ledger_ref"): print(f"    ledger_ref: {e['ledger_ref']}")
    for cv in res.get("caveats", []):
        print(f"    ⚠ CAVEAT (open ruling): {cv['node']} → {cv['ledger_ref']}")
    print(f"    path: {fired_path(res.get('audit', []))}")

print("=" * 96 + "\nELIGIBILITY CASES (entry: Standard gate — process determined)\n" + "=" * 96)
for name, payload, start in ELIG_CASES:
    show(name, c.crawl(payload, start=start))

print("\n" + "=" * 96 + "\nROUTER CASES (entry: root.process_router)\n" + "=" * 96)
for name, payload in ROUTER_CASES:
    show(name, c.crawl(payload))

# Case UW eligibility (entry: case_underwriting gate). Admits all types; 11 exclusions.
CU_GATE = "case_underwriting.elig.gate"
cu = {
    "is_contractor_equipment": False, "has_plates": True, "is_competition_offroad": False,
    "has_body_modifications": False, "is_rail_vehicle": False, "is_rental": False,
    "is_learning_vehicle": False, "circula_fuera_pais_actividad_regular": False,
    "servicio_publico_pasajeros": False, "is_bomberos_policia_ejercito": False,
    "is_public_tender": False, "is_mass_grouping": False, "channel": "directas",
    "valor_asegurado": 100000, "suscriptor": "Manuel Sauma", "cantidad_vehiculos": 1,
    "has_rc": False, "has_ap": False, "is_enlatado": False,
}
def U(**ov):
    d = dict(cu); d.update(ov); return d

CASEUW_CASES = [
    ("CU1. Case UW admite PESADO >8 TN (el Estándar X01 lo declina) → eligible", U(vehicle_class="camion", tonnage_tn=12), CU_GATE),
    ("CU2. Rent-A-Car en Case UW → C05 contradicción → ESCALATE (blocking)", U(is_rental=True), CU_GATE),
    ("CU3. Ambulancia en Case UW → ELEGIBLE (C09 no menciona ambulancias)", U(is_ambulance=True), CU_GATE),
]
print("\n" + "=" * 96 + "\nCASE UW ELIGIBILITY CASES (entry: case_underwriting gate)\n" + "=" * 96)
for name, payload, start in CASEUW_CASES:
    show(name, c.crawl(payload, start=start))

print("\n  — fidelity contrast (same ambulancia, two processes):")
amb_std = E(vehicle_class="furgoneta", is_ambulance=True)
print(f"    Estándar (X19 incluye ambulancias): {c.crawl(amb_std, start=GATE)['outcome']}")
print(f"    Case UW  (C09 las excluye? no):     {c.crawl(U(is_ambulance=True), start=CU_GATE)['outcome']}")

# Authority stage (capacity R-003 + matrix authority R-013/072/092), chained after eligibility.
AUTH_CASES = [
    ("A1. Estándar autoridad EXCEDE (Ninoska Martinez máx 490k, VA 600k)", E(valor_asegurado=600000, suscriptor="Ninoska Martinez"), GATE),
    ("A2. Case UW capacidad EXCEDE (VA 4.000.000 > 3.480.000 — R-003)", U(valor_asegurado=4000000), CU_GATE),
    ("A3. Case UW autoridad DENTRO (VA 2.000.000, José Carlos López máx 2.1M) → eligible", U(valor_asegurado=2000000, suscriptor="José Carlos López"), CU_GATE),
    ("A4. Case UW suscriptor DESCONOCIDO → refer_authority", U(valor_asegurado=500000, suscriptor="Fulano Desconocido"), CU_GATE),
]
print("\n" + "=" * 96 + "\nAUTHORITY CASES (capacity R-003 + matrix authority, chained after eligibility)\n" + "=" * 96)
for name, payload, start in AUTH_CASES:
    show(name, c.crawl(payload, start=start))

print("\n  — Lizeth Rios, mismo riesgo (VA 1.000.000, 50 vehículos), dos procesos (RUL-LIZETH-RIOS-AUTH):")
luw = c.crawl(U(valor_asegurado=1000000, suscriptor="Lizeth Rios", cantidad_vehiculos=50), start=CU_GATE)
llic = c.crawl(R(is_public_tender=True, valor_asegurado=1000000, suscriptor="Lizeth Rios", cantidad_vehiculos=50))
print(f"    Case UW  (matriz 100 / 1.400.000): {luw['outcome']}   caveat={[cv['ledger_ref'] for cv in luw.get('caveats', [])]}")
print(f"    Licitac. (matriz  10 /   700.000): {llic['outcome']}   caveat={[cv['ledger_ref'] for cv in llic.get('caveats', [])]}")

# Coverage-limit cases (Batch 3b): RC/AP overflow routing.
LIMIT_CASES = [
    ("L1. Estándar RC > 210k → refer_process Case UW (handoff, R-018)", E(has_rc=True, rc_asegurado=300000), GATE),
    ("L2. Estándar RC 300k bajo enlatado → SIN desborde (excepción R-018)", E(has_rc=True, rc_asegurado=300000, is_enlatado=True), GATE),
    ("L3. Estándar AP > 140k/persona → refer Línea Seguros Personales (R-022)", E(has_ap=True, ap_capital_por_persona=200000), GATE),
    ("L4. Case UW RC > 350k → refer Línea RC (R-074)", U(has_rc=True, rc_asegurado=400000), CU_GATE),
]
print("\n" + "=" * 96 + "\nCOVERAGE-LIMIT CASES (RC/AP overflow routing — Batch 3b)\n" + "=" * 96)
for name, payload, start in LIMIT_CASES:
    show(name, c.crawl(payload, start=start))

# Renovación (S2 siniestralidad bands + the Consumer-vs-pesados overlap) — process "renovacion".
RENOV_ENTRY = "renovacion.comercial"  # min-order renovacion node = flow entry
def RN(**ov):
    d = {"segment": "consumer", "vehicle_class": "liviano", "siniestralidad": 0.0}; d.update(ov); return d
RENOV_CASES = [
    ("RN1. Comercial siniestralidad 0% → mantener tasa vigente", RN(segment="comercial", siniestralidad=0), RENOV_ENTRY),
    ("RN2. Consumer liviano 100% → recargo 10% / tarificador", RN(siniestralidad=100), RENOV_ENTRY),
    ("RN3. Consumer liviano 300% → depuración (decline)", RN(siniestralidad=300), RENOV_ENTRY),
    ("RN4. Consumer PESADO 55% → OVERLAP conflict (Consumer vs pesados/motos)", RN(vehicle_class="camion", siniestralidad=55), RENOV_ENTRY),
    ("RN5. Consumer liviano 60% (borde de banda) → ESCALATE RUL-BAND-EDGES", RN(siniestralidad=60), RENOV_ENTRY),
    ("RN6. Pesados/motos individual 100% → +17% (esquema punto 3)", RN(vehicle_class="camion", siniestralidad=100), "renovacion.pesados_motos"),
]
print("\n" + "=" * 96 + "\nRENOVACIÓN CASES (S2 siniestralidad bands; entry: renovacion flow)\n" + "=" * 96)
for name, payload, start in RENOV_CASES:
    show(name, c.crawl(payload, start=start))

# Retroactividad — process "retroactividad"; overlay (siniestro) checked first, then duration.
RETRO_ENTRY = "retroactividad.siniestro_overlay"
def RT(**ov):
    d = {"siniestro_en_periodo": False, "retroactividad_dias": 15}; d.update(ov); return d
RETRO_CASES = [
    ("RT1. ≤30 días, sin siniestro → condicional (con requisitos)", RT(retroactividad_dias=15), RETRO_ENTRY),
    ("RT2. >30 días, sin siniestro → Case UW (+ Operaciones)", RT(retroactividad_dias=45), RETRO_ENTRY),
    ("RT3. siniestro en el periodo → Comité de Riesgos y Siniestros", RT(siniestro_en_periodo=True), RETRO_ENTRY),
]
print("\n" + "=" * 96 + "\nRETROACTIVIDAD CASES (overlay siniestro + duración; entry: retroactividad flow)\n" + "=" * 96)
for name, payload, start in RETRO_CASES:
    show(name, c.crawl(payload, start=start))

print("\n" + "=" * 96 + "\nS2 BRACKET LOOKUP — TBL-FRANQ-MOTO\n" + "=" * 96)
t = c.tables["TBL-FRANQ-MOTO"]
for va in (30000, 50000, 90000):
    out, conf = bracket_lookup(t, va)
    print(f"  VA={va:>7}  → " + (f"ESCALATE {conf['reason']} (edge {conf.get('edge')}) → {conf['ledger_ref']}" if conf else str(out)))

print("\n" + "=" * 96 + "\nFULL AUDIT TRAIL (case 3 — antiguo renovación, LIFT) — nodes · source_quotes · facts\n" + "=" * 96)
res = c.crawl(E(vehicle_age_years=30, is_renewal=True), start=GATE)
print(f"OUTCOME: {res['outcome']} (nodo {res.get('terminal_node')}); {len(res['audit'])} nodos evaluados\n")
for s in res["audit"]:
    if s.get("result") == "advance": continue
    print(f"  • {s['node']}  [{s['result']}]")
    if s.get("source_quote"): print(f"      source_quote: «{s['source_quote'][:140]}»")
    if s.get("facts_used"):   print(f"      facts_used:   {s['facts_used']}")
    if s.get("required_clauses"): print(f"      required_clauses: {s['required_clauses']}")
    if s.get("detail"):       print(f"      detail: {s['detail']}")
