# COVERAGE_SLICE_REPORT.md — Daños Propios + Robo Parcial reconciliation

## Sección III Daños Propios
- converted: 10 · ledger: 0 · reference: 1 · missing: 0
- `seccion[3].clausula[1]` — **converted** → coverage.guard.section_included
- `seccion[3].clausula[2]` — **converted** → coverage.danos.scope
- `seccion[3].clausula[3].taller_libre_eleccion` — **converted** → coverage.danos.workshop_base_cap
- `seccion[3].clausula[3].conversion_perdida_total` — **converted** → coverage.danos.total_loss_conversion
- `seccion[3].clausula[3].infraseguro_sobreseguro_proformas` — **reference** → reference
- `seccion[3].clausula[4].umbral_reposicion` — **converted** → coverage.parts.replacement_threshold
- `seccion[3].clausula[4].partes_no_disponibles` — **converted** → coverage.parts.local_market_unavailable
- `seccion[3].clausula[4].diferencia_importacion` — **converted** → coverage.parts.import_difference
- `seccion[3].clausula[5].a` — **converted** → coverage.danos.exclusion.mechanical
- `seccion[3].clausula[5].b` — **converted** → coverage.danos.exclusion.after_damage_driving
- `seccion[3].clausula[5].c` — **converted** → coverage.danos.exclusion.robo_piezas

## Sección V Robo Parcial
- converted: 15 · ledger: 0 · reference: 2 · missing: 0
- `seccion[5].clausula[1]` — **converted** → coverage.guard.section_included
- `seccion[5].clausula[1].intento_robo` — **converted** → coverage.robo.attempt
- `seccion[5].clausula[1].cobertura_robo` — **converted** → coverage.robo.scope
- `seccion[5].clausula[1].robo_consumado` — **converted** → coverage.robo.consumated
- `seccion[5].clausula[1].partes_verificadas` — **converted** → coverage.robo.parts_verified
- `seccion[5].clausula[1].partes_fijadas` — **converted** → coverage.robo.parts_attached
- `seccion[5].clausula[2].limite_eventos_llanta` — **reference** → reference
- `seccion[5].clausula[3].umbral_reposicion` — **converted** → coverage.parts.replacement_threshold
- `seccion[5].clausula[4].taller_libre_eleccion` — **converted** → coverage.robo.workshop_base_cap
- `seccion[5].clausula[4].conversion_perdida_total` — **converted** → coverage.robo.total_loss_conversion
- `seccion[5].clausula[4].infraseguro_sobreseguro_proformas` — **reference** → reference
- `seccion[5].clausula[4].partes_no_disponibles` — **converted** → coverage.parts.local_market_unavailable
- `seccion[5].clausula[4].diferencia_importacion` — **converted** → coverage.parts.import_difference
- `seccion[5].clausula[5].a` — **converted** → coverage.robo.exclusion.hurto
- `seccion[5].clausula[5].b` — **converted** → coverage.general.intentional_act
- `seccion[5].clausula[5].c` — **converted** → coverage.general.confiscation
- `seccion[5].clausula[5].d` — **converted** → coverage.robo.security_measures

## Obligaciones siniestro
- converted: 7 · ledger: 0 · reference: 5 · missing: 0
- `obligaciones_siniestro.a` — **reference** → reference
- `obligaciones_siniestro.b` — **converted** → coverage.duty.police_report_missing
- `obligaciones_siniestro.b.excepcion_menor_1000` — **converted** → coverage.duty.police_report_small_claim_cap
- `obligaciones_siniestro.c` — **converted** → coverage.duty.alcohol_test_missing
- `obligaciones_siniestro.c.excepcion_menor_1000` — **converted** → coverage.duty.alcohol_test_small_claim_cap
- `obligaciones_siniestro.d` — **converted** → coverage.duty.technical_report
- `obligaciones_siniestro.e` — **converted** → coverage.duty.notice_delay
- `obligaciones_siniestro.f` — **reference** → reference
- `obligaciones_siniestro.g` — **reference** → reference
- `obligaciones_siniestro.h` — **converted** → coverage.duty.repair_authorization
- `obligaciones_siniestro.i` — **reference** → reference
- `obligaciones_siniestro.j` — **reference** → reference

## Exclusiones generales / linkage
- converted: 7 · ledger: 2 · reference: 3 · missing: 0
- `exclusiones_generales.basicas.alcoholemia` — **converted** → coverage.general.alcohol
- `exclusiones_generales.basicas.drogas_medicacion` — **converted** → coverage.general.drugs_or_medication
- `exclusiones_generales.basicas.confiscacion` — **converted** → coverage.general.confiscation
- `exclusiones_generales.basicas.robo_hurto_partes_motos` — **converted** → coverage.general.robo_partes_motos
- `exclusiones_generales.orden_publico` — **reference** → reference
- `exclusiones_generales.otras.hechos_intencionales` — **converted** → coverage.general.intentional_act
- `exclusiones_generales.otras.conduccion_no_autorizada` — **reference** → reference
- `exclusiones_generales.otras.vias_no_autorizadas` — **reference** → reference
- `link.extraterritorialidad_2027` — **ledger** → coverage.conflict.extraterritorialidad_2027
- `link.talleres_2045_2053` — **ledger** → coverage.workshop.conflict_2045_2053
- `2045` — **converted** → coverage.workshop.cg2045
- `2053` — **converted** → coverage.workshop.cg2053
