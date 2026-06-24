#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
troubleshoot testing/_harness.py — shared substrate for the runtime-conflict stress harness.

NON-DESTRUCTIVE BY CONSTRUCTION. This module only ever:
  - instantiates the real Crawler (which loads crawlable/* read-only), and
  - deep-copies that in-memory object to mutate the COPY for fault injection.
It never writes to representation/, graph/, tables*.json, facts.json, or rulings/.

It imports ONLY the clean `crawl` module (Crawler/bracket_lookup/flatten_tables/jl). It does NOT
import run_cases.py or validate.py (both execute on import). The canonical case corpus below is
replicated verbatim from crawlable/crawler/run_cases.py so the golden snapshot reflects the real
demonstration cases without importing that script.
"""
import os, sys, copy, json

HARNESS_DIR = os.path.dirname(os.path.abspath(__file__))            # .../troubleshoot testing/
PROJ        = os.path.dirname(HARNESS_DIR)                          # .../Fable_Approach/
CRAWLABLE   = os.path.join(PROJ, "crawlable")
CRAWLER_DIR = os.path.join(CRAWLABLE, "crawler")
sys.path.insert(0, CRAWLER_DIR)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from crawl import Crawler, bracket_lookup, flatten_tables, jl, _row_matches, MissingFact, EvalError  # noqa: E402

# ----------------------------------------------------------------------------- crawler lifecycle
def fresh():
    """A real crawler, loaded read-only from crawlable/."""
    return Crawler()

def clone(c):
    """Deep copy so fault injection mutates the COPY only (memo keeps nodes<->by_process shared)."""
    return copy.deepcopy(c)

def recompute_table_ctx(c):
    """Call after mutating c.tables so flattened @tables.* context stays consistent."""
    c.table_ctx = flatten_tables(c.tables)

# ----------------------------------------------------------------------------- result classifiers
def is_escalate(res):  return res.get("outcome") == "ESCALATE"
def is_outcome(res):   return res.get("outcome") in OUTCOMES
OUTCOMES = {"eligible", "conditional_eligible", "decline", "refer_authority", "refer_process", "refer_line"}

def caveat_refs(res):
    return [cv.get("ledger_ref") for cv in res.get("caveats", [])]

def escalation_ledger(res):
    return (res.get("escalation") or {}).get("ledger_ref")

def escalation_reason(res):
    return (res.get("escalation") or {}).get("reason")

def fired_steps(res):
    """audit steps that actually fired (not plain 'advance')."""
    return [s for s in res.get("audit", []) if s.get("result") != "advance"]

def audit_missing_source_quotes(res):
    """fired steps whose source_quote is missing/empty (audit-integrity)."""
    return [s["node"] for s in fired_steps(res) if not s.get("source_quote")]

def signature(res):
    """A stable, comparable fingerprint of an outcome + decisive path (for snapshot/determinism)."""
    sig = {
        "outcome": res.get("outcome"),
        "process": res.get("process"),
        "terminal_node": res.get("terminal_node"),
        "referral_target": res.get("referral_target"),
        "rate_action": res.get("rate_action"),
        "caveats": sorted([(cv.get("node"), cv.get("ledger_ref")) for cv in res.get("caveats", [])]),
        "path": [(s.get("node"), s.get("result")) for s in res.get("audit", [])],
    }
    if is_escalate(res):
        e = res.get("escalation", {})
        sig["escalation"] = {"reason": e.get("reason"), "at_node": e.get("at_node"),
                             "ledger_ref": e.get("ledger_ref"), "blocking_fact": e.get("blocking_fact"),
                             "on_missing": e.get("on_missing")}
    return sig

# ----------------------------------------------------------------------------- canonical corpus
# Replicated from crawlable/crawler/run_cases.py (payloads verbatim). Each: (name, payload, start).
GATE    = "standard.elig.gate_tipo_vehiculo"
CU_GATE = "case_underwriting.elig.gate"
ROUTER  = "root.process_router"

_elig = {
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
    d = dict(_elig); d.update(ov); return d

_cu = {
    "is_contractor_equipment": False, "has_plates": True, "is_competition_offroad": False,
    "has_body_modifications": False, "is_rail_vehicle": False, "is_rental": False,
    "is_learning_vehicle": False, "circula_fuera_pais_actividad_regular": False,
    "servicio_publico_pasajeros": False, "is_bomberos_policia_ejercito": False,
    "is_public_tender": False, "is_mass_grouping": False, "channel": "directas",
    "valor_asegurado": 100000, "suscriptor": "Manuel Sauma", "cantidad_vehiculos": 1,
    "has_rc": False, "has_ap": False, "is_enlatado": False,
}
def U(**ov):
    d = dict(_cu); d.update(ov); return d

_rbase = {**_elig, "product": "otro", "client_type": "empresa", "requests_standard_deviation": False,
          # O14: licitaciones prohibited-condition facts (R-097) — clean tender requests none
          "requests_valor_admitido": False, "alcoholemia_permitida_gl": 0.0, "licencia_vencida_dias": 0,
          "requests_permiso_velocidad_especial": False, "requests_ap_pasajeros_carroceria": False}
def R(**ov):
    d = dict(_rbase); d.update(ov); return d

def RN(**ov):
    d = {"segment": "consumer", "vehicle_class": "liviano", "siniestralidad": 0.0}; d.update(ov); return d
def RT(**ov):
    d = {"siniestro_en_periodo": False, "retroactividad_dias": 15}; d.update(ov); return d

CORPUS = [
    # name, payload, start
    ("E1 clean accept", E(), GATE),
    ("E2 clean decline X05 competición", E(is_competition_offroad=True), GATE),
    ("E3 lift YES antiguo renov X12.a", E(vehicle_age_years=30, is_renewal=True), GATE),
    ("E4 lift NO antiguo nueva marca X12.b", E(vehicle_age_years=25, is_renewal=False, model_year=1985, vehicle_brand="Ferrari"), GATE),
    ("E5 refer_process X10 rent-a-car petroleras", E(is_rental=True, rented_to_petroleum=True), GATE),
    ("E6 refer_authority X15 importador no aut.", E(valor_asegurado=800000, importer="OtroImportador"), GATE),
    ("E7 high-value ELIGIBLE X15 Toyosa", E(valor_asegurado=800000, importer="Toyosa"), GATE),
    ("E8 ESCALATE missing importer", E(valor_asegurado=800000), GATE),
    ("E9 decline consumer heavy X02", E(segment="consumer", vehicle_class="camion", is_heavy=True, tonnage_tn=5), GATE),
    ("E10 lift YES minibús X07", E(vehicle_class="minibus", design_modified_capacity=True, capacity_was_reduced=True, ap_coverage="solo_conductor"), GATE),
    ("R1 ESCALATE precedence lbc_auto", R(product="lbc_auto")),
    ("R2 refer_process automatica", R(product="lbc_auto_kilometraje")),
    ("R3 route standard moto", R(product="moto_proteccion", vehicle_class="motocicleta", cilindrada_cc=150, es_moto_lujo_o_competicion=False)),
    ("R4 refer_process licitaciones", R(is_public_tender=True)),
    ("R5 refer_process masiva", R(is_mass_grouping=True)),
    ("R6 ESCALATE precedence licit+masiva", R(is_public_tender=True, is_mass_grouping=True)),
    ("CU1 Case-UW pesado eligible", U(vehicle_class="camion", tonnage_tn=12), CU_GATE),
    ("CU2 C05 rent-a-car ESCALATE blocking", U(is_rental=True), CU_GATE),
    ("CU3 ambulancia Case-UW eligible", U(is_ambulance=True), CU_GATE),
    ("AMB-STD ambulancia Estándar X19 decline", E(vehicle_class="furgoneta", is_ambulance=True), GATE),
    ("A1 Estándar autoridad EXCEDE", E(valor_asegurado=600000, suscriptor="Ninoska Martinez"), GATE),
    ("A2 Case-UW capacidad EXCEDE", U(valor_asegurado=4000000), CU_GATE),
    ("A3 Case-UW autoridad DENTRO eligible", U(valor_asegurado=2000000, suscriptor="José Carlos López"), CU_GATE),
    ("A4 Case-UW suscriptor DESCONOCIDO", U(valor_asegurado=500000, suscriptor="Fulano Desconocido"), CU_GATE),
    ("LR-UW Lizeth Rios Case-UW", U(valor_asegurado=1000000, suscriptor="Lizeth Rios", cantidad_vehiculos=50), CU_GATE),
    ("LR-LIC Lizeth Rios Licitaciones", R(is_public_tender=True, valor_asegurado=1000000, suscriptor="Lizeth Rios", cantidad_vehiculos=50)),
    ("L1 RC>210k refer Case-UW", E(has_rc=True, rc_asegurado=300000), GATE),
    ("L2 RC 300k enlatado sin desborde", E(has_rc=True, rc_asegurado=300000, is_enlatado=True), GATE),
    ("L3 AP>140k refer Seguros Personales", E(has_ap=True, ap_capital_por_persona=200000), GATE),
    ("L4 Case-UW RC>350k refer Línea RC", U(has_rc=True, rc_asegurado=400000), CU_GATE),
    ("RN1 Comercial 0% mantener", RN(segment="comercial", siniestralidad=0), "renovacion.comercial"),
    ("RN2 Consumer 100% recargo", RN(siniestralidad=100), "renovacion.comercial"),
    ("RN3 Consumer 300% depuración", RN(siniestralidad=300), "renovacion.comercial"),
    ("RN4 Consumer pesado 55% OVERLAP", RN(vehicle_class="camion", siniestralidad=55), "renovacion.comercial"),
    ("RN5 Consumer 60% BAND-EDGE", RN(siniestralidad=60), "renovacion.comercial"),
    ("RN6 Pesados/motos 100% +17%", RN(vehicle_class="camion", siniestralidad=100), "renovacion.pesados_motos"),
    ("RT1 <=30 sin siniestro", RT(retroactividad_dias=15), "retroactividad.siniestro_overlay"),
    ("RT2 >30 sin siniestro Case-UW", RT(retroactividad_dias=45), "retroactividad.siniestro_overlay"),
    ("RT3 siniestro Comité", RT(siniestro_en_periodo=True), "retroactividad.siniestro_overlay"),
    # O14 — licitaciones prohibited-condition gates (R-097)
    ("LIC-ALC alcoholemia>0.70 decline+caveat", R(is_public_tender=True, alcoholemia_permitida_gl=0.80)),
    ("LIC-VADM valor admitido decline", R(is_public_tender=True, requests_valor_admitido=True)),
    ("LIC-AP ap carrocería refer_authority", R(is_public_tender=True, requests_ap_pasajeros_carroceria=True)),
    # gate-rejection: a vehicle type not in the admitted list -> not_admitted_by_standard -> reevaluación
    ("GATE-REJECT tipo no admitido (remolque)", R(vehicle_class="remolque")),
]

# Normalize: router cases are written as 2-tuples (default start = root.process_router).
CORPUS = [(t[0], t[1], t[2] if len(t) > 2 else None) for t in CORPUS]

def crawl_case(c, name, payload, start):
    """Run one corpus case; start may be ROUTER (default) or an explicit entry node."""
    return c.crawl(payload, start=start) if start else c.crawl(payload)

def node_coverage():
    """Which graph nodes the corpus actually exercises (informational — FULL node coverage needs the
    O4 underwriter-validated corpus; this just shows what the regression snapshot touches)."""
    c = fresh()
    fired = set()
    for name, p, s in CORPUS:
        r = crawl_case(c, name, p, s)
        for step in r.get("audit", []):
            fired.add(step.get("node"))
        if r.get("terminal_node"):
            fired.add(r["terminal_node"])
        esc = r.get("escalation") or {}
        if esc.get("at_node"):
            fired.add(esc["at_node"])
    allnodes = set(c.nodes)
    return sorted(n for n in allnodes if n in fired), sorted(n for n in allnodes if n not in fired)

if __name__ == "__main__":
    c = fresh()
    print(f"loaded: {len(c.nodes)} nodes, {len(c.facts)} facts, {len(c.tables)} tables")
    print(f"corpus: {len(CORPUS)} cases")
    ok = sum(1 for (n, p, s) in CORPUS if crawl_case(c, n, p, s))
    print(f"all {ok}/{len(CORPUS)} cases returned a result (no crash)")
