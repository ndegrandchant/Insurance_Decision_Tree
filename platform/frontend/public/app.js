/* =====================================================================
   RiskIQ — consola de inteligencia de suscripción y cobertura
   Vanilla SPA over dev_server.py. Inicio launcher + module router.
   ===================================================================== */

/* ---------- catálogo de módulos (tarjetas de inicio + navegación) ---------- */
const MODULES = [
  { id: "simple_chat",     name: "Chat",             icon: "◌", group: "Operación",    status: "ready",
    desc: "Chat local con memoria del caso, paquete vivo y evaluación automática cuando RiskIQ tiene datos suficientes." },
  { id: "clients",     name: "Clientes",          icon: "▦", group: "Operación",    status: "ready",
    desc: "Base operacional de clientes, pólizas, vehículos, reclamos, renovaciones y eventos creados desde chat." },
  { id: "bandeja",    name: "Bandeja de tareas", icon: "✉", group: "Operación",    status: "ready",
    desc: "Cola del suscriptor: cada caso detenido por dato faltante o dictamen llega con todo el paquete para resolverlo y reanudar el árbol." },
  { id: "uw",         name: "Suscripción",       icon: "▶", group: "Flujos",       status: "ready",
    desc: "Recorre el árbol de elegibilidad, revisa la ruta de decisión y obtiene precios finales LBC Auto cuando corresponde." },
  { id: "claims",     name: "Reclamos",          icon: "▣", group: "Flujos",       status: "ready",
    desc: "Ejecuta una orientación de cobertura citada a fuente para reclamos, con deberes documentales, exclusiones y salvedades." },
  { id: "renewals",   name: "Renovaciones",      icon: "↻", group: "Flujos",       status: "ready",
    desc: "Mesa de renovación y deltas acotados por cliente/póliza sobre una versión fija del grafo." },
  { id: "graph",      name: "Mapa de decisiones", icon: "⊟", group: "Flujos",       status: "ready",
    desc: "Explora cada nodo de decisión: ramas, hechos, citas fuente y enlaces cruzados del árbol ejecutable." },
  { id: "flags",      name: "Incidencias",       icon: "!", group: "Flujos",       status: "ready",
    desc: "Revisa posibles errores, conflictos, ambigüedades y entradas RUL/OVL del registro en un solo lugar." },
  { id: "demo",       name: "Recorrido demo",    icon: "▷", group: "Flujos",       status: "ready",
    desc: "Muestra cómo una narrativa se convierte en hechos confirmados, recorre el grafo ejecutable y llega a un resultado." },
  { id: "simulation", name: "Simulación",        icon: "~", group: "Inteligencia", status: "ready",
    desc: "Qué pasa si cambias una regla o precio: elige una versión candidata y mide el impacto antes de lanzarla." },
  { id: "supervision", name: "Supervisión",      icon: "⌁", group: "Inteligencia", status: "ready",
    desc: "Cómo está la cartera hoy: riesgo, clientes, severidad, dónde se pierde dinero y cola de renovación." }
];

/* ---------- sample submissions ---------- */
// UW examples for the runner: "clean" prices straight through with no human stop;
// "review" is eligible but the plaza/marca fall outside the LBC calibration, so
// pricing returns requires_pricing_review → a human (pricing) packet.
const UW_EXAMPLES = {
  clean: {
    label: "Aprobado sin intervención humana",
    note: "La Paz / Toyota: elegible y tarificado de inmediato.",
  },
  review: {
    label: "Requiere revisión humana",
    note: "Plaza y marca fuera de calibración LBC: el precio se detiene para revisión de un suscriptor.",
  },
};
const DEMO_TEXT = {
  uw: "Cliente empresa por canal directas solicita Moto Proteccion. Vehiculo motocicleta 150 cc, modelo 2021, marca Honda, modelo CG 150, valor asegurado Bs. 90000, ciudad La Paz, siniestralidad historica 35%. No tiene techo de lona, no es alquiler, no circula fuera del pais y tiene placas.",
  uw_review: "Cliente empresa por canal directas solicita Moto Proteccion para una motocicleta 125 cc, modelo 2021, marca Suzuki, modelo GN125, valor asegurado Bs. 90000, ciudad Cobija, siniestralidad historica 35%. No es alquiler, no circula fuera del pais, tiene placas y no solicita desviacion del procedimiento estandar.",
  coverage: "Siniestro de robo parcial de partes en La Paz. La cobertura de robo parcial esta incluida, hubo denuncia policial y dosaje dentro de 6 horas, el vehiculo no estaba en territorio extranjero, las partes estaban adheridas y fueron verificadas, el aviso a la aseguradora fue a los 2 dias y no se inicio reparacion sin autorizacion."
};

// Pre-written demo clients for "Recorrido demo". These are NOT stored in the portfolio
// or any database — they are loaded fresh into the in-memory demo session each time.
// Each carries a natural-language narrative (shown as the incoming chat message) plus a
// ground-truth fact packet that drives a deterministic traversal. Cliente A prices
// straight through with no human stop; Cliente B deliberately omits the derived fact
// `is_heavy` (on_missing: refer) so the tree stops at standard.elig.consumer_heavy_any
// and routes a resumable human task to the underwriter (Bandeja de tareas).
const DEMO_RECORRIDO_CLIENTS = [
  {
    id: "DEMO-NOVA",
    engine: "uw",
    tree: "Suscripción",
    name: "Transportes Nova SRL",
    subtitle: "Empresa · Moto Protección · sin intervención",
    intervention: false,
    narrative: "Hola, somos Transportes Nova SRL (empresa). Queremos asegurar por canal directas un vehículo liviano, marca Toyota Corolla modelo 2021, valor asegurado Bs. 90.000, que circula en La Paz. Siniestralidad histórica 35%. No es de alquiler, no circula fuera del país, tiene placas y no pedimos desviaciones al procedimiento estándar.",
    facts: {
      product: "moto_proteccion", channel: "directas", client_type: "empresa", segment: "comercial",
      requests_standard_deviation: false, is_public_tender: false, is_mass_grouping: false,
      is_contractor_equipment: false, is_competition_offroad: false, has_body_modifications: false,
      is_rail_vehicle: false, es_moto_lujo_o_competicion: false, vehicle_class: "liviano",
      valor_asegurado: 90000, model_year: 2021, make: "Toyota", model: "Corolla", city: "La Paz", siniestralidad: 35,
      is_rental: false, is_learning_vehicle: false, vehicle_age_years: 5, circula_fuera_pais_actividad_regular: false,
      capacidad_original_mayor_8: false, servicio_publico_pasajeros: false, is_convertible_lona: false, is_armored: false,
      is_bomberos_policia_ejercito: false, is_ambulance: false, has_foreign_plates: false, is_brevet_policy: false,
      has_rc: false, has_ap: false, is_enlatado: true, suscriptor: "Manuel Sauma", participa_competicion: false,
      moto_proteccion_terms: true, is_heavy: false, design_modified_capacity: false, capacity_was_reduced: false,
      cantidad_vehiculos: 1, extraterritorialidad: "no", cuotas: 1, selected_pricing_option: "option_1",
      rc_asegurado: 0, ap_capital_por_persona: 0, ap_coverage: "ninguna"
    }
  },
  {
    id: "DEMO-QUISPE",
    engine: "uw",
    tree: "Suscripción",
    name: "Mario Quispe (PN con NIT)",
    subtitle: "Consumer · vehículo ambiguo · requiere suscriptor",
    intervention: true,
    narrative: "Buenas, soy Mario Quispe, persona natural con NIT (consumer). Quiero asegurar por directas mi Toyota Hilux modelo 2020, valor asegurado Bs. 95.000, circula en La Paz, siniestralidad 35%. Tiene placas, no es alquiler y no sale del país. La uso para mi negocio y a veces lleva carga; no estoy seguro si cuenta como vehículo pesado.",
    facts: {
      product: "moto_proteccion", channel: "directas", client_type: "pn_con_nit", segment: "consumer",
      requests_standard_deviation: false, is_public_tender: false, is_mass_grouping: false,
      is_contractor_equipment: false, is_competition_offroad: false, has_body_modifications: false,
      is_rail_vehicle: false, es_moto_lujo_o_competicion: false, vehicle_class: "camioneta", tonnage_tn: 3,
      valor_asegurado: 95000, model_year: 2020, make: "Toyota", model: "Hilux", city: "La Paz", siniestralidad: 35,
      is_rental: false, is_learning_vehicle: false, vehicle_age_years: 6, circula_fuera_pais_actividad_regular: false,
      capacidad_original_mayor_8: false, servicio_publico_pasajeros: false, is_convertible_lona: false, is_armored: false,
      is_bomberos_policia_ejercito: false, is_ambulance: false, has_foreign_plates: false, is_brevet_policy: false,
      suscriptor: "Manuel Sauma", participa_competicion: false, moto_proteccion_terms: true,
      design_modified_capacity: false, capacity_was_reduced: false, cantidad_vehiculos: 1, extraterritorialidad: "no",
      cuotas: 1, selected_pricing_option: "option_1", rc_asegurado: 0, ap_capital_por_persona: 0,
      ap_coverage: "ninguna", has_rc: false, has_ap: false, is_enlatado: true
      /* is_heavy intentionally omitted → underwriter decides */
    }
  },
  {
    id: "DEMO-ROBO",
    engine: "coverage",
    tree: "Reclamos",
    name: "Robo parcial de partes",
    subtitle: "Reclamos · robo de piezas · cubierto sin intervención",
    intervention: false,
    narrative: "Reporto un robo parcial de partes en La Paz. La Sección de Robo Parcial está incluida en mi póliza, hubo denuncia policial y dosaje dentro de las 6 horas, el vehículo no estaba en territorio extranjero, las partes estaban adheridas y fueron verificadas y valorizadas, avisé a la aseguradora a los 2 días, tengo el informe técnico y no inicié reparación sin autorización.",
    facts: {
      coverage_section: "robo_parcial", coverage_included: true, event_type: "robo_partes",
      driver_alcohol_over_limit: false, driver_under_drugs_or_impairing_medication: false,
      intentional_act: false, confiscation_or_authority_measure: false, vehicle_type: "auto",
      foreign_territory: false, theft_consumated: true, parts_verified_and_valued: true,
      parts_permanently_attached_or_declared: true, security_measures_requested: false,
      security_measures_completed: false, written_security_exception: false, attached_clause_codes: [],
      uses_free_choice_workshop: false, estimated_replacement_cost_percent_va: 20,
      part_repair_cost_percent_replacement: 80, insured_requests_part_replacement: false,
      parts_available_local_market: true, local_price_over_import_price_percent: 0,
      police_report_within_6h: true, alcohol_test_within_6h: true, justified_impediment: false,
      technical_report_available: true, insurer_notice_days: 2, repair_started_without_authorization: false
    }
  },
  {
    id: "DEMO-PARTES",
    engine: "coverage",
    tree: "Reclamos",
    name: "Robo parcial · falta un dato",
    subtitle: "Reclamos · se detiene y pregunta al reclamante",
    intervention: true,
    narrative: "Tengo un robo parcial de partes en La Paz, con la Sección de Robo Parcial incluida. Hubo denuncia policial y dosaje dentro de 6 horas, el vehículo no salió del país, avisé a los 2 días, tengo informe técnico y no inicié reparación sin autorización. Las partes estaban adheridas al vehículo.",
    facts: {
      coverage_section: "robo_parcial", coverage_included: true, event_type: "robo_partes",
      driver_alcohol_over_limit: false, driver_under_drugs_or_impairing_medication: false,
      intentional_act: false, confiscation_or_authority_measure: false, vehicle_type: "auto",
      foreign_territory: false, theft_consumated: true,
      parts_permanently_attached_or_declared: true, security_measures_requested: false,
      security_measures_completed: false, written_security_exception: false, attached_clause_codes: [],
      uses_free_choice_workshop: false, estimated_replacement_cost_percent_va: 20,
      part_repair_cost_percent_replacement: 80, insured_requests_part_replacement: false,
      parts_available_local_market: true, local_price_over_import_price_percent: 0,
      police_report_within_6h: true, alcohol_test_within_6h: true, justified_impediment: false,
      technical_report_available: true, insurer_notice_days: 2, repair_started_without_authorization: false
      /* parts_verified_and_valued intentionally omitted → el árbol pregunta al reclamante */
    }
  },
  {
    id: "DEMO-RENU",
    engine: "uw",
    tree: "Renovación",
    policyType: "renovacion",
    note: "La renovación re-ejecuta el árbol base de suscripción y recalcula la prima; aquí ves ese recorrido base.",
    name: "Renovación · Transportes Andes",
    subtitle: "Renovación · re-ejecuta árbol base + recalcula prima",
    intervention: false,
    narrative: "Somos Transportes Andes SRL (empresa) y queremos renovar nuestra póliza Moto Protección por directas. Es el mismo vehículo liviano Toyota Corolla 2021, valor asegurado Bs. 90.000, en La Paz, siniestralidad histórica 35%. Sigue sin ser de alquiler, no circula fuera del país y tiene placas.",
    facts: {
      product: "moto_proteccion", channel: "directas", client_type: "empresa", segment: "comercial",
      policy_type: "renovacion",
      requests_standard_deviation: false, is_public_tender: false, is_mass_grouping: false,
      is_contractor_equipment: false, is_competition_offroad: false, has_body_modifications: false,
      is_rail_vehicle: false, es_moto_lujo_o_competicion: false, vehicle_class: "liviano",
      valor_asegurado: 90000, model_year: 2021, make: "Toyota", model: "Corolla", city: "La Paz", siniestralidad: 35,
      is_rental: false, is_learning_vehicle: false, vehicle_age_years: 5, circula_fuera_pais_actividad_regular: false,
      capacidad_original_mayor_8: false, servicio_publico_pasajeros: false, is_convertible_lona: false, is_armored: false,
      is_bomberos_policia_ejercito: false, is_ambulance: false, has_foreign_plates: false, is_brevet_policy: false,
      has_rc: false, has_ap: false, is_enlatado: true, suscriptor: "Manuel Sauma", participa_competicion: false,
      moto_proteccion_terms: true, is_heavy: false, design_modified_capacity: false, capacity_was_reduced: false,
      cantidad_vehiculos: 1, extraterritorialidad: "no", cuotas: 1, selected_pricing_option: "option_1",
      rc_asegurado: 0, ap_capital_por_persona: 0, ap_coverage: "ninguna"
    }
  }
];

const SIMPLE_CHAT_CASE_DEFAULTS = {
  product: "moto_proteccion",
  channel: "directas",
  client_type: "empresa",
  apply_standard_assumptions: true
};

const SIMPLE_CHAT_SETTING_OPTIONS = {
  product: [
    ["moto_proteccion", "Moto Protección"],
    ["lbc_auto", "LBC Auto"],
    ["lbc_auto_kilometraje", "LBC Auto Km"],
    ["lbc_moto_low_cost", "Moto Low Cost"],
    ["otro", "Otro"]
  ],
  channel: [
    ["directas", "Directas"],
    ["agentes", "Agentes"],
    ["brokers", "Brokers"],
    ["corporate", "Corporate"],
    ["wholesale", "Wholesale"],
    ["concesionario", "Concesionario"],
    ["banco", "Banco"],
    ["entidad_financiera", "Entidad financiera"]
  ],
  client_type: [
    ["empresa", "Empresa"],
    ["consumer_individual", "Persona natural"],
    ["pn_con_nit", "PN con NIT"],
    ["consumer_fleet_4plus", "Flota consumer"],
    ["estatal", "Estatal"]
  ]
};

const UW_CLIENT_SEGMENT_ASSUMPTIONS = {
  empresa: "comercial",
  estatal: "comercial",
  consumer_individual: "consumer",
  consumer_fleet_4plus: "consumer",
  pn_con_nit: "consumer"
};

const UW_STANDARD_CONTEXT_ASSUMPTIONS = {
  requests_standard_deviation: false,
  is_public_tender: false,
  is_mass_grouping: false,
  is_contractor_equipment: false,
  is_competition_offroad: false,
  has_body_modifications: false,
  is_rail_vehicle: false,
  es_moto_lujo_o_competicion: false,
  is_learning_vehicle: false,
  capacidad_original_mayor_8: false,
  servicio_publico_pasajeros: false,
  is_convertible_lona: false,
  is_armored: false,
  is_bomberos_policia_ejercito: false,
  is_ambulance: false,
  has_foreign_plates: false,
  is_brevet_policy: false,
  has_rc: false,
  has_ap: false,
  is_enlatado: false,
  cantidad_vehiculos: 1,
  suscriptor: "Manuel Sauma",
  extraterritorialidad: "no",
  cuotas: 1,
  selected_pricing_option: "option_1"
};

const PRICING_SAMPLE = {
  valor_asegurado: 200000,
  model_year: 2020,
  make: "Toyota",
  marca_auto: 44,
  model: "Corolla",
  vehicle_type: "auto",
  city: "La Paz",
  plaza_auto: 1,
  extraterritorialidad: "no",
  cuotas: 1,
  selected_pricing_option: "option_1"
};

const RENEWAL_SAMPLE = {
  client_id: "CLI-ACME-001",
  policy_id: "POL-AUT-2025-001",
  renewal_date: new Date().toISOString().slice(0, 10),
  price_adjustment_percent: 8,
  price_adjustment_reason: "Ajuste demo de renovación por siniestralidad histórica y exposición de plaza.",
  rating_facts: {
    valor_asegurado: 200000,
    model_year: 2020,
    make: "Toyota",
    marca_auto: 44,
    model: "Corolla",
    vehicle_type: "auto",
    city: "La Paz",
    plaza_auto: 1,
    extraterritorialidad: "no",
    cuotas: 1
  },
  node_overrides: [
    {
      target_type: "node",
      target_id: "standard.elig.descapotable_lona",
      change_type: "eligibility_exception",
      patch: { field: "outcome", from: "decline", to: "refer_authority" },
      rationale: "Excepción de renovación acotada al cliente. Requiere aprobación antes de usarla."
    }
  ]
};

function demoUwFacts(overrides = {}) {
  const year = Number(overrides.model_year || 2021);
  return {
    ...UW_STANDARD_CONTEXT_ASSUMPTIONS,
    product: "lbc_auto",
    channel: "brokers",
    client_type: "empresa",
    requests_standard_deviation: false,
    is_mass_grouping: false,
    is_public_tender: false,
    vehicle_class: "liviano",
    segment: "comercial",
    tonnage_tn: 0,
    is_heavy: false,
    has_plates: true,
    cilindrada_cc: 0,
    es_moto_lujo_o_competicion: false,
    participa_competicion: false,
    moto_proteccion_terms: false,
    valor_asegurado: 90000,
    importer: "Toyosa",
    is_rental: false,
    rented_to_petroleum: false,
    is_renewal: true,
    model_year: year,
    vehicle_age_years: Math.max(0, new Date().getFullYear() - year),
    vehicle_brand: "Toyota",
    make: "Toyota",
    marca_auto: 44,
    model: "Corolla",
    vehicle_type: "auto",
    city: "La Paz",
    plaza_auto: 1,
    siniestralidad: 20,
    siniestralidad_historica: 20,
    retroactividad_dias: 0,
    siniestro_en_periodo: false,
    circula_fuera_pais_actividad_regular: false,
    ...overrides,
  };
}

function demoCoverageFacts(overrides = {}) {
  return {
    coverage_section: "robo_parcial",
    coverage_included: true,
    event_type: "robo_partes",
    driver_alcohol_over_limit: false,
    driver_under_drugs_or_impairing_medication: false,
    intentional_act: false,
    confiscation_or_authority_measure: false,
    vehicle_type: "auto",
    foreign_territory: false,
    foreign_stay_days: 0,
    theft_consumated: true,
    parts_verified_and_valued: true,
    parts_permanently_attached_or_declared: true,
    security_measures_requested: false,
    security_measures_completed: false,
    written_security_exception: false,
    attached_clause_codes: [],
    uses_free_choice_workshop: false,
    estimated_repair_cost_percent_va: 20,
    estimated_replacement_cost_percent_va: 20,
    part_repair_cost_percent_replacement: 80,
    insured_requests_part_replacement: false,
    parts_available_local_market: true,
    local_price_over_import_price_percent: 0,
    police_report_within_6h: true,
    alcohol_test_within_6h: true,
    justified_impediment: false,
    claim_estimate_usd: 800,
    affects_only_danos_or_robo: true,
    technical_report_available: true,
    insurer_notice_days: 2,
    repair_started_without_authorization: false,
    ...overrides,
  };
}

const DEMO_CLIENTS = [
  {
    id: "CLI-MORA-001",
    name: "Mora Motors SRL",
    contact: "Laura Mora",
    broker: "Broker Andes",
    city: "La Paz",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-101",
    policy_status: "activa",
    renewal_due: "2026-08-30",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 3800,
      approved_at: "2025-08-30",
      facts: demoUwFacts({
        valor_asegurado: 90000,
        model_year: 2021,
        model: "Corolla",
        siniestralidad: 12,
        siniestralidad_historica: 12,
      }),
    },
    renewal: {
      price_adjustment_percent: -2,
      reason: "Renovación limpia: póliza activa, cero reclamos y baja siniestralidad histórica.",
      node_overrides: [],
    },
    claims: [],
  },
  {
    id: "CLI-ORIENTE-002",
    name: "Oriente Courier SRL",
    contact: "Diego Zambrana",
    broker: "Oriente Brokers",
    city: "Santa Cruz",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-118",
    policy_status: "activa",
    renewal_due: "2026-09-12",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 5080.22,
      approved_at: "2025-09-12",
      facts: demoUwFacts({
        valor_asegurado: 135000,
        model_year: 2022,
        make: "Toyota",
        vehicle_brand: "Toyota",
        model: "Hilux",
        city: "Santa Cruz",
        plaza_auto: "",
        siniestralidad: 47,
        siniestralidad_historica: 47,
      }),
    },
    renewal: {
      price_adjustment_percent: 7,
      reason: "Un reclamo reciente con aviso tardío; se propone ajuste prudente y seguimiento.",
      node_overrides: [],
    },
    claims: [
      {
        id: "SIN-2026-041",
        date: "2026-05-14",
        label: "Aviso tardío",
        status: "refer_adjuster",
        amount_usd: 1800,
        summary: "Robo parcial con documentación completa, pero aviso a la aseguradora después de 18 días.",
        narrative: "Oriente Courier reporta robo parcial de piezas de su Toyota Hilux. La cobertura de robo parcial esta incluida, hubo denuncia policial y dosaje dentro de 6 horas, las partes estaban verificadas y fijadas, no hubo territorio extranjero, pero el aviso a la aseguradora fue a los 18 dias.",
        facts: demoCoverageFacts({ claim_estimate_usd: 1800, insurer_notice_days: 18 }),
      },
    ],
  },
  {
    id: "CLI-AGROSUR-003",
    name: "AgroSur Logistica",
    contact: "Maria Fernanda Rivero",
    broker: "Oriente Brokers",
    city: "Cochabamba",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-144",
    policy_status: "activa",
    renewal_due: "2026-10-05",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 5579.17,
      approved_at: "2025-10-05",
      facts: demoUwFacts({
        valor_asegurado: 185000,
        model_year: 2019,
        make: "Suzuki",
        vehicle_brand: "Suzuki",
        model: "Vitara",
        city: "Cochabamba",
        plaza_auto: "",
        siniestralidad: 82,
        siniestralidad_historica: 82,
      }),
    },
    renewal: {
      price_adjustment_percent: 12,
      reason: "Dos eventos en la vigencia y siniestralidad alta; revisión de condiciones para renovar.",
      node_overrides: [
        {
          target_type: "node",
          target_id: "standard.elig.antique_vehicle",
          change_type: "note_only",
          patch: { note: "Cliente con historial de reclamos; revisar deducible y condiciones al renovar." },
          rationale: "Nota acotada al cliente para discusión comercial de renovación.",
        },
      ],
    },
    claims: [
      {
        id: "SIN-2026-022",
        date: "2026-03-03",
        label: "Falta denuncia",
        status: "missing_document",
        amount_usd: 2400,
        summary: "Robo parcial con monto mayor a USD 1.000 y denuncia policial no acreditada dentro de 6 horas.",
        narrative: "AgroSur Logistica reclama robo parcial de piezas en Cochabamba. La cobertura esta incluida y las piezas estaban verificadas y fijadas, pero no se acredito denuncia policial dentro de 6 horas. El estimado del reclamo es USD 2400.",
        facts: demoCoverageFacts({ claim_estimate_usd: 2400, police_report_within_6h: false }),
      },
      {
        id: "SIN-2025-117",
        date: "2025-11-19",
        label: "Cambio de parte",
        status: "partially_covered",
        amount_usd: 1300,
        summary: "El asegurado pide cambio de parte aunque reparar cuesta menos del 65% del valor de reposición.",
        narrative: "AgroSur Logistica solicita cambio de pieza por robo parcial. La parte estaba verificada y fijada, hay denuncia y dosaje en plazo, pero la reparacion cuesta 40% del valor de reposicion y el asegurado pide cambio completo.",
        facts: demoCoverageFacts({
          claim_estimate_usd: 1300,
          insured_requests_part_replacement: true,
          part_repair_cost_percent_replacement: 40,
        }),
      },
    ],
  },
  {
    id: "CLI-PAREDES-004",
    name: "Familia Paredes",
    contact: "Rodrigo Paredes",
    broker: "Capital Seguros",
    city: "Sucre",
    client_type: "consumer_individual",
    policy_id: "POL-AUT-2025-173",
    policy_status: "activa",
    renewal_due: "2026-07-21",
    underwriting: {
      outcome: "conditional_eligible",
      final_price_bob: 3200,
      approved_at: "2025-07-21",
      facts: demoUwFacts({
        client_type: "consumer_individual",
        segment: "consumer",
        valor_asegurado: 72000,
        model_year: 2003,
        vehicle_age_years: 23,
        make: "Nissan",
        vehicle_brand: "Nissan",
        model: "Patrol",
        city: "Sucre",
        plaza_auto: "",
        siniestralidad: 0,
        siniestralidad_historica: 0,
      }),
    },
    renewal: {
      price_adjustment_percent: 4,
      reason: "Sin reclamos, pero unidad antigua; renovar con validación de inspección vigente.",
      node_overrides: [],
    },
    claims: [],
  },
  {
    id: "CLI-VIEDMA-005",
    name: "Talleres Viedma SRL",
    contact: "Paola Viedma",
    broker: "Broker Andes",
    city: "Tarija",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-189",
    policy_status: "activa",
    renewal_due: "2026-11-18",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 4650,
      approved_at: "2025-11-18",
      facts: demoUwFacts({
        valor_asegurado: 118000,
        model_year: 2020,
        make: "Toyota",
        vehicle_brand: "Toyota",
        model: "RAV4",
        city: "Tarija",
        plaza_auto: "",
        siniestralidad: 34,
        siniestralidad_historica: 34,
      }),
    },
    renewal: {
      price_adjustment_percent: 5,
      reason: "Reclamo parcial con pago limitado; mantener cuenta con ajuste moderado.",
      node_overrides: [],
    },
    claims: [
      {
        id: "SIN-2026-058",
        date: "2026-06-08",
        label: "Cubierto parcial",
        status: "partially_covered",
        amount_usd: 950,
        summary: "Cambio de parte pedido por el asegurado; aplica diferencia por reparación bajo umbral.",
        narrative: "Talleres Viedma reporta robo parcial de pieza. La cobertura esta incluida, denuncia y dosaje dentro de plazo, partes verificadas y fijadas. El asegurado pide cambio de parte, pero reparar cuesta 35% del valor de reposicion.",
        facts: demoCoverageFacts({
          claim_estimate_usd: 950,
          insured_requests_part_replacement: true,
          part_repair_cost_percent_replacement: 35,
        }),
      },
    ],
  },
  {
    id: "CLI-NORTE-006",
    name: "Clinica Norte",
    contact: "Sofia Arce",
    broker: "Salud & Riesgo",
    city: "La Paz",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-207",
    policy_status: "activa",
    renewal_due: "2026-12-01",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 6900,
      approved_at: "2025-12-01",
      facts: demoUwFacts({
        valor_asegurado: 210000,
        model_year: 2023,
        make: "Toyota",
        vehicle_brand: "Toyota",
        model: "Hiace",
        city: "La Paz",
        plaza_auto: 1,
        siniestralidad: 18,
        siniestralidad_historica: 18,
      }),
    },
    renewal: {
      price_adjustment_percent: 0,
      reason: "Cuenta estable, sin accidentes y con prima suficiente para renovar sin cambio.",
      node_overrides: [],
    },
    claims: [],
  },
  {
    id: "CLI-CARGO-007",
    name: "CargoMin Bolivia",
    contact: "Victor Iriarte",
    broker: "Global Risk",
    city: "Oruro",
    client_type: "empresa",
    policy_id: "POL-AUT-2025-226",
    policy_status: "activa",
    renewal_due: "2026-09-28",
    underwriting: {
      outcome: "eligible",
      final_price_bob: 14800,
      approved_at: "2025-09-28",
      facts: demoUwFacts({
        valor_asegurado: 420000,
        model_year: 2021,
        make: "Toyota",
        vehicle_brand: "Toyota",
        model: "Land Cruiser",
        city: "Oruro",
        plaza_auto: "",
        siniestralidad: 61,
        siniestralidad_historica: 61,
      }),
    },
    renewal: {
      price_adjustment_percent: 9,
      reason: "Frecuencia moderada y operación minera; ajuste de renovación para conservar margen.",
      node_overrides: [],
    },
    claims: [
      {
        id: "SIN-2026-049",
        date: "2026-04-26",
        label: "Cubierto",
        status: "likely_covered",
        amount_usd: 800,
        summary: "Robo parcial de piezas con documentos y aviso en plazo.",
        narrative: "CargoMin Bolivia reporta robo parcial de piezas. Cobertura incluida, denuncia policial y dosaje dentro de 6 horas, piezas verificadas y fijadas, aviso en 2 dias y sin reparacion iniciada sin autorizacion.",
        facts: demoCoverageFacts({ claim_estimate_usd: 800, insurer_notice_days: 2 }),
      },
    ],
  },
];

const DEFAULT_SIM_CONTROLS = {
  coverage_price_multiplier: 1.08,
  deductible_multiplier: 1,
  accident_frequency_multiplier: 1,
  severity_multiplier: 1,
  renewal_price_change_percent: 8,
  coverage_notice_days_limit: 15,
  coverage_replacement_threshold: 70,
  coverage_alcohol_outcome: "refer_adjuster",
  coverage_moto_parts_outcome: "refer_adjuster",
  uw_antique_age_limit: 25,
  uw_rental_non_petroleum_outcome: "refer_process",
  claims_volume_factor: 1
};

const RATING_FALLBACK_SCHEMA = {
  fields: [
    { id: "valor_asegurado", label: "Valor comercial / asegurado", type: "number", unit: "BOB", required: true },
    { id: "model_year", label: "Año modelo", type: "number", required: true },
    { id: "make", label: "Marca", type: "string", required: true },
    { id: "marca_auto", label: "ID marca RUAT", type: "number", required: false },
    { id: "model", label: "Modelo", type: "string", required: true },
    { id: "city", label: "Plaza de circulación", type: "enum", values: ["La Paz", "Santa Cruz", "Cochabamba", "Tarija", "Trinidad", "Oruro", "Potosi", "Sucre"], required: true },
    { id: "plaza_auto", label: "ID plaza_auto", type: "number", required: false },
    { id: "extraterritorialidad", label: "Extraterritorialidad", type: "enum", values: ["no", "si"], required: false },
    { id: "cuotas", label: "Número de cuotas", type: "number", required: false },
    { id: "selected_pricing_option", label: "Opción", type: "enum", values: ["option_1", "option_2", "option_3"], required: false }
  ]
};

const VERDICT = {
  eligible:       { cls: "v-ok",   ico: "✓", tag: "Elegible",                  kpi: "is-ok"   },
  conditional_eligible: { cls: "v-ok", ico: "✓", tag: "Elegible condicionado", kpi: "is-ok"   },
  likely_covered: { cls: "v-ok",   ico: "✓", tag: "Probablemente cubierto",    kpi: "is-ok"   },
  ineligible:     { cls: "v-bad",  ico: "✕", tag: "No elegible",               kpi: "is-bad"  },
  decline:        { cls: "v-bad",  ico: "✕", tag: "No elegible",               kpi: "is-bad"  },
  not_covered:    { cls: "v-bad",  ico: "✕", tag: "Probablemente no cubierto", kpi: "is-bad"  },
  excluded:       { cls: "v-bad",  ico: "✕", tag: "Excluido",                  kpi: "is-bad"  },
  ESCALATE:       { cls: "v-warn", ico: "!", tag: "Escalar",                   kpi: "is-warn" },
  escalate:       { cls: "v-warn", ico: "!", tag: "Escalar",                   kpi: "is-warn" },
  missing_fact:   { cls: "v-warn", ico: "?", tag: "Falta dato",                kpi: "is-warn" },
  conflict_escalation: { cls: "v-warn", ico: "!", tag: "Conflicto a revisar",  kpi: "is-warn" }
};

/* ---------- helpers ---------- */
const UI_TERMS = {
  all: "Todos",
  source: "Fuente",
  uw: "Suscripción",
  coverage: "Reclamos",
  underwriting: "Suscripción",
  claims: "Reclamos",
  listo: "listo",
  ready: "listo",
  buildable_now: "listo",
  bloqueado: "bloqueado",
  gated: "bloqueado",
  blocked: "bloqueado",
  open: "abierto",
  closed: "cerrado",
  source_observed: "observado en fuente",
  published: "publicado",
  draft: "borrador",
  draft_verified_by_validator: "borrador verificado",
  eligible: "Elegible",
  conditional_eligible: "Elegible condicionado",
  decline: "No elegible",
  refer_authority: "Derivar a autoridad",
  refer_process: "Derivar a proceso",
  refer_line: "Derivar a línea",
  likely_covered: "Probablemente cubierto",
  conditionally_covered: "Cubierto condicionado",
  partially_covered: "Cubierto parcialmente",
  refer_adjuster: "Derivar a ajustador",
  likely_covered: "Probablemente cubierto",
  not_covered: "Probablemente no cubierto",
  missing_fact: "Falta dato",
  missing_document: "Falta documento",
  conflict_escalation: "Conflicto a revisar",
  human_pricing_review: "Revisión humana de precio",
  priced_lbc_auto: "Precio LBC Auto calculado",
  priced_demo: "Precio demo calculado",
  city_mapped_to_resto: "Plaza mapeada a resto",
  city_not_in_lbc_calibration_used_la_paz_factor: "Plaza fuera de calibración LBC",
  brand_not_in_lbc_calibration_used_toyota_factor: "Marca fuera de calibración LBC",
  vehicle_age_over_20: "Antigüedad mayor a 20 años",
  extreme_siniestralidad_demo_review: "Siniestralidad extrema",
  high_value_demo_review: "Valor alto para revisión demo",
  blocked_by_uw_outcome: "bloqueado por resultado de suscripción",
  missing_rating_input: "faltan datos de tarificación",
  approved_final_price: "precio final aprobado",
  requires_pricing_review: "requiere revisión de tarificación",
  needs_human_input: "requiere input humano",
  needs_client_followup: "esperando dato del cliente",
  needs_fact_confirmation: "datos por incorporar",
  human_task_created: "tarea humana creada",
  ran_tree: "evaluado por RiskIQ",
  governance_or_manual_review: "gobernanza o revisión manual",
  pending: "pendiente",
  review: "revisión",
  priced: "tarificado",
  submitted: "enviado",
  conflict: "conflicto",
  row_conflict: "conflicto de fila",
  flag: "alerta",
  flags: "alertas",
  band_boundary_flag: "alerta de límite de banda",
  conflict_flag: "alerta de conflicto",
  inconsistency_flag: "alerta de inconsistencia",
  price_adjustment: "ajuste de precio",
  threshold_override: "excepción de umbral",
  routing_override: "excepción de ruteo",
  eligibility_exception: "excepción de elegibilidad",
  coverage_exception: "excepción de cobertura",
  fact_override: "excepción de hecho",
  note_only: "solo nota",
  client_policy_renewal: "renovación cliente/póliza",
  router: "enrutador",
  gate: "compuerta",
  condition: "condición",
  accumulator: "acumulador",
  referral: "derivación",
  node: "nodo",
  nodes: "nodos",
  target: "objetivo",
  process: "proceso",
  authority: "autoridad",
  terminal: "terminal",
  branch: "rama",
  advance: "avanza",
  pass: "pasa",
  fail: "falla",
  stop: "detiene",
  fired: "activado",
  unknown: "desconocido",
  unknown_key: "clave desconocida",
  none: "ninguno",
  pricing: "Tarificación",
  claims_accidents: "Siniestros",
  underwriting_ops: "Suscripción",
  robo_partes: "Robo de partes",
  robo_partes_moto: "Robo de partes (moto)",
  alcoholemia: "Alcohol sobre el límite",
  aviso_tardio: "Aviso fuera de plazo",
  reemplazo_parte: "Reemplazo de parte",
  dosaje_faltante_menor: "Sin prueba de alcoholemia"
};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uiTerm = (s) => {
  const raw = String(s ?? "");
  const key = raw.trim();
  const norm = key.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return UI_TERMS[key] || UI_TERMS[norm] || null;
};
const titleCase = (s) => uiTerm(s) || String(s ?? "").replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (v) => typeof v === "boolean" ? (v ? "sí" : "no") : Array.isArray(v) ? (v.length ? v.join(", ") : "∅") : (v === null || v === undefined || v === "" ? "—" : String(v));
const moneyBob = (v) => Number(v || 0).toLocaleString("es-BO", { maximumFractionDigits: 0 });
const signedMoneyBob = (v) => `${Number(v || 0) >= 0 ? "+" : "-"}${moneyBob(Math.abs(Number(v || 0)))}`;
const signedNumber = (v, digits = 1) => `${Number(v || 0) >= 0 ? "+" : ""}${Number(v || 0).toFixed(digits)}`;
const pctPoint = (v) => `${signedNumber(Number(v || 0) * 100, 1)} pp`;
const truncate = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const hasValor = (v) => v !== null && v !== undefined && v !== "";

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }
async function postJSON(url, body, role) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(role ? { "X-Role": role } : {}) }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = "toast"; }, 2600);
}

/* ---------- app state ---------- */
const DEFAULT_ROUTE = "simple_chat";
const state = {
  route: DEFAULT_ROUTE,
  cache: { versions: null, engines: null, discovery: null, health: null, defs: {}, graph: {}, flags: {}, ledger: null, drafts: null, ratingSchema: null, simulationFilters: null, simulationCandidates: null, portfolio: null },
  runner: {
    engine: "uw",
    values: { uw: {}, coverage: {} },
    chat: { uw: { text: "", attachments: [], result: null }, coverage: { text: "", attachments: [], result: null } },
    demo: { uw: { text: DEMO_TEXT.uw, result: null, step: 0, active: false }, coverage: { text: DEMO_TEXT.coverage, result: null, step: 0, active: false } },
    result: null,
    mode: "form",
    ratingWeights: null,
    caseSettings: { ...SIMPLE_CHAT_CASE_DEFAULTS },
    selectedClientId: null,
    selectedClaimId: null
  },
  renewal: { values: JSON.parse(JSON.stringify(RENEWAL_SAMPLE)), result: null, saved: null, selectedClientId: null },
  simple_chat: {
    scenario: "chat",
    result: null,
    local: { sessions: [], session: null, text: "", engine: "auto", selectedClientId: "", caseSettings: { ...SIMPLE_CHAT_CASE_DEFAULTS } }
  },
  clients: { selectedClientId: "CLI-MORA-001" },
  graph: { engine: "uw", selected: null, query: "", mode: "map" },
  flags: { engine: "all", selected: null, query: "", mode: "flags" },
  ledger: { selected: null },
  simulation: {
    filters: { engine: "all", age_min: "", age_max: "", cities: "", brokers: "", business_types: "", vehicle_makes: "", policy_types: "", claim_causes: "" },
    controls: { ...DEFAULT_SIM_CONTROLS },
    candidate_id: "growth_sandbox",
    domain: "suscripcion",
    result: null
  },
  supervision: { result: null, baseline: null },
  recorrido: { clientId: null, messages: [], facts: {}, result: null, task: null, status: "idle", busy: false, text: "" },
  bandeja: { tasks: [], selectedId: null, preview: null, answerText: "", busy: false }
};

/* ---------- data loaders (cached) ---------- */
async function loadCore() {
  try { state.cache.versions = await getJSON("/api/graph-versions"); } catch { state.cache.versions = []; }
  try { state.cache.engines = await getJSON("/api/engines"); } catch { state.cache.engines = [{ id: "uw", label: "Suscripción" }, { id: "coverage", label: "Reclamos" }]; }
  getJSON("/api/health").then((h) => { state.cache.health = h; renderHealth(h); }).catch(() => renderHealth(null));
  getJSON("/api/data-discovery").then((d) => { state.cache.discovery = d; }).catch(() => {});
}
async function defs(engine) {
  if (!state.cache.defs[engine]) { try { state.cache.defs[engine] = await getJSON(`/api/facts?engine=${engine}`); } catch { state.cache.defs[engine] = {}; } }
  return state.cache.defs[engine];
}
async function graphData(engine) {
  if (!state.cache.graph[engine]) state.cache.graph[engine] = await getJSON(`/api/graph?engine=${engine}`);
  return state.cache.graph[engine];
}
async function alertasData(engine) {
  if (!state.cache.flags[engine]) state.cache.flags[engine] = await getJSON(`/api/flags?engine=${engine}`);
  return state.cache.flags[engine];
}
async function ledgerList() {
  if (!state.cache.ledger) state.cache.ledger = await getJSON("/api/ledger");
  return state.cache.ledger;
}
async function drafts() { state.cache.drafts = await getJSON("/api/proposals"); return state.cache.drafts; }
async function ratingSchema() {
  if (!state.cache.ratingSchema) {
    try { state.cache.ratingSchema = await getJSON("/api/rating/schema"); }
    catch { state.cache.ratingSchema = RATING_FALLBACK_SCHEMA; }
  }
  return state.cache.ratingSchema;
}
async function simulationFilters() {
  if (!state.cache.simulationFilters) state.cache.simulationFilters = await getJSON("/api/simulations/filters");
  return state.cache.simulationFilters;
}
async function simulationCandidates() {
  if (!state.cache.simulationCandidates) state.cache.simulationCandidates = await getJSON("/api/simulations/candidates");
  return state.cache.simulationCandidates;
}
async function runSimulationPayload(payload) {
  return postJSON("/api/simulations/run", payload, "simulation_user");
}
async function supervisionPayload(payload = {}) {
  return Object.keys(payload || {}).length ? postJSON("/api/supervision", payload, "supervision_user") : getJSON("/api/supervision");
}
async function renewalList() { state.renewal.saved = await getJSON("/api/renewals"); return state.renewal.saved; }
async function portfolioData(force = false) {
  if (force || !state.cache.portfolio) state.cache.portfolio = await getJSON("/api/portfolio");
  return state.cache.portfolio;
}
function discovery() { return state.cache.discovery || { downstream_verdict: {} }; }
function versionFor(engine) { return (state.cache.versions || []).find((v) => v.engine === engine); }
function registeredMotors() {
  const list = Array.isArray(state.cache.engines) ? state.cache.engines : [];
  return list.length ? list : [{ id: "uw", label: "Suscripción" }, { id: "coverage", label: "Reclamos" }];
}
function engineLabel(id) {
  if (id === "auto") return "Automático";
  if (id === "renewal") return "Renovación";
  if (id === "coverage" || id === "claims") return "Reclamos";
  const spec = registeredMotors().find((e) => e.id === id);
  return spec ? (spec.label || titleCase(spec.id)) : titleCase(id);
}
function engineSegment(id, current) {
  return `<div class="seg" id="${id}">${registeredMotors().map((engine) =>
    `<button class="seg-btn ${current === engine.id ? "active" : ""}" data-engine="${esc(engine.id)}">${esc(engineLabel(engine.id))}</button>`
  ).join("")}</div>`;
}

function exampleNarrative(engine, variant = "clean") {
  const key = engine === "claims" ? "coverage" : engine;
  if (key === "uw" && variant === "review") return DEMO_TEXT.uw_review;
  return DEMO_TEXT[key] || DEMO_TEXT.uw;
}

function activeInputModeId() {
  if ($("#demo-input-mode")) return "demo-input-mode";
  return "input-mode";
}

function loadCaseExampleText(engine, variant = "clean", isDemo = false) {
  const text = exampleNarrative(engine, variant);
  const label = engine === "uw" && UW_EXAMPLES[variant] ? UW_EXAMPLES[variant].label : `${engineLabel(engine)} demo`;
  state.runner.values[engine] = {};
  state.runner.result = null;
  state.runner.chat[engine] = { text, attachments: [], result: null };
  state.runner.demo[engine] ||= { text: "", result: null, step: 0, active: false };
  state.runner.demo[engine].text = text;
  state.runner.demo[engine].result = null;
  state.runner.demo[engine].step = 0;
  state.runner.demo[engine].active = false;
  renderForm(); syncJson();
  setInputMode("chat", isDemo ? "demo-input-mode" : activeInputModeId());
  renderChat();
  markExampleTextarea("#chat-input", "#chat-loaded-note", `Ejemplo cargado aquí: ${label}`);
  if ($("#result-body")) $("#result-body").innerHTML = isDemo ? emptyDemoResult() : emptyResult();
  if ($("#audit-id")) $("#audit-id").textContent = "";
  if (!isDemo) {
    setKpi("—", engine === "coverage" ? "pendiente de evaluar" : "Aún no ejecutado", "");
    const steps = $("#kpi-steps");
    if (steps) steps.textContent = "0";
    setRunFourthKpi(null);
    refreshFactCount();
  }
}

function markExampleTextarea(inputSelector, noteSelector, message) {
  const input = $(inputSelector);
  if (!input) return;
  input.focus({ preventScroll: true });
  input.setSelectionRange(0, 0);
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.classList.remove("example-loaded");
  void input.offsetWidth;
  input.classList.add("example-loaded");
  const note = $(noteSelector);
  if (note) {
    note.textContent = message;
    note.classList.remove("hidden");
    clearTimeout(note._hideTimer);
    note._hideTimer = setTimeout(() => note.classList.add("hidden"), 4500);
  }
}

/* ---------- shell ---------- */
function renderNav() {
  const groups = {};
  for (const m of MODULES) (groups[m.group] ||= []).push(m);
  let html = "";
  for (const [group, mods] of Object.entries(groups)) {
    html += `<p class="nav-label">${esc(group)}</p>`;
    for (const m of mods) {
      html += `<button class="nav-item ${state.route === m.id ? "active" : ""}" data-route="${m.id}">
        <span class="nav-ico">${m.icon}</span><span class="nav-name">${esc(m.name)}</span>
        ${m.status === "gated" ? '<span class="nav-tag">pronto</span>' : ""}</button>`;
    }
  }
  $("#nav").innerHTML = html;
  $$("#nav .nav-item").forEach((b) => b.addEventListener("click", () => go(b.dataset.route)));
}

function setTopbar(title, sub, actionsHtml) {
  $("#page-title").textContent = title;
  $("#page-sub").textContent = sub || "";
  $("#topbar-actions").innerHTML = actionsHtml || "";
  $("#back-btn").classList.toggle("hidden", state.route === DEFAULT_ROUTE || state.route === "home");
}

function renderHealth(health) {
  const dot = $("#health-dot"), txt = $("#health-text");
  if (health && health.ok) { dot.className = "dot dot-live"; txt.textContent = "Motor validado · VERDE"; }
  else if (health) { dot.className = "dot dot-warn"; txt.textContent = "Incidencias de validador"; }
  else { dot.className = "dot dot-bad"; txt.textContent = "Motor offline"; }
}

/* ---------- router ---------- */
const VIEWS = {}; // filled below
function routeFromHash() {
  const raw = String(window.location.hash || "").replace(/^#\/?/, "").trim();
  return !raw || raw === "home" ? DEFAULT_ROUTE : raw;
}
function syncHash(route) {
  const target = route === DEFAULT_ROUTE || route === "home" ? "" : `#${route}`;
  if (window.location.hash === target) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${target}`);
}
function go(route, params, opts = {}) {
  const requested = route === "home" ? DEFAULT_ROUTE : route;
  const nextRoute = VIEWS[requested] ? requested : DEFAULT_ROUTE;
  state.route = nextRoute;
  if (!opts.skipHashSync) syncHash(nextRoute);
  document.body.classList.toggle("home-route", nextRoute === "home");
  renderNav();
  window.scrollTo(0, 0);
  VIEWS[nextRoute](params || {});
}

/* =====================================================================
   VIEW: HOME (launcher)
   ===================================================================== */
VIEWS.home = async function () {
  setTopbar("Inicio", "Accesos a los flujos operativos de RiskIQ.", "");

  const groups = {};
  for (const m of MODULES) (groups[m.group] ||= []).push(m);

  let cards = "";
  for (const [group, mods] of Object.entries(groups)) {
    cards += `<p class="home-group">${esc(group)}</p><div class="home-grid">`;
    for (const m of mods) {
      const gated = m.status === "gated";
      const reason = gated ? gateReason(m.gateKey) : "";
      cards += `<button class="mod-card ${gated ? "is-gated" : ""}" data-route="${m.id}">
        <div class="mod-top"><span class="mod-ico">${m.icon}</span>
          <span class="badge ${gated ? "badge-amber" : "badge-ok"}">${gated ? "bloqueado" : "listo"}</span></div>
        <h3 class="mod-name">${esc(m.name)}</h3>
        <p class="mod-desc">${esc(m.desc)}</p>
        ${gated ? `<p class="mod-gate">🔒 ${esc(reason)}</p>` : `<span class="mod-go">Abrir →</span>`}
      </button>`;
    }
    cards += `</div>`;
  }

  $("#view").innerHTML = `
    <div class="home">
      <header class="home-head">
        <h2 class="home-brand">Risk<strong>IQ</strong></h2>
        <p class="home-tag">Elige un flujo para continuar. El chat queda como pantalla principal en la URL base.</p>
      </header>
      ${cards}
    </div>`;

  $$("#view .mod-card").forEach((c) => c.addEventListener("click", () => go(c.dataset.route)));
};

function gateReason(key) {
  const v = (discovery().downstream_verdict || {})[key] || "gated";
  return String(v).replace(/^gated_/, "").replace(/_/g, " ");
}

/* =====================================================================
   VIEW: CLIENTES
   ===================================================================== */
VIEWS.clients = async function () {
  const data = await portfolioData(true).catch(() => null);
  if (!data) {
    toast("No se pudo cargar Clientes", true);
    return;
  }
  const selectedId = state.clients.selectedClientId || ((data.tables?.clients || [])[0] || {}).client_id || "";
  state.clients.selectedClientId = selectedId;
  const selected = (data.tables?.clients || []).find((row) => row.client_id === selectedId);
  setTopbar(
    "Clientes",
    "Base operacional conectada: clientes, pólizas, vehículos, suscripción, reclamos, renovaciones y eventos.",
    `<span class="badge badge-ok">${esc((data.summary || {}).client_count || 0)} clientes</span>
     <span class="badge badge-amber">${esc((data.summary || {}).event_count || 0)} eventos chat</span>`
  );

  $("#view").innerHTML = `
    <div class="clients-page">
      <section class="client-browser clients-master">
        <div class="client-browser-head">
          <div>
            <span class="client-browser-kicker">Tabla maestra</span>
            <h2>Clientes</h2>
            <p>Haz clic en una fila para filtrar las tablas relacionadas por llave foránea.</p>
          </div>
          <div class="client-browser-stats">
            <span><b>${esc((data.summary || {}).policy_count || 0)}</b> pólizas</span>
            <span><b>${esc((data.summary || {}).claim_count || 0)}</b> reclamos</span>
            <span><b>${esc((data.summary || {}).clean_client_count || 0)}</b> limpios</span>
          </div>
        </div>
        <div class="client-table-wrap">${clientsMasterTable(data.tables?.clients || [], selectedId)}</div>
      </section>

      ${selected ? `<section class="client-browser">
        <div class="client-detail">
          <div class="client-detail-main">
            <span class="client-browser-kicker">Cliente seleccionado</span>
            <h3>${esc(selected.client_name)}</h3>
            <p>${esc(selected.client_id)} · ${esc(selected.broker)} · ${esc(selected.city)} · LR ${Number(selected.loss_ratio || 0).toFixed(2)}</p>
          </div>
          <div class="client-detail-actions">
            <button class="btn btn-ghost" id="client-open-uw">Abrir en Suscripción</button>
            <button class="btn btn-ghost" id="client-open-claims">Abrir en Reclamos</button>
            <button class="btn btn-primary" id="client-open-renewal">Abrir en Renovación</button>
          </div>
        </div>
      </section>` : ""}

      ${bandHead("Tablas relacionadas", "filtradas por client_id / policy_id")}
      <section class="supervision-grid clients-grid">
        ${tableCard("Pólizas", portfolioTableRows("policies", relatedRows(data, "policies", selectedId)))}
        ${tableCard("Vehículos", portfolioTableRows("vehicles", relatedRows(data, "vehicles", selectedId)))}
        ${tableCard("Paquetes de suscripción", portfolioTableRows("underwriting_packets", relatedRows(data, "underwriting_packets", selectedId)))}
        ${tableCard("Reclamos", portfolioTableRows("claims", relatedRows(data, "claims", selectedId)))}
        ${tableCard("Renovaciones base", portfolioTableRows("renewal_terms", relatedRows(data, "renewal_terms", selectedId)))}
        ${tableCard("Eventos creados desde chat", portfolioEventRows(relatedRows(data, "events", selectedId)))}
      </section>

      ${bandHead("Esquema", "llaves foráneas operativas")}
      <section class="client-browser schema-card">
        <div class="card-body">${foreignKeyRows(data.schema?.foreign_keys || [])}</div>
      </section>
    </div>`;

  $$("#view .client-row-link").forEach((row) => row.addEventListener("click", () => {
    state.clients.selectedClientId = row.dataset.clientId;
    VIEWS.clients();
  }));
  $("#client-open-uw")?.addEventListener("click", () => openClientInFlow(selectedId, "uw"));
  $("#client-open-claims")?.addEventListener("click", () => openClientInFlow(selectedId, "claims"));
  $("#client-open-renewal")?.addEventListener("click", () => openClientInFlow(selectedId, "renewals"));
  bindPortfolioEventButtons();
};

function clientsMasterTable(rows, selectedId) {
  return `<table class="client-table"><thead><tr><th>Cliente</th><th>Broker</th><th>Ciudad</th><th>Pólizas</th><th>Reclamos</th><th>LR</th></tr></thead><tbody>
    ${rows.map((row) => `<tr class="client-row client-row-link ${row.client_id === selectedId ? "selected" : ""}" data-client-id="${esc(row.client_id)}">
      <td><b>${esc(row.client_name)}</b><div class="sim-sub">${esc(row.client_id)} · ${esc(titleCase(row.client_type))}</div></td>
      <td>${esc(row.broker)}<div class="sim-sub">${esc(row.contact || "")}</div></td>
      <td>${esc(row.city)}</td>
      <td class="num">${esc(row.policy_count)}</td>
      <td class="num">${esc(row.claim_count)}</td>
      <td class="num">${Number(row.loss_ratio || 0).toFixed(2)}</td>
    </tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function relatedRows(data, table, clientId) {
  const rows = (data.tables && data.tables[table]) || [];
  if (!clientId) return rows;
  return rows.filter((row) => row.client_id === clientId);
}

function portfolioTableRows(table, rows) {
  const columnsByTable = {
    policies: ["policy_id", "client_id", "vehicle_id", "status", "product", "current_premium_bob", "renewal_due"],
    vehicles: ["vehicle_id", "policy_id", "make", "model", "model_year", "vehicle_class", "valor_asegurado"],
    underwriting_packets: ["underwriting_packet_id", "policy_id", "outcome", "approved_at", "final_price_bob"],
    claims: ["claim_id", "policy_id", "date", "label", "status", "amount_usd"],
    renewal_terms: ["renewal_id", "policy_id", "renewal_due", "price_adjustment_percent", "reason"],
  };
  const columns = columnsByTable[table] || Object.keys(rows[0] || {}).slice(0, 7);
  return `<table class="gtable"><thead><tr>${columns.map((column) => `<th>${esc(titleCase(column))}</th>`).join("")}</tr></thead><tbody>
    ${rows.map((row) => `<tr class="gtr">${columns.map((column) => `<td class="${typeof row[column] === "number" ? "num" : ""}">${esc(fmtPortfolioCell(row[column]))}</td>`).join("")}</tr>`).join("") || emptyTableRow(columns.length || 1)}
  </tbody></table>`;
}

function portfolioEventRows(rows) {
  return `<table class="gtable"><thead><tr><th>Evento</th><th>Tipo</th><th>Cliente</th><th>Estado</th><th>Listo</th><th></th></tr></thead><tbody>
    ${rows.map((event) => `<tr class="gtr"><td class="mono">${esc(event.event_id)}</td><td>${esc(titleCase(event.event_type))}</td><td>${esc(event.client_name || event.client_id || "—")}</td><td>${esc(titleCase(event.status))}</td><td>${event.ready_to_execute ? "sí" : "no"}</td><td><button class="btn btn-ghost event-load-btn" data-event-id="${esc(event.event_id)}">Cargar</button></td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function foreignKeyRows(rows) {
  return `<table class="gtable"><thead><tr><th>Desde</th><th>Hacia</th></tr></thead><tbody>
    ${rows.map((row) => `<tr class="gtr"><td class="mono">${esc(row.from)}</td><td class="mono">${esc(row.to)}</td></tr>`).join("") || emptyTableRow(2)}
  </tbody></table>`;
}

function portfolioOpsSection(data) {
  if (!data) return "";
  const events = ((data.tables || {}).events || []).slice(0, 8);
  const clients = ((data.tables || {}).clients || []).slice(0, 8);
  return `${bandHead("Datos operativos vivos", "clientes y eventos creados desde Chat")}
    <section class="supervision-grid">
      ${tableCard("Eventos de chat", portfolioEventRows(events))}
      ${tableCard("Clientes operativos", clientsMasterTable(clients, state.clients.selectedClientId))}
    </section>`;
}

function fmtPortfolioCell(value) {
  if (value && typeof value === "object") return Array.isArray(value) ? `${value.length} filas` : `${Object.keys(value).length} campos`;
  return fmt(value);
}

async function openClientInFlow(clientId, route) {
  if (route === "claims") {
    state.runner.selectedClientId = clientId;
    go("claims");
    return;
  }
  if (route === "renewals") {
    state.renewal.selectedClientId = clientId;
    go("renewals");
    return;
  }
  const data = await portfolioData();
  const packet = (data.tables?.underwriting_packets || []).find((row) => row.client_id === clientId);
  if (packet) state.runner.values.uw = compactFacts(packet.facts || {});
  go("uw");
}

/* =====================================================================
   VIEW: STAKEHOLDER DEMO
   ===================================================================== */
VIEWS.demo = async function () {
  // The demo runs on the UW engine. The left column mirrors the chat experience; the
  // right column animates the exact nodes the real engine visited for the loaded client.
  state.runner.engine = "uw";
  await defs("uw");
  const schema = await ratingSchema();
  state.runner.ratingWeights ||= JSON.parse(JSON.stringify(schema.calibration || schema.weights || {}));

  setTopbar(
    "Recorrido demo",
    "Carga un cliente pre-escrito y mira el árbol recorrerse nodo por nodo, igual que en el chat.",
    `<button class="btn btn-ghost" id="recorrido-reset-btn">Reiniciar</button>`
  );

  $("#view").innerHTML = `
    <div class="recorrido-workspace">
      <section class="chat-col recorrido-chat">
        ${recorridoClientPicker()}
        <div class="chat-thread" id="recorrido-thread">${recorridoMessages()}</div>
        <div class="composer-area">
          <div class="composer">
            <textarea id="recorrido-input" class="composer-input" rows="1" spellcheck="true" placeholder="Escribe como el cliente para sumar datos…">${esc(state.recorrido.text || "")}</textarea>
            <button class="composer-send" id="recorrido-send" title="Enviar" aria-label="Enviar">↑</button>
          </div>
          <div class="composer-bar">
            <span class="composer-hint">Carga un cliente arriba · Enter envía · Shift+Enter salto</span>
          </div>
        </div>
      </section>
      <aside class="card result-card recorrido-stage-card">
        <div class="card-head"><h2>Recorrido del árbol</h2><span class="audit-id" id="audit-id"></span></div>
        <div class="card-body" id="result-body">${emptyDemoResult()}</div>
      </aside>
    </div>`;

  bindRecorridoControls();
  renderRecorridoStage();
  const thread = $("#recorrido-thread");
  if (thread) thread.scrollTop = thread.scrollHeight;
};

function recorridoClientPicker() {
  const active = state.recorrido.clientId;
  const trees = [];
  for (const c of DEMO_RECORRIDO_CLIENTS) {
    const label = c.tree || "Otros";
    let group = trees.find((t) => t.label === label);
    if (!group) { group = { label, clients: [] }; trees.push(group); }
    group.clients.push(c);
  }
  const groups = trees.map((group) => {
    const chips = group.clients.map((c) => `
      <button class="recorrido-client ${active === c.id ? "active" : ""}" data-client="${esc(c.id)}">
        <span class="recorrido-client-dot ${c.intervention ? "warn" : "ok"}"></span>
        <span class="recorrido-client-main"><b>${esc(c.name)}</b><span>${esc(c.subtitle)}</span></span>
      </button>`).join("");
    return `<div class="recorrido-tree-group">
      <span class="recorrido-tree-label">${esc(group.label)}</span>
      <div class="recorrido-clients-row">${chips}</div>
    </div>`;
  }).join("");
  return `<div class="recorrido-clients">
    <span class="recorrido-clients-label">Cliente pre-escrito (no se guarda) · un caso por árbol</span>
    ${groups}
  </div>`;
}

function recorridoMessages() {
  const messages = state.recorrido.messages || [];
  if (!messages.length) return `<div class="chat-empty">
    <div class="chat-empty-mark">▷</div>
    <p class="chat-empty-title">Elige un cliente para iniciar</p>
    <p class="chat-empty-sub">Cliente A pasa elegible y tarificado sin intervención. Cliente B se detiene en un dato que decide el suscriptor y crea una tarea en la Bandeja.</p>
  </div>`;
  return messages.map((m) => {
    if (m.sender === "sistema") return `<div class="msg-sys">${esc(m.text)}</div>`;
    const isUser = m.sender === "cliente";
    const who = isUser ? "user" : "bot";
    const label = isUser ? (state.recorrido.clientName || "Cliente") : "RiskIQ";
    const avatar = isUser ? esc(label.slice(0, 1)) : "◌";
    return `<div class="msg msg-${who}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-name">${esc(label)}</div>
        <div class="msg-text">${esc(m.text)}</div>
      </div>
    </div>`;
  }).join("");
}

function pushRecorridoMsg(sender, text) {
  state.recorrido.messages.push({ sender, text });
}

function refreshRecorridoThread() {
  const thread = $("#recorrido-thread");
  if (thread) { thread.innerHTML = recorridoMessages(); thread.scrollTop = thread.scrollHeight; }
  const picker = $(".recorrido-clients");
  if (picker) picker.outerHTML = recorridoClientPicker();
  bindRecorridoClientChips();
}

function recorridoStageEmpty() {
  return `<div class="empty demo-empty"><div class="empty-ico">▷</div><p class="empty-title">Sin recorrido todavía</p>
    <p class="empty-sub">Carga un cliente: RiskIQ confirma los datos y el árbol se recorre aquí, nodo por nodo, hasta el dictamen.</p></div>`;
}

function renderRecorridoStage() {
  if (state.recorrido.result) renderWalkthroughResult(state.recorrido.result);
  else $("#result-body").innerHTML = recorridoStageEmpty();
}

function bindRecorridoClientChips() {
  $$(".recorrido-client").forEach((b) => b.addEventListener("click", () => loadDemoClient(b.dataset.client)));
}

function bindRecorridoControls() {
  bindRecorridoClientChips();
  $("#recorrido-reset-btn")?.addEventListener("click", () => {
    state.recorrido = { clientId: null, messages: [], facts: {}, result: null, task: null, status: "idle", busy: false, text: "" };
    state.runner.result = null;
    demoState().active = false; demoState().step = 0;
    refreshRecorridoThread(); renderRecorridoStage();
    toast("Recorrido reiniciado");
  });
  const input = $("#recorrido-input");
  if (input) {
    const grow = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; };
    input.addEventListener("input", (e) => { state.recorrido.text = e.target.value; grow(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRecorridoMessage(); } });
    grow();
  }
  $("#recorrido-send")?.addEventListener("click", sendRecorridoMessage);
}

async function loadDemoClient(clientId) {
  const client = DEMO_RECORRIDO_CLIENTS.find((c) => c.id === clientId);
  if (!client || state.recorrido.busy) return;
  const engine = client.engine || "uw";
  state.runner.engine = engine;
  state.recorrido = {
    clientId: client.id, clientName: client.name, engine, messages: [], facts: { ...client.facts },
    result: null, task: null, status: "loading", busy: true, text: ""
  };
  pushRecorridoMsg("cliente", client.narrative);
  pushRecorridoMsg("sistema", `Cliente nuevo cargado (no se guarda en la base): ${client.name}.`);
  if (client.note) pushRecorridoMsg("sistema", client.note);
  refreshRecorridoThread();
  await defs(engine).catch(() => {});
  await runRecorrido(client);
  state.recorrido.busy = false;
}

async function runRecorrido(client) {
  const engine = client.engine || "uw";
  state.runner.engine = engine;
  try {
    const endpoint = engine === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const role = engine === "uw" ? "uw_user" : "claims_user";
    const body = { facts: state.recorrido.facts, facts_confirmed: true };
    if (engine === "uw") {
      body.include_pricing = true;
      body.rating_weights = state.runner.ratingWeights;
    }
    const data = await postJSON(endpoint, body, role);
    state.recorrido.result = data;
    state.runner.values[engine] = compactFacts({ ...state.recorrido.facts });
    state.runner.result = data;
    demoState().active = true; demoState().step = -1;

    const packet = data.human_packet;
    const factCount = Object.keys(compactFacts(state.recorrido.facts)).length;
    const treeWord = client.tree === "Reclamos" ? "el árbol de reclamos"
      : client.tree === "Renovación" ? "el árbol base de la renovación"
      : "el árbol";
    pushRecorridoMsg("riskiq", `Confirmé ${factCount} datos del caso y recorrí ${treeWord}. Mira el recorrido nodo por nodo a la derecha.`);
    if (packet && shouldCreateHumanTaskClient(packet)) {
      const task = await postJSON("/api/human-tasks", {
        packet, initial_slip: client.narrative, source_channel: "demo", source_sender: client.name
      }, "chat_agent");
      state.recorrido.task = task;
      state.recorrido.status = "human_task";
      pushRecorridoMsg("riskiq", `El árbol se detuvo en “${packet.question || "un dato que necesita criterio"}”. Pasé el caso a ${task.owner_name || "Santiago Bustillos"} con todo el paquete.`);
      pushRecorridoMsg("sistema", `Tarea ${task.task_id} creada en la Bandeja de tareas → resuélvela ahí para reanudar el árbol.`);
    } else if (packet && packet.resolution_channel === "client_followup") {
      state.recorrido.status = "client_followup";
      pushRecorridoMsg("riskiq", `El árbol se detuvo porque falta un dato: ${packet.question || packet.requested_fact || "un dato del caso"}. Respóndelo en el chat y sigo el recorrido.`);
    } else if (engine === "coverage") {
      state.recorrido.status = "done";
      pushRecorridoMsg("riskiq", `Dictamen orientativo: ${titleCase(data.outcome || "evaluado")}. Revisa el detalle del recorrido a la derecha.`);
    } else if (data.outcome === "eligible" || data.outcome === "conditional_eligible") {
      const price = (data.pricing && data.pricing.status === "approved_final_price");
      state.recorrido.status = "done";
      const renew = client.tree === "Renovación";
      pushRecorridoMsg("riskiq", price
        ? `Resultado: ${titleCase(data.outcome)} y ${renew ? "prima de renovación recalculada" : "precio final aprobado"}, sin intervención humana.`
        : `Resultado: ${titleCase(data.outcome)}. Revisa el dictamen a la derecha.`);
    } else {
      state.recorrido.status = "done";
      pushRecorridoMsg("riskiq", `Resultado: ${titleCase(data.outcome || "dictamen")}. Revisa el detalle a la derecha.`);
    }
  } catch (err) {
    state.recorrido.status = "error";
    pushRecorridoMsg("sistema", "No se pudo correr el árbol — ¿está levantado el servidor?");
  }
  refreshRecorridoThread();
  renderRecorridoStage();
}

function shouldCreateHumanTaskClient(packet) {
  return packet && packet.needs_human_task !== false && packet.resolution_channel !== "client_followup";
}

async function sendRecorridoMessage() {
  const text = ($("#recorrido-input")?.value || state.recorrido.text || "").trim();
  if (!text) { toast("Escribe un mensaje primero", true); return; }
  if (!state.recorrido.clientId) { toast("Carga primero un cliente", true); return; }
  if (state.recorrido.busy) return;
  state.recorrido.busy = true; state.recorrido.text = "";
  const input = $("#recorrido-input"); if (input) { input.value = ""; input.style.height = "auto"; }
  pushRecorridoMsg("cliente", text);
  refreshRecorridoThread();
  const engine = state.recorrido.engine || "uw";
  const role = engine === "uw" ? "uw_user" : "claims_user";
  try {
    const extraction = await postJSON("/api/nl/extract-facts", { engine, text }, role);
    const added = {};
    for (const [k, item] of Object.entries(extraction.facts || {})) {
      if (item && typeof item === "object" && "value" in item && hasValor(item.value)) added[k] = item.value;
    }
    if (Object.keys(added).length) {
      state.recorrido.facts = { ...state.recorrido.facts, ...added };
      pushRecorridoMsg("sistema", `Datos añadidos: ${Object.keys(added).join(", ")}.`);
      const client = DEMO_RECORRIDO_CLIENTS.find((c) => c.id === state.recorrido.clientId) || { narrative: text, name: state.recorrido.clientName };
      await runRecorrido(client);
    } else {
      pushRecorridoMsg("riskiq", "No encontré datos nuevos en ese mensaje. Dame un dato concreto (marca, valor, ciudad, etc.).");
      refreshRecorridoThread();
    }
  } catch {
    pushRecorridoMsg("sistema", "No se pudo interpretar el mensaje.");
    refreshRecorridoThread();
  } finally {
    state.recorrido.busy = false;
  }
}

/* =====================================================================
   VIEW: BANDEJA DE TAREAS (underwriter inbox)
   Every case the tree stops on arrives here with its full packet. The
   underwriter answers in natural language; the LLM interprets it, the
   underwriter confirms, and the answer is merged so the tree resumes.
   ===================================================================== */
VIEWS.bandeja = async function () {
  state.runner.engine = "uw";
  await defs("uw").catch(() => {});
  await refreshBandejaTasks();
  renderBandejaInner();
};

async function refreshBandejaTasks() {
  try {
    const tasks = await getJSON("/api/human-tasks");
    state.bandeja.tasks = Array.isArray(tasks) ? tasks : [];
  } catch {
    state.bandeja.tasks = [];
    toast("No se pudo cargar la Bandeja", true);
  }
  const tasks = state.bandeja.tasks;
  if (!state.bandeja.selectedId || !tasks.some((t) => t.task_id === state.bandeja.selectedId)) {
    const open = tasks.filter(bandejaIsOpen);
    state.bandeja.selectedId = (open[0] || tasks[0] || {}).task_id || null;
  }
}

function bandejaIsOpen(task) {
  return !!task && (task.status === "needs_human_input" || task.status === "resumed_needs_more_input");
}

function renderBandejaInner() {
  const tasks = state.bandeja.tasks;
  const open = tasks.filter(bandejaIsOpen);
  setTopbar(
    "Bandeja de tareas",
    "Cola del suscriptor Santiago Bustillos: cada caso detenido por un dato o dictamen llega con todo el paquete para resolverlo y reanudar el árbol.",
    `<span class="badge ${open.length ? "badge-amber" : "badge-ok"}">${open.length} pendientes</span>
     <span class="badge badge-muted">${tasks.length} en total</span>
     <button class="btn btn-ghost" id="bandeja-refresh-btn">Actualizar</button>`
  );
  $("#view").innerHTML = `
    <div class="bandeja-workspace">
      <section class="card bandeja-list">
        <div class="card-head"><h2>Tareas asignadas</h2><span class="audit-id">Santiago Bustillos</span></div>
        <div class="card-body bandeja-list-body">${bandejaTaskListHtml(tasks)}</div>
      </section>
      <section class="card bandeja-detail" id="bandeja-detail">${bandejaDetailHtml()}</section>
    </div>`;
  bindBandeja();
}

function bandejaTaskListHtml(tasks) {
  if (!tasks.length) return `<div class="empty"><div class="empty-ico">✉</div>
    <p class="empty-title">Sin tareas todavía</p>
    <p class="empty-sub">Carga el cliente que requiere intervención en Recorrido demo: su caso se detiene y llega aquí con todo el paquete.</p></div>`;
  return tasks.map((t) => {
    const open = bandejaIsOpen(t);
    const active = t.task_id === state.bandeja.selectedId;
    return `<button class="bandeja-task ${active ? "active" : ""}" data-task="${esc(t.task_id)}">
      <span class="bandeja-task-dot ${open ? "warn" : "ok"}"></span>
      <span class="bandeja-task-main">
        <b>${esc(t.question || "Revisión humana")}</b>
        <span class="bandeja-task-sub">${esc(t.task_id)} · ${esc(titleCase(t.engine || "uw"))} · ${esc(bandejaStatusLabel(t.status))}</span>
        <span class="bandeja-task-meta">${esc(t.owner_name || "Santiago Bustillos")} · ${esc(t.source_sender || t.source_channel || "—")}</span>
      </span>
      <span class="badge ${open ? "badge-amber" : "badge-ok"}">${esc(bandejaPriorityLabel(t.priority))}</span>
    </button>`;
  }).join("");
}

function bandejaDetailHtml() {
  const task = state.bandeja.tasks.find((t) => t.task_id === state.bandeja.selectedId);
  if (!task) return `<div class="empty"><div class="empty-ico">▷</div>
    <p class="empty-title">Elige una tarea</p>
    <p class="empty-sub">Selecciona una tarea de la izquierda para ver el paquete completo y resolverla.</p></div>`;
  const open = bandejaIsOpen(task);
  const facts = task.confirmed_facts || {};
  const factChips = Object.entries(facts).map(([k, v]) => `<span class="fact-chip">${esc(k)}=<b>${esc(fmt(v))}</b></span>`).join("")
    || `<span class="human-sub">Sin hechos en el paquete.</span>`;
  const node = task.current_node || {};
  const schema = task.answer_schema || {};
  const sourceQuote = schema.source_quote || node.source_quote || (task.audit_packet || {}).source_quote || "";
  const head = `<div class="bandeja-detail-head">
    <div>
      <span class="bandeja-kicker">${esc(bandejaStatusLabel(task.status))} · ${esc(task.priority || "normal")}</span>
      <h2>${esc(task.question || "Revisión humana")}</h2>
      <p>${esc(task.task_id)} · motor ${esc(titleCase(task.engine || "uw"))} · asignada a <b>${esc(task.owner_name || "Santiago Bustillos")}</b></p>
    </div>
    <span class="badge ${open ? "badge-amber" : "badge-ok"}">${open ? "abierta" : "resuelta"}</span>
  </div>`;
  // The full case packet (every confirmed fact, route, source) is available but tucked
  // away in a collapsible — the underwriter should focus on the one missing thing, not
  // re-read 40 facts the chat already settled.
  const packetDetails = `<details class="bandeja-packet-details">
    <summary>Ver paquete completo del caso (${Object.keys(facts).length} hechos)</summary>
    <div class="bandeja-packet">
      ${task.initial_slip ? `<div class="section-label">Solicitud original</div><blockquote class="quote sm">${esc(task.initial_slip)}</blockquote>` : ""}
      <div class="bandeja-packet-meta">
        <div><span>Detenido en</span><b>${esc(node.id || node.title || "—")}</b></div>
        <div><span>Hechos confirmados</span><b>${task.facts_count ?? Object.keys(facts).length}</b></div>
        <div><span>Pasos de ruta</span><b>${task.path_count ?? 0}</b></div>
        <div><span>Dato solicitado</span><b>${esc(task.requested_fact || "—")}</b></div>
      </div>
      <div class="bandeja-facts">${factChips}</div>
    </div>
  </details>`;
  if (!open) {
    return head + bandejaCompletedHtml(task) + packetDetails;
  }
  // Open task: lead with ONLY the missing thing — the question, the fact it needs, and
  // the source text that justifies asking.
  const focus = `<div class="bandeja-focus">
    <div class="section-label">Lo único que falta</div>
    <div class="bandeja-focus-fact">
      <span class="bandeja-focus-q">${esc(task.question || "Revisión humana")}</span>
      ${task.requested_fact ? `<span class="fact-chip needed">dato · <b>${esc(task.requested_fact)}</b></span>` : ""}
    </div>
    ${bandejaPricingHtml(task)}
    ${sourceQuote ? `<blockquote class="quote sm">${esc(sourceQuote)}</blockquote>` : ""}
  </div>`;
  return head + focus + bandejaResolveHtml(task) + packetDetails;
}

function bandejaPricingHtml(task) {
  const pricing = (task.packet && task.packet.context && task.packet.context.pricing) || {};
  const suggested = pricing.suggested_price_bob;
  if (suggested == null) return "";
  const currency = pricing.currency === "BOB" || !pricing.currency ? "Bs" : esc(pricing.currency);
  const options = Array.isArray(pricing.suggested_options) ? pricing.suggested_options : [];
  const optionRows = options.map((o) => `<div class="bandeja-price-opt">
      <span>${esc(o.label || o.id || "Opción")}</span>
      <b>${currency} ${esc(money(o.cash_annual_premium_bob ?? o.installment_amount_bob))}</b>
    </div>`).join("");
  const reasons = (pricing.review_reasons || []).map((r) => `<span class="fact-chip">${esc(titleCase(r))}</span>`).join("");
  return `<div class="bandeja-price">
    <div class="bandeja-price-head">
      <span>Prima sugerida por el motor</span>
      <b class="bandeja-price-big">${currency} ${esc(money(suggested))}</b>
    </div>
    ${optionRows ? `<div class="bandeja-price-opts">${optionRows}</div>` : ""}
    ${reasons ? `<div class="bandeja-price-reasons"><span class="human-sub">Motivo de revisión</span>${reasons}</div>` : ""}
    <p class="human-sub">Aprueba, ajusta o rechaza esta prima antes de convertirla en precio final.</p>
  </div>`;
}

function bandejaResolveHtml(task) {
  if (!task.resumable) {
    return `<div class="bandeja-resolve">
      <div class="section-label">Dictamen manual</div>
      <p class="human-sub">${esc((task.packet || {}).non_resumable_reason || "Esta tarea requiere un dictamen y no se reanuda con un solo dato.")}</p>
      <textarea id="bandeja-answer" class="composer-input" rows="3" placeholder="Notas del dictamen…">${esc(state.bandeja.answerText || "")}</textarea>
      <div class="bandeja-actions"><button class="btn btn-primary" id="bandeja-dictamen-btn">Marcar como resuelto</button></div>
    </div>`;
  }
  const preview = (state.bandeja.preview && state.bandeja.preview.task_id === task.task_id) ? state.bandeja.preview : null;
  const schema = task.answer_schema || {};
  return `<div class="bandeja-resolve">
    <div class="section-label">Responde como suscriptor${schema.type ? ` <span class="chip">tipo · <b>${esc(schema.type)}</b></span>` : ""}</div>
    <textarea id="bandeja-answer" class="composer-input" rows="3" placeholder="Escribe tu criterio en lenguaje natural (p. ej. ‘es un camión con cabina separada, trátalo como pesado’)…">${esc(state.bandeja.answerText || "")}</textarea>
    <div class="bandeja-actions"><button class="btn btn-ghost" id="bandeja-interpret-btn">Interpretar respuesta</button></div>
    ${preview ? bandejaPreviewHtml(preview) : ""}
  </div>`;
}

function bandejaPreviewHtml(preview) {
  if (!preview.interpreted) {
    return `<div class="bandeja-preview warn"><p>${esc(preview.reply_es)}</p></div>`;
  }
  const label = bandejaValueLabel(preview.interpreted_value, preview.fact_type);
  return `<div class="bandeja-preview ok">
    <div class="bandeja-preview-head"><span class="human-badge">Interpretación del LLM</span><span class="chip">confianza · <b>${esc(preview.confidence)}</b></span></div>
    <p>${esc(preview.reply_es)}</p>
    <div class="bandeja-preview-val"><span>${esc(preview.requested_fact)}</span><b>${esc(label)}</b></div>
    <div class="bandeja-actions">
      <button class="btn btn-primary" id="bandeja-confirm-btn">Confirmar e incorporar al paquete</button>
      <button class="btn btn-ghost" id="bandeja-edit-btn">Reescribir</button>
    </div>
  </div>`;
}

function bandejaCompletedHtml(task) {
  const ans = task.answer || {};
  const valueLabel = bandejaValueLabel(ans.value, (task.answer_schema || {}).type);
  return `<div class="bandeja-resolved">
    <div class="bandeja-preview ok">
      <div class="bandeja-preview-head"><span class="human-badge">Resuelto por ${esc(task.owner_name || "Santiago Bustillos")}</span></div>
      <p>El suscriptor respondió <b>${esc(task.requested_fact || ans.fact_id || "")} = ${esc(valueLabel)}</b>. El árbol se reanudó con el paquete actualizado.</p>
      ${task.human_notes ? `<p class="human-sub">“${esc(task.human_notes)}”</p>` : ""}
    </div>
    ${task.next_task_id ? `<div class="bandeja-preview warn"><p>El árbol volvió a detenerse: se creó la tarea <b>${esc(task.next_task_id)}</b>.</p><div class="bandeja-actions"><button class="btn btn-ghost" id="bandeja-goto-next">Ir a la siguiente tarea</button></div></div>` : ""}
    <div class="card-head sub"><h3>Recorrido reanudado</h3><span class="audit-id" id="audit-id"></span></div>
    <div id="result-body">${emptyDemoResult()}</div>
  </div>`;
}

function bindBandeja() {
  $("#bandeja-refresh-btn")?.addEventListener("click", async () => {
    await refreshBandejaTasks();
    renderBandejaInner();
    toast("Bandeja actualizada");
  });
  $$(".bandeja-task").forEach((b) => b.addEventListener("click", () => {
    state.bandeja.selectedId = b.dataset.task;
    state.bandeja.preview = null;
    state.bandeja.answerText = "";
    renderBandejaInner();
  }));
  const task = state.bandeja.tasks.find((t) => t.task_id === state.bandeja.selectedId);
  if (!task) return;
  const ta = $("#bandeja-answer");
  if (ta) ta.addEventListener("input", (e) => { state.bandeja.answerText = e.target.value; });
  $("#bandeja-interpret-btn")?.addEventListener("click", () => bandejaInterpret(task));
  $("#bandeja-confirm-btn")?.addEventListener("click", () => bandejaConfirm(task));
  $("#bandeja-edit-btn")?.addEventListener("click", () => { state.bandeja.preview = null; renderBandejaInner(); });
  $("#bandeja-dictamen-btn")?.addEventListener("click", () => bandejaDictamen(task));
  $("#bandeja-goto-next")?.addEventListener("click", () => {
    state.bandeja.selectedId = task.next_task_id;
    state.bandeja.preview = null;
    state.bandeja.answerText = "";
    renderBandejaInner();
  });
  if (!bandejaIsOpen(task) && task.resume_result && Array.isArray(task.resume_result.audit)) {
    state.runner.engine = "uw";
    const merged = { ...((task.packet || {}).facts || task.confirmed_facts || {}) };
    if (task.answer && task.answer.fact_id) merged[task.answer.fact_id] = task.answer.value;
    state.runner.values.uw = compactFacts(merged);
    state.runner.result = task.resume_result;
    demoState().active = true; demoState().step = -1;
    renderWalkthroughResult(task.resume_result);
  }
}

async function bandejaInterpret(task) {
  const text = ($("#bandeja-answer")?.value || state.bandeja.answerText || "").trim();
  if (!text) { toast("Escribe tu criterio primero", true); return; }
  if (state.bandeja.busy) return;
  state.bandeja.busy = true;
  const btn = $("#bandeja-interpret-btn");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }
  try {
    const preview = await postJSON(`/api/human-tasks/${task.task_id}/interpret`, { text }, "uw_user");
    state.bandeja.preview = { ...preview, task_id: task.task_id };
    state.bandeja.answerText = text;
    renderBandejaInner();
  } catch {
    toast("No se pudo interpretar la respuesta", true);
  } finally {
    state.bandeja.busy = false;
  }
}

async function bandejaConfirm(task) {
  const preview = state.bandeja.preview;
  if (!preview || !preview.interpreted) { toast("Interpreta una respuesta primero", true); return; }
  if (state.bandeja.busy) return;
  state.bandeja.busy = true;
  const btn = $("#bandeja-confirm-btn");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }
  try {
    await postJSON(`/api/human-tasks/${task.task_id}/complete`, {
      answer: { fact_id: preview.requested_fact, value: preview.interpreted_value },
      human_notes: state.bandeja.answerText
    }, "uw_user");
    state.bandeja.preview = null;
    state.bandeja.answerText = "";
    await refreshBandejaTasks();
    state.bandeja.selectedId = task.task_id;
    renderBandejaInner();
    toast("Paquete actualizado · árbol reanudado");
  } catch {
    toast("No se pudo completar la tarea", true);
  } finally {
    state.bandeja.busy = false;
  }
}

async function bandejaDictamen(task) {
  if (state.bandeja.busy) return;
  state.bandeja.busy = true;
  const btn = $("#bandeja-dictamen-btn");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }
  try {
    await postJSON(`/api/human-tasks/${task.task_id}/complete`, {
      human_notes: state.bandeja.answerText, status: "completed"
    }, "uw_user");
    state.bandeja.answerText = "";
    await refreshBandejaTasks();
    state.bandeja.selectedId = task.task_id;
    renderBandejaInner();
    toast("Tarea marcada como resuelta");
  } catch {
    toast("No se pudo cerrar la tarea", true);
  } finally {
    state.bandeja.busy = false;
  }
}

function bandejaValueLabel(value, factType) {
  if (factType === "boolean") return value === true ? "Sí" : (value === false ? "No" : "—");
  if (Array.isArray(value)) return value.join(", ");
  return value === null || value === undefined ? "—" : String(value);
}

function bandejaStatusLabel(status) {
  return {
    needs_human_input: "pendiente",
    resumed_needs_more_input: "necesita más datos",
    completed: "resuelto",
    completed_needs_client_followup: "espera al cliente",
  }[status] || titleCase(status || "");
}

function bandejaPriorityLabel(priority) {
  return titleCase(priority || "normal");
}

/* =====================================================================
   VIEW: DECISION RUNNER
   ===================================================================== */
VIEWS.runner = async function (params) {
  if (params.engine) state.runner.engine = params.engine;
  const engine = state.runner.engine;
  await defs(engine);
  const portfolioView = await portfolioData().catch(() => null);
  if (engine === "uw") {
    const schema = await ratingSchema();
    state.runner.ratingWeights ||= JSON.parse(JSON.stringify(schema.calibration || schema.weights || {}));
  }

  setTopbar(
    engine === "uw" ? "Corrida de decisión de suscripción" : "Corrida de orientación de reclamos",
    engine === "uw" ? "Recorrido de elegibilidad más precio final cuando el resultado de suscripción queda aprobado." : "Orientación de cobertura citada a fuente — no es una determinación.",
    `<div class="seg" id="engine-seg">
       <button class="seg-btn ${engine === "uw" ? "active" : ""}" data-engine="uw">Suscripción</button>
       <button class="seg-btn ${engine === "coverage" ? "active" : ""}" data-engine="coverage">Reclamos</button>
     </div>
     <button class="btn btn-ghost" id="reset-btn">Limpiar</button>
     <button class="btn btn-primary" id="run-btn">▶ Ejecutar</button>`
  );

  $("#view").innerHTML = `
    ${runnerKpis(engine)}
    ${engine === "coverage" ? claimsListPanel() : portfolioEventPanel("subscription", portfolioView)}
    <div class="board">
      <section class="card inputs-card">
        <div class="card-head"><h2>Hechos de la solicitud</h2>
          <div class="card-head-tools">
            <div class="search"><span class="search-ico">⌕</span><input id="fact-search" type="text" placeholder="Filtrar…" autocomplete="off"/></div>
            <div class="seg" id="input-mode"><button class="seg-btn active" data-view="form">Formulario</button><button class="seg-btn" data-view="json">JSON</button></div>
          </div>
        </div>
        <div class="card-body">
          <div id="form-view" class="fields"></div>
          <div id="json-view" class="hidden"><textarea id="json-input" spellcheck="false"></textarea><p class="json-hint">Avanzado — los cambios se sincronizan al ejecutar.</p></div>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Decisión</h2><span class="audit-id" id="audit-id"></span></div>
        <div class="card-body" id="result-body">${emptyResult()}</div>
      </section>
    </div>`;

  renderForm(); syncJson();
  $("#run-btn").addEventListener("click", runMotor);
  $("#reset-btn").addEventListener("click", () => {
    state.runner.values[engine] = {};
    if (engine === "coverage") {
      state.runner.selectedClientId = null;
      state.runner.selectedClaimId = null;
      refreshClaimsList();
    }
    renderForm(); syncJson(); resetResult(); toast("Hechos limpiados");
  });
  $$("#engine-seg .seg-btn").forEach((b) => b.addEventListener("click", () => go(b.dataset.engine === "coverage" ? "claims" : "uw")));
  $$("#input-mode .seg-btn").forEach((b) => b.addEventListener("click", () => setInputMode(b.dataset.view)));
  $("#fact-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    $$("#form-view .field").forEach((r) => r.classList.toggle("hide", q && !r.textContent.toLowerCase().includes(q)));
  });
  if (engine === "coverage") bindClaimsList();
  else bindPortfolioEventButtons();
};

VIEWS.uw = function () {
  return VIEWS.runner({ engine: "uw" });
};

VIEWS.claims = function () {
  return VIEWS.runner({ engine: "coverage" });
};

function copyDemo(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function demoClientById(id) {
  return DEMO_CLIENTS.find((client) => client.id === id) || null;
}

function demoClaimById(client, claimId) {
  if (!client || !Array.isArray(client.claims) || !client.claims.length) return null;
  return client.claims.find((claim) => claim.id === claimId) || client.claims[0];
}

function demoClaimTotalUsd(client) {
  return (client.claims || []).reduce((total, claim) => total + Number(claim.amount_usd || 0), 0);
}

function demoLossRatio(client) {
  const premium = Number((client.underwriting || {}).final_price_bob || 0);
  if (!premium) return 0;
  return (demoClaimTotalUsd(client) * 6.96) / premium;
}

function demoVehicleLabel(client) {
  const facts = (client.underwriting || {}).facts || {};
  return `${facts.model_year || "--"} ${facts.make || facts.vehicle_brand || ""} ${facts.model || ""}`.trim();
}

function demoRatingFacts(client) {
  const facts = (client.underwriting || {}).facts || {};
  const keys = ["valor_asegurado", "model_year", "make", "marca_auto", "model", "city", "plaza_auto", "extraterritorialidad", "cuotas", "selected_pricing_option"];
  const out = {};
  for (const key of keys) if (hasValor(facts[key])) out[key] = facts[key];
  return out;
}

function demoRenewalPayload(client) {
  return {
    client_id: client.id,
    policy_id: client.policy_id,
    renewal_date: client.renewal_due || new Date().toISOString().slice(0, 10),
    price_adjustment_percent: Number((client.renewal || {}).price_adjustment_percent || 0),
    price_adjustment_reason: (client.renewal || {}).reason || "Renovación cargada desde cartera demo.",
    rating_facts: demoRatingFacts(client),
    node_overrides: copyDemo((client.renewal || {}).node_overrides || []),
    source_subscription: {
      outcome: (client.underwriting || {}).outcome,
      approved_at: (client.underwriting || {}).approved_at,
      final_price_bob: (client.underwriting || {}).final_price_bob,
    },
  };
}

function selectedDemoClient(context) {
  const selectedId = context === "renewals" ? state.renewal.selectedClientId : state.runner.selectedClientId;
  return demoClientById(selectedId);
}

function allDemoClaims() {
  const out = [];
  DEMO_CLIENTS.forEach((client) => (client.claims || []).forEach((claim) => out.push({ client, claim })));
  return out;
}

// Reclamos flow: a flat list of the created claim instances. Selecting one loads
// its facts into the package; the full portfolio table lives in Supervisión.
function claimsListPanel() {
  const items = allDemoClaims();
  const selectedId = state.runner.selectedClaimId;
  const totalUsd = items.reduce((total, item) => total + Number(item.claim.amount_usd || 0), 0);
  return `<section class="client-browser" id="claims-list">
    <div class="client-browser-head">
      <div>
        <span class="client-browser-kicker">Reclamos cargados</span>
        <h2>Lista de reclamos</h2>
        <p>Selecciona un reclamo para cargar sus hechos en el paquete y ejecutar la orientación de cobertura.</p>
      </div>
      <div class="client-browser-stats">
        <span><b>${esc(items.length)}</b> reclamos</span>
        <span><b>USD ${moneyBob(totalUsd)}</b> expuesto</span>
      </div>
    </div>
    <div class="client-table-wrap">
      <table class="client-table">
        <thead><tr><th>Reclamo</th><th>Cliente</th><th>Vehículo</th><th>Tipo</th><th>Monto</th><th></th></tr></thead>
        <tbody>${items.map(({ client, claim }) => claimsListRow(client, claim, selectedId)).join("")}</tbody>
      </table>
    </div>
  </section>`;
}

function claimsListRow(client, claim, selectedId) {
  const active = selectedId === claim.id;
  return `<tr class="client-row${active ? " selected" : ""}">
    <td><b>${esc(claim.id)}</b><div class="sim-sub">${esc(client.policy_id)}</div></td>
    <td>${esc(client.name)}<div class="sim-sub">${esc(client.city)} · ${esc(client.broker)}</div></td>
    <td>${esc(demoVehicleLabel(client))}</td>
    <td>${esc(claim.label)}</td>
    <td>USD ${moneyBob(claim.amount_usd)}</td>
    <td><button class="btn ${active ? "btn-secondary" : "btn-ghost"} claim-list-pick" data-client-id="${esc(client.id)}" data-claim-id="${esc(claim.id)}">${active ? "Cargado" : "Cargar"}</button></td>
  </tr>`;
}

function bindClaimsList() {
  $$("#claims-list .claim-list-pick").forEach((button) => button.addEventListener("click", () => {
    selectDemoClientForClaims(button.dataset.clientId, button.dataset.claimId);
  }));
}

function refreshClaimsList() {
  const host = $("#claims-list");
  if (!host) return;
  host.outerHTML = claimsListPanel();
  bindClaimsList();
}

function demoPortfolioPanel(context) {
  const selected = selectedDemoClient(context);
  const claimsCount = DEMO_CLIENTS.reduce((total, client) => total + (client.claims || []).length, 0);
  const cleanCount = DEMO_CLIENTS.filter((client) => !(client.claims || []).length).length;
  const isRenewals = context === "renewals";
  const clients = isRenewals
    ? [...DEMO_CLIENTS].sort((a, b) => String(a.renewal_due || "").localeCompare(String(b.renewal_due || "")))
    : DEMO_CLIENTS;
  const title = isRenewals ? "Cartera para renovación" : "Cartera para reclamos";
  const sub = isRenewals
    ? "Pólizas ordenadas por vencimiento más próximo. Selecciona una para precargar rating, prima y ajuste de renovación."
    : "Selecciona un cliente; si tiene siniestros, se carga el paquete del reclamo en el motor.";
  const extraHead = isRenewals
    ? `<th class="num">Severidad anual</th><th class="num">Siniestros/año</th><th class="num">Prom. siniestro</th>`
    : "";
  return `<section class="client-browser" id="demo-client-browser">
    <div class="client-browser-head">
      <div>
        <span class="client-browser-kicker">Clientes demo suscritos</span>
        <h2>${esc(title)}</h2>
        <p>${esc(sub)}</p>
      </div>
      <div class="client-browser-stats">
        <span><b>${esc(DEMO_CLIENTS.length)}</b> clientes</span>
        <span><b>${esc(claimsCount)}</b> reclamos</span>
        <span><b>${esc(cleanCount)}</b> sin accidentes</span>
      </div>
    </div>
    <div class="client-table-wrap">
      <table class="client-table">
        <thead><tr><th>Cliente</th><th>Póliza</th><th>Vehículo</th><th>Reclamos</th>${extraHead}<th>Renovación</th><th></th></tr></thead>
        <tbody>${clients.map((client) => demoClientRow(client, context, selected)).join("")}</tbody>
      </table>
    </div>
    ${demoClientDetail(context, selected)}
  </section>`;
}

function demoClientRow(client, context, selected) {
  const claimCount = (client.claims || []).length;
  const loss = demoLossRatio(client);
  const selectedCls = selected && selected.id === client.id ? " selected" : "";
  const action = context === "renewals"
    ? "Preparar"
    : (claimCount ? "Abrir reclamo" : "Ver póliza");
  const severityUsd = demoClaimTotalUsd(client);
  const extraCells = context === "renewals"
    ? `<td class="num">USD ${moneyBob(severityUsd)}</td><td class="num">${claimCount}</td><td class="num">${claimCount ? `USD ${moneyBob(severityUsd / claimCount)}` : "--"}</td>`
    : "";
  return `<tr class="client-row${selectedCls}">
    <td><b>${esc(client.name)}</b><div class="sim-sub">${esc(client.id)} · ${esc(client.broker)}</div></td>
    <td><span class="mono">${esc(client.policy_id)}</span><div class="sim-sub">${esc(client.city)} · ${esc(titleCase(client.policy_status))}</div></td>
    <td>${esc(demoVehicleLabel(client))}<div class="sim-sub">Bs ${moneyBob(((client.underwriting || {}).facts || {}).valor_asegurado)}</div></td>
    <td><span class="claim-pill ${claimCount ? "has-claims" : "is-clean"}">${claimCount ? `${claimCount} reclamo${claimCount === 1 ? "" : "s"}` : "sin accidentes"}</span><div class="sim-sub">LR ${loss.toFixed(2)}</div></td>
    ${extraCells}
    <td>${signedNumber((client.renewal || {}).price_adjustment_percent || 0, 0)}%<div class="sim-sub">${esc(client.renewal_due)}</div></td>
    <td><button class="btn btn-ghost client-pick" data-client-id="${esc(client.id)}" data-context="${esc(context)}">${esc(action)}</button></td>
  </tr>`;
}

function demoClientDetail(context, client) {
  if (!client) {
    return `<div class="client-detail empty-detail">
      <p>Elige un cliente de la tabla para cargar sus datos de suscripción, póliza y ${context === "renewals" ? "renovación" : "reclamo"}.</p>
    </div>`;
  }
  const facts = (client.underwriting || {}).facts || {};
  const claim = context === "renewals" ? null : demoClaimById(client, state.runner.selectedClaimId);
  const claimButtons = context === "claims" ? demoClaimButtons(client, claim) : "";
  const detailAction = context === "renewals"
    ? `<button class="btn btn-primary" id="client-preview-renewal">Previsualizar renovación</button>`
    : (claim ? `<button class="btn btn-primary" id="client-run-claim">Ejecutar reclamo cargado</button>` : "");
  const detailNote = context === "renewals"
    ? (client.renewal || {}).reason
    : (claim ? claim.summary : "Cliente con póliza activa y sin reclamos abiertos en la cartera demo.");
  return `<div class="client-detail">
    <div class="client-detail-main">
      <span class="client-browser-kicker">Seleccionado</span>
      <h3>${esc(client.name)}</h3>
      <p>${esc(detailNote)}</p>
      ${claimButtons}
      <div class="client-detail-actions">${detailAction}</div>
    </div>
    <div class="client-fact-grid">
      ${priceMeta("Suscripción", titleCase((client.underwriting || {}).outcome))}
      ${priceMeta("Precio final", `Bs ${money((client.underwriting || {}).final_price_bob)}`)}
      ${priceMeta("Producto", facts.product)}
      ${priceMeta("Canal", facts.channel)}
      ${priceMeta("Tipo", facts.client_type)}
      ${priceMeta("Hechos UW", Object.keys(compactFacts(facts)).length)}
    </div>
  </div>`;
}

function demoClaimButtons(client, selectedClaim) {
  const claims = client.claims || [];
  if (!claims.length) return `<div class="claim-options"><span class="claim-pill is-clean">sin reclamos abiertos</span></div>`;
  return `<div class="claim-options">${claims.map((claim) => `
    <button class="claim-option ${selectedClaim && selectedClaim.id === claim.id ? "active" : ""}" data-client-id="${esc(client.id)}" data-claim-id="${esc(claim.id)}">
      <b>${esc(claim.id)}</b><span>${esc(claim.label)} · USD ${moneyBob(claim.amount_usd)}</span>
    </button>`).join("")}</div>`;
}

function bindDemoPortfolio(context) {
  $$("#demo-client-browser .client-pick").forEach((button) => button.addEventListener("click", () => {
    if (context === "renewals") selectDemoClientForRenewal(button.dataset.clientId);
    else selectDemoClientForClaims(button.dataset.clientId);
  }));
  $$("#demo-client-browser .claim-option").forEach((button) => button.addEventListener("click", () => {
    selectDemoClientForClaims(button.dataset.clientId, button.dataset.claimId);
  }));
  const claimRun = $("#client-run-claim");
  if (claimRun) claimRun.addEventListener("click", runMotor);
  const renewalPreview = $("#client-preview-renewal");
  if (renewalPreview) renewalPreview.addEventListener("click", () => runRenewal(false));
}

function refreshDemoPortfolio(context) {
  const host = $("#demo-client-browser");
  if (!host) return;
  host.outerHTML = demoPortfolioPanel(context);
  bindDemoPortfolio(context);
}

function selectDemoClientForClaims(clientId, claimId = null) {
  const client = demoClientById(clientId);
  if (!client) return;
  const claim = demoClaimById(client, claimId);
  state.runner.selectedClientId = client.id;
  state.runner.selectedClaimId = claim ? claim.id : null;
  state.runner.result = null;
  demoState().active = false;
  if (claim) {
    state.runner.values.coverage = compactFacts(copyDemo(claim.facts));
    renderForm(); syncJson(); resetResult();
    setInputMode("form", activeInputModeId());
    toast(`${claim.id} cargado para ${client.name}`);
  } else {
    state.runner.values.coverage = {};
    renderForm(); syncJson(); resetResult();
    setInputMode("form", activeInputModeId());
    toast(`${client.name}: sin reclamos abiertos`);
  }
  refreshClaimsList();
}

function selectDemoClientForRenewal(clientId) {
  const client = demoClientById(clientId);
  if (!client) return;
  state.renewal.selectedClientId = client.id;
  state.renewal.values = demoRenewalPayload(client);
  state.renewal.result = null;
  renderRenewalForm();
  renderRenewalResult(null);
  refreshDemoPortfolio("renewals");
  toast(`Renovación preparada para ${client.name}`);
}

function portfolioEventPanel(eventType, data) {
  const rows = ((data && data.tables && data.tables.events) || []).filter((event) => event.event_type === eventType).slice(0, 6);
  const title = {
    subscription: "Eventos de suscripción creados desde chat",
    claim: "Eventos de reclamo creados desde chat",
    renewal: "Eventos de renovación creados desde chat",
  }[eventType] || "Eventos creados desde chat";
  return `<section class="client-browser event-inbox">
    <div class="client-browser-head">
      <div>
        <span class="client-browser-kicker">Bandeja operativa</span>
        <h2>${esc(title)}</h2>
        <p>Estos paquetes nacen en Chat, quedan guardados en Clientes y pueden cargarse aquí para ejecutar el flujo.</p>
      </div>
      <div class="client-browser-stats"><span><b>${esc(rows.length)}</b> visibles</span></div>
    </div>
    <div class="client-table-wrap">${portfolioEventRows(rows)}</div>
  </section>`;
}

function bindPortfolioEventButtons() {
  $$("#view .event-load-btn").forEach((button) => button.addEventListener("click", () => loadPortfolioEvent(button.dataset.eventId)));
}

async function loadPortfolioEvent(eventId) {
  const event = await getJSON(`/api/portfolio/events/${encodeURIComponent(eventId)}`);
  if (event.event_type === "claim") {
    state.runner.engine = "coverage";
    state.runner.values.coverage = compactFacts(event.facts || {});
    state.runner.chat.coverage = { text: (event.source || {}).text || "", attachments: [], result: { facts: event.facts || {} } };
    state.runner.result = null;
    if (state.route !== "claims") return go("claims");
    renderForm(); syncJson(); renderChat(); resetResult();
    setInputMode("form", activeInputModeId());
  } else if (event.event_type === "renewal") {
    state.renewal.values = { ...(event.renewal_payload || {}) };
    state.renewal.selectedClientId = event.client_id || "";
    state.renewal.result = null;
    if (state.route !== "renewals") return go("renewals");
    renderRenewalForm(); renderRenewalResult(null);
  } else {
    state.runner.engine = "uw";
    state.runner.values.uw = compactFacts(event.facts || {});
    state.runner.chat.uw = { text: (event.source || {}).text || "", attachments: [], result: { facts: event.facts || {} } };
    state.runner.result = null;
    if (state.route !== "uw") return go("uw");
    renderForm(); syncJson(); renderChat(); resetResult();
    setInputMode("form", activeInputModeId());
  }
  toast(`Evento ${event.event_id} cargado`);
}

// Switch the input card between Chat / Formulario / JSON. Shared by the segment
// buttons and the chat "Cargar al paquete" step so the flow stays consistent.
function setInputMode(next, modeId = "input-mode") {
  const seg = $(`#${modeId}`);
  if (!seg) return;
  if (!$("#json-view").classList.contains("hidden") && next !== "json" && !syncFromJson()) return;
  if (next === "json") syncJson();
  if (next === "form") renderForm();
  if (next === "chat") renderChat();
  $$(`#${modeId} .seg-btn`).forEach((x) => x.classList.toggle("active", x.dataset.view === next));
  $("#form-view").classList.toggle("hidden", next !== "form");
  $("#json-view").classList.toggle("hidden", next !== "json");
  $("#chat-view")?.classList.toggle("hidden", next !== "chat");
}

function runnerKpis(engine) {
  const coverage = engine === "coverage";
  const copy = coverage
    ? {
        outcome: ["Riesgo descrito", "pendiente de evaluar"],
        route: ["Ruta citada", "nodos con fuente"],
        facts: ["Hechos del siniestro", "de 0"],
        fourth: ["Salvedades", "pendiente de ejecución"]
      }
    : {
        outcome: ["Resultado", "Aún no ejecutado"],
        route: ["Ruta de decisión", "nodos evaluados"],
        facts: ["Hechos de solicitud", "de 0"],
        fourth: ["Precio final", "tras aprobación"]
      };
  return `<section class="kpis">
    <div class="kpi" id="kpi-outcome-card"><span class="kpi-label">${copy.outcome[0]}</span><span class="kpi-value" id="kpi-outcome">—</span><span class="kpi-sub" id="kpi-outcome-sub">${copy.outcome[1]}</span></div>
    <div class="kpi"><span class="kpi-label">${copy.route[0]}</span><span class="kpi-value" id="kpi-steps">0</span><span class="kpi-sub">${copy.route[1]}</span></div>
    <div class="kpi"><span class="kpi-label">${copy.facts[0]}</span><span class="kpi-value" id="kpi-facts">0</span><span class="kpi-sub" id="kpi-facts-sub">${copy.facts[1]}</span></div>
    <div class="kpi" id="kpi-price-card"><span class="kpi-label">${copy.fourth[0]}</span><span class="kpi-value" id="kpi-price">—</span><span class="kpi-sub" id="kpi-price-sub">${copy.fourth[1]}</span></div>
  </section>`;
}

function chatExampleControl() {
  const engine = state.runner.engine;
  if (engine === "uw") {
    return `<select id="chat-example-select" class="ex-select chat-example-control" title="Cargar un ejemplo en el chat">
      <option value="">Cargar ejemplo...</option>
      <option value="clean">${esc(UW_EXAMPLES.clean.label)}</option>
      <option value="review">${esc(UW_EXAMPLES.review.label)}</option>
    </select>`;
  }
  return `<button class="btn btn-ghost chat-example-control" id="chat-example-btn">Cargar ejemplo</button>`;
}

function chatPanel() {
  return `<div class="chat-panel">
    ${runnerChatSettingsBar()}
    <div class="chat-steps" aria-hidden="true">
      <span class="chat-step is-on" data-step="1"><b>1</b> Extraer</span>
      <span class="chat-step" data-step="2"><b>2</b> Cargar al paquete</span>
      <span class="chat-step" data-step="3"><b>3</b> Ejecutar</span>
    </div>
    <div class="chat-composer">
      <div class="chat-composer-head">
        <span class="chat-composer-title">Chat del caso</span>
        ${chatExampleControl()}
      </div>
      <textarea id="chat-input" class="nl chat-input" placeholder="Pega la solicitud de suscripción o narrativa del reclamo en español." spellcheck="true"></textarea>
      <div class="chat-loaded-note hidden" id="chat-loaded-note"></div>
      <div class="chat-actions">
        <button class="btn btn-primary" id="chat-suggest-btn">✨ Extraer hechos</button>
        <label class="btn btn-ghost file-btn" title="Adjuntar foto o audio">Adjuntar<input id="chat-files" type="file" accept="image/*,audio/*" multiple/></label>
        <button class="btn btn-ghost" id="chat-clear-btn">Limpiar</button>
      </div>
    </div>
    <p class="chat-hint">Solo orientativo. El motor ejecuta los valores confirmados del paquete, no el texto.</p>
    <div class="media-list" id="chat-media"></div>
    <div class="nl-result chat-result" id="chat-result"></div>
    <div class="chat-load-row hidden" id="chat-load-row">
      <button class="btn btn-secondary" id="chat-load-package-btn">Cargar al paquete</button>
      <span class="chat-load-hint">Luego revisa el formulario o pulsa <b>▶ Ejecutar</b>.</span>
    </div>
  </div>`;
}

function chatState() {
  state.runner.chat[state.runner.engine] ||= { text: "", attachments: [], result: null };
  return state.runner.chat[state.runner.engine];
}

function renderChat() {
  const input = $("#chat-input");
  if (!input) return;
  const chat = chatState();
  input.value = chat.text || "";
  input.oninput = (e) => { chat.text = e.target.value; };
  $("#chat-suggest-btn").onclick = suggestFromChat;
  $("#chat-clear-btn").onclick = () => {
    state.runner.chat[state.runner.engine] = { text: "", attachments: [], result: null };
    renderChat();
    toast("Chat limpiado");
  };
  $("#chat-files").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    const attachments = await Promise.all(files.map(readAttachmentFile));
    chat.attachments.push(...attachments);
    e.target.value = "";
    renderChatMedia();
  };
  const loadBtn = $("#chat-load-package-btn");
  if (loadBtn) loadBtn.onclick = () => {
    const entries = chatSuggestionEntries(chat.result);
    if (!entries.length) { toast("Primero extrae hechos del chat", true); return; }
    const assumed = runnerChatAssumptionEntries(Object.fromEntries(entries));
    [...entries, ...assumed].forEach(([k, v]) => applySuggestedFact(k, v, false));
    renderForm(); syncJson();
    setInputMode("form", activeInputModeId());
    toast("Paquete cargado — revisa el formulario o pulsa Ejecutar");
  };
  bindRunnerChatSettings();
  renderChatMedia();
  renderFactSuggestions(chat.result, "#chat-result");
  bindChatExampleControls();
  updateChatStep();
}

function runnerCaseSettings() {
  state.runner.caseSettings = { ...SIMPLE_CHAT_CASE_DEFAULTS, ...(state.runner.caseSettings || {}) };
  return state.runner.caseSettings;
}

function runnerChatSettingsBar() {
  if (state.runner.engine !== "uw") return "";
  const settings = runnerCaseSettings();
  return `<div class="simple_chat-settings runner-chat-settings" aria-label="Contexto del caso">
    ${caseSettingSelect("chat", "channel", "Canal", settings.channel)}
    ${caseSettingSelect("chat", "client_type", "Tipo", settings.client_type)}
    ${caseSettingSelect("chat", "product", "Macro", settings.product)}
    <label class="simple_chat-setting toggle">
      <input id="chat-setting-apply_standard_assumptions" type="checkbox" data-runner-setting="apply_standard_assumptions" ${settings.apply_standard_assumptions !== false ? "checked" : ""}/>
      <span>Supuestos estándar</span>
    </label>
  </div>`;
}

function bindRunnerChatSettings() {
  $$("#chat-view [data-runner-setting]").forEach((control) => {
    control.addEventListener("change", () => {
      const key = control.dataset.runnerSetting;
      const settings = runnerCaseSettings();
      settings[key] = control.type === "checkbox" ? control.checked : control.value;
      toast("Contexto actualizado");
    });
  });
}

function runnerChatAssumptionEntries(sourceFacts = {}) {
  if (state.runner.engine !== "uw") return [];
  const settings = runnerCaseSettings();
  const merged = { ...(state.runner.values.uw || {}), ...(sourceFacts || {}) };
  const assumptions = [];
  const add = (key, value) => {
    if (hasValor(merged[key])) return;
    merged[key] = value;
    assumptions.push([key, value]);
  };
  add("product", settings.product);
  add("channel", settings.channel);
  add("client_type", settings.client_type);
  if (UW_CLIENT_SEGMENT_ASSUMPTIONS[merged.client_type]) {
    add("segment", UW_CLIENT_SEGMENT_ASSUMPTIONS[merged.client_type]);
  }
  if (settings.apply_standard_assumptions !== false) {
    for (const [key, value] of Object.entries(UW_STANDARD_CONTEXT_ASSUMPTIONS)) add(key, value);
  }
  const year = Number(merged.model_year || merged.year || 0);
  if (year > 1900) add("vehicle_age_years", Math.max(0, new Date().getFullYear() - year));
  if (normalizeSettingText(merged.make || merged.vehicle_brand) === "toyota") add("marca_auto", 44);
  if (normalizeSettingText(merged.city || merged.plaza) === "la paz") add("plaza_auto", 1);
  return assumptions;
}

function normalizeSettingText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bindChatExampleControls() {
  const engine = state.runner.engine;
  const loadExample = (key = "clean") => {
    loadCaseExampleText(engine, key, !!$("#demo-input-mode"));
    toast(engine === "uw" && UW_EXAMPLES[key] ? `Ejemplo en el chat: ${UW_EXAMPLES[key].label}` : "Ejemplo cargado en el chat");
  };
  const sampleSelect = $("#chat-example-select");
  if (sampleSelect) sampleSelect.onchange = (e) => {
    if (!e.target.value) return;
    loadExample(e.target.value);
    e.target.value = "";
  };
  const sampleBtn = $("#chat-example-btn");
  if (sampleBtn) sampleBtn.onclick = () => loadExample("clean");
}

// Normalize an extract-facts result into [key, value] pairs (handles the
// {value, confidence} wrapper the extractor sometimes returns).
function chatSuggestionEntries(result) {
  const facts = result && (result.facts || result.extracted || result);
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return [];
  return Object.entries(facts).map(([k, v]) => [k, v && typeof v === "object" && "value" in v ? v.value : v]);
}

// Light progress cue on the chat steps: 1 until extracted, 2 once suggestions
// exist, 3 once at least one suggested fact is in the confirmed packet.
function updateChatStep() {
  const host = $("#chat-view");
  if (!host) return;
  const entries = chatSuggestionEntries(chatState().result);
  const packet = state.runner.values[state.runner.engine] || {};
  const loaded = entries.some(([k]) => k in packet);
  const step = loaded ? 3 : entries.length ? 2 : 1;
  $$("#chat-view .chat-step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("is-done", n < step);
    el.classList.toggle("is-on", n === step);
  });
  const loadRow = $("#chat-load-row");
  if (loadRow) loadRow.classList.toggle("hidden", !entries.length);
}

function renderChatMedia() {
  const host = $("#chat-media");
  if (!host) return;
  const attachments = chatState().attachments || [];
  host.innerHTML = attachments.length ? attachments.map((a, i) => `<div class="media-chip">
    <span class="media-kind">${esc(a.kind)}</span>
    <span class="media-name">${esc(a.name)}</span>
    <span class="media-size">${esc(fileSize(a.size))}</span>
    <button class="media-remove" data-idx="${i}" title="Quitar">×</button>
  </div>`).join("") : "";
  $$("#chat-media .media-remove").forEach((b) => b.addEventListener("click", () => {
    chatState().attachments.splice(Number(b.dataset.idx), 1);
    renderChatMedia();
  }));
}

function fileSize(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function readAttachmentFile(file) {
  const kind = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "photo" : "file";
  const base = { name: file.name, mime: file.type, size: file.size, kind };
  if (!["photo", "audio"].includes(kind) || file.size > 6 * 1024 * 1024) {
    return Promise.resolve({ ...base, payload_status: file.size > 6 * 1024 * 1024 ? "too_large_for_inline_payload" : "metadata_only" });
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, data_url: reader.result, payload_status: "inline_payload_ready" });
    reader.onerror = () => resolve({ ...base, payload_status: "read_failed" });
    reader.readAsDataURL(file);
  });
}

async function suggestFromChat() {
  const chat = chatState();
  const text = ($("#chat-input") && $("#chat-input").value.trim()) || "";
  chat.text = text;
  if (!text && !(chat.attachments || []).length) { toast("Agrega primero texto, una foto o audio", true); return; }
  const btn = $("#chat-suggest-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const result = await postJSON("/api/nl/extract-facts", {
      engine: state.runner.engine,
      text,
      attachments: chat.attachments || []
    });
    chat.result = result;
    renderFactSuggestions(result, "#chat-result");
    updateChatStep();
    toast("Sugerencias listas");
  } catch {
    toast("Falló la extracción", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function demoPanel() {
  return `<div class="demo-panel">
    <div class="truth-note"><b>Recorrido para interesados.</b> Ingresa un caso, sugiere hechos, confírmalos y recorre la ruta ejecutable real nodo por nodo.</div>
    <textarea id="demo-input" class="nl demo-input" placeholder="Pega una narrativa de caso en español para presentar." spellcheck="true"></textarea>
    <div class="demo-actions">
      <button class="btn btn-ghost" id="demo-sample-btn">Cargar caso demo</button>
      <button class="btn btn-secondary" id="demo-suggest-btn">Sugerir hechos</button>
      <button class="btn btn-primary" id="demo-start-btn">Iniciar recorrido</button>
    </div>
    <div class="demo-status" id="demo-status"></div>
    <div class="nl-result demo-result" id="demo-result"></div>
  </div>`;
}

function demoState() {
  state.runner.demo[state.runner.engine] ||= { text: DEMO_TEXT[state.runner.engine] || "", result: null, step: 0, active: false };
  return state.runner.demo[state.runner.engine];
}

function renderDemo() {
  const input = $("#demo-input");
  if (!input) return;
  const demo = demoState();
  input.value = demo.text || "";
  input.oninput = (e) => { demo.text = e.target.value; };
  $("#demo-sample-btn").onclick = () => {
    const engine = state.runner.engine;
    loadCaseExampleText(engine, "clean", true);
    renderDemo();
    toast("Caso demo cargado como texto");
  };
  $("#demo-suggest-btn").onclick = suggestFromDemo;
  $("#demo-start-btn").onclick = startWalkthrough;
  $("#demo-status").innerHTML = demoStatus();
  renderFactSuggestions(demo.result, "#demo-result");
}

function demoStatus() {
  const engine = state.runner.engine;
  const factCount = Object.keys(compactFacts(state.runner.values[engine])).length;
  const demo = demoState();
  const active = demo.active && state.runner.result;
  return `<span class="badge ${factCount ? "badge-ok" : "badge-amber"}">${factCount} hechos confirmados</span>
    ${active ? `<span class="badge badge-ok">recorrido activo</span>` : `<span class="badge">no iniciado</span>`}
    <span class="demo-hint">Las sugerencias llenan el mismo paquete de formulario/JSON; revísalas antes de iniciar.</span>`;
}

async function suggestFromDemo() {
  const demo = demoState();
  const text = ($("#demo-input") && $("#demo-input").value.trim()) || "";
  demo.text = text;
  if (!text) { toast("Agrega primero una narrativa del caso", true); return; }
  const btn = $("#demo-suggest-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const result = await postJSON("/api/nl/extract-facts", { engine: state.runner.engine, text });
    demo.result = result;
    renderFactSuggestions(result, "#demo-result");
    $("#demo-status").innerHTML = demoStatus();
    toast("Sugerencias demo listas");
  } catch {
    toast("Falló la extracción demo", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

async function startWalkthrough() {
  const jsonView = $("#json-view");
  if (jsonView && !jsonView.classList.contains("hidden") && !syncFromJson()) return;
  const engine = state.runner.engine;
  const facts = compactFacts(state.runner.values[engine]);
  if (!Object.keys(facts).length) {
    toast("Aplica o ingresa hechos antes de iniciar el recorrido", true);
    return;
  }
  const demo = demoState();
  const btn = $("#demo-start-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const endpoint = engine === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const role = engine === "uw" ? "uw_user" : "claims_user";
    const body = { facts, facts_confirmed: true };
    if (engine === "uw") {
      body.include_pricing = true;
      body.rating_weights = state.runner.ratingWeights;
    }
    const data = await postJSON(endpoint, body, role);
    state.runner.result = data;
    demo.step = -1;
    demo.active = true;
    renderWalkthroughResult(data);
    renderDemo();
    toast("Recorrido listo");
  } catch {
    toast("Falló el recorrido - ¿está levantado el servidor?", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function renderForm() {
  const engine = state.runner.engine, d = state.cache.defs[engine] || {}, vals = state.runner.values[engine];
  const defsForForm = engine === "uw" ? { ...d, ...uwPricingFactDefs() } : d;
  const groups = { "Clasificación": [], "Alertas de riesgo": [], "Valores y cantidades": [], "Identidad": [] };
  const keys = [...new Set([...Object.keys(defsForForm), ...Object.keys(vals)])];
  for (const k of keys) {
    const t = (defsForForm[k] && defsForForm[k].type) || inferType(vals[k]);
    if (t === "enum") groups["Clasificación"].push(k);
    else if (t === "boolean") groups["Alertas de riesgo"].push(k);
    else if (t === "number") groups["Valores y cantidades"].push(k);
    else groups["Identidad"].push(k);
  }
  let html = "";
  for (const [title, keys] of Object.entries(groups)) {
    if (!keys.length) continue;
    html += `<div class="fgroup-title">${title} · ${keys.length}</div>`;
    for (const k of keys) html += fieldRow(k, defsForForm[k] || {}, Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : undefined);
  }
  $("#form-view").innerHTML = html;
  $$("#form-view [data-fk]").forEach((el) => el.addEventListener("change", (e) => onFieldChange(e.target)));
  refreshFactCount();
}
function uwPricingFactDefs() {
  return {
    model_year: { type: "number", prompt: "Año modelo" },
    make: { type: "string", prompt: "Marca" },
    marca_auto: { type: "number", prompt: "ID marca RUAT" },
    model: { type: "string", prompt: "Modelo" },
    city: { type: "enum", prompt: "Plaza de circulación", values: ["La Paz", "Santa Cruz", "Cochabamba", "Tarija", "Trinidad", "Oruro", "Potosi", "Sucre"] },
    plaza_auto: { type: "number", prompt: "ID plaza_auto" },
    extraterritorialidad: { type: "enum", prompt: "Extraterritorialidad", values: ["no", "si"] },
    cuotas: { type: "number", prompt: "Número de cuotas" },
    selected_pricing_option: { type: "enum", prompt: "Opción de precio", values: ["option_1", "option_2", "option_3"] }
  };
}
function inferType(v) { return typeof v === "boolean" ? "boolean" : typeof v === "number" ? "number" : Array.isArray(v) ? "array" : "string"; }
function enumValues(def) { return Array.isArray(def.values) ? def.values : (Array.isArray(def.allowed_values) ? def.allowed_values : []); }
function fieldRow(key, def, value) {
  const type = def.type || inferType(value);
  const label = def.prompt || titleCase(key);
  const ruling = def.needs_ruling ? " needs-ruling" : "";
  let control;
  if (type === "boolean") control = `<select class="bool-select" data-fk="${key}" data-ft="boolean">
      <option value="" ${value === undefined || value === null || value === "" ? "selected" : ""}>Desconocido</option>
      <option value="true" ${value === true ? "selected" : ""}>Sí</option>
      <option value="false" ${value === false ? "selected" : ""}>No</option>
    </select>`;
  else if (type === "enum" && enumValues(def).length) {
    const opts = enumValues(def);
    const current = hasValor(value) ? String(value) : "";
    const allOpts = current && !opts.includes(current) ? [current, ...opts] : opts;
    control = `<select data-fk="${key}" data-ft="enum"><option value="" ${!current ? "selected" : ""}>Desconocido</option>${allOpts.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(titleCase(o))}</option>`).join("")}</select>`;
  }
  else if (type === "number") control = `<input class="num-input" type="number" data-fk="${key}" data-ft="number" value="${value ?? ""}"/>`;
  else if (type === "array") control = `<input class="num-input" style="width:150px;text-align:left" type="text" data-fk="${key}" data-ft="array" placeholder="code, code" value="${esc((value || []).join(", "))}"/>`;
  else control = `<input class="num-input" style="width:160px;text-align:left" type="text" data-fk="${key}" data-ft="string" value="${esc(value ?? "")}"/>`;
  return `<div class="field${ruling}"><div class="field-label">${esc(label)}<span class="field-key">${esc(key)}</span></div><div class="field-control">${control}</div></div>`;
}
function onFieldChange(el) {
  const k = el.dataset.fk, t = el.dataset.ft;
  let v;
  if (t === "boolean") v = el.value === "" ? undefined : el.value === "true";
  else if (t === "number") v = el.value === "" ? null : Number(el.value);
  else if (t === "array") v = el.value.split(",").map((s) => s.trim()).filter(Boolean);
  else v = el.value;
  if (hasValor(v)) state.runner.values[state.runner.engine][k] = v;
  else delete state.runner.values[state.runner.engine][k];
  syncJson();
}
function syncJson() { const el = $("#json-input"); if (el) el.value = JSON.stringify(state.runner.values[state.runner.engine], null, 2); refreshFactCount(); }
function syncFromJson() {
  try {
    const parsed = JSON.parse($("#json-input").value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Se esperaba un objeto");
    state.runner.values[state.runner.engine] = compactFacts(parsed);
    renderForm();
    return true;
  } catch { toast("JSON inválido", true); return false; }
}
function refreshFactCount() {
  const vals = compactFacts(state.runner.values[state.runner.engine]);
  const d = state.runner.engine === "uw"
    ? { ...(state.cache.defs[state.runner.engine] || {}), ...uwPricingFactDefs() }
    : (state.cache.defs[state.runner.engine] || {});
  const total = Object.keys(d).length || Object.keys(vals).length;
  if ($("#kpi-facts")) { $("#kpi-facts").textContent = Object.keys(vals).length; $("#kpi-facts-sub").textContent = `de ${total}`; }
}
function compactFacts(values) {
  const out = {};
  for (const [k, v] of Object.entries(values || {})) if (hasValor(v)) out[k] = v;
  return out;
}

async function runMotor() {
  if (!$("#json-view").classList.contains("hidden") && !syncFromJson()) return;
  const engine = state.runner.engine, btn = $("#run-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const endpoint = engine === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const role = engine === "uw" ? "uw_user" : "claims_user";
    const body = { facts: compactFacts(state.runner.values[engine]), facts_confirmed: true };
    if (engine === "uw") {
      body.include_pricing = true;
      body.rating_weights = state.runner.ratingWeights;
    }
    const data = await postJSON(endpoint, body, role);
    demoState().active = false;
    state.runner.result = data; renderResult(data); toast("Decisión computed");
  } catch { toast("Falló la ejecución — ¿está levantado el servidor?", true); }
  finally { btn.classList.remove("loading"); btn.disabled = false; }
}

function emptyResult() {
  return `<div class="empty"><div class="empty-ico">▣</div><p class="empty-title">Aún no hay decisión</p>
    <p class="empty-sub">Ajusta los hechos de la solicitud y ejecuta el motor para ver el resultado y la ruta exacta con citas fuente.</p></div>`;
}
function emptyDemoResult() {
  return `<div class="empty demo-empty"><div class="empty-ico">▷</div><p class="empty-title">Listo para el recorrido</p>
    <p class="empty-sub">Carga el ejemplo o ingresa un caso, confirma los hechos y comienza. Cada clic muestra el siguiente nodo que visitó el motor real.</p></div>`;
}
function resetResult() {
  const demo = demoState();
  demo.active = false;
  demo.step = -1;
  $("#result-body").innerHTML = emptyResult();
  $("#audit-id").textContent = "";
  setKpi("—", state.runner.engine === "coverage" ? "pendiente de evaluar" : "Aún no ejecutado", "");
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = "0";
  setRunFourthKpi(null);
  refreshFactCount();
}

function renderResult(data) {
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  const isEsc = data.kind === "escalate" || data.outcome === "ESCALATE" || data.outcome === "missing_fact" || !!(data.escalation && data.escalation.blocking_fact);
  const key = data.outcome || (isEsc ? "ESCALATE" : "result");
  const meta = VERDICT[key] || VERDICT[String(key).toLowerCase()] || { cls: "v-info", ico: "•", tag: titleCase(key), kpi: "is-info" };

  let headline, reason, chips = [];
  if (isEsc && data.escalation) {
    const e = data.escalation;
    headline = e.node_title || "Revisión manual requerida";
    reason = e.message || e.fact_prompt || e.reason || "Falta un hecho requerido.";
    if (e.blocking_fact) chips.push(chip("bloqueante", e.blocking_fact));
    if (e.on_missing) chips.push(chip("on_missing", e.on_missing));
    if (e.at_node) chips.push(chip("nodo", e.at_node));
    if (e.ledger_ref) chips.push(chip("registro", ledgerIdFromRef(e.ledger_ref)));
  } else {
    headline = meta.tag;
    reason = data.reason || data.orientation || "Nodo terminal alcanzado.";
    if (data.process) chips.push(chip("proceso", data.process));
    if (data.terminal_node) chips.push(chip("terminal", data.terminal_node));
  }
  const src = (isEsc ? (data.escalation || {}).source_quote || (data.escalation || {}).fact_source_quote : data.source_quote);

  let html = `<div class="verdict ${meta.cls}"><div class="verdict-ico">${meta.ico}</div><div class="verdict-main">
    <div class="verdict-tag">${esc(meta.tag)}</div><div class="verdict-headline">${esc(headline)}</div>
    <div class="verdict-reason">${esc(reason)}</div><div class="verdict-meta">${chips.join("")}</div></div></div>`;
  if (src) html += `<blockquote class="quote">${esc(src)}</blockquote>`;
  if (data.human_packet) html += humanPaquetePanel(data.human_packet);
  if (data.pricing) html += uwPricingPanel(data.pricing);
  if (isEsc && data.escalation && data.escalation.ledger_ref) html += `<div class="issue-actions result-actions">
    ${ledgerLink(data.escalation.ledger_ref)}
    <button class="flag-change" data-kind="escalation" data-target="${esc(data.escalation.at_node || data.escalation.ledger_ref)}" data-title="${esc(data.escalation.node_title || data.escalation.reason || "Escalamiento")}" data-summary="${esc(data.escalation.message || data.escalation.detail || data.escalation.reason || "")}" data-engine="${esc(state.runner.engine)}">Preparar resolución</button>
  </div>`;
  if (audit.length) html += `<div class="section-label">Ruta de decisión · ${audit.length} ${audit.length === 1 ? "nodo" : "nodos"}</div><div class="path">${audit.map((s, i) => stepRow(s, i === audit.length - 1 && !isEsc)).join("")}</div>`;
  if (caveats.length) html += `<div class="section-label">Salvedades</div><div class="caveats">${caveats.map(caveatRow).join("")}</div>`;
  $("#result-body").innerHTML = html;
  bindIncidenciaActions("#result-body");
  bindHumanPaquete(data.human_packet);
  $("#audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  const outcomeKpi = engineOutcomeKpi(data, isEsc, meta);
  setKpi(outcomeKpi.value, outcomeKpi.sub, meta.kpi);
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = audit.length;
  setRunFourthKpi(data); refreshFactCount();
}

function renderWalkthroughResult(data) {
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const demo = demoState();
  const rawStep = Number(demo.step);
  demo.step = Number.isFinite(rawStep) ? rawStep : -1;
  if (!audit.length || demo.step < 0) demo.step = -1;
  else demo.step = Math.min(demo.step, audit.length - 1);
  const idx = demo.step;
  const showingVerdict = idx < 0;
  const progress = showingVerdict ? 100 : Math.round(((idx + 1) / Math.max(1, audit.length)) * 100);
  const routePanel = walkthroughRoutePanel(audit, idx);
  const body = showingVerdict
    ? walkthroughVerdictPanel(data, routePanel)
    : `${walkthroughNodePanel(audit[idx], idx, audit.length, data)}${routePanel}`;
  $("#result-body").innerHTML = `<div class="walkthrough">
    <div class="walk-head">
      <div>
        <span class="walk-label">Recorrido de presentación</span>
        <h3>${showingVerdict ? "Decisión final" : `Nodo ${idx + 1} de ${audit.length}`}</h3>
      </div>
      <span class="badge ${showingVerdict ? "badge-ok" : "badge-amber"}">${showingVerdict ? "dictamen visible" : "detalle de nodo"}</span>
    </div>
    <div class="walk-progress"><span style="width:${progress}%"></span></div>
    <div class="walk-controls walk-controls-top">
      <button class="btn btn-ghost" id="walk-verdict" ${showingVerdict ? "disabled" : ""}>Decisión final</button>
      <button class="btn btn-ghost" id="walk-back" ${showingVerdict || idx <= 0 ? "disabled" : ""}>Atrás</button>
      <button class="btn btn-primary" id="walk-next" ${!audit.length || idx >= audit.length - 1 ? "disabled" : ""}>${showingVerdict ? "Ver paso 1" : "Siguiente"}</button>
    </div>
    ${body}
  </div>`;
  resetWalkthroughViewport();
  bindWalkthroughControls(data);
  bindIncidenciaActions("#result-body");
  bindHumanPaquete(data.human_packet);
  $("#audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  const summary = walkthroughSummary(data);
  const outcomeKpi = engineOutcomeKpi(data, summary.isEsc, summary.meta);
  setKpi(outcomeKpi.value, outcomeKpi.sub, summary.meta.kpi);
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = audit.length;
  setRunFourthKpi(data);
  refreshFactCount();
}

function walkthroughNodePanel(step, idx, total, data) {
  const facts = step.facts_used && typeof step.facts_used === "object"
    ? Object.entries(step.facts_used).map(([k, v]) => `<span class="fact-chip">${esc(k)}=<b>${esc(fmt(v))}</b></span>`).join("")
    : "";
  const packetFacts = Object.keys(compactFacts(state.runner.values[state.runner.engine])).length;
  const result = step.chosen || step.result || "evaluated";
  const pricing = step.type === "rating" && data.pricing ? uwPricingPanel(data.pricing) : "";
  return `<div class="walk-node">
    <div class="walk-node-top">
      <span class="ntype nt-${esc(step.type || "condition")}">${esc(step.type || "nodo")}</span>
      <span class="walk-node-id">${esc(step.node || `step-${idx + 1}`)}</span>
    </div>
    <h4>${esc(step.title || step.node || "Nodo ejecutable")}</h4>
    <div class="walk-explain">
      <div><span>Paquete</span><b>${packetFacts} hechos confirmados</b></div>
      <div><span>Resultado aquí</span><b>${esc(titleCase(result))}</b></div>
      <div><span>Progreso</span><b>${idx + 1}/${total} nodos</b></div>
    </div>
    ${step.detail ? `<p class="walk-detail">${esc(step.detail)}</p>` : ""}
    ${pricing ? `<div class="section-label inline">Tarificación producida</div>${pricing}` : ""}
    ${facts ? `<div class="section-label inline">Hechos usados en este nodo</div><div class="walk-facts">${facts}</div>` : ""}
    ${step.source_quote ? `<div class="section-label inline">Texto fuente</div><blockquote class="quote sm">${esc(step.source_quote)}</blockquote>` : ""}
    ${data.human_packet && idx === total - 1 ? `<div class="walk-callout"><b>Punto de intervención humana.</b> Esta ruta se detiene con un paquete que puede responderse y reanudarse.</div>` : ""}
  </div>`;
}

function walkthroughVerdictPanel(data, routePanel = "") {
  const summary = walkthroughSummary(data);
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  let html = `<div class="walk-verdict ${summary.meta.cls}">
    <div class="verdict-ico">${summary.meta.ico}</div>
    <div class="verdict-main">
      <div class="verdict-tag">${esc(summary.meta.tag)}</div>
      <div class="verdict-headline">${esc(summary.headline)}</div>
      <div class="verdict-reason">${esc(summary.reason)}</div>
      <div class="verdict-meta">${summary.chips.join("")}</div>
    </div>
  </div>`;
  if (summary.source) html += `<blockquote class="quote">${esc(summary.source)}</blockquote>`;
  html += routePanel;
  if (data.human_packet) html += humanPaquetePanel(data.human_packet);
  if (data.pricing) html += uwPricingPanel(data.pricing);
  if (caveats.length) html += `<div class="section-label">Salvedades</div><div class="caveats">${caveats.map(caveatRow).join("")}</div>`;
  return html;
}

function walkthroughRoutePanel(audit, activeIdx = -1) {
  if (!Array.isArray(audit) || !audit.length) {
    return `<div class="walk-route-panel">
      <div class="walk-route-head"><span>Ruta atravesada</span><b>0 nodos</b></div>
      <p class="walk-route-empty">El motor no devolvió nodos auditables para este caso.</p>
    </div>`;
  }
  const rows = audit.map((step, i) => {
    const result = step.chosen || step.result || "evaluated";
    return `<button class="walk-route-item ${i === activeIdx ? "active" : ""}" data-step="${i}" title="${esc(step.node || `step-${i + 1}`)}">
      <span class="walk-route-num">${i + 1}</span>
      <span class="walk-route-main">
        <span class="walk-route-title">${esc(step.title || step.node || "Nodo ejecutable")}</span>
        <span class="walk-route-id">${esc(step.node || `step-${i + 1}`)}</span>
      </span>
      <span class="walk-route-meta">
        <span class="ntype nt-${esc(step.type || "condition")}">${esc(step.type || "nodo")}</span>
        <span class="walk-route-result">${esc(titleCase(result))}</span>
      </span>
    </button>`;
  }).join("");
  return `<div class="walk-route-panel">
    <div class="walk-route-head"><span>Nodos atravesados</span><b>${audit.length} ${audit.length === 1 ? "nodo" : "nodos"}</b></div>
    <div class="walk-route-list">${rows}</div>
  </div>`;
}

function resetWalkthroughViewport() {
  const goTop = () => {
    const body = $("#result-body");
    try { if (body) body.scrollTop = 0; } catch {}
    const cardBody = body?.closest(".card-body");
    try { if (cardBody) cardBody.scrollTop = 0; } catch {}
    window.scrollTo({ top: 0, left: window.scrollX, behavior: "auto" });
  };
  requestAnimationFrame(() => {
    goTop();
    setTimeout(goTop, 0);
    setTimeout(goTop, 80);
  });
}

function walkthroughSummary(data) {
  const isEsc = data.kind === "escalate" || data.outcome === "ESCALATE" || data.outcome === "missing_fact" || !!(data.escalation && data.escalation.blocking_fact);
  const key = data.outcome || (isEsc ? "ESCALATE" : "result");
  const meta = VERDICT[key] || VERDICT[String(key).toLowerCase()] || { cls: "v-info", ico: "•", tag: titleCase(key), kpi: "is-info" };
  let headline, reason, chips = [];
  if (isEsc && data.escalation) {
    const e = data.escalation;
    headline = e.node_title || "Revisión manual requerida";
    reason = e.message || e.fact_prompt || e.reason || "Falta un hecho requerido.";
    if (e.blocking_fact) chips.push(chip("bloqueante", e.blocking_fact));
    if (e.on_missing) chips.push(chip("on_missing", e.on_missing));
    if (e.at_node) chips.push(chip("nodo", e.at_node));
    if (e.ledger_ref) chips.push(chip("registro", ledgerIdFromRef(e.ledger_ref)));
  } else {
    headline = meta.tag;
    reason = data.reason || data.orientation || "Nodo terminal alcanzado.";
    if (data.process) chips.push(chip("proceso", data.process));
    if (data.terminal_node) chips.push(chip("terminal", data.terminal_node));
  }
  const source = isEsc ? (data.escalation || {}).source_quote || (data.escalation || {}).fact_source_quote : data.source_quote;
  return { isEsc, meta, headline, reason, chips, source };
}

function bindWalkthroughControls(data) {
  const demo = demoState();
  const max = Array.isArray(data.audit) ? data.audit.length - 1 : -1;
  const currentStep = () => Number.isFinite(Number(demo.step)) ? Number(demo.step) : -1;
  const verdict = $("#walk-verdict");
  const back = $("#walk-back");
  const next = $("#walk-next");
  if (verdict) verdict.addEventListener("click", () => { demo.step = -1; renderWalkthroughResult(data); });
  if (back) back.addEventListener("click", () => { demo.step = Math.max(0, demo.step - 1); renderWalkthroughResult(data); });
  if (next) next.addEventListener("click", () => { demo.step = Math.min(max, currentStep() < 0 ? 0 : currentStep() + 1); renderWalkthroughResult(data); });
  $$(".walk-route-item").forEach((item) => item.addEventListener("click", () => {
    demo.step = Number(item.dataset.step || 0);
    renderWalkthroughResult(data);
  }));
}

const chip = (k, v) => `<span class="chip">${esc(titleCase(k))} · <b>${esc(v)}</b></span>`;
function uwPricingPanel(pricing) {
  const quote = pricing.quote || {};
  if (pricing.status === "blocked_by_uw_outcome") {
    return `<div class="price-inline price-blocked">
      <div class="price-inline-head"><span class="badge badge-amber">precio bloqueado</span><b>El precio final espera aprobación de suscripción</b></div>
      <p>${esc(pricing.blocked_reason || "El resultado de suscripción no está aprobado.")}</p>
    </div>`;
  }
  if (pricing.status === "missing_rating_input") {
    return `<div class="price-inline price-blocked">
      <div class="price-inline-head"><span class="badge badge-amber">faltan datos de precio</span><b>Aún no se puede producir precio final</b></div>
      <p>${esc(pricing.blocked_reason || "Faltan datos de tarificación.")}</p>
      <div class="step-facts">${(pricing.required_inputs || []).map((f) => `<span class="fact-chip">${esc(f)}</span>`).join("")}</div>
    </div>`;
  }
  const approved = pricing.approved;
  return `<div class="price-inline ${approved ? "approved" : "review"}">
    <div class="price-inline-head">
      <span class="badge ${approved ? "badge-ok" : "badge-amber"}">${approved ? "precio final aprobado" : "revisión de precio"}</span>
      <b>Bs. ${money(approved ? pricing.final_price_bob : pricing.suggested_price_bob)}</b>
    </div>
    <p>${approved ? "Suscripción aprobada y la tarificación no tiene alertas de revisión." : "La suscripción es elegible, pero el precio necesita revisión antes de ser final."}</p>
    ${priceOptionsList(quote.options || pricing.suggested_options || [])}
    <div class="price-breakdown compact">${(quote.breakdown || []).map(priceBreakdownRow).join("")}</div>
    ${(pricing.review_reasons || []).length ? `<div class="price-flags">${pricing.review_reasons.map((r) => `<span class="flag-count text">${esc(titleCase(r))}</span>`).join("")}</div>` : ""}
  </div>`;
}

function priceOptionsList(options) {
  if (!Array.isArray(options) || !options.length) return "";
  return `<div class="price-breakdown compact">${options.map((option) => `
    <div class="price-break-row">
      <span><b>${esc(option.label || option.id)}</b><em>franquicia min. Bs. ${money((option.franchise || {}).minimum_bob)}</em></span>
      <strong>Bs. ${money(option.cash_annual_premium_bob)}</strong>
    </div>`).join("")}</div>`;
}
function humanPaquetePanel(packet) {
  // A package that can't be auto-resumed and needs a person to weigh in is shown
  // as the notification that person would receive, with an inline resolve flow.
  if (!packet.resumable && packet.needs_human_task) return humanNotificationPanel(packet);
  const schema = packet.answer_schema || {};
  const facts = Object.keys(packet.facts || {}).length;
  const path = (packet.path || []).length;
  const node = packet.current_node || {};
  const control = packet.resumable ? humanAnswerControl(schema) : "";
  const action = packet.resumable
    ? `<button class="btn btn-primary" id="human-resume-btn">Continuar recorrido</button>`
    : `<button class="flag-change" data-kind="${esc(packet.task_type)}" data-target="${esc((node && node.id) || packet.requested_fact || "manual-review")}" data-title="${esc(packet.question || "Revisión manual")}" data-summary="${esc((packet.context && (packet.context.message || packet.context.reason)) || packet.non_resumable_reason || "")}" data-engine="${esc(packet.engine)}">Preparar dictamen</button>`;
  return `<div class="human-packet">
    <div class="human-head"><span class="human-badge">${packet.resumable ? "Necesita respuesta" : "Necesita dictamen"}</span><span class="mono">${esc(packet.packet_id || "")}</span></div>
    <h3>${esc(packet.question || "Intervención humana requerida")}</h3>
    <p class="human-sub">El paquete contiene ${facts} hechos y ${path} pasos de ruta${node && node.id ? ` · detenido en ${esc(node.id)}` : ""}.</p>
    ${schema.source_quote ? `<blockquote class="quote sm">${esc(schema.source_quote)}</blockquote>` : ""}
    ${packet.resumable ? `<label class="human-answer"><span>${esc(schema.fact_id || packet.requested_fact || "respuesta")}</span>${control}</label>` : `<p class="human-sub">${esc(packet.non_resumable_reason || "Esto debe pasar por gobernanza.")}</p>`}
    <div class="human-actions">${action}</div>
  </div>`;
}
function humanAnswerControl(schema) {
  const values = Array.isArray(schema.allowed_values) ? schema.allowed_values : [];
  const fact = esc(schema.fact_id || "");
  if (schema.type === "boolean") return `<select id="human-answer" data-ft="boolean" data-fact="${fact}"><option value="">Desconocido</option><option value="true">Sí</option><option value="false">No</option></select>`;
  if (schema.type === "enum" && values.length) return `<select id="human-answer" data-ft="enum" data-fact="${fact}"><option value="">Elegir…</option>${values.map((v) => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join("")}</select>`;
  if (schema.type === "number") return `<input id="human-answer" class="num-input" type="number" data-ft="number" data-fact="${fact}" placeholder="${esc(schema.unit || "")}"/>`;
  if (schema.type === "array") return `<input id="human-answer" class="num-input" style="width:220px;text-align:left" type="text" data-ft="array" data-fact="${fact}" placeholder="code, code"/>`;
  return `<input id="human-answer" class="num-input" style="width:220px;text-align:left" type="text" data-ft="string" data-fact="${fact}"/>`;
}
function bindHumanPaquete(packet) {
  if (!packet) return;
  if (!packet.resumable && packet.needs_human_task) return bindHumanNotification(packet);
  const btn = $("#human-resume-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const el = $("#human-answer");
    const value = parseAnswerValue(el);
    if (!hasValor(value)) { toast("Responde primero el hecho solicitado", true); return; }
    btn.classList.add("loading"); btn.disabled = true;
    try {
      const role = packet.engine === "uw" ? "uw_user" : "claims_user";
      const data = await postJSON(packet.resume_endpoint || `/api/${packet.engine}/resume`, {
        packet,
        answer: { fact_id: packet.requested_fact, value },
        facts_confirmed: true
      }, role);
      state.runner.values[packet.engine] = compactFacts({ ...(packet.facts || {}), [packet.requested_fact]: value });
      state.runner.result = data;
      if (state.route === "demo" || $(".recorrido-workspace")) {
        state.recorrido.facts = compactFacts({ ...(state.recorrido.facts || {}), [packet.requested_fact]: value });
        state.recorrido.result = data;
        state.recorrido.status = data.human_packet ? "human_task" : "done";
        demoState().active = true;
        demoState().step = -1;
        renderWalkthroughResult(data);
      } else if ($("#form-view")) {
        renderForm(); syncJson(); renderResult(data);
      } else {
        renderWalkthroughResult(data);
      }
      toast("Recorrido continuado");
    } catch {
      toast("No se pudo reanudar el recorrido", true);
    } finally {
      btn.classList.remove("loading"); btn.disabled = false;
    }
  });
}
function parseAnswerValue(el) {
  if (!el) return undefined;
  const t = el.dataset.ft;
  if (t === "boolean") return el.value === "" ? undefined : el.value === "true";
  if (t === "number") return el.value === "" ? undefined : Number(el.value);
  if (t === "array") return el.value.split(",").map((s) => s.trim()).filter(Boolean);
  return el.value;
}

/* ---------- human-in-the-loop notification ----------
   Visualizes the notification a human (e.g. pricing/underwriting) receives when
   the engine stops on a package it cannot resume on its own, plus the inline
   "respond and let the packet continue" flow against the real human-task API. */
const HUMAN_OWNER_LABELS = {
  pricing_review: "Suscriptor · Pricing",
  governance_or_manual_review: "Mesa de gobernanza",
  missing_document: "Suscriptor",
  manual_review: "Suscriptor",
};
function humanOwnerLabel(packet, task) {
  if (task && task.owner_role) return titleCase(task.owner_role);
  return HUMAN_OWNER_LABELS[packet.task_type] || "Suscriptor";
}
function humanPacketPricing(packet) {
  return (packet.context && packet.context.pricing) || {};
}
function humanNotificationPanel(packet) {
  const node = packet.current_node || {};
  const facts = Object.keys(packet.facts || {}).length;
  const path = (packet.path || []).length;
  const ctx = packet.context || {};
  const pricing = humanPacketPricing(packet);
  const reasons = (pricing.review_reasons || []).map((r) => `<span class="notify-reason">${esc(titleCase(r))}</span>`).join("");
  const suggested = pricing.suggested_price_bob;
  return `<div class="human-notify" data-packet='${esc(JSON.stringify(packet))}'>
    <div class="notify-card">
      <div class="notify-head">
        <span class="notify-bell">◉</span>
        <div class="notify-headtext">
          <div class="notify-to">Notificación para: <b>${esc(humanOwnerLabel(packet))}</b></div>
          <div class="notify-title">Un paquete espera tu revisión</div>
        </div>
        <span class="notify-sla">SLA 3 h</span>
      </div>
      <div class="notify-body">
        <p class="notify-q">${esc(packet.question || "Intervención humana requerida")}</p>
        ${ctx.message ? `<p class="notify-msg">${esc(ctx.message)}</p>` : ""}
        ${reasons ? `<div class="notify-reasons">${reasons}</div>` : ""}
        ${suggested != null ? `<div class="notify-suggested">Prima sugerida por el motor <b>Bs ${esc(money(suggested))}</b> · requiere aprobación humana</div>` : ""}
        ${ctx.source_quote ? `<blockquote class="quote sm">${esc(ctx.source_quote)}</blockquote>` : ""}
        <div class="notify-meta"><span>${facts} hechos</span><span>${path} pasos de ruta</span>${node && node.id ? `<span>detenido en <span class="mono">${esc(node.id)}</span></span>` : ""}</div>
      </div>
      <div class="notify-stage" id="notify-stage">
        <button class="btn btn-primary" id="notify-send-btn">Enviar a la bandeja del suscriptor</button>
        <span class="notify-stage-hint">Crea la tarea humana y notifica al rol responsable.</span>
      </div>
    </div>
  </div>`;
}
function humanNotifyFormFields(packet, task) {
  const schema = packet.answer_schema || task.answer_schema || {};
  const required = schema.required_fields || (packet.requested_fact ? [packet.requested_fact] : ["human_notes"]);
  const allowed = schema.allowed_values || {};
  const suggested = humanPacketPricing(packet).suggested_price_bob;
  return required.map((field) => {
    if (field === "human_notes") {
      return `<label class="notify-field"><span>Notas de la decisión</span><textarea id="nf-human_notes" class="notify-notes" placeholder="Justificación y referencia de la decisión"></textarea></label>`;
    }
    const opts = allowed[field];
    if (Array.isArray(opts) && opts.length) {
      return `<label class="notify-field"><span>${esc(humanFieldLabel(field))}</span><select id="nf-${esc(field)}" data-ft="string"><option value="">Elegir…</option>${opts.map((o) => `<option value="${esc(o)}">${esc(titleCase(o))}</option>`).join("")}</select></label>`;
    }
    const isPrice = /price|bob|prima|monto/.test(field);
    const prefill = isPrice && suggested != null ? ` value="${esc(suggested)}"` : "";
    return `<label class="notify-field"><span>${esc(humanFieldLabel(field))}</span><input id="nf-${esc(field)}" class="num-input" type="${isPrice ? "number" : "text"}" data-ft="${isPrice ? "number" : "string"}"${prefill}/></label>`;
  }).join("");
}
const HUMAN_FIELD_LABELS = {
  pricing_decision: "Decisión de pricing",
  approved_price_bob: "Precio aprobado (Bs)",
  human_notes: "Notas de la decisión",
};
function humanFieldLabel(field) {
  return HUMAN_FIELD_LABELS[field] || titleCase(field);
}
function bindHumanNotification(packet) {
  const root = $(".human-notify");
  if (!root) return;
  const role = packet.engine === "uw" ? "uw_user" : "claims_user";
  let task = null;
  const sendBtn = $("#notify-send-btn");
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    sendBtn.classList.add("loading"); sendBtn.disabled = true;
    try {
      task = await postJSON("/api/human-tasks", { packet, source_channel: "runner", initial_slip: "Corrida de decisión — revisión humana" }, "chat_agent");
      renderNotifyForm(packet, task);
    } catch {
      toast("No se pudo crear la tarea humana", true);
      sendBtn.classList.remove("loading"); sendBtn.disabled = false;
    }
  });

  function renderNotifyForm(packet, task) {
    const stage = $("#notify-stage");
    if (!stage) return;
    stage.innerHTML = `
      <div class="notify-created"><span class="notify-dot"></span>Tarea <span class="mono">${esc(task.task_id)}</span> en bandeja de <b>${esc(humanOwnerLabel(packet, task))}</b> · estado: necesita input</div>
      <div class="notify-form">${humanNotifyFormFields(packet, task)}</div>
      <div class="human-actions"><button class="btn btn-primary" id="notify-complete-btn">Resolver y continuar el paquete →</button></div>`;
    const completeBtn = $("#notify-complete-btn");
    completeBtn.addEventListener("click", async () => {
      const schema = packet.answer_schema || task.answer_schema || {};
      const required = schema.required_fields || (packet.requested_fact ? [packet.requested_fact] : ["human_notes"]);
      const answer = {};
      let humanNotes = "";
      for (const field of required) {
        const el = $(`#nf-${field}`);
        const val = parseAnswerValue(el);
        if (field === "human_notes") { humanNotes = el ? el.value : ""; continue; }
        if (!hasValor(val)) { toast(`Completa "${humanFieldLabel(field)}"`, true); return; }
        answer[field] = val;
      }
      completeBtn.classList.add("loading"); completeBtn.disabled = true;
      try {
        const res = await postJSON(`/api/human-tasks/${encodeURIComponent(task.task_id)}/complete`, { answer, human_notes: humanNotes, status: "completed" }, role);
        renderNotifyResolved(packet, res.task || {}, answer);
      } catch {
        toast("No se pudo completar la tarea", true);
        completeBtn.classList.remove("loading"); completeBtn.disabled = false;
      }
    });
  }

  function renderNotifyResolved(packet, doneTask, answer) {
    const stage = $("#notify-stage");
    if (!stage) return;
    const decision = answer.pricing_decision;
    const price = answer.approved_price_bob;
    const approved = decision !== "rejected";
    if (approved && price != null) setHumanApprovedPriceKpi(price);
    stage.innerHTML = `<div class="notify-resolved ${approved ? "ok" : "bad"}">
      <div class="notify-resolved-head"><span class="notify-check">${approved ? "✓" : "✕"}</span>
        <b>${approved ? "Paquete reanudado por el suscriptor" : "Paquete rechazado por el suscriptor"}</b></div>
      <p>Tarea <span class="mono">${esc(doneTask.task_id || "")}</span> resuelta por <b>${esc(titleCase(doneTask.completed_by_role || "suscriptor"))}</b>${decision ? ` · decisión: <b>${esc(titleCase(decision))}</b>` : ""}.</p>
      ${approved && price != null ? `<p class="notify-price">Precio final aprobado: <b>Bs ${esc(money(price))}</b>. El paquete continúa su curso.</p>` : `<p>El paquete no continúa; queda registrado para gobernanza.</p>`}
    </div>`;
    toast(approved ? "Paquete reanudado" : "Paquete rechazado");
  }
}
function setHumanApprovedPriceKpi(value) {
  const el = $("#kpi-price");
  if (!el) return;
  el.textContent = `Bs ${money(value)}`;
  const sub = $("#kpi-price-sub");
  if (sub) sub.textContent = "aprobado por humano";
  const card = $("#kpi-price-card");
  if (card) card.className = "kpi is-ok";
}
function caveatRow(c) {
  const text = typeof c === "string" ? c : (c.message || c.summary || JSON.stringify(c));
  const registro = c && typeof c === "object" ? c.ledger_ref : null;
  const target = c && typeof c === "object" ? (c.node || c.at_node || registro || "run-caveat") : "run-caveat";
  return `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(text)}</span>
    <span class="issue-actions">${registro ? ledgerLink(registro) : ""}<button class="flag-change" data-kind="caveat" data-target="${esc(target)}" data-title="${esc(target)}" data-summary="${esc(text)}" data-engine="${esc(state.runner.engine)}">Preparar cambio</button></span></div>`;
}
function stepRow(step, isFinal) {
  const result = String(step.result || "").toLowerCase();
  const rcls = isFinal ? "r-final" : (["pass", "advance", "branch", "fail", "stop"].includes(result) ? `r-${result}` : "r-advance");
  const facts = step.facts_used && typeof step.facts_used === "object" ? Object.entries(step.facts_used).map(([k, v]) => `<span class="fact-chip">${esc(k)}=<b>${esc(fmt(v))}</b></span>`).join("") : "";
  const src = step.source_quote ? `<span class="step-src">${esc(truncate(step.source_quote, 240))}</span>` : "";
  return `<div class="step ${rcls}"><span class="step-dot"></span><div class="step-card">
    <div class="step-top"><span class="step-type">${esc(step.type || "nodo")}</span><span class="step-title">${esc(step.title || step.node || "")}</span><span class="step-result">${esc(step.chosen || step.result || "")}</span></div>
    ${step.detail ? `<p class="step-detail">${esc(step.detail)}</p>` : ""}${facts ? `<div class="step-facts">${facts}</div>` : ""}${src}</div></div>`;
}
function engineOutcomeKpi(data, isEsc, meta) {
  if (state.runner.engine === "coverage") {
    const outcome = String(data.outcome || "").toLowerCase();
    if (isEsc || outcome === "missing_fact") return { value: "Falta dato", sub: "no se puede cerrar aún" };
    if (["likely_covered", "covered"].includes(outcome)) return { value: "Cubierto", sub: "según la orientación citada" };
    if (["not_covered", "excluded"].includes(outcome)) return { value: "No cubierto", sub: outcome === "excluded" ? "exclusión aplicable" : "fuera de cobertura" };
    if (outcome.includes("conflict") || outcome.includes("escalate") || outcome.includes("review")) return { value: "Revisar", sub: "requiere criterio humano" };
    return { value: meta.tag, sub: "orientación, no determinación" };
  }
  return {
    value: meta.tag,
    sub: isEsc ? "necesita un dato" : (data.process ? `${data.process} proceso` : "terminal")
  };
}
function setKpi(value, sub, cls) { const el = $("#kpi-outcome"); if (!el) return; el.textContent = value; $("#kpi-outcome-sub").textContent = sub; el.closest(".kpi").className = "kpi" + (cls ? " " + cls : ""); }
function setRunFourthKpi(data) {
  if (state.runner.engine === "coverage") return setCoverageCaveatsKpi(data);
  return setRunPriceKpi(data && data.pricing);
}
function setCoverageCaveatsKpi(data) {
  const el = $("#kpi-price");
  if (!el) return;
  const card = $("#kpi-price-card");
  const sub = $("#kpi-price-sub");
  if (!data) {
    el.textContent = "—";
    sub.textContent = "pendiente de ejecución";
    card.className = "kpi";
    return;
  }
  const packet = data.human_packet || {};
  const escalation = data.escalation || {};
  const requestedFact = packet.requested_fact || escalation.blocking_fact;
  if (requestedFact) {
    el.textContent = "Dato";
    sub.textContent = truncate(`falta ${titleCase(requestedFact)}`, 34);
    card.className = "kpi is-warn";
    return;
  }
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  el.textContent = String(caveats.length);
  sub.textContent = caveats.length ? `${caveats.length === 1 ? "salvedad" : "salvedades"} en dictamen` : "sin salvedades";
  card.className = "kpi" + (caveats.length ? " is-warn" : " is-ok");
}
function setRunPriceKpi(pricing) {
  const el = $("#kpi-price");
  if (!el) return;
  const card = $("#kpi-price-card");
  if (!pricing) {
    el.textContent = "—";
    $("#kpi-price-sub").textContent = "tras aprobación";
    card.className = "kpi";
    return;
  }
  if (pricing.approved) {
    el.textContent = `Bs. ${money(pricing.final_price_bob)}`;
    $("#kpi-price-sub").textContent = "aprobado";
    card.className = "kpi is-ok";
  } else if (pricing.suggested_price_bob) {
    el.textContent = `Bs. ${money(pricing.suggested_price_bob)}`;
    $("#kpi-price-sub").textContent = titleCase(pricing.status);
    card.className = "kpi is-warn";
  } else {
    el.textContent = "—";
    $("#kpi-price-sub").textContent = pricing.status ? titleCase(pricing.status) : "sin precio";
    card.className = "kpi is-warn";
  }
}

// Synonym facts the parser mirrors so both the decision-tree layer (vehicle_brand,
// siniestralidad) and the rating/form layer (make, year, siniestralidad_historica) stay
// fed. We collapse each group to one display row but still apply every member on click.
const FACT_ALIAS_GROUPS = [
  ["make", "vehicle_brand"],
  ["model_year", "year"],
  ["siniestralidad", "siniestralidad_historica"],
];
function aliasGroupFor(key) {
  return FACT_ALIAS_GROUPS.find((g) => g.includes(key)) || null;
}
function dedupeFactEntries(entries) {
  const rows = [];
  const byCanon = new Map();
  for (const [k, v] of entries) {
    const group = aliasGroupFor(k);
    if (!group) { rows.push({ keys: [k], k, v }); continue; }
    const canon = group[0];
    let row = byCanon.get(canon);
    if (!row) { row = { keys: [], k, v, canon }; byCanon.set(canon, row); rows.push(row); }
    row.keys.push(k);
    if (k === canon || row.k !== canon) { row.k = k; row.v = v; }
  }
  return rows;
}

function renderFactSuggestions(data, hostSel) {
  const host = $(hostSel);
  if (!host) return;
  if (!data) { host.innerHTML = ""; return; }
  const facts = data && (data.facts || data.extracted || data);
  const entries = facts && typeof facts === "object" && !Array.isArray(facts) ? Object.entries(facts) : [];
  const media = data.attachments || {};
  const mediaRows = (media.items || []).map((item) => `<div class="nl-row media-row">
    <span class="nl-key">${esc(item.kind)} · ${esc(item.name || "adjunto")}</span>
    <span class="nl-val">${esc(item.status_label || titleCase(item.status))}</span>
  </div>`).join("");
  if (!entries.length && !mediaRows) { host.innerHTML = `<p class="nl-empty">No se sugirieron hechos. Es solo orientativo; confirma manualmente.</p>`; return; }
  const applyTodos = entries.length ? `<div class="chat-bulk"><button class="nl-apply apply-all" data-host="${esc(hostSel)}">Aplicar todas las sugerencias</button><span>Revisar antes de ejecutar.</span></div>` : "";
  host.innerHTML = `${applyTodos}${dedupeFactEntries(entries).map((row) => {
    const v = row.v;
    const val = v && typeof v === "object" && "value" in v ? v.value : v;
    const conf = v && typeof v === "object" && "confidence" in v ? ` · ${Math.round(Number(v.confidence || 0) * 100)}%` : "";
    return `<div class="nl-row"><span class="nl-key">${esc(row.k)}${esc(conf)}</span><span class="nl-val">${esc(fmt(val))}</span><button class="nl-apply" data-aks='${esc(JSON.stringify(row.keys))}' data-av='${esc(JSON.stringify(val))}'>Aplicar →</button></div>`;
  }).join("")}${mediaRows}`;
  $$(`${hostSel} .nl-apply[data-aks]`).forEach((b) => b.addEventListener("click", () => {
    try {
      const v = JSON.parse(b.dataset.av);
      const keys = JSON.parse(b.dataset.aks);
      keys.forEach((kk, i) => applySuggestedFact(kk, v, i === keys.length - 1));
    } catch { toast("No se pudo aplicar", true); }
  }));
  const all = $(`${hostSel} .apply-all`);
  if (all) all.addEventListener("click", () => {
    const plainEntries = entries.map(([k, v]) => [k, v && typeof v === "object" && "value" in v ? v.value : v]);
    const assumed = hostSel === "#chat-result" ? runnerChatAssumptionEntries(Object.fromEntries(plainEntries)) : [];
    [...plainEntries, ...assumed].forEach(([k, v]) => applySuggestedFact(k, v, false));
    renderForm(); syncJson(); renderChat(); renderDemo();
    toast("Sugerencias aplicadas para revisión");
  });
}

function applySuggestedFact(key, value, rerender = true) {
  if (hasValor(value)) state.runner.values[state.runner.engine][key] = value;
  else delete state.runner.values[state.runner.engine][key];
  if (rerender) {
    renderForm(); syncJson(); renderChat(); renderDemo();
    toast(`Aplicado ${key}`);
  }
}
/* =====================================================================
   VIEW: SIMPLE_CHAT LOCAL CHAT
   ===================================================================== */
VIEWS.simple_chat = async function (params) {
  await loadChatLocalSessions();
  const portfolioView = await portfolioData().catch(() => null);
  const local = state.simple_chat.local;
  if (params.session) {
    try { local.session = await getJSON(`/api/chat/${encodeURIComponent(params.session)}`); }
    catch { toast("No se encontró la conversación local", true); }
  }
  const session = local.session;
  local.caseSettings = { ...SIMPLE_CHAT_CASE_DEFAULTS, ...(local.caseSettings || {}), ...((session && session.case_settings) || {}) };

  setTopbar(
    "Chat",
    "Chat local con detección automática de intención, cliente seleccionado y creación de eventos.",
    `<span class="badge badge-ok">intención automática</span>
     <button class="btn btn-ghost" id="simple_chat-new-chat-btn">Nueva conversación</button>`
  );

  $("#view").innerHTML = `
    <div class="simple_chat-workspace">
      <section class="chat-col">
        ${simple_chatCaseSettingsBar(local)}
        ${simple_chatStatusBanner(session)}
        <div class="chat-thread" id="simple_chat-local-log">
          ${simple_chatLocalMessages(session)}
        </div>
        <div class="composer-area">
          <div class="composer">
            <textarea id="simple_chat-local-input" class="composer-input" rows="1" spellcheck="true" placeholder="Escribe como cliente o broker…">${esc(local.text || "")}</textarea>
            <button class="composer-send" id="simple_chat-send-local-btn" title="Enviar" aria-label="Enviar">↑</button>
          </div>
          <div class="chat-loaded-note simple_chat-loaded-note hidden" id="simple_chat-loaded-note"></div>
          <div class="composer-bar">
            <label class="composer-engine"><span>Tipo de caso</span>${simple_chatEngineSelect(local.engine)}</label>
            <label class="composer-engine client-select"><span>Cliente</span>${simple_chatClientSelect(local, portfolioView)}</label>
            <div class="composer-bar-right">
              <button class="btn btn-ghost composer-confirm" id="simple_chat-sample-clean-btn">Sin revisión</button>
              <button class="btn btn-ghost composer-confirm" id="simple_chat-sample-review-btn">Con revisión</button>
              <span class="composer-hint">Enter envía · Shift+Enter salto</span>
            </div>
          </div>
        </div>
        <details class="simple_chat-more">
          <summary><span class="simple_chat-more-ico" aria-hidden="true">⌄</span> Ver memoria y conversaciones</summary>
          <div class="simple_chat-more-body">
            <section class="card">
              <div class="card-head"><h2>Memoria del caso</h2><span class="badge ${session ? simple_chatStatusClass(session.status) : "badge-ok"}">${esc(session ? titleCase(session.status) : "nuevo")}</span></div>
              <div class="card-body simple_chat-insight">${simple_chatLocalInsight(session)}</div>
            </section>
          </div>
        </details>
      </section>
      <aside class="simple_chat-packet-rail">
        ${simple_chatLivePacket(session)}
      </aside>
    </div>`;

  $("#simple_chat-new-chat-btn").addEventListener("click", newChatLocalChat);
  $("#simple_chat-sample-clean-btn").addEventListener("click", () => loadChatLocalSample("clean"));
  $("#simple_chat-sample-review-btn").addEventListener("click", () => loadChatLocalSample("review"));
  $("#simple_chat-send-local-btn").addEventListener("click", () => sendChatLocalChat(false));
  bindSimpleChatCaseSettings();
  $$("#view .sb-chip").forEach((b) => b.addEventListener("click", () => {
    const reply = b.dataset.reply || "";
    state.simple_chat.local.text = reply;
    const ta = $("#simple_chat-local-input"); if (ta) ta.value = reply;
    sendChatLocalChat(false);
  }));
  const localInput = $("#simple_chat-local-input");
  const autoGrowComposer = () => { localInput.style.height = "auto"; localInput.style.height = Math.min(localInput.scrollHeight, 200) + "px"; };
  localInput.addEventListener("input", (e) => { state.simple_chat.local.text = e.target.value; autoGrowComposer(); });
  localInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatLocalChat(false); }
  });
  autoGrowComposer();
  $("#simple_chat-engine-select").addEventListener("change", (e) => setChatLocalEngine(e.target.value));
  $("#simple_chat-client-select")?.addEventListener("change", (e) => {
    state.simple_chat.local.selectedClientId = e.target.value;
    toast(e.target.value ? "Cliente seleccionado" : "Chat sin cliente fijo");
  });
  bindPortfolioEventButtons();
  $$("#view .local-session").forEach((b) => b.addEventListener("click", async () => {
    try {
      state.simple_chat.local.session = await getJSON(`/api/chat/${encodeURIComponent(b.dataset.session)}`);
      state.simple_chat.local.engine = state.simple_chat.local.session.engine || "uw";
      state.simple_chat.local.selectedClientId = state.simple_chat.local.session.client_id || "";
      state.simple_chat.local.caseSettings = { ...SIMPLE_CHAT_CASE_DEFAULTS, ...((state.simple_chat.local.session || {}).case_settings || {}) };
      state.simple_chat.local.text = "";
      VIEWS.simple_chat({});
    } catch { toast("No se pudo abrir la conversación", true); }
  }));
  const log = $("#simple_chat-local-log");
  if (log) log.scrollTop = log.scrollHeight;
};

function simple_chatStatusClass(status) {
  const s = String(status || "");
  if (s.includes("ready") || s.includes("mock") || s.includes("bridge")) return "badge-ok";
  if (s.includes("ran") || s.includes("open")) return "badge-ok";
  if (s.includes("needs") || s.includes("human")) return "badge-amber";
  if (s.includes("partial") || s.includes("queue")) return "badge-amber";
  return "";
}

async function loadChatLocalSessions() {
  try { state.simple_chat.local.sessions = await getJSON("/api/chat"); }
  catch { state.simple_chat.local.sessions = []; }
}

function simple_chatEngineSelect(current) {
  const options = [
    { id: "auto", label: "Automático" },
    { id: "uw", label: "Suscripción" },
    { id: "renewal", label: "Renovación" },
    { id: "coverage", label: "Reclamos" },
  ];
  return `<select id="simple_chat-engine-select">${options.map((engine) =>
    `<option value="${esc(engine.id)}" ${current === engine.id ? "selected" : ""}>${esc(engine.label)}</option>`
  ).join("")}</select>`;
}

function simple_chatClientSelect(local, portfolioView) {
  const clients = (portfolioView && portfolioView.tables && portfolioView.tables.clients) || [];
  return `<select id="simple_chat-client-select">
    <option value="" ${!local.selectedClientId ? "selected" : ""}>Sin cliente fijo</option>
    ${clients.map((client) => `<option value="${esc(client.client_id)}" ${local.selectedClientId === client.client_id ? "selected" : ""}>${esc(client.client_name)} · ${esc(client.client_id)}</option>`).join("")}
  </select>`;
}

function caseSettingSelect(prefix, id, label, value, dataAttr = "data-runner-setting") {
  const options = SIMPLE_CHAT_SETTING_OPTIONS[id] || [];
  return `<label class="simple_chat-setting">
    <span>${esc(label)}</span>
    <select id="${esc(prefix)}-setting-${esc(id)}" ${dataAttr}="${esc(id)}">
      ${options.map(([optionValue, optionLabel]) => `<option value="${esc(optionValue)}" ${value === optionValue ? "selected" : ""}>${esc(optionLabel)}</option>`).join("")}
    </select>
  </label>`;
}

function simple_chatSettingSelect(id, label, value) {
  return caseSettingSelect("simple_chat", id, label, value, "data-setting");
}

function simple_chatCaseSettingsBar(local) {
  if (!["uw", "auto"].includes(local.engine || "auto")) return "";
  const settings = { ...SIMPLE_CHAT_CASE_DEFAULTS, ...(local.caseSettings || {}) };
  return `<div class="simple_chat-settings" aria-label="Contexto del caso">
    ${simple_chatSettingSelect("channel", "Canal", settings.channel)}
    ${simple_chatSettingSelect("client_type", "Tipo", settings.client_type)}
    ${simple_chatSettingSelect("product", "Macro", settings.product)}
    <label class="simple_chat-setting toggle">
      <input id="simple_chat-setting-apply_standard_assumptions" type="checkbox" data-setting="apply_standard_assumptions" ${settings.apply_standard_assumptions !== false ? "checked" : ""}/>
      <span>Supuestos estándar</span>
    </label>
  </div>`;
}

function bindSimpleChatCaseSettings() {
  const local = state.simple_chat.local;
  $$("#view [data-setting]").forEach((control) => {
    control.addEventListener("change", () => {
      const key = control.dataset.setting;
      local.caseSettings = { ...SIMPLE_CHAT_CASE_DEFAULTS, ...(local.caseSettings || {}) };
      local.caseSettings[key] = control.type === "checkbox" ? control.checked : control.value;
      toast("Contexto actualizado");
    });
  });
}

function chatDemoText(engine, variant = "clean") {
  const key = engine === "claims" ? "coverage" : engine;
  if (key === "uw") return exampleNarrative("uw", variant);
  return DEMO_TEXT[key] || DEMO_TEXT.uw;
}

function setChatLocalEngine(engine) {
  const local = state.simple_chat.local;
  if (!engine || local.engine === engine) return;
  local.engine = engine;
  local.session = null;
  VIEWS.simple_chat({});
  toast(`Tipo de caso: ${engineLabel(engine)}`);
}

function humanizeChatText(text) {
  let t = String(text || "");
  const map = [
    [/El [áa]rbol se detuvo y cre[ée] la tarea \S+ para [\w_]+\.?/gi, "Pasé el caso a una persona del equipo para que lo revise."],
    [/El [áa]rbol se detuvo/gi, "El caso se detuvo"],
    [/antes de ejecutar el [áa]rbol/gi, "para continuar"],
    [/ejecutar el [áa]rbol/gi, "evaluar el caso"],
    [/ejecutar el motor/gi, "evaluar el caso"],
    [/\bel [áa]rbol\b/gi, "el caso"],
    [/Extraje estos datos sugeridos:?/gi, "Anoté estos datos:"],
    [/Hechos sugeridos confirmados para ejecutar el motor\.?/gi, "Datos confirmados. RiskIQ está evaluando el caso."],
    [/Tarea humana creada:.*$/gim, "Pasé el caso a una persona del equipo."],
    [/datos sugeridos/gi, "datos"],
    [/hechos sugeridos/gi, "datos"],
    [/No pude extraer datos suficientes todav[íi]a\.?/gi, "Todavía no tengo datos suficientes."],
    [/\bhechos\b/gi, "datos"],
  ];
  for (const [re, rep] of map) t = t.replace(re, rep);
  return t.replace(/[ \t]{2,}/g, " ").trim();
}

function simple_chatBanner(tone, title, sub, extra) {
  const dot = { info: "●", warn: "▲", ok: "✓" }[tone] || "●";
  return `<div class="status-banner sb-${tone}">
    <span class="sb-dot">${dot}</span>
    <div class="sb-main">
      <div class="sb-title">${esc(title)}</div>
      <div class="sb-sub">${esc(sub)}</div>
      ${extra || ""}
    </div>
  </div>`;
}

function simple_chatQuickReplies(question) {
  const q = String(question || "").toLowerCase();
  const openEnded = /(cu[áa]l|qu[ée]|cu[áa]nt|c[óo]mo|d[óo]nde|cu[áa]ndo|n[úu]mero|monto|valor|placa|modelo|marca|a[ñn]o|nombre|direcci)/.test(q);
  if (openEnded) return "";
  return `<div class="sb-quick">
    <button class="sb-chip" data-reply="Sí">Sí</button>
    <button class="sb-chip" data-reply="No">No</button>
  </div>`;
}

const SIMPLE_CHAT_FACT_LABELS = {
  product: "Producto",
  channel: "Canal",
  client_type: "Cliente",
  requests_standard_deviation: "Desviaciones",
  is_mass_grouping: "Agrupación masiva",
  is_public_tender: "Licitación",
  vehicle_class: "Vehículo",
  segment: "Segmento",
  cilindrada_cc: "Cilindrada",
  valor_asegurado: "Valor asegurado",
  city: "Plaza",
  model_year: "Año modelo",
  make: "Marca",
  model: "Modelo",
  siniestralidad_historica: "Siniestralidad",
  has_plates: "Placas",
  is_public_tender: "Licitación",
  is_mass_grouping: "Agrupación",
  is_contractor_equipment: "Equipo contratista",
  is_competition_offroad: "Competición/off-road",
  is_rental: "Alquiler",
  has_body_modifications: "Modificaciones",
  is_rail_vehicle: "Sobre rieles",
  es_moto_lujo_o_competicion: "Moto lujo/competición",
  is_learning_vehicle: "Aprendizaje",
  circula_fuera_pais_actividad_regular: "Circula fuera del país",
  capacidad_original_mayor_8: "Más de 8 pasajeros",
  servicio_publico_pasajeros: "Servicio público",
  is_armored: "Blindado",
  is_bomberos_policia_ejercito: "Emergencia/FFAA",
  is_ambulance: "Ambulancia",
  has_foreign_plates: "Placa extranjera",
  is_brevet_policy: "Póliza brevet",
  has_rc: "RC",
  has_ap: "AP",
  is_enlatado: "Enlatado",
  cantidad_vehiculos: "Vehículos",
  suscriptor: "Suscriptor",
  extraterritorialidad: "Extraterritorialidad",
  cuotas: "Cuotas",
  selected_pricing_option: "Opción precio",
  vehicle_age_years: "Antigüedad",
  marca_auto: "ID marca",
  plaza_auto: "ID plaza",
  coverage_section: "Cobertura",
  coverage_included: "Cobertura incluida",
  event_type: "Evento",
  police_report_within_6h: "Denuncia",
  alcohol_test_within_6h: "Dosaje",
  insurer_notice_days: "Aviso"
};

function simple_chatFactLabel(key) {
  return SIMPLE_CHAT_FACT_LABELS[key] || titleCase(key);
}

function simple_chatLivePacket(session) {
  const facts = (session && session.confirmed_facts) || {};
  const pending = (session && session.pending_facts) || {};
  const assumed = (session && Array.isArray(session.assumed_facts)) ? session.assumed_facts : [];
  const factEntries = Object.entries(facts).filter(([, value]) => hasValor(value));
  const pendingEntries = Object.entries(pending).filter(([, value]) => hasValor(value));
  const assumedRows = assumed.slice(0, 10).map((item) => `<li class="assumed"><span>${esc(simple_chatFactLabel(item.fact_id))}</span><b>${esc(fmt(item.value))}</b></li>`).join("");
  const summary = (session && session.last_result_summary) || {};
  const event = session && session.last_event;
  const followup = session && session.client_followup;
  const task = session && session.human_task;
  const title = session ? (session.title || "Paquete del caso") : "Paquete del caso";
  const stateLabel = session ? titleCase(session.status || "open") : "nuevo";
  const rows = factEntries.slice(0, 14).map(([key, value]) => `<li><span>${esc(simple_chatFactLabel(key))}</span><b>${esc(fmt(value))}</b></li>`).join("");
  const pendingRows = pendingEntries.slice(0, 8).map(([key, value]) => `<li class="pending"><span>${esc(simple_chatFactLabel(key))}</span><b>${esc(fmt(value))}</b></li>`).join("");
  const next = followup
    ? (followup.client_question || followup.question || "Falta un dato del cliente.")
    : task
      ? `Revisión de ${titleCase(task.owner_role || "equipo")}: ${task.question || "paquete humano"}`
      : summary.outcome
        ? `RiskIQ: ${titleCase(summary.outcome)}${summary.pricing_status ? ` · ${titleCase(summary.pricing_status)}` : ""}`
        : session
          ? "Chat sigue escuchando y completando el paquete."
          : "Escribe el primer mensaje para armarlo.";
  return `<div class="packet-shell">
    <div class="packet-kicker">Paquete vivo</div>
    <h2>${esc(title)}</h2>
    <div class="packet-state">
      <span>${esc(stateLabel)}</span>
      <b>${factEntries.length} datos</b>
    </div>
    ${event ? `<div class="packet-section">
      <h3>Evento</h3>
      <p class="packet-next"><span class="mono">${esc(event.event_id)}</span> · ${esc(titleCase(event.event_type))} · ${event.ready_to_execute ? "listo" : "incompleto"}</p>
      <button class="btn btn-ghost event-load-btn" data-event-id="${esc(event.event_id)}">Cargar en flujo</button>
    </div>` : ""}
    <div class="packet-section">
      <h3>Datos</h3>
      ${rows || pendingRows ? `<ul class="packet-list">${rows}${pendingRows}</ul>` : `<p class="packet-empty">Aún no hay datos del caso.</p>`}
    </div>
    ${assumedRows ? `<div class="packet-section"><h3>Supuestos</h3><ul class="packet-list">${assumedRows}</ul></div>` : ""}
    <div class="packet-section">
      <h3>Siguiente</h3>
      <p class="packet-next">${esc(humanizeChatText(next))}</p>
    </div>
    ${summary.audit_steps ? `<div class="packet-section"><h3>Ruta</h3><p class="packet-next">${esc(summary.audit_steps)} pasos recorridos${summary.requested_fact ? ` · falta ${esc(simple_chatFactLabel(summary.requested_fact))}` : ""}</p></div>` : ""}
  </div>`;
}

function simple_chatStatusBanner(session) {
  if (!session || !Array.isArray(session.messages) || !session.messages.length) {
    return simple_chatBanner("info", "Listo para conversar", "Cuéntame el caso como se lo dirías a un suscriptor. Si falta algo, te lo pregunto aquí.");
  }
  const pendingCount = Object.keys(session.pending_facts || {}).length;
  const summary = session.last_result_summary || {};
  const followup = session.client_followup;
  const task = session.human_task;

  if (pendingCount) {
    return simple_chatBanner("info", "Tengo datos del caso", "Sigue con el siguiente dato o corrige lo que haga falta; lo incorporo en la conversación.");
  }
  if (followup) {
    const q = humanizeChatText(followup.client_question || followup.question || "Chat necesita un dato más del cliente.");
    return simple_chatBanner("info", "Chat está esperando una respuesta", q, simple_chatQuickReplies(q));
  }
  if (task) {
    return simple_chatBanner("warn", "El caso pasó a una persona del equipo", "Alguien del equipo va a revisar este caso. No necesitas hacer nada más por ahora.");
  }
  if (summary.outcome) {
    const needsReview = /escal|declin|rechaz|human|revis|pend/i.test(String(summary.outcome));
    if (needsReview) {
      return simple_chatBanner("warn", "El caso necesita una revisión", "RiskIQ marcó que este caso requiere una mirada adicional antes de continuar.");
    }
    return simple_chatBanner("ok", "RiskIQ terminó de evaluar el caso", "La evaluación está lista. Puedes ver el detalle en “Ver detalles técnicos”.");
  }
  return simple_chatBanner("info", "Conversando con el cliente", "Sigue escribiendo. Chat actualiza el paquete y RiskIQ evalúa cuando corresponde.");
}

function simple_chatLocalMessages(session) {
  const messages = (session && Array.isArray(session.messages)) ? session.messages : [];
  if (!messages.length) return `<div class="chat-empty">
    <div class="chat-empty-mark">◌</div>
    <p class="chat-empty-title">¿En qué te ayudo hoy?</p>
    <p class="chat-empty-sub">Escribe como cliente o broker. Chat entiende la intención, arma el paquete y llama a RiskIQ cuando toca.</p>
  </div>`;
  return messages.map((m) => {
    const sender = String(m.sender || "");
    if (sender === "sistema") return `<div class="msg-sys">${esc(humanizeChatText(m.text))}</div>`;
    const isUser = sender === "cliente" || sender === "broker" || sender === "usuario";
    const who = isUser ? "user" : "bot";
    const label = isUser ? titleCase(sender) : "Chat";
    const avatar = isUser ? esc(label.slice(0, 1)) : "◌";
    const text = isUser ? m.text : humanizeChatText(m.text);
    return `<div class="msg msg-${who}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-name">${esc(label)}</div>
        <div class="msg-text">${esc(text)}</div>
      </div>
    </div>`;
  }).join("");
}

function simple_chatLocalInsight(session) {
  if (!session) return `<div class="empty"><div class="empty-ico">▣</div><p class="empty-title">Sin conversación activa</p><p class="empty-sub">Puedes empezar desde cero o abrir una conversación local guardada.</p></div>${simple_chatLocalSessionList()}`;
  const pending = session.pending_facts || {};
  const summary = session.last_result_summary || {};
  return `<div class="local-insight-stack">
    <div class="verdict v-info local-verdict">
      <div class="verdict-ico">◌</div>
      <div class="verdict-main">
        <div class="verdict-tag">chat</div>
        <div class="verdict-headline">${esc(session.title || session.session_id)}</div>
        <div class="verdict-reason">${esc(session.guardrail || "El chat mantiene memoria; RiskIQ decide.")}</div>
        <div class="verdict-meta">
          ${chip("estado", titleCase(session.status))}
          ${chip("motor", engineLabel(session.engine))}
          ${summary.outcome ? chip("resultado", titleCase(summary.outcome)) : ""}
          ${summary.requested_fact ? chip("bloqueante", summary.requested_fact) : ""}
        </div>
      </div>
    </div>
    ${Object.keys(pending).length ? simple_chatPendingFacts(pending) : ""}
    ${session.client_followup ? simple_chatClientFollowup(session.client_followup) : ""}
    ${summary.outcome ? simple_chatResultSummary(summary) : ""}
    ${session.human_task ? simple_chatTaskSummary(session.human_task) : ""}
    ${simple_chatLocalSessionList(session.session_id)}
  </div>`;
}

function simple_chatPendingFacts(facts) {
  const rows = Object.entries(facts).map(([k, v]) => `<div class="nl-row"><span class="nl-key">${esc(k)}</span><span class="nl-val">${esc(fmt(v))}</span></div>`).join("");
  return `<div class="local-panel">
    <div class="section-label">Datos pendientes</div>
    <p class="nl-empty">Estos datos vienen de una conversación anterior. Al continuar, Chat los incorpora al paquete.</p>
    <div class="local-facts">${rows}</div>
  </div>`;
}

function simple_chatResultSummary(summary) {
  return `<div class="price-inline ${summary.pricing_status === "approved_final_price" ? "approved" : "review"}">
    <div class="price-inline-head"><span class="badge ${summary.pricing_status === "approved_final_price" ? "badge-ok" : "badge-amber"}">${esc(titleCase(summary.outcome))}</span><b>${esc(summary.terminal_node || summary.requested_fact || "resultado")}</b></div>
    <p>Ruta ejecutada con ${esc(summary.audit_steps || 0)} pasos. ${summary.pricing_status ? `Precio: ${esc(titleCase(summary.pricing_status))}.` : ""}</p>
  </div>`;
}

function simple_chatClientFollowup(packet) {
  return `<div class="price-inline review">
    <div class="price-inline-head"><span class="badge badge-amber">Pregunta al cliente</span><b>${esc(packet.requested_fact || "dato pendiente")}</b></div>
    <p>${esc(packet.client_question || packet.question || "Necesito un dato adicional para continuar.")}</p>
    <div class="step-facts">
      <span class="fact-chip">canal=<b>cliente/broker</b></span>
      <span class="fact-chip">sin tarea humana</span>
      ${packet.resolution_reason ? `<span class="fact-chip">motivo=<b>${esc(packet.resolution_reason)}</b></span>` : ""}
    </div>
  </div>`;
}

function simple_chatPacketSummary(packet) {
  return `<div class="human-packet simple_chat-packet">
    <div class="human-head"><span class="human-badge">${packet.resumable ? "Paquete reanudable" : "Necesita dictamen"}</span><span class="mono">${esc(packet.packet_id || "mock")}</span></div>
    <h3>${esc(packet.question || "Intervención humana requerida")}</h3>
    <p class="human-sub">Motor ${esc(packet.engine)} · ${Object.keys(packet.facts || {}).length} hechos · ${(packet.path || []).length} pasos · solicitado: ${esc(packet.requested_fact || "dictamen")}</p>
    ${packet.context && packet.context.source_quote ? `<blockquote class="quote sm">${esc(packet.context.source_quote)}</blockquote>` : ""}
  </div>`;
}

function simple_chatTaskSummary(task) {
  if (task.task_id && task.owner_role) {
    return `<div class="price-inline review">
      <div class="price-inline-head"><span class="badge badge-amber">${esc(titleCase(task.task_type || "human_task"))}</span><b>${esc(task.question || "Tarea humana")}</b></div>
      <p>Asignada a ${esc(task.owner_role)} con prioridad ${esc(titleCase(task.priority || "normal"))}.</p>
      <div class="step-facts">
        <span class="fact-chip">task_id=<b>${esc(task.task_id)}</b></span>
        ${task.requested_fact ? `<span class="fact-chip">hecho=<b>${esc(task.requested_fact)}</b></span>` : ""}
      </div>
    </div>`;
  }
  return `<div class="price-inline review">
    <div class="price-inline-head"><span class="badge badge-amber">${esc(titleCase(task.kind))}</span><b>${esc(task.title)}</b></div>
    <p>${esc(task.summary)}</p>
    <div class="step-facts">
      <span class="fact-chip">task_id=<b>${esc(task.task_id)}</b></span>
      <span class="fact-chip">outcome=<b>${esc((task.route || {}).outcome)}</b></span>
      <span class="fact-chip">pasos=<b>${esc((task.route || {}).audit_steps)}</b></span>
    </div>
  </div>`;
}

function simple_chatLocalSessionList(activeId) {
  const sessions = state.simple_chat.local.sessions || [];
  if (!sessions.length) return "";
  return `<div class="local-panel">
    <div class="section-label">Conversaciones locales</div>
    <div class="local-sessions">${sessions.slice(0, 8).map((s) => `<button class="local-session ${s.session_id === activeId ? "active" : ""}" data-session="${esc(s.session_id)}">
      <span>${esc(s.title || s.session_id)}</span>
      <b>${esc(titleCase(s.status || "open"))}</b>
    </button>`).join("")}</div>
  </div>`;
}

async function sendChatLocalChat(confirmPending) {
  const local = state.simple_chat.local;
  const text = ($("#simple_chat-local-input") ? $("#simple_chat-local-input").value : local.text || "").trim();
  if (!confirmPending && !text) { toast("Escribe un mensaje primero", true); return; }
  const btn = confirmPending ? $("#simple_chat-confirm-local-btn") : $("#simple_chat-send-local-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const body = {
      session_id: local.session && local.session.session_id,
      engine: local.engine || "uw",
      text: confirmPending ? "" : text,
      action: confirmPending ? "confirm_pending" : "message",
      use_pending_facts: confirmPending,
      facts_confirmed: confirmPending,
      case_settings: local.caseSettings || SIMPLE_CHAT_CASE_DEFAULTS,
      client_id: local.selectedClientId || "",
      auto_detect_intent: local.engine === "auto",
      create_human_task: true
    };
    const data = await postJSON("/api/chat", body, "chat_agent");
    if (data.error) throw new Error(data.error);
    local.session = data.session;
    local.engine = data.session.engine || local.engine;
    local.selectedClientId = data.session.client_id || local.selectedClientId || "";
    state.cache.portfolio = null;
    local.text = "";
    await loadChatLocalSessions();
    VIEWS.simple_chat({});
    toast(confirmPending ? "Hechos confirmados y motor ejecutado" : "Mensaje enviado");
  } catch (err) {
    toast(err.message || "No se pudo enviar al chat local", true);
  } finally {
    const nextBtn = confirmPending ? $("#simple_chat-confirm-local-btn") : $("#simple_chat-send-local-btn");
    if (nextBtn) { nextBtn.classList.remove("loading"); nextBtn.disabled = false; }
  }
}

function newChatLocalChat() {
  state.simple_chat.local.session = null;
  state.simple_chat.local.text = "";
  VIEWS.simple_chat({});
  toast("Nueva conversación local");
}

async function loadChatLocalSample(variant = "clean") {
  const local = state.simple_chat.local;
  local.session = null;
  local.text = chatDemoText(local.engine, variant);
  await VIEWS.simple_chat({});
  const label = local.engine === "uw" && UW_EXAMPLES[variant] ? UW_EXAMPLES[variant].label : `Demo de ${engineLabel(local.engine)}`;
  markExampleTextarea("#simple_chat-local-input", "#simple_chat-loaded-note", `${label} cargado aquí`);
  toast(`Demo de ${engineLabel(local.engine)} cargado en el chat`);
}

/* =====================================================================
   VIEW: LBC AUTO PRICING
   ===================================================================== */
VIEWS.pricing = async function () {
  const schema = await ratingSchema();
  setTopbar(
    "Tarificación LBC Auto",
    "Formula reverse-engineered de la API LBC, aislada fuera del árbol de suscripción.",
    `<span class="badge badge-amber">reverse engineered</span>
     <button class="btn btn-ghost" id="price-sample-btn">Cargar ejemplo</button>
     <button class="btn btn-ghost" id="price-clear-btn">Limpiar</button>
     <button class="btn btn-primary" id="price-run-btn">$ Calcular</button>`
  );

  $("#view").innerHTML = `
    <section class="kpis price-kpis">
      <div class="kpi" id="price-kpi-card"><span class="kpi-label">Prima anual</span><span class="kpi-value" id="price-kpi-total">--</span><span class="kpi-sub" id="price-kpi-sub">Aún sin precio</span></div>
      <div class="kpi"><span class="kpi-label">Tasa técnica</span><span class="kpi-value" id="price-kpi-rate">--</span><span class="kpi-sub">después de factores</span></div>
      <div class="kpi"><span class="kpi-label">Multiplicador</span><span class="kpi-value" id="price-kpi-mult">--</span><span class="kpi-sub">factor combinado</span></div>
      <div class="kpi"><span class="kpi-label">Revisión</span><span class="kpi-value" id="price-kpi-review">--</span><span class="kpi-sub">alertas de precio</span></div>
    </section>
    <div class="board pricing-board">
      <section class="card">
        <div class="card-head"><h2>Datos de tarificación</h2><span class="badge badge-amber">LBC Auto</span></div>
        <div class="card-body">
          <div class="truth-note"><b>Separado del árbol.</b> Esto no toca representation/ ni grafos crawlable; solo calcula precio con la fórmula calibrada.</div>
          <div class="pform price-form" id="price-form"></div>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Estimación de precio</h2><span class="audit-id" id="price-audit-id"></span></div>
        <div class="card-body" id="price-result-body">${emptyPriceResult()}</div>
      </section>
    </div>`;

  renderPriceForm(schema);
  renderPriceResult(state.pricing.result);
  $("#price-run-btn").addEventListener("click", runDemoPricing);
  $("#price-sample-btn").addEventListener("click", async () => {
    state.pricing.values = { ...PRICING_SAMPLE };
    state.pricing.result = null;
    renderPriceForm(await ratingSchema());
    renderPriceResult(null);
    toast("Ejemplo de precio cargado");
  });
  $("#price-clear-btn").addEventListener("click", async () => {
    state.pricing.values = {};
    state.pricing.result = null;
    renderPriceForm(await ratingSchema());
    renderPriceResult(null);
    toast("Datos de precio limpiados");
  });
};

function renderPriceForm(schema) {
  const fields = (schema && schema.fields) || RATING_FALLBACK_SCHEMA.fields;
  $("#price-form").innerHTML = fields.map((field) => priceField(field, state.pricing.values[field.id])).join("");
  $$("#price-form [data-pk]").forEach((el) => el.addEventListener("change", () => onPriceFieldChange(el)));
}

function priceField(field, value) {
  const id = esc(field.id);
  const label = `${esc(field.label || titleCase(field.id))}${field.required ? " *" : ""}`;
  const hint = field.unit ? `<em>${esc(field.unit)}</em>` : "";
  let control;
  if (field.type === "enum" && Array.isArray(field.values)) {
    const current = hasValor(value) ? String(value) : "";
    control = `<select id="price-${id}" data-pk="${id}" data-pt="enum">
      <option value="" ${!current ? "selected" : ""}>Elegir</option>
      ${field.values.map((v) => `<option value="${esc(v)}" ${String(v) === current ? "selected" : ""}>${esc(titleCase(v))}</option>`).join("")}
    </select>`;
  } else if (field.type === "number") {
    const step = field.id === "model_year" ? "1" : "0.01";
    control = `<input id="price-${id}" data-pk="${id}" data-pt="number" type="number" step="${step}" value="${esc(value ?? "")}"/>`;
  } else {
    control = `<input id="price-${id}" data-pk="${id}" data-pt="string" type="text" value="${esc(value ?? "")}"/>`;
  }
  return `<label class="pf"><span>${label} ${hint}</span>${control}</label>`;
}

function onPriceFieldChange(el) {
  const key = el.dataset.pk;
  const value = el.dataset.pt === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
  if (hasValor(value)) state.pricing.values[key] = value;
  else delete state.pricing.values[key];
}

async function runDemoPricing() {
  const btn = $("#price-run-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const data = await postJSON("/api/rating/lbc-auto", { facts: compactFacts(state.pricing.values), facts_confirmed: true }, "uw_user");
    if (data.error || data.detail) {
      toast(data.error || data.detail, true);
      return;
    }
    state.pricing.result = data;
    renderPriceResult(data);
    toast("Precio LBC Auto calculado");
  } catch {
    toast("Falló la tarificación - ¿está levantado el servidor?", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function emptyPriceResult() {
  return `<div class="empty"><div class="empty-ico">$</div><p class="empty-title">Aún no hay precio</p>
    <p class="empty-sub">Ingresa los datos de tarificación LBC Auto y calcula las tres opciones.</p></div>`;
}

function renderPriceResult(data) {
  if (!data) {
    $("#price-result-body").innerHTML = emptyPriceResult();
    $("#price-audit-id").textContent = "";
    setPriceKpis(null);
    return;
  }
  const reviewReasons = Array.isArray(data.review_reasons) ? data.review_reasons : [];
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  const reviewBadge = reviewReasons.length
    ? `<span class="badge badge-amber">${reviewReasons.length} alerta de revisión${reviewReasons.length === 1 ? "" : "s"}</span>`
    : `<span class="badge badge-ok">precio LBC calculado</span>`;
  $("#price-result-body").innerHTML = `
    <div class="price-result">
      <div class="price-hero">
        <span class="price-label">Prima anual seleccionada</span>
        <strong>Bs. ${money(data.annual_premium_bob)}</strong>
        <span class="price-sub">${esc(data.selected_option || "option_1")} · referencia mensual Bs. ${money(data.monthly_reference_bob)} · ${pct(data.technical_rate)} tasa técnica</span>
        <div class="price-badges">${reviewBadge}<span class="badge badge-amber">reverse engineered</span></div>
      </div>
      <div class="price-meta-grid">
        ${priceMeta("Vehículo", `${(data.inputs || {}).make || "--"} ${(data.inputs || {}).model || ""}`)}
        ${priceMeta("Marca RUAT", (data.inputs || {}).marca_auto)}
        ${priceMeta("Plaza", (data.inputs || {}).city)}
        ${priceMeta("Valor", `Bs. ${money((data.inputs || {}).valor_asegurado)}`)}
        ${priceMeta("Año", (data.inputs || {}).model_year)}
        ${priceMeta("Cuotas", (data.inputs || {}).cuotas)}
      </div>
      <div class="section-label">Opciones</div>
      ${priceOptionsList(data.options || [])}
      ${reviewReasons.length ? `<div class="section-label">Alertas de revisión</div><div class="price-flags">${reviewReasons.map((r) => `<span class="flag-count text">${esc(titleCase(r))}</span>`).join("")}</div>` : ""}
      <div class="section-label">Desglose de factores</div>
      <div class="price-breakdown">${(data.breakdown || []).map(priceBreakdownRow).join("")}</div>
      <div class="section-label">Salvedades</div>
      <div class="caveats">${caveats.map((c) => `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(c.message || c)}</span></div>`).join("")}</div>
    </div>`;
  $("#price-audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  setPriceKpis(data);
}

function priceMeta(k, v) {
  return `<div class="price-meta"><span>${esc(k)}</span><b>${esc(fmt(v))}</b></div>`;
}

function priceBreakdownRow(row) {
  const right = row.amount_bob !== undefined
    ? `Bs. ${money(row.amount_bob)}`
    : row.base_rate !== undefined
      ? pct(row.base_rate)
      : `x${Number(row.multiplier || 1).toFixed(2)}`;
  return `<div class="price-break-row">
    <span><b>${esc(row.label || row.key)}</b><em>${esc(fmt(row.value))}</em></span>
    <strong>${esc(right)}</strong>
  </div>`;
}

function setPriceKpis(data) {
  const card = $("#price-kpi-card");
  if (!card) return;
  $("#price-kpi-total").textContent = data ? `Bs. ${money(data.annual_premium_bob)}` : "--";
  $("#price-kpi-sub").textContent = data ? data.outcome : "Aún sin precio";
  $("#price-kpi-rate").textContent = data ? pct(data.technical_rate) : "--";
  $("#price-kpi-mult").textContent = data ? `x${Number(data.combined_multiplier || 1).toFixed(2)}` : "--";
  const reviews = data && Array.isArray(data.review_reasons) ? data.review_reasons.length : null;
  $("#price-kpi-review").textContent = data ? String(reviews) : "--";
  card.className = "kpi" + (data ? (reviews ? " is-warn" : " is-ok") : "");
}

function money(v) {
  if (!hasValor(v) || Number.isNaN(Number(v))) return "--";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v) {
  if (!hasValor(v) || Number.isNaN(Number(v))) return "--";
  return `${(Number(v) * 100).toFixed(2)}%`;
}
VIEWS.pricing = function () { go("uw"); };

/* =====================================================================
   VIEW: RENEWAL WORKBENCH
   ===================================================================== */
VIEWS.renewals = async function () {
  await ratingSchema();
  setTopbar(
    "Mesa de renovación",
    "Deltas por cliente/póliza sobre una versión fija del grafo. El árbol base y la fuente permanecen intactos.",
    `<span class="badge badge-amber">modelo delta</span>
     <button class="btn btn-ghost" id="ren-sample-btn">Cargar ejemplo</button>
     <button class="btn btn-primary" id="ren-preview-btn">Previsualizar renovación</button>
     <button class="btn btn-secondary" id="ren-save-btn">Guardar borrador</button>`
  );

  $("#view").innerHTML = `
    <section class="kpis renewal-kpis">
      <div class="kpi" id="ren-price-card"><span class="kpi-label">Prima de renovación</span><span class="kpi-value" id="ren-kpi-price">--</span><span class="kpi-sub">después del ajuste</span></div>
      <div class="kpi"><span class="kpi-label">Almacenamiento delta</span><span class="kpi-value" id="ren-kpi-delta">--</span><span class="kpi-sub">por cliente/póliza</span></div>
      <div class="kpi"><span class="kpi-label">Árbol completo</span><span class="kpi-value" id="ren-kpi-tree">--</span><span class="kpi-sub">no duplicado</span></div>
      <div class="kpi"><span class="kpi-label">Deltas de nodo</span><span class="kpi-value" id="ren-kpi-nodes">--</span><span class="kpi-sub">cambios acotados</span></div>
    </section>
    ${demoPortfolioPanel("renewals")}
    <div class="board renewal-board">
      <section class="card">
        <div class="card-head"><h2>Paquete de renovación</h2><span class="badge badge-amber">fuente sin cambios</span></div>
        <div class="card-body">
          <div class="truth-note"><b>Solo delta.</b> Guardamos la versión del grafo usada y los objetivos cambiados, no un árbol clonado.</div>
          <div class="pform" id="ren-form">
            <label class="pf"><span>ID de cliente</span><input data-rk="client_id" type="text"/></label>
            <label class="pf"><span>ID de póliza</span><input data-rk="policy_id" type="text"/></label>
            <label class="pf"><span>Fecha de renovación</span><input data-rk="renewal_date" type="date"/></label>
            <label class="pf"><span>Ajuste de precio <em>%</em></span><input data-rk="price_adjustment_percent" type="number" step="0.01"/></label>
            <label class="pf full"><span>Motivo del ajuste</span><textarea data-rk="price_adjustment_reason" rows="2"></textarea></label>
          </div>
          <div class="section-label inline">Hechos de tarificación</div>
          <div class="pform ren-rating-form" id="ren-rating-form"></div>
          <label class="pf full ren-json"><span>Deltas de nodo/artefacto acotados al cliente <em>JSON</em></span><textarea id="ren-overrides" rows="9" spellcheck="false"></textarea></label>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Previsualización de renovación</h2><span class="audit-id" id="ren-audit-id"></span></div>
        <div class="card-body" id="ren-result-body">${emptyRenewalResult()}</div>
      </section>
    </div>
    <div class="board lower renewal-lower">
      <section class="card">
        <div class="card-head"><h2>Borradores de renovación guardados</h2><span class="badge" id="ren-saved-count">--</span></div>
        <div class="card-body" id="ren-saved-body"><p class="nl-empty">Cargando borradores...</p></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Modelo de almacenamiento</h2><span class="badge badge-ok">reutilizable</span></div>
        <div class="card-body">
          <div class="ins-row"><span class="ins-k">base</span><span class="ins-v">una versión inmutable del grafo por manual/producto/versión</span></div>
          <div class="ins-row"><span class="ins-k">cliente</span><span class="ins-v">solo hechos de renovación, delta de precio y referencias cambiadas</span></div>
          <div class="ins-row"><span class="ins-k">reproducción</span><span class="ins-v">cargar la versión base del grafo y aplicar deltas aprobados acotados a esa póliza</span></div>
        </div>
      </section>
    </div>`;

  renderRenewalForm();
  renderRenewalResult(state.renewal.result);
  renderSavedRenewals().catch(() => { $("#ren-saved-body").innerHTML = `<p class="nl-empty">No se pudieron cargar los borradores de renovación.</p>`; });
  $("#ren-preview-btn").addEventListener("click", () => runRenewal(false));
  $("#ren-save-btn").addEventListener("click", () => runRenewal(true));
  $("#ren-sample-btn").addEventListener("click", () => {
    state.renewal.values = JSON.parse(JSON.stringify(RENEWAL_SAMPLE));
    state.renewal.result = null;
    state.renewal.selectedClientId = null;
    renderRenewalForm();
    renderRenewalResult(null);
    refreshDemoPortfolio("renewals");
    toast("Ejemplo de renovación cargado");
  });
  bindDemoPortfolio("renewals");
};

function renderRenewalForm() {
  const v = state.renewal.values;
  $$("#ren-form [data-rk]").forEach((el) => {
    el.value = v[el.dataset.rk] ?? "";
    el.addEventListener("change", () => {
      const value = el.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
      if (hasValor(value)) state.renewal.values[el.dataset.rk] = value;
      else delete state.renewal.values[el.dataset.rk];
    });
  });
  const fields = (state.cache.ratingSchema || RATING_FALLBACK_SCHEMA).fields || [];
  $("#ren-rating-form").innerHTML = fields.map((field) => renewalRatingField(field, (v.rating_facts || {})[field.id])).join("");
  $$("#ren-rating-form [data-rrk]").forEach((el) => el.addEventListener("change", () => {
    const value = el.dataset.rrt === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
    state.renewal.values.rating_facts ||= {};
    if (hasValor(value)) state.renewal.values.rating_facts[el.dataset.rrk] = value;
    else delete state.renewal.values.rating_facts[el.dataset.rrk];
  }));
  $("#ren-overrides").value = JSON.stringify(v.node_overrides || [], null, 2);
  $("#ren-overrides").addEventListener("change", () => {
    try {
      const parsed = JSON.parse($("#ren-overrides").value || "[]");
      if (!Array.isArray(parsed)) throw new Error("Se esperaba una lista");
      state.renewal.values.node_overrides = parsed;
    } catch { toast("El JSON de deltas de nodo no es válido", true); }
  });
}

function renewalRatingField(field, value) {
  const id = esc(field.id);
  const label = `${esc(field.label || titleCase(field.id))}${field.unit ? ` <em>${esc(field.unit)}</em>` : ""}`;
  if (field.type === "enum" && Array.isArray(field.values)) {
    const current = hasValor(value) ? String(value) : "";
    return `<label class="pf"><span>${label}</span><select data-rrk="${id}" data-rrt="enum">
      <option value="" ${!current ? "selected" : ""}>Elegir</option>
      ${field.values.map((opt) => `<option value="${esc(opt)}" ${String(opt) === current ? "selected" : ""}>${esc(titleCase(opt))}</option>`).join("")}
    </select></label>`;
  }
  return `<label class="pf"><span>${label}</span><input data-rrk="${id}" data-rrt="${field.type === "number" ? "number" : "string"}" type="${field.type === "number" ? "number" : "text"}" step="0.01" value="${esc(value ?? "")}"/></label>`;
}

function renewalPayload() {
  const overridesText = $("#ren-overrides") ? $("#ren-overrides").value : "[]";
  let node_overrides;
  try {
    node_overrides = JSON.parse(overridesText || "[]");
    if (!Array.isArray(node_overrides)) throw new Error("Se esperaba una lista");
  } catch {
    toast("El JSON de deltas de nodo no es válido", true);
    return null;
  }
  return {
    ...state.renewal.values,
    node_overrides,
    facts_confirmed: true
  };
}

async function runRenewal(save) {
  const body = renewalPayload();
  if (!body) return;
  const btn = save ? $("#ren-save-btn") : $("#ren-preview-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const data = await postJSON(save ? "/api/renewals" : "/api/renewals/preview", body, "uw_user");
    if (data.error || data.detail) { toast(data.error || data.detail, true); return; }
    state.renewal.result = data;
    renderRenewalResult(data);
    if (save) await renderSavedRenewals();
    toast(save ? "Borrador de renovación guardado" : "Previsualización de renovación listo");
  } catch {
    toast("Falló la solicitud de renovación", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function emptyRenewalResult() {
  return `<div class="empty"><div class="empty-ico">↻</div><p class="empty-title">Aún no hay previsualización de renovación</p>
    <p class="empty-sub">La previsualización guarda la versión base del grafo y solo los deltas acotados al cliente.</p></div>`;
}

function renderRenewalResult(data) {
  if (!data) {
    $("#ren-result-body").innerHTML = emptyRenewalResult();
    $("#ren-audit-id").textContent = "";
    setRenewalKpis(null);
    return;
  }
  const pricing = data.pricing || {};
  const storage = data.storage_estimate || {};
  const overrides = data.node_overrides || [];
  $("#ren-result-body").innerHTML = `
    <div class="price-result renewal-result">
      <div class="price-hero">
        <span class="price-label">Prima ajustada de renovación</span>
        <strong>Bs. ${money(pricing.adjusted_annual_premium_bob)}</strong>
        <span class="price-sub">Base Bs. ${money(pricing.base_annual_premium_bob)} · delta Bs. ${money(pricing.delta_bob)} · ajuste ${fmt(pricing.adjustment_percent)}%</span>
        <div class="price-badges"><span class="badge badge-ok">grafo base intacto</span><span class="badge badge-amber">acotado al cliente</span></div>
      </div>
      <div class="price-meta-grid">
        ${priceMeta("Cliente", data.client_id)}
        ${priceMeta("Póliza", data.policy_id)}
        ${priceMeta("Versión del grafo", data.base_graph_version_id)}
        ${priceMeta("Almacenamiento delta", `${storage.delta_kb} KB`)}
        ${priceMeta("Árbol completo", `${storage.base_graph_artifact_kb} KB`)}
        ${priceMeta("Ahorro", `${storage.savings_vs_full_clone_percent}%`)}
      </div>
      <div class="section-label">Deltas de nodo/artefacto acotados</div>
      <div class="renewal-overrides">${overrides.map(renewalOverrideRow).join("") || `<p class="nl-empty">Sin deltas de nodo.</p>`}</div>
      <div class="section-label">Salvedades</div>
      <div class="caveats">${(data.caveats || []).map((c) => `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(c)}</span></div>`).join("")}</div>
    </div>`;
  $("#ren-audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  setRenewalKpis(data);
}

function renewalOverrideRow(o) {
  const exists = o.target_exists_in_base_graph === false ? `<span class="badge badge-amber">no encontrado</span>` : `<span class="badge badge-ok">fijado</span>`;
  return `<div class="renewal-override">
    <div class="draft-top"><span class="mono">${esc(o.target_id)}</span>${exists}<span class="draft-status">${esc(titleCase(o.approval_status))}</span></div>
    <p class="draft-title">${esc(titleCase(o.change_type))}${o.base_node_title ? ` · ${esc(o.base_node_title)}` : ""}</p>
    <p class="draft-change">${esc(JSON.stringify(o.patch))}</p>
    ${o.rationale ? `<p class="draft-meta">${esc(o.rationale)}</p>` : ""}
  </div>`;
}

function setRenewalKpis(data) {
  if (!$("#ren-kpi-price")) return;
  const pricing = (data && data.pricing) || {};
  const storage = (data && data.storage_estimate) || {};
  $("#ren-kpi-price").textContent = data ? `Bs. ${money(pricing.adjusted_annual_premium_bob)}` : "--";
  $("#ren-kpi-delta").textContent = data ? `${storage.delta_kb} KB` : "--";
  $("#ren-kpi-tree").textContent = data ? `${storage.base_graph_artifact_kb} KB` : "--";
  $("#ren-kpi-nodes").textContent = data ? String((data.node_overrides || []).length) : "--";
  $("#ren-price-card").className = "kpi" + (data ? " is-ok" : "");
}

async function renderSavedRenewals() {
  const list = await renewalList();
  $("#ren-saved-count").textContent = String(list.length);
  $("#ren-saved-body").innerHTML = list.length ? list.slice(0, 6).map((r) => `
    <div class="draft-row">
      <div class="draft-top"><span class="mono">${esc(r.renewal_id)}</span><span class="draft-status">${esc(titleCase(r.status))}</span></div>
      <p class="draft-title">${esc(r.client_id)} · ${esc(r.policy_id)}</p>
      <p class="draft-meta">${esc(r.base_graph_version_id)} · ${esc((r.node_overrides || []).length)} deltas · ${esc((r.storage_estimate || {}).delta_kb)} KB</p>
    </div>`).join("") : `<p class="nl-empty">Aún no hay borradores de renovación guardados.</p>`;
}

/* =====================================================================
   VIEW: GRAPH REVIEWER
   ===================================================================== */
VIEWS.graph = async function (params) {
  if (params.engine) state.graph.engine = params.engine;
  if (params.mode) state.graph.mode = params.mode;
  if (params.selected) state.graph.selected = params.selected;
  const engine = state.graph.engine, mode = state.graph.mode;
  await defs(engine).catch(() => {});
  setTopbar("Mapa de decisiones", "Árbol de decisión: mapa visual, tabla y detalle de nodos. Cada nodo cita su fuente.",
    `<div class="seg" id="g-mode">
       <button class="seg-btn ${mode === "map" ? "active" : ""}" data-mode="map">◇ Mapa</button>
       <button class="seg-btn ${mode === "sections" ? "active" : ""}" data-mode="sections">Secciones</button>
       <button class="seg-btn ${mode === "table" ? "active" : ""}" data-mode="table">▤ Tabla</button>
       <button class="seg-btn ${mode === "list" ? "active" : ""}" data-mode="list">≡ Lista</button>
     </div>
     ${engineSegment("g-engine", engine)}`);

  $("#view").innerHTML = `
    <div class="gtools">
      <div class="search wide"><span class="search-ico">⌕</span><input id="g-search" type="text" placeholder="Buscar id, título, tipo, hecho…" value="${esc(state.graph.query)}"/></div>
      <span class="badge" id="g-count">…</span>
      <div class="glegend" id="g-legend"></div>
    </div>
    <div class="gcanvas" id="g-canvas"><p class="nl-empty">Cargando grafo…</p></div>
    <section class="g-drawer" id="g-drawer" aria-hidden="true" role="dialog" aria-modal="true"></section>
    <div class="g-drawer-back" id="g-drawer-back"></div>`;

  $$("#g-mode .seg-btn").forEach((b) => b.addEventListener("click", () => go("graph", { mode: b.dataset.mode })));
  $$("#g-engine .seg-btn").forEach((b) => b.addEventListener("click", () => { state.graph.selected = null; go("graph", { engine: b.dataset.engine }); }));
  $("#g-drawer-back").addEventListener("click", closeDrawer);

  let data;
  try { data = await graphData(engine); } catch { $("#g-canvas").innerHTML = `<p class="nl-empty">No se pudo cargar el grafo.</p>`; return; }
  state.graph._ids = new Set(data.node_ids);
  state.graph._data = data;
  $("#g-count").textContent = `${data.nodes.length} nodos · ${data.files.length} archivos · ${data.nodes.filter((n) => nodeFlags(n).length).length} con alertas`;
  renderLegend(data);
  renderGraphMode(data);
  $("#g-search").addEventListener("input", (e) => { state.graph.query = e.target.value; renderGraphMode(data); });
  if (state.graph.selected) selectNode(data, state.graph.selected);
};

const NT_ORDER = ["router", "gate", "condition", "accumulator", "referral", "authority", "terminal"];
function renderLegend(data) {
  const present = [...new Set(data.nodes.map((n) => n.type))].sort((a, b) => NT_ORDER.indexOf(a) - NT_ORDER.indexOf(b));
  const types = present.map((t) => `<span class="lg-item"><span class="lg-dot nt-${esc(t)}"></span>${esc(titleCase(t))}</span>`).join("");
  const edges = state.graph.mode === "map"
    ? `<span class="lg-sep"></span>
       <span class="lg-item"><span class="lg-line l-advance"></span>avanza (siguiente chequeo)</span>
       <span class="lg-item"><span class="lg-line l-branch"></span>rama</span>
       <span class="lg-item"><span class="lg-line l-route"></span>ruta / deriva</span>` : "";
  $("#g-legend").innerHTML = types + edges;
}

function filteredNodes(data) {
  const q = state.graph.query.toLowerCase();
  if (!q) return data.nodes;
  return data.nodes.filter((n) => `${n.id} ${n.title || ""} ${(n.needs_facts || []).join(" ")} ${n.type} ${n.process || ""}`.toLowerCase().includes(q));
}

function renderGraphMode(data) {
  const mode = state.graph.mode;
  if (mode === "sections") return renderSecciones(data);
  if (mode === "table") return renderTable(data);
  if (mode === "list") return renderList(data);
  return renderMap(data);
}

/* ---- MAP: execution-faithful top-down tree.
   Mirrors crawl.py — one INICIO router sits above the process columns; each process
   still runs top-to-bottom by `order` (the fall-through "advance" spine). ---- */
const NW = 184, NH = 60, VG = 26, LANE_GAP = 78, LANE_HEAD = 40, MAP_PAD = 14, ROOT_GAP = 58;

function laneKeyOf(n) { return n.process || n._file.replace(".json", ""); }

function layoutEngine(nodes) {
  const map = {}; nodes.forEach((n) => (map[n.id] = n));
  const lanes = {};
  nodes.forEach((n) => (lanes[laneKeyOf(n)] ||= []).push(n));
  for (const k in lanes) lanes[k].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));

  // entry node = router if present, else lowest-order node overall
  const entryId = map["root.process_router"] ? "root.process_router"
    : ([...nodes].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9))[0] || {}).id;
  const entryLane = entryId ? laneKeyOf(map[entryId]) : null;
  const laneEntry = {}; for (const k in lanes) laneEntry[k] = lanes[k][0].id; // refer_process target → lane entry

  const keys = Object.keys(lanes).sort((a, b) =>
    (a === entryLane ? -1 : b === entryLane ? 1 : (lanes[a][0].order ?? 1e9) - (lanes[b][0].order ?? 1e9)));

  const rootOnlyEntry = entryId && entryLane && lanes[entryLane] && lanes[entryLane].length === 1;
  const bodyKeys = rootOnlyEntry ? keys.filter((k) => k !== entryLane) : keys;
  const colCount = Math.max(1, bodyKeys.length || keys.length);
  const width = colCount * NW + (colCount - 1) * LANE_GAP + MAP_PAD * 2;
  const rootY = MAP_PAD;
  const laneHeadY = rootOnlyEntry ? rootY + NH + ROOT_GAP : MAP_PAD + 6;
  const laneStartY = laneHeadY + LANE_HEAD;
  const pos = {};
  let height = rootOnlyEntry ? rootY + NH : 0;
  const laneInfo = [];
  if (rootOnlyEntry) {
    pos[entryId] = { x: Math.round((width - NW) / 2), y: rootY, lane: entryLane, root: true };
  }
  bodyKeys.forEach((k, ci) => {
    const x = MAP_PAD + ci * (NW + LANE_GAP);
    laneInfo.push({ key: k, x, y: laneHeadY, count: lanes[k].length });
    lanes[k].forEach((n, ri) => {
      if (rootOnlyEntry && n.id === entryId) return;
      pos[n.id] = { x, y: laneStartY + ri * (NH + VG), lane: k };
    });
    height = Math.max(height, laneStartY + lanes[k].length * (NH + VG));
  });
  if (!bodyKeys.length && entryId && !pos[entryId]) {
    pos[entryId] = { x: Math.round((width - NW) / 2), y: rootY, lane: entryLane, root: true };
    height = Math.max(height, rootY + NH);
  }

  // edges (engine semantics)
  const edges = [];
  for (const k in lanes) {
    const list = lanes[k];
    for (let i = 0; i < list.length - 1; i++)
      if (list[i].type !== "terminal") edges.push({ from: list[i].id, to: list[i + 1].id, kind: "advance" });
  }
  const ext = {}; // node id -> external target labels
  nodes.forEach((n) => {
    const addExt = (label) => (ext[n.id] ||= []).push(label);
    if (Array.isArray(n.branches)) n.branches.forEach((b) => {
      if (!b.target) return;
      if (map[b.target]) edges.push({ from: n.id, to: b.target, kind: "branch" });
      else if (laneEntry[b.target]) edges.push({ from: n.id, to: laneEntry[b.target], kind: "route" });
      else addExt(b.target);
    });
    if (n.on_no_match) { map[n.on_no_match] ? edges.push({ from: n.id, to: n.on_no_match, kind: "route" }) : addExt(n.on_no_match); }
    const rt = n.referral_target && n.referral_target.name;
    if (rt) { laneEntry[rt] ? edges.push({ from: n.id, to: laneEntry[rt], kind: "route" }) : addExt(rt); }
  });
  return { pos, laneInfo, edges, ext, width: Math.max(width, NW + MAP_PAD * 2), height: height + MAP_PAD, entryId, orientation: "top-down" };
}

function edgePath(a, b) {
  if (b.y >= a.y + NH) {
    const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
    const mid = Math.max(y1 + 22, Math.round((y1 + y2) / 2));
    return `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
  }
  const right = b.x > a.x;                       // back/cross edge to a higher target
  const x1 = a.x + (right ? NW : 0), y1 = a.y + NH / 2;
  const x2 = b.x + (right ? 0 : NW), y2 = b.y + NH / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.4) * (right ? 1 : -1);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function renderMap(data) {
  const all = data.nodes;
  if (!all.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos.</p>`; return; }
  const lay = layoutEngine(all);
  const layoutSig = `${state.graph.engine}:${lay.orientation}:${lay.width}x${lay.height}`;
  if (state.graph._layoutSig !== layoutSig) {
    state.graph.view = null;
    state.graph._layoutSig = layoutSig;
  }
  state.graph._lay = lay;
  const q = state.graph.query.toLowerCase();
  const matches = (n) => !q || `${n.id} ${n.title || ""} ${(n.needs_facts || []).join(" ")} ${n.type} ${n.process || ""}`.toLowerCase().includes(q);
  const entryLane = laneKeyOf(data.nodes.find((n) => n.id === lay.entryId));

  // lane background bands (every other lane tinted) + headers
  const bands = lay.laneInfo.map((l, i) => {
    const isEntry = l.key === entryLane;
    return `<div class="glane-band${i % 2 ? " alt" : ""}${isEntry ? " entry" : ""}" style="left:${l.x - LANE_GAP / 2}px;top:${Math.max(0, l.y - 6)}px;width:${NW + LANE_GAP}px;height:${lay.height - l.y + 6}px"></div>`;
  }).join("");
  const laneHeads = lay.laneInfo.map((l) => {
    const isEntry = l.key === entryLane;
    return `<div class="glane-head${isEntry ? " entry" : ""}" style="left:${l.x}px;top:${l.y}px;width:${NW}px">
      ${isEntry ? `<span class="glane-tag">INICIO</span>` : ""}
      <span class="glane-name">${esc(l.key)}</span><span class="glane-n">${l.count}</span></div>`;
  }).join("");

  const edges = lay.edges.map((e) => {
    const a = lay.pos[e.from], b = lay.pos[e.to]; if (!a || !b) return "";
    return `<path class="edge edge-${e.kind}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="${edgePath(a, b)}" marker-end="url(#g-arr-${e.kind})"></path>`;
  }).join("");

  const boxes = all.map((n) => {
    const p = lay.pos[n.id]; if (!p) return "";
    const sel = state.graph.selected === n.id ? " sel" : "";
    const dim = q && !matches(n) ? " dim" : "";
    const isStart = n.id === lay.entryId;
    const isResultado = n.type === "terminal";
    const ex = lay.ext[n.id] || [];
    return `<button class="gnode nt-${esc(n.type)}${sel}${dim}${isStart ? " is-start" : ""}${isResultado ? " is-outcome" : ""}" data-id="${esc(n.id)}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px" title="${esc(n.id)}">
      ${isStart ? `<span class="gnode-start">▶ INICIO</span>` : ""}
      ${typeof n.order === "number" ? `<span class="gnode-order">${n.order}</span>` : ""}
      <span class="gnode-type">${esc(titleCase(n.type))}</span>
      <span class="gnode-title">${esc(truncate(n.title || n.id, 48))}</span>
      ${nodeFlags(n).length ? `<span class="gnode-flag" title="${esc(nodeFlags(n).length + " alerta(s)") }">!</span>` : ""}
      ${ex.length ? `<span class="gnode-ext" title="deriva fuera → ${esc(ex.join(", "))}">↗ ${esc(ex.length === 1 ? ex[0] : ex.length + " refs")}</span>` : ""}
    </button>`;
  }).join("");

  const marker = (id, cls) => `<marker id="g-arr-${id}" class="${cls}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z"></path></marker>`;
  $("#g-canvas").innerHTML = `
    <div class="gviewport" id="gviewport">
      <div class="gzoom">
        <button data-z="out" title="Alejar">−</button>
        <button data-z="in" title="Acercar">+</button>
        <button data-z="fit" title="Ajustar a pantalla">⤢ Ajustar</button>
        <button data-z="reset" title="Tamaño real">1:1</button>
      </div>
      <div class="ghint" id="ghint">Desplaza para acercar · arrastra para mover · haz clic en un nodo para trazar su flujo</div>
      <div class="gstage" id="gstage" style="width:${lay.width}px;height:${lay.height}px">
        <div class="glanes">${bands}</div>
        <svg class="gmap-edges" width="${lay.width}" height="${lay.height}"><defs>
          ${marker("advance", "m-advance")}${marker("branch", "m-branch")}${marker("route", "m-route")}
        </defs>${edges}</svg>
        ${laneHeads}${boxes}
      </div>
    </div>`;
  $$("#gstage .gnode").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
  $$(".gzoom button").forEach((b) => b.addEventListener("click", () => zoomCmd(b.dataset.z, lay)));
  setupPanZoom(lay);
  if (state.graph.selected) highlightConnections(state.graph.selected);
}

/* ---- pan / zoom on the map stage ---- */
const clampK = (k) => Math.max(0.2, Math.min(2.4, k));
function applyView() {
  const st = $("#gstage"); if (!st) return;
  const v = state.graph.view || { k: 1, x: 0, y: 0 };
  st.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`;
}
function fitView(lay) {
  const vp = $("#gviewport"); if (!vp) return;
  const r = vp.getBoundingClientRect();
  const fitW = (r.width - 48) / lay.width;
  const fitH = (r.height - 48) / lay.height;
  const k = clampK(lay.orientation === "top-down" ? Math.min(fitW, 1.05) : Math.min(fitW, fitH, 1.05));
  state.graph.view = { k, x: Math.max(24, (r.width - lay.width * k) / 2), y: 20 };
  applyView();
}
function zoomCmd(cmd, lay) {
  const vp = $("#gviewport"); if (!vp) return;
  const r = vp.getBoundingClientRect();
  const v = state.graph.view || { k: 1, x: 0, y: 0 };
  if (cmd === "fit") return fitView(lay);
  if (cmd === "reset") { state.graph.view = { k: 1, x: 24, y: 20 }; return applyView(); }
  const factor = cmd === "in" ? 1.25 : 0.8;
  const cx = r.width / 2, cy = r.height / 2;
  const nk = clampK(v.k * factor);
  state.graph.view = { k: nk, x: cx - (cx - v.x) * (nk / v.k), y: cy - (cy - v.y) * (nk / v.k) };
  applyView();
}
function setupPanZoom(lay) {
  const vp = $("#gviewport"); if (!vp) return;
  if (!state.graph.view) fitView(lay); else applyView();
  vp.onwheel = (e) => {
    e.preventDefault();
    const r = vp.getBoundingClientRect(), v = state.graph.view;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const nk = clampK(v.k * (e.deltaY < 0 ? 1.1 : 0.9));
    state.graph.view = { k: nk, x: mx - (mx - v.x) * (nk / v.k), y: my - (my - v.y) * (nk / v.k) };
    applyView();
  };
  let drag = null;
  vp.onpointerdown = (e) => {
    if (e.target.closest(".gnode") || e.target.closest(".gzoom")) return;
    drag = { sx: e.clientX, sy: e.clientY, ox: state.graph.view.x, oy: state.graph.view.y };
    vp.classList.add("panning"); vp.setPointerCapture(e.pointerId);
  };
  vp.onpointermove = (e) => {
    if (!drag) return;
    state.graph.view = { ...state.graph.view, x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) };
    applyView();
  };
  vp.onpointerup = (e) => { drag = null; vp.classList.remove("panning"); try { vp.releasePointerCapture(e.pointerId); } catch {} };
}

/* ---- highlight a node's flow: light its edges + neighbours, fade the rest ---- */
function highlightConnections(id) {
  const st = $("#gstage"); if (!st) return;
  st.classList.toggle("has-sel", !!id);
  const adj = new Set();
  $$("#gstage .edge").forEach((p) => {
    const hot = id && (p.dataset.from === id || p.dataset.to === id);
    p.classList.toggle("hot", !!hot);
    if (hot) { adj.add(p.dataset.from); adj.add(p.dataset.to); }
  });
  $$("#gstage .gnode").forEach((el) => el.classList.toggle("adj", !!id && adj.has(el.dataset.id) && el.dataset.id !== id));
}

/* ---- TABLE ---- */
function renderTable(data) {
  const nodes = filteredNodes(data);
  if (!nodes.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos que coincidan “${esc(state.graph.query)}”.</p>`; return; }
  const rows = nodes.map((n) => {
    const out = n.branches ? `${n.branches.length} rama${n.branches.length === 1 ? "" : "s"}` : (n.outcome || n.referral_target || (n.evaluate ? "evaluate" : "—"));
    const sel = state.graph.selected === n.id ? " sel" : "";
    return `<tr class="gtr${sel}" data-id="${esc(n.id)}">
      <td><span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span></td>
      <td class="gtd-title">${esc(n.title || n.id)}</td>
      <td class="mono sm">${esc(n.id)}</td>
      <td class="sm">${esc(n.process || "—")}</td>
      <td class="num">${(n.needs_facts || []).length}</td>
      <td class="num">${nodeFlags(n).length ? `<span class="flag-count">${nodeFlags(n).length}</span>` : "—"}</td>
      <td class="sm">${esc(out)}</td>
      <td class="mono sm">${esc(n._file.replace(".json", ""))}</td></tr>`;
  }).join("");
  $("#g-canvas").innerHTML = `<div class="gtable-wrap card"><table class="gtable">
    <thead><tr><th>Tipo</th><th>Título</th><th>ID</th><th>Proceso</th><th>Hechos</th><th>Alertas</th><th>Resultado / flujo</th><th>Archivo</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
  $$("#g-canvas .gtr").forEach((r) => r.addEventListener("click", () => selectNode(data, r.dataset.id)));
}

/* ---- LIST (grouped by file) ---- */
function renderList(data) {
  const nodes = filteredNodes(data);
  const byFile = {};
  for (const n of nodes) (byFile[n._file] ||= []).push(n);
  let html = "";
  for (const [file, fileNodes] of Object.entries(byFile)) {
    html += `<p class="node-group">${esc(file.replace(".json", ""))}</p>`;
    for (const n of fileNodes) html += `<button class="node-item ${state.graph.selected === n.id ? "sel" : ""}" data-id="${esc(n.id)}">
      <span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span>
      <span class="node-item-main"><span class="node-item-title">${esc(n.title || n.id)}</span><span class="node-item-id">${esc(n.id)}</span></span>
      ${nodeFlags(n).length ? `<span class="flag-count">${nodeFlags(n).length}</span>` : ""}</button>`;
  }
  $("#g-canvas").innerHTML = `<div class="glist card">${html || `<p class="nl-empty">No hay nodos que coincidan.</p>`}</div>`;
  $$("#g-canvas .node-item").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
}

/* ---- SECTIONS (manual-like hierarchy para review/editing) ---- */
function renderSecciones(data) {
  const nodes = filteredNodes(data);
  if (!nodes.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos que coincidan.</p>`; return; }
  const groups = sectionGroups(nodes);
  $("#g-canvas").innerHTML = `<div class="sections-view">
    ${groups.map((group, idx) => `<details class="section-block" ${idx < 4 ? "open" : ""}>
      <summary><span>${esc(group.title)}</span><b>${group.nodes.length}</b></summary>
      <div class="section-node-list">
        ${group.nodes.map((n) => sectionNodeRow(n)).join("")}
      </div>
    </details>`).join("")}
  </div>`;
  $$("#g-canvas .section-node").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
  $$("#g-canvas .section-edit").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    selectNode(data, b.dataset.id);
  }));
}

function sectionGroups(nodes) {
  const by = {};
  for (const n of nodes) {
    const key = sectionKey(n);
    (by[key] ||= []).push(n);
  }
  return Object.entries(by)
    .map(([title, groupNodes]) => ({
      title,
      nodes: groupNodes.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.id).localeCompare(String(b.id)))
    }))
    .sort((a, b) => (a.nodes[0].order ?? 1e9) - (b.nodes[0].order ?? 1e9) || a.title.localeCompare(b.title));
}

function sectionKey(n) {
  const src = n.source || {};
  const origin = n._origin || {};
  return src.section || src.clause || origin.path || n.process || n._file.replace(".json", "");
}

function sectionNodeRow(n) {
  const facts = (n.needs_facts || []).slice(0, 5).map((f) => `<span class="fact-chip">${esc(f)}</span>`).join("");
  const branchCount = Array.isArray(n.branches) ? n.branches.length : 0;
  const flagCount = nodeFlags(n).length;
  return `<button class="section-node ${state.graph.selected === n.id ? "sel" : ""}" data-id="${esc(n.id)}">
    <span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span>
    <span class="section-node-main">
      <span class="section-node-title">${esc(n.title || n.id)}</span>
      <span class="section-node-id">${esc(n.id)}${n.process ? " · " + esc(n.process) : ""}</span>
      ${n.source_quote ? `<span class="section-node-quote">${esc(truncate(n.source_quote, 180))}</span>` : ""}
      ${facts ? `<span class="section-node-facts">${facts}</span>` : ""}
    </span>
    <span class="section-node-meta">${branchCount ? `${branchCount} ramas` : esc(n.outcome || n.referral_target?.name || "chequeo")}${flagCount ? ` · ${flagCount} alertas` : ""}</span>
    <span class="section-edit" data-id="${esc(n.id)}">Revisar</span>
  </button>`;
}

/* ---- INSPECTOR DRAWER ---- */
function closeDrawer() {
  state.graph.selected = null;
  const d = $("#g-drawer"); if (d) { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); }
  const b = $("#g-drawer-back"); if (b) b.classList.remove("open");
  $$("#g-canvas .gnode, #g-canvas .gtr, #g-canvas .node-item, #g-canvas .section-node").forEach((el) => el.classList.remove("sel"));
  highlightConnections(null);
}

function selectNode(data, id) {
  state.graph.selected = id;
  $$("#g-canvas .gnode, #g-canvas .gtr, #g-canvas .node-item, #g-canvas .section-node").forEach((el) => el.classList.toggle("sel", el.dataset.id === id));
  const n = data.nodes.find((x) => x.id === id);
  if (!n) return;
  const ids = state.graph._ids;
  const link = (t) => {
    const id = t && typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : t;
    return ids.has(id) ? `<button class="xlink" data-goto="${esc(id)}">${esc(id)} →</button>` : `<span class="xtarget">${esc(id)}</span>`;
  };

  let branches = "";
  if (Array.isArray(n.branches) && n.branches.length) {
    branches = `<div class="ins-sec"><h4>Ramas · ${n.branches.length}</h4>${n.branches.map((b) => `
      <div class="branch">
        <div class="branch-cond"><code>${esc(humanLogic(b.when || b.evaluate))}</code></div>
        <div class="branch-arrow">→</div>
        <div class="branch-out">
          <span class="branch-outcome">${esc(b.outcome || "")}</span>
          ${b.target ? link(b.target) : ""}
          ${b.reason ? `<p class="branch-reason">${esc(b.reason)}</p>` : ""}
          ${b.source_quote ? `<blockquote class="quote sm">${esc(b.source_quote)}</blockquote>` : ""}
        </div>
      </div>`).join("")}</div>`;
  }
  let evalBlock = "";
  if (n.evaluate && !n.branches) {
    evalBlock = `<div class="ins-sec"><h4>Condición</h4><div class="branch"><div class="branch-cond"><code>${esc(humanLogic(n.evaluate))}</code></div><div class="branch-arrow">→</div>
      <div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div></div>`;
  }
  let outcomeBlock = "";
  if (!n.branches && !n.evaluate && (n.outcome || n.referral_target)) {
    outcomeBlock = `<div class="ins-sec"><h4>Resultado</h4><div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "terminal")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div>`;
  }
  const facts = (n.needs_facts || []).map((f) => `<span class="fact-chip clickable" data-fact="${esc(f)}" title="${esc(factPrompt(f))}">${esc(f)}</span>`).join("");
  const flags = nodeFlags(n);
  const flagBlock = flags.length ? `<div class="ins-sec"><h4>Alertas · ${flags.length}</h4>${flags.map((f) => `
    <div class="flag-card mini">
      <div class="flag-top"><span class="flag-kind">${esc(titleCase(f.category))}</span><span class="badge ${f.status === "open" ? "badge-amber" : ""}">${esc(titleCase(f.status))}</span></div>
      <p class="flag-summary">${esc(f.summary || f.title)}</p>
      <div class="issue-actions">${f.ledger_ref ? ledgerLink(f.ledger_ref) : ""}<button class="flag-change" data-kind="${esc(f.category)}" data-target="${esc(n.id)}" data-node-id="${esc(n.id)}" data-title="${esc(n.title || n.id)}" data-summary="${esc(f.summary || "")}" data-source="${esc(n.source_quote || "")}" data-engine="${esc(state.graph.engine)}">Preparar cambio</button></div>
    </div>`).join("")}</div>` : "";
  const links = [];
  if (n.on_no_match) links.push(`<div class="ins-row"><span class="ins-k">si no coincide</span>${link(n.on_no_match)}</div>`);
  if (n.referral_target && n.branches) links.push(`<div class="ins-row"><span class="ins-k">derivación</span>${link(n.referral_target)}</div>`);
  if (Array.isArray(n.see_also)) n.see_also.forEach((s) => links.push(`<div class="ins-row"><span class="ins-k">ver también</span>${ledgerLink(s)}</div>`));
  if (n.conflict && ledgerIdFromRef(n.conflict)) links.push(`<div class="ins-row"><span class="ins-k">conflicto</span>${ledgerLink(n.conflict)}</div>`);
  if (n.row_conflict_ref) links.push(`<div class="ins-row"><span class="ins-k">conflicto de fila</span>${ledgerLink(n.row_conflict_ref)}</div>`);

  const drawer = $("#g-drawer");
  drawer.innerHTML = `
    <div class="drawer-bar node-modal-head">
      <div class="node-modal-titleblock">
        <div class="node-modal-kicker"><span class="ntype nt-${esc(n.type)} big">${esc(titleCase(n.type))}</span><span>${esc(n.process || "sin proceso")}</span></div>
        <h3 class="ins-title">${esc(n.title || n.id)}</h3>
        <span class="ins-id">${esc(n.id)} · ${esc(n._file)}${n.order !== undefined ? " · orden " + esc(n.order) : ""}</span>
      </div>
      <button class="drawer-x" id="drawer-x" title="Cerrar">✕</button>
    </div>
    <div class="drawer-body node-modal-body">
      <div class="truth-note compact node-modal-help"><b>Revisa antes de editar.</b> Este popup muestra qué condición evalúa el nodo, qué hechos lee, cómo enruta el caso y qué fuente lo respalda. Para cambiarlo, usa el chat guiado y prepara un borrador; nada se aplica automáticamente.</div>
      <div class="node-modal-grid">
        <div class="node-modal-col">
          ${n.source_quote ? `<div class="ins-sec first"><h4>Fuente citada</h4><blockquote class="quote">${esc(n.source_quote)}</blockquote></div>` : ""}
          <div class="ins-sec first"><h4>Condicion explicada</h4>${conditionDescriptionHtml(n)}</div>
          ${facts ? `<div class="ins-sec"><h4>Hechos que lee · ${(n.needs_facts || []).length}</h4><div class="step-facts">${facts}</div></div>` : ""}
          ${n.note ? `<div class="ins-sec"><h4>Nota</h4><p class="ins-note">${esc(n.note)}</p></div>` : ""}
        </div>
        <div class="node-modal-col">
          ${evalBlock}${branches}${outcomeBlock}${flagBlock}
          ${links.length ? `<div class="ins-sec"><h4>Enlaces</h4>${links.join("")}</div>` : ""}
        </div>
      </div>
    </div>
    <div class="drawer-foot node-modal-foot">
      <div class="node-modal-actions">
        <button class="btn btn-ghost" id="node-close-foot">Cerrar</button>
        <button class="btn btn-primary" id="propose-btn">Editar con chat guiado</button>
      </div>
      <p class="drawer-foot-note">El editor prepara una propuesta gobernada para revisión; no cambia el grafo ni la fuente por sí solo.</p>
    </div>`;
  drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
  $("#g-drawer-back").classList.add("open");
  $("#drawer-x").addEventListener("click", closeDrawer);
  $("#node-close-foot").addEventListener("click", closeDrawer);
  $("#propose-btn").addEventListener("click", () => { closeDrawer(); openProposeModal(n); });
  $$("#g-drawer .xlink").forEach((b) => b.addEventListener("click", () => { selectNode(data, b.dataset.goto); drawer.querySelector(".drawer-body").scrollTop = 0; }));
  bindIncidenciaActions("#g-drawer");
  $$("#g-drawer .fact-chip.clickable").forEach((c) => c.addEventListener("click", () => toast(`${c.dataset.fact}: ${factPrompt(c.dataset.fact) || "sin pregunta"}`)));
  highlightConnections(id);
}

function factPrompt(f) { const d = state.cache.defs[state.graph.engine] || {}; return d[f] ? d[f].prompt : ""; }
function nodeFlags(n) {
  const out = [];
  if (n.conflict) {
    const c = n.conflict;
    out.push({ category: c.kind || "conflict", status: c.status || "open", summary: c.summary || _briefUI(c), ledger_ref: ledgerIdFromRef(c) });
  }
  if (n.row_conflict_ref) out.push({ category: "row_conflict", status: "open", summary: String(n.row_conflict_ref), ledger_ref: n.row_conflict_ref });
  for (const key of ["flag", "flags", "band_boundary_flag", "conflict_flag", "inconsistency_flag"]) {
    if (n[key]) out.push({ category: key, status: "open", summary: _briefUI(n[key]) });
  }
  return out.filter((f) => f.summary || f.ledger_ref);
}
function _briefUI(v) {
  const text = typeof v === "string" ? v : JSON.stringify(v);
  return truncate(text.replace(/\s+/g, " "), 320);
}
function ledgerLink(ref) {
  const id = ledgerIdFromRef(ref);
  return `<button class="ledger-link" data-ledger="${esc(id)}">⌗ ${esc(id)}</button>`;
}
function ledgerIdFromRef(ref) {
  if (!ref) return "";
  const raw = typeof ref === "object" ? (ref.ledger_ref || ref.ref || "") : String(ref);
  return raw.replace(/^rulings\//, "").replace(/\.md$/, "");
}
function bindIncidenciaActions(rootSel) {
  $$(`${rootSel} .ledger-link`).forEach((b) => b.addEventListener("click", () => go("flags", { mode: "conflicts", id: b.dataset.ledger })));
  $$(`${rootSel} .flag-change`).forEach((b) => b.addEventListener("click", () => {
    const engine = b.dataset.engine || state.graph.engine || "uw";
    const linkedNode = cachedGraphNode(engine, b.dataset.nodeId || b.dataset.target);
    openProposeModal({
      ...(linkedNode || {}),
      id: linkedNode?.id || b.dataset.nodeId || b.dataset.target,
      target: b.dataset.target,
      node_id: b.dataset.nodeId || linkedNode?.id || "",
      title: linkedNode?.title || b.dataset.title,
      issue_title: b.dataset.title,
      issue_category: b.dataset.kind,
      issue_summary: b.dataset.summary,
      issue_source: b.dataset.source,
      category: b.dataset.kind,
      engine,
      source_quote: linkedNode?.source_quote || b.dataset.source || b.dataset.summary,
      proposal_title: `Resolver ${b.dataset.kind}: ${b.dataset.title}`,
      proposal_kind: "RUL"
    });
  }));
}

/* JSONLogic → readable */
function humanLogic(l) {
  if (l === null || l === undefined) return "—";
  if (typeof l !== "object") return JSON.stringify(l);
  if (Array.isArray(l)) return "[" + l.map(humanLogic).join(", ") + "]";
  const op = Object.keys(l)[0], a = l[op];
  if (op === "var") return String(a);
  const ops = { "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤" };
  if (ops[op] && Array.isArray(a)) return `${humanLogic(a[0])} ${ops[op]} ${humanLogic(a[1])}`;
  if (op === "in" && Array.isArray(a)) return `${humanLogic(a[0])} ∈ {${(Array.isArray(a[1]) ? a[1] : [a[1]]).map(humanLogic).join(", ")}}`;
  if (op === "and") return a.map(humanLogic).join("  AND  ");
  if (op === "or") return a.map(humanLogic).join("  OR  ");
  if (op === "!" || op === "not") return `NOT ${humanLogic(Array.isArray(a) ? a[0] : a)}`;
  return `${op}(${(Array.isArray(a) ? a : [a]).map(humanLogic).join(", ")})`;
}

function targetLabel(v) {
  if (!v) return "";
  if (typeof v === "object") return v.name || v.id || JSON.stringify(v);
  return String(v);
}

function decisionPhrase(obj = {}) {
  const pieces = [];
  if (obj.outcome) pieces.push(`devuelve "${titleCase(obj.outcome)}"`);
  if (obj.target) pieces.push(`continua en ${targetLabel(obj.target)}`);
  if (obj.referral_target) pieces.push(`deriva a ${targetLabel(obj.referral_target)}`);
  if (obj.on_no_match) pieces.push(`si no coincide va a ${targetLabel(obj.on_no_match)}`);
  if (obj.reason) pieces.push(`motivo: ${_briefUI(obj.reason)}`);
  return pieces.join("; ") || "no declara resultado, derivacion o siguiente objetivo explicito";
}

function nodeConditionParts(node = {}) {
  const facts = Array.isArray(node.needs_facts) ? node.needs_facts.filter(Boolean) : [];
  const factText = facts.length
    ? `Lee ${facts.length} dato${facts.length === 1 ? "" : "s"} del caso: ${facts.join(", ")}.`
    : "No declara datos requeridos propios; depende del contexto acumulado o es un nodo terminal.";
  if (Array.isArray(node.branches) && node.branches.length) {
    return {
      overview: `${factText} Luego decide entre ${node.branches.length} rama${node.branches.length === 1 ? "" : "s"} segun la condicion de cada rama.`,
      details: node.branches.map((b, i) => `Rama ${i + 1}: cuando ${humanLogic(b.when || b.evaluate)}, ${decisionPhrase(b)}.`)
    };
  }
  if (node.evaluate) {
    return {
      overview: `${factText} La condicion principal se cumple cuando: ${humanLogic(node.evaluate)}.`,
      details: [`Si se cumple, ${decisionPhrase(node)}.`]
    };
  }
  if (node.outcome || node.referral_target || node.on_no_match) {
    return {
      overview: `${factText} Este nodo no evalua una condicion propia.`,
      details: [`Resultado configurado: ${decisionPhrase(node)}.`]
    };
  }
  return {
    overview: `${factText} No hay condicion ejecutable visible en este objetivo.`,
    details: []
  };
}

function nodeConditionDescription(node = {}) {
  const parts = nodeConditionParts(node);
  return [parts.overview, ...parts.details].join(" ");
}

function conditionDescriptionHtml(node = {}) {
  const parts = nodeConditionParts(node);
  return `<p class="ins-note">${esc(parts.overview)}</p>${parts.details.length ? `<ul class="condition-list">${parts.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}`;
}

function nodeIssueDescription(node = {}) {
  const flags = node.type ? nodeFlags(node) : [];
  if (node.issue_description) return node.issue_description;
  if (node.issue_summary) {
    return `Problema reportado: ${_briefUI(node.issue_summary)}${node.issue_category ? ` Categoria: ${titleCase(node.issue_category)}.` : ""}`;
  }
  if (node.summary && !node.type) return `Problema reportado: ${_briefUI(node.summary)}`;
  if (flags.length) {
    return `Este nodo tiene ${flags.length} alerta${flags.length === 1 ? "" : "s"} abierta${flags.length === 1 ? "" : "s"}: ${flags.map((f) => `${titleCase(f.category)} - ${_briefUI(f.summary || f.ledger_ref)}`).join("; ")}.`;
  }
  if (node.conflict) return `Tiene un conflicto registrado: ${_briefUI(node.conflict)}.`;
  if (node.row_conflict_ref) return `Tiene conflicto de fila registrado en ${node.row_conflict_ref}.`;
  return `No hay una incidencia especifica adjunta; la propuesta sera una edicion gobernada sobre ${node.title || node.target || node.id || "este objetivo"}.`;
}

function flagIssueDescription(item = {}) {
  const target = item.node_id && item.node_id !== item.target ? `${item.target} (nodo ${item.node_id})` : item.target;
  const pieces = [
    `Esta incidencia marca ${titleCase(item.category || "alerta")} sobre ${target || "un objetivo sin id"}.`,
    item.summary ? `Problema: ${_briefUI(item.summary)}.` : "No trae resumen automatico suficiente; revisa la fuente visible antes de resolver.",
    item.ledger_ref ? `Existe registro vinculado ${ledgerIdFromRef(item.ledger_ref)}.` : "",
    item.source ? `Evidencia visible: ${_briefUI(item.source)}.` : "",
    "La resolucion debe decir si se corrige el nodo ejecutable, se agrega un overlay o se deja como observacion de fuente."
  ].filter(Boolean);
  return pieces.join(" ");
}

function markdownPlainText(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rulingIssueDescription(detail = {}, fm = {}) {
  const kind = titleCase(fm.kind || "dictamen");
  const status = fm.status ? ` Estado: ${titleCase(fm.status)}.` : "";
  const refs = fm.source_refs ? ` Referencias fuente: ${fm.source_refs}.` : "";
  const body = markdownPlainText(detail.body);
  return `${kind} ${detail.id || ""}.${status}${refs} Tema principal: ${truncate(body || "sin fundamento visible", 360)}.`;
}

function cachedGraphNode(engine, id) {
  const graph = state.cache.graph[engine] || state.cache.graph[state.graph.engine];
  if (!graph || !Array.isArray(graph.nodes) || !id) return null;
  return graph.nodes.find((n) => n.id === id) || null;
}

function proposalContext(node = {}) {
  const engine = ["uw", "coverage"].includes(node.engine) ? node.engine : (state.graph.engine || state.runner.engine || "uw");
  const target = node.target || node.node_id || node.id || "";
  const isNode = Boolean(node.type || node.evaluate || node.branches || node.outcome || node.referral_target || node.on_no_match);
  const source = node.source_quote || node.source || node.issue_source || node.summary || "";
  return {
    engine,
    target,
    isNode,
    title: node.title || node.issue_title || node.proposal_title || target,
    condition: isNode ? nodeConditionDescription(node) : "La incidencia no esta enlazada a un nodo ejecutable cargado en memoria.",
    issue: nodeIssueDescription(node),
    source: source ? _briefUI(source) : "Sin cita fuente copiada en el contexto visible.",
    decision: isNode ? decisionPhrase(node) : "Sin decision ejecutable cargada.",
    facts: Array.isArray(node.needs_facts) ? node.needs_facts.join(", ") : ""
  };
}

function proposalContextPanel(node) {
  const ctx = proposalContext(node);
  return `<div class="proposal-context">
    <div class="proposal-context-block">
      <span class="proposal-context-label">${ctx.isNode ? "Condicion del objetivo" : "Contexto del objetivo"}</span>
      <p>${esc(ctx.condition)}</p>
    </div>
    <div class="proposal-context-block">
      <span class="proposal-context-label">Problema a resolver</span>
      <p>${esc(ctx.issue)}</p>
    </div>
  </div>`;
}

function proposalAssistantPanel() {
  return `<div class="proposal-ai chat-col">
    <div class="proposal-ai-head">
      <div><h3>Chat para proponer el cambio</h3><p>Describe lo que quieres corregir. El chat explica el impacto y luego lo convierte en una propuesta revisable.</p></div>
    </div>
    <div class="chat-thread proposal-ai-log" id="m-ai-log" aria-live="polite"></div>
    <div class="composer-area proposal-ai-compose">
      <div class="composer">
        <textarea id="m-ai-input" class="composer-input" rows="1" placeholder="Ej: esta condicion deberia mandar a rechazo cuando el riesgo no esta cubierto por la poliza"></textarea>
        <button class="composer-send" id="m-ai-send" type="button" title="Enviar" aria-label="Enviar">↑</button>
      </div>
      <div class="composer-bar">
        <button class="btn btn-ghost composer-confirm" id="m-ai-explain" type="button">Explicar contexto</button>
        <div class="composer-bar-right">
          <span class="composer-hint">Enter envia · Shift+Enter salto</span>
          <button class="btn btn-primary composer-confirm" id="m-ai-apply" type="button" disabled>Usar como propuesta</button>
        </div>
      </div>
    </div>
  </div>`;
}

function appendProposalAi(root, role, text) {
  const log = root.querySelector("#m-ai-log");
  if (!log) return;
  const el = document.createElement("div");
  const isUser = role === "user";
  el.className = `msg msg-${isUser ? "user" : "bot"}`;
  el.innerHTML = `<div class="msg-avatar">${isUser ? "T" : "AI"}</div>
    <div class="msg-content">
      <div class="msg-name">${isUser ? "Tu" : "Chat de cambio"}</div>
      <div class="msg-text">${esc(text)}</div>
    </div>`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function proposalContextExplanation(ctx) {
  return [
    `Objetivo: ${ctx.target || "sin id visible"} (${engineLabel(ctx.engine)}).`,
    `Condicion actual: ${ctx.condition}`,
    `Problema: ${ctx.issue}`,
    `Decision actual: ${ctx.decision}`,
    ctx.facts ? `Datos que lee: ${ctx.facts}.` : "No hay lista de datos requeridos en este contexto.",
    `Cita/evidencia: ${ctx.source}`,
    "No aplico nada automaticamente: primero convierto la conversacion en una propuesta revisable."
  ].join("\n");
}

function choosePatchType(prompt) {
  const p = prompt.toLowerCase();
  if (/(rama|ramas|ruta|rute|deriv|target|siguiente|fallback|flujo)/.test(p)) return "branches";
  if (/(condicion|condición|jsonlogic|cuando|si\s|criterio|umbral)/.test(p)) return "condition";
  if (/(hecho|dato|fact|campo|leer|capturar)/.test(p)) return "facts";
  if (/(resultado|cubiert|rechaz|declin|elegible|no\s+cubre|cubre|aprobar|denegar)/.test(p)) return "outcome_flow";
  if (/(titulo|título|nota|texto|descripcion|descripción|nombre)/.test(p)) return "metadata";
  return "full_node_reading";
}

function assistantImpactSentence(patchType, ctx) {
  const map = {
    condition: `El cambio debe modificar cuando se activa ${ctx.target}; casos que antes no cumplian la condicion podrian entrar, y casos que antes entraban podrian salir.`,
    branches: `El cambio debe mover casos entre rutas o destinos; revisa que cada rama conserve una condicion clara y un resultado/destino unico.`,
    outcome_flow: `El cambio debe alterar el resultado o fallback del objetivo; en reclamos esto debe decir claramente si el riesgo queda cubierto, no cubierto o pendiente por dato faltante.`,
    facts: `El cambio debe ajustar los datos que el nodo lee; despues habra que confirmar que esos hechos existen en el extractor o formulario.`,
    metadata: `El cambio debe mejorar la lectura humana del nodo sin cambiar necesariamente la logica ejecutable.`,
    full_node_reading: `El cambio debe registrar una nueva lectura gobernada del objetivo completo y dejar claro que parte de la logica cambia.`
  };
  return map[patchType] || map.full_node_reading;
}

function extractJsonCandidate(text) {
  const raw = String(text || "");
  const starts = [raw.indexOf("{"), raw.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const end = raw.lastIndexOf(raw[start] === "[" ? "]" : "}");
  if (end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); }
  catch { return null; }
}

function proposalAssistantReply(node, prompt) {
  const ctx = proposalContext(node);
  const patchType = choosePatchType(prompt);
  const json = extractJsonCandidate(prompt);
  const impact = assistantImpactSentence(patchType, ctx);
  const titleBit = truncate(prompt.replace(/\s+/g, " ").trim(), 72);
  const suggestion = {
    patch_type: patchType,
    title: `Resolver ${ctx.target || "objetivo"}: ${titleBit}`,
    rationale: `Contexto: ${ctx.issue} Pedido del usuario: ${prompt}`,
    change: `${impact} Cambio conversado: ${prompt}`,
    note: /(nota|texto|descripcion|descripción)/i.test(prompt) ? prompt : ""
  };
  if (json && patchType === "condition" && !Array.isArray(json)) suggestion.condition = JSON.stringify(json, null, 2);
  if (json && patchType === "branches") suggestion.branches = JSON.stringify(Array.isArray(json) ? json : [json], null, 2);
  const jsonHint = json
    ? "Detecte JSON en tu mensaje y lo puedo copiar al campo estructurado correspondiente."
    : "No veo JSON estructurado en el mensaje; dejare la propuesta como cambio explicado para que ajustes los campos editables antes de preparar el borrador.";
  return {
    suggestion,
    message: [
      `Lo prepararia como cambio de ${titleCase(patchType)}.`,
      `Que deberia hacer: ${impact}`,
      `Por que: ${ctx.issue}`,
      jsonHint,
      "Cuando estes conforme, usa 'Usar ultima propuesta' y luego 'Preparar borrador'."
    ].join("\n")
  };
}

function applyAssistantSuggestion(root, suggestion) {
  const set = (sel, value) => {
    const el = root.querySelector(sel);
    if (el && value !== undefined && value !== null && String(value).trim() !== "") el.value = value;
  };
  set("#m-title", suggestion.title);
  set("#m-rationale", suggestion.rationale);
  set("#m-change", suggestion.change);
  set("#m-note", suggestion.note);
  set("#m-condition", suggestion.condition);
  set("#m-branches", suggestion.branches);
  const patchType = root.querySelector("#m-patch-type");
  if (patchType && [...patchType.options].some((o) => o.value === suggestion.patch_type)) {
    patchType.value = suggestion.patch_type;
    patchType.dispatchEvent(new Event("change"));
  }
}

function bindProposalAssistant(root, node) {
  const input = root.querySelector("#m-ai-input");
  const send = root.querySelector("#m-ai-send");
  const explain = root.querySelector("#m-ai-explain");
  const apply = root.querySelector("#m-ai-apply");
  if (!input || !send || !explain || !apply) return;
  const session = { lastSuggestion: null };
  const ctx = proposalContext(node);
  appendProposalAi(root, "assistant", `Tengo contexto de ${engineLabel(ctx.engine)} para ${ctx.target || "este objetivo"}. Cuéntame el cambio en lenguaje normal; te diré qué afectaría y después puedes usarlo como propuesta.`);
  explain.addEventListener("click", () => {
    appendProposalAi(root, "user", "Explicame el contexto antes de proponer.");
    appendProposalAi(root, "assistant", proposalContextExplanation(ctx));
  });
  const run = () => {
    const prompt = input.value.trim();
    if (!prompt) { toast("Describe primero el cambio que quieres conversar", true); return; }
    appendProposalAi(root, "user", prompt);
    const reply = proposalAssistantReply(node, prompt);
    session.lastSuggestion = reply.suggestion;
    appendProposalAi(root, "assistant", reply.message);
    apply.disabled = false;
    input.value = "";
  };
  send.addEventListener("click", run);
  const grow = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 180) + "px"; };
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
  });
  grow();
  apply.addEventListener("click", () => {
    if (!session.lastSuggestion) return;
    applyAssistantSuggestion(root, session.lastSuggestion);
    appendProposalAi(root, "assistant", "Copie la ultima propuesta al formulario de abajo. Todavia no se aplica al grafo; revisa los campos y prepara el borrador cuando este correcto.");
  });
}

/* =====================================================================
   VIEW: ISSUES (FLAGS + CONFLICTS)
   ===================================================================== */
VIEWS.flags = async function (params) {
  if (params.engine) state.flags.engine = params.engine;
  if (params.mode) state.flags.mode = params.mode;
  const engine = state.flags.engine;
  const mode = state.flags.mode || "flags";
  setTopbar("Incidencias", "Posibles errores, conflictos, ambigüedades y dictámenes RUL/OVL gobernados. Los cambios quedan como borradores, nunca como ediciones de fuente.",
    `<div class="seg" id="issue-mode">
       <button class="seg-btn ${mode === "flags" ? "active" : ""}" data-mode="flags">Alertas</button>
       <button class="seg-btn ${mode === "conflicts" ? "active" : ""}" data-mode="conflicts">Conflictos</button>
     </div>
     <div class="seg${mode === "flags" ? "" : " seg-reserved"}" id="flag-engine" aria-hidden="${mode === "flags" ? "false" : "true"}">
       <button class="seg-btn ${engine === "all" ? "active" : ""}" data-engine="all">Todos</button>
       ${registeredMotors().map((item) => `<button class="seg-btn ${engine === item.id ? "active" : ""}" data-engine="${esc(item.id)}">${esc(engineLabel(item.id))}</button>`).join("")}
       <button class="seg-btn ${engine === "source" ? "active" : ""}" data-engine="source">Fuente</button>
     </div>`);
  $$("#issue-mode .seg-btn").forEach((b) => b.addEventListener("click", () => go("flags", { mode: b.dataset.mode })));
  if (mode === "conflicts") return renderConflictosPanel(params);
  $("#view").innerHTML = `<section class="kpis alertas-kpis">
      <div class="kpi"><span class="kpi-label">Alertas</span><span class="kpi-value" id="flag-total">—</span><span class="kpi-sub">objetivos de revisión</span></div>
      <div class="kpi is-warn"><span class="kpi-label">Abiertas</span><span class="kpi-value" id="flag-open">—</span><span class="kpi-sub">registro / grafo</span></div>
      <div class="kpi"><span class="kpi-label">Fuente</span><span class="kpi-value" id="flag-source">—</span><span class="kpi-sub">observado, inmutable</span></div>
      <div class="kpi"><span class="kpi-label">Grafo</span><span class="kpi-value" id="flag-graph">—</span><span class="kpi-sub">refs ejecutables</span></div>
    </section>
    <div class="reviewer">
      <div class="card node-list"><div class="card-head"><h2>Alertas</h2><span class="badge" id="f-count">…</span></div>
        <div class="search wide"><span class="search-ico">⌕</span><input id="f-search" type="text" placeholder="Buscar alertas…" value="${esc(state.flags.query)}"/></div>
        <div class="node-scroll" id="f-list"><p class="nl-empty">Cargando…</p></div></div>
      <div class="card node-inspect"><div class="card-body" id="f-detail"><div class="empty"><div class="empty-ico">!</div><p class="empty-title">Selecciona una alerta</p><p class="empty-sub">Revisa la incidencia respaldada por fuente y prepara una resolución gobernada o un borrador de overlay.</p></div></div></div>
    </div>`;
  $$("#flag-engine .seg-btn").forEach((b) => b.addEventListener("click", () => go("flags", { engine: b.dataset.engine })));
  let data;
  try { data = await alertasData(engine); } catch { $("#f-list").innerHTML = `<p class="nl-empty">No se pudieron cargar las alertas.</p>`; return; }
  renderFlagSummary(data.summary || {});
  const draw = (q) => {
    state.flags.query = q;
    const items = (data.items || []).filter((f) => !q || `${f.id} ${f.category} ${f.status} ${f.title} ${f.summary} ${f.target} ${f.ledger_ref || ""}`.toLowerCase().includes(q.toLowerCase()));
    $("#f-count").textContent = `${items.length}`;
    $("#f-list").innerHTML = items.map((f) => `<button class="node-item ${state.flags.selected === f.id ? "sel" : ""}" data-id="${esc(f.id)}">
      <span class="status-dot ${f.status === "open" ? "s-open" : f.status === "source_observed" ? "s-source" : "s-closed"}"></span>
      <span class="node-item-main"><span class="node-item-title">${esc(f.title)}</span><span class="node-item-id">${esc(f.category)} · ${esc(f.target)}</span></span></button>`).join("") || `<p class="nl-empty">No hay alertas que coincidan.</p>`;
    $$("#f-list .node-item").forEach((b) => b.addEventListener("click", () => openFlag(data, b.dataset.id)));
  };
  draw(state.flags.query);
  $("#f-search").addEventListener("input", (e) => draw(e.target.value));
  if (params.id) openFlag(data, params.id);
};

function renderFlagSummary(s) {
  $("#flag-total").textContent = s.total ?? 0;
  $("#flag-open").textContent = s.open ?? 0;
  $("#flag-source").textContent = s.source_observed ?? 0;
  $("#flag-graph").textContent = s.graph ?? 0;
}

function openFlag(data, id) {
  const item = (data.items || []).find((f) => f.id === id);
  if (!item) return;
  state.flags.selected = id;
  $$("#f-list .node-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
  const canAbiertasNode = item.node_id && ["uw", "coverage"].includes(item.engine);
  const issueText = flagIssueDescription(item);
  $("#f-detail").innerHTML = `<div class="ins-head"><span class="ntype nt-ruling big">${esc(titleCase(item.category))}</span>
      <div><h3 class="ins-title">${esc(item.title)}</h3><span class="ins-id">${esc(item.id)} · ${esc(titleCase(item.status))} · ${esc(titleCase(item.engine))}</span></div></div>
    <div class="flag-detail-grid">
      <div class="ins-row"><span class="ins-k">objetivo</span><span class="ins-v mono">${esc(item.target)}</span></div>
      <div class="ins-row"><span class="ins-k">estado</span><span class="ins-v">${esc(titleCase(item.status))}</span></div>
      ${item.ledger_ref ? `<div class="ins-row"><span class="ins-k">registro</span>${ledgerLink(item.ledger_ref)}</div>` : ""}
      ${canAbiertasNode ? `<div class="ins-row"><span class="ins-k">nodo</span><button class="xlink" id="flag-open-node">Abrir en grafo →</button></div>` : ""}
    </div>
    <div class="ins-sec"><h4>Que esta pasando</h4><p class="ins-note">${esc(issueText)}</p></div>
    <div class="ins-sec"><h4>Resumen original</h4><p class="ins-note">${esc(item.summary || "No se proporcionó resumen.")}</p></div>
    ${item.source ? `<div class="ins-sec"><h4>Fuente / referencia</h4><blockquote class="quote sm">${esc(_briefUI(item.source))}</blockquote></div>` : ""}
    <div class="flag-detail-actions">
      <button class="btn btn-primary flag-change" data-kind="${esc(item.category)}" data-target="${esc(item.target)}" data-node-id="${esc(item.node_id || "")}" data-title="${esc(item.title)}" data-summary="${esc(issueText)}" data-source="${esc(item.source || item.summary || "")}" data-engine="${esc(item.engine === "source" || item.engine === "ledger" ? "uw" : item.engine)}">Preparar resolución</button>
      ${item.ledger_ref ? ledgerLink(item.ledger_ref) : ""}
    </div>`;
  bindIncidenciaActions("#f-detail");
  const openNode = $("#flag-open-node");
  if (openNode) openNode.addEventListener("click", () => go("graph", { engine: item.engine, selected: item.node_id }));
}

async function renderConflictosPanel(params = {}) {
  $("#view").innerHTML = `<div class="reviewer"><div class="card node-list"><div class="card-head"><h2>Dictámenes</h2><span class="badge" id="l-count">…</span></div>
      <div class="search wide"><span class="search-ico">⌕</span><input id="l-search" type="text" placeholder="Buscar dictamen…"/></div>
      <div class="node-scroll" id="l-list"><p class="nl-empty">Cargando…</p></div></div>
    <div class="card node-inspect"><div class="card-body" id="l-detail"><div class="empty"><div class="empty-ico">⌗</div><p class="empty-title">Selecciona un dictamen</p><p class="empty-sub">Cada dictamen registra un conflicto o ambigüedad real de los manuales fuente, cómo se trató y a qué cláusulas se vincula.</p></div></div></div></div>`;
  let list;
  try { list = await ledgerList(); } catch { $("#l-list").innerHTML = `<p class="nl-empty">No se pudo cargar.</p>`; return; }
  const items = list.filter((r) => r.id !== "README");
  $("#l-count").textContent = `${items.length}`;
  const draw = (q) => {
    const f = items.filter((r) => !q || `${r.id} ${r.kind} ${r.source_refs || ""}`.toLowerCase().includes(q.toLowerCase()));
    $("#l-list").innerHTML = f.map((r) => `<button class="node-item ${state.ledger.selected === r.id ? "sel" : ""}" data-id="${esc(r.id)}">
      <span class="status-dot ${r.status === "open" ? "s-open" : "s-closed"}" title="${esc(titleCase(r.status))}"></span>
      <span class="node-item-main"><span class="node-item-title">${esc(r.id)}</span><span class="node-item-id">${esc(r.kind)}</span></span></button>`).join("") || `<p class="nl-empty">Sin coincidencias.</p>`;
    $$("#l-list .node-item").forEach((b) => b.addEventListener("click", () => openRuling(b.dataset.id)));
  };
  draw("");
  $("#l-search").addEventListener("input", (e) => draw(e.target.value));
  if (params.id) openRuling(params.id);
}

VIEWS.ledger = function (params) {
  return VIEWS.flags({ ...(params || {}), mode: "conflicts" });
};

async function openRuling(id) {
  state.ledger.selected = id;
  $$("#l-list .node-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
  $("#l-detail").innerHTML = `<p class="nl-empty">Cargando ${esc(id)}…</p>`;
  let d;
  try { d = await getJSON(`/api/ledger/${encodeURIComponent(id)}`); } catch { $("#l-detail").innerHTML = `<p class="nl-empty">No se pudo cargar ${esc(id)}.</p>`; return; }
  const fm = d.frontmatter || {};
  const meta = Object.entries(fm).filter(([k]) => k !== "id").map(([k, v]) => `<div class="ins-row"><span class="ins-k">${esc(k)}</span><span class="ins-v">${esc(v)}</span></div>`).join("");
  const issueText = rulingIssueDescription(d, fm);
  $("#l-detail").innerHTML = `<div class="ins-head"><span class="ntype nt-ruling big">${esc(titleCase(fm.kind || "dictamen"))}</span>
      <div><h3 class="ins-title">${esc(d.id)}</h3><span class="ins-id">${esc(d.path)} ${fm.status ? "· " + esc(titleCase(fm.status)) : ""}</span></div></div>
    ${meta ? `<div class="ins-sec"><h4>Metadatos</h4>${meta}</div>` : ""}
    <div class="ins-sec"><h4>Que esta pasando</h4><p class="ins-note">${esc(issueText)}</p></div>
    <div class="ins-sec"><h4>Fundamento</h4><div class="doc">${mdLite(d.body)}</div></div>
    <div class="flag-detail-actions">
      <button class="btn btn-primary flag-change" data-kind="${esc(fm.kind || "ruling")}" data-target="${esc(d.id)}" data-title="${esc(d.id)}" data-summary="${esc(issueText)}" data-source="${esc(d.body.slice(0, 700))}" data-engine="uw">Preparar resolución</button>
    </div>`;
  bindIncidenciaActions("#l-detail");
};

/* tiny markdown → html (headings, bold, code, listas, párrafos) */
function mdLite(md) {
  const lines = String(md || "").split("\n");
  let html = "", inList = false, inCode = false;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
  for (let raw of lines) {
    if (raw.trim().startsWith("```")) { inCode = !inCode; html += inCode ? "<pre>" : "</pre>"; continue; }
    if (inCode) { html += esc(raw) + "\n"; continue; }
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) { if (inList) { html += "</ul>"; inList = false; } const lvl = line.match(/^#+/)[0].length; html += `<h${Math.min(lvl + 2, 6)}>${inline(line.replace(/^#+\s/, ""))}</h${Math.min(lvl + 2, 6)}>`; }
    else if (/^[-*]\s/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`; }
    else if (line.trim() === "") { if (inList) { html += "</ul>"; inList = false; } }
    else { if (inList) { html += "</ul>"; inList = false; } html += `<p>${inline(line)}</p>`; }
  }
  if (inList) html += "</ul>";
  if (inCode) html += "</pre>";
  return html;
}

/* =====================================================================
   PROPOSE CORRECTION — modal launched from graph reviewer
   ===================================================================== */
function openProposeModal(node) {
  const engine = ["uw", "coverage"].includes(node.engine) ? node.engine : (state.graph.engine || state.runner.engine || "uw");
  const target = node.target || node.node_id || node.id || "";
  const sourceQuote = node.source_quote || node.issue_source || node.source || node.issue_summary || node.summary || "";
  const defaultTitle = node.proposal_title || (node.type ? `Cambiar ${node.title || target}` : "");
  const defaultKind = node.proposal_kind || "RUL";
  const isNode = Boolean(node.type || node.evaluate || node.branches || node.outcome || node.referral_target || node.on_no_match);
  const truthTarget = isNode
    ? "un reemplazo propuesto para este nodo ejecutable"
    : "una resolucion propuesta para esta incidencia o dictamen";
  const modalTitle = isNode ? "Editar nodo con chat" : "Resolver incidencia con chat";
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal proposal-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div><h2 class="modal-title">${esc(modalTitle)}</h2>
          <p class="modal-sub">Objetivo <span class="mono">${esc(target)}</span>${node._file ? " · " + esc(node._file) : ""}</p></div>
        <button class="drawer-x" id="m-close" title="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="truth-note"><b>La fuente permanece inmutable.</b> Estás editando ${truthTarget}. El grafo actual no cambia hasta revisión, regeneración, validador VERDE y publicación.</div>
        ${proposalContextPanel(node)}
        ${proposalAssistantPanel()}
        <div class="pform">
          <label class="pf"><span>Tipo</span><select id="m-kind"><option value="RUL" ${defaultKind === "RUL" ? "selected" : ""}>RUL — dictamen de conflicto</option><option value="OVL" ${defaultKind === "OVL" ? "selected" : ""}>OVL — overlay / excepción</option></select></label>
          <label class="pf"><span>Motor</span><select id="m-engine"><option value="uw" ${engine === "uw" ? "selected" : ""}>Suscripción</option><option value="coverage" ${engine === "coverage" ? "selected" : ""}>Reclamos</option></select></label>
          <label class="pf full"><span>Título de propuesta</span><input id="m-title" type="text" placeholder="Resumen breve del cambio propuesto de decisión/texto" value="${esc(defaultTitle)}"/></label>
          <label class="pf full"><span>Nodo / cláusula / alerta objetivo</span><input id="m-target" type="text" value="${esc(target)}"/></label>
          <label class="pf full"><span>Evidencia fuente copiada del nodo <em>(no edita la fuente)</em></span><textarea id="m-source" rows="2" placeholder="Pega el texto fuente exacto que sustenta la propuesta">${esc(sourceQuote)}</textarea></label>
          <label class="pf full"><span>Justificación</span><textarea id="m-rationale" rows="2" placeholder="Por qué la lógica actual es incorrecta o ambigua"></textarea></label>
        </div>
        ${isNode ? proposalStructuredEditaror(node) : ""}
        <div class="pform">
          <label class="pf full"><span>Resumen del cambio propuesto</span><textarea id="m-change" rows="2" placeholder="Resumen breve en lenguaje claro de cómo debería quedar la lógica corregida"></textarea></label>
        </div>
        <div id="m-pipeline"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
        <button class="btn btn-primary" id="m-submit">✎ Preparar borrador</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add("open"));
  const close = () => { back.classList.remove("open"); setTimeout(() => back.remove(), 180); };
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.querySelector("#m-close").addEventListener("click", close);
  back.querySelector("#m-cancel").addEventListener("click", close);
  bindProposalEditaror(back, node);
  bindProposalAssistant(back, node);
  back.querySelector("#m-submit").addEventListener("click", () => submitDraft(back));
}

function proposalStructuredEditaror(node) {
  const facts = Array.isArray(node.needs_facts) ? node.needs_facts.join(", ") : "";
  const condition = node.evaluate ? JSON.stringify(node.evaluate, null, 2) : "";
  const branches = Array.isArray(node.branches) ? JSON.stringify(node.branches, null, 2) : "";
  const referral = typeof node.referral_target === "object" ? (node.referral_target.name || JSON.stringify(node.referral_target)) : (node.referral_target || "");
  const currentSnapshot = JSON.stringify(proposalNodeSnapshot(node), null, 2);
  const readableCondición = node.evaluate ? humanLogic(node.evaluate) : "Sin condición a nivel de nodo";
  const readableBranches = Array.isArray(node.branches) && node.branches.length
    ? node.branches.map((b, i) => `${i + 1}. ${humanLogic(b.when || b.evaluate)} -> ${b.outcome || b.target || "rama"}`).join("\n")
    : "Sin lista de ramas en este nodo";
  const currentDecisión = [
    node.outcome ? `outcome: ${node.outcome}` : "",
    node.on_no_match ? `on_no_match: ${node.on_no_match}` : "",
    referral ? `referral_target: ${referral}` : ""
  ].filter(Boolean).join("\n") || "Sin resultado o fallback explícito en este nodo";
  return `<div class="proposal-editor">
    <div class="section-label inline">Nodo actual → nodo propuesto</div>
    <div class="truth-note compact"><b>¿Qué había antes?</b> Los campos de solo lectura “Actual” son lo que tiene hoy el grafo ejecutable. Los campos editables “Propuesto” inician como copia; cambia solo lo que debería ser distinto.</div>
    <div class="pform">
      <label class="pf"><span>Categoría de cambio</span><select id="m-patch-type">
        <option value="condition">Condición / JSONLogic</option>
        <option value="branches">Ramas / ruteo</option>
        <option value="outcome_flow">Resultado / siguiente objetivo</option>
        <option value="facts">Hechos requeridos</option>
        <option value="metadata">Título / nota / lectura de fuente</option>
        <option value="full_node_reading">Lectura completa del nodo</option>
      </select></label>
      <label class="pf"><span>Tipo de nodo actual</span><input type="text" value="${esc(node.type || "nodo")}" readonly/></label>
      <label class="pf full"><span>Texto visible actual</span><textarea class="readonly-area" rows="2" readonly>${esc(node.title || "")}</textarea></label>
      <label class="pf full"><span>Texto visible propuesto</span><input id="m-node-title" type="text" value="${esc(node.title || "")}"/></label>
      <label class="pf full"><span>Hechos requeridos actuales</span><input class="readonly-area" type="text" value="${esc(facts || "Sin hechos requeridos")}" readonly/></label>
      <label class="pf full"><span>Hechos requeridos propuestos <em>ids de hechos separados por coma</em></span><input id="m-needs-facts" type="text" value="${esc(facts)}"/></label>
      <label class="pf full"><span>Condición actual <em>vista legible</em></span><textarea class="mono-area readonly-area" rows="2" readonly>${esc(readableCondición)}</textarea></label>
      <label class="pf full"><span>Condición JSONLogic propuesta <em>editable</em></span><textarea id="m-condition" class="mono-area" rows="7" placeholder='{"==":[{"var":"field"},"value"]}'>${esc(condition)}</textarea></label>
      <label class="pf full"><span>Ramas actuales <em>vista legible</em></span><textarea class="mono-area readonly-area" rows="3" readonly>${esc(readableBranches)}</textarea></label>
      <label class="pf full"><span>Ramas JSON propuestas <em>lista editable</em></span><textarea id="m-branches" class="mono-area" rows="8" placeholder='[{"when": {...}, "outcome": "advance", "target": "node.id"}]'>${esc(branches)}</textarea></label>
      <label class="pf full"><span>Decisión / ruteo actual</span><textarea class="mono-area readonly-area" rows="3" readonly>${esc(currentDecisión)}</textarea></label>
      <label class="pf"><span>Decisión / resultado propuesto</span><input id="m-outcome" type="text" value="${esc(node.outcome || "")}" placeholder="eligible / decline / refer_authority / advance"/></label>
      <label class="pf"><span>Fallback / siguiente objetivo propuesto</span><input id="m-on-no-match" type="text" value="${esc(node.on_no_match || "")}" placeholder="id de nodo objetivo"/></label>
      <label class="pf"><span>Destino de derivación propuesto</span><input id="m-referral-target" type="text" value="${esc(referral)}" placeholder="id de proceso o nodo"/></label>
      <label class="pf"><span>Política de impacto propuesta</span><input id="m-hit-policy" type="text" value="${esc(node.hit_policy || "")}" placeholder="unique / first / all"/></label>
      <label class="pf full"><span>Nota / interpretación actual</span><textarea class="readonly-area" rows="3" readonly>${esc(node.note || "")}</textarea></label>
      <label class="pf full"><span>Nota / interpretación propuesta</span><textarea id="m-note" rows="3" placeholder="Nota o interpretación propuesta">${esc(node.note || "")}</textarea></label>
    </div>
    <details class="proposal-current">
      <summary>Instantánea ejecutable actual</summary>
      <textarea id="m-current-json" class="mono-area" rows="10" readonly>${esc(currentSnapshot)}</textarea>
    </details>
  </div>`;
}

function proposalNodeSnapshot(node) {
  const keys = ["id", "type", "process", "order", "title", "needs_facts", "evaluate", "branches", "outcome", "on_no_match", "referral_target", "hit_policy", "note", "source_quote", "source", "_origin"];
  const out = {};
  keys.forEach((k) => {
    if (node[k] !== undefined) out[k] = node[k];
  });
  return out;
}

function bindProposalEditaror(root, node) {
  const type = root.querySelector("#m-patch-type");
  if (!type) return;
  const summary = root.querySelector("#m-change");
  const update = () => {
    if (!summary || summary.value.trim()) return;
    const target = node.id || node.target || "target";
    const labels = {
      condition: "Cambiar condición del nodo / JSONLogic",
      branches: "Cambiar ruteo o resultados de ramas",
      outcome_flow: "Cambiar resultado o fallback objetivo",
      facts: "Cambiar los hechos que lee este nodo",
      metadata: "Cambiar el título, nota o lectura de fuente",
      full_node_reading: "Reemplazar la lectura gobernada de este nodo"
    };
    summary.placeholder = `${labels[type.value] || "Cambiar lógica del nodo"} para ${target}`;
  };
  type.addEventListener("change", update);
  update();
}

function collectStructuredPatch(root) {
  const patchTipoEl = root.querySelector("#m-patch-type");
  if (!patchTipoEl) return { ok: true, patch_type: "freeform", patch: null };

  let current = {};
  try {
    current = JSON.parse(root.querySelector("#m-current-json").value || "{}");
  } catch {
    current = {};
  }

  const get = (id) => (root.querySelector(id) ? root.querySelector(id).value : "");
  const parseJsonField = (id, label, allowEmpty) => {
    const raw = get(id).trim();
    if (!raw && allowEmpty) return { ok: true, value: undefined };
    try { return { ok: true, value: JSON.parse(raw) }; }
    catch { return { ok: false, error: `El campo ${label} debe ser JSON válido.` }; }
  };

  const condition = parseJsonField("#m-condition", "Condición JSONLogic", true);
  if (!condition.ok) return condition;
  const branches = parseJsonField("#m-branches", "JSON de ramas", true);
  if (!branches.ok) return branches;
  if (branches.value !== undefined && !Array.isArray(branches.value)) {
    return { ok: false, error: "JSON de ramas debe ser una lista." };
  }

  const facts = get("#m-needs-facts").split(",").map((s) => s.trim()).filter(Boolean);
  const proposed = {
    title: get("#m-node-title").trim(),
    needs_facts: facts,
    evaluate: condition.value,
    branches: branches.value,
    outcome: get("#m-outcome").trim(),
    on_no_match: get("#m-on-no-match").trim(),
    referral_target: get("#m-referral-target").trim(),
    hit_policy: get("#m-hit-policy").trim(),
    note: get("#m-note").trim(),
  };
  Object.keys(proposed).forEach((k) => {
    if (proposed[k] === "" || proposed[k] === undefined || (Array.isArray(proposed[k]) && !proposed[k].length)) delete proposed[k];
  });

  const changed = {};
  for (const [key, value] of Object.entries(proposed)) {
    const comparableCurrent = key === "referral_target" && typeof current[key] === "object" ? current[key].name : current[key];
    if (JSON.stringify(comparableCurrent ?? null) !== JSON.stringify(value ?? null)) {
      changed[key] = { from: comparableCurrent ?? null, to: value };
    }
  }

  return {
    ok: true,
    patch_type: patchTipoEl.value,
    patch: {
      target_type: "node",
      patch_type: patchTipoEl.value,
      current,
      proposed,
      changed,
    }
  };
}

async function submitDraft(root) {
  const v = (id) => root.querySelector(id).value;
  const structured = collectStructuredPatch(root);
  if (!structured.ok) { toast(structured.error, true); return; }
  const body = {
    kind: v("#m-kind"), engine: v("#m-engine"), title: v("#m-title"), target: v("#m-target"),
    source_quote: v("#m-source"), rationale: v("#m-rationale"), proposed_change: v("#m-change"),
    patch_type: structured.patch_type,
    structured_patch: structured.patch
  };
  if (!body.title.trim() || !body.target.trim()) { toast("Título y objetivo son requeridos", true); return; }
  const btn = root.querySelector("#m-submit"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const r = await postJSON("/api/proposals/draft", body, "uw_user");
    state.cache.drafts = null;
    renderPipeline(root.querySelector("#m-pipeline"), r);
    toast(`Borrador ${r.draft.draft_id} preparado`);
  } catch { toast("No se pudo preparar el borrador", true); }
  finally { btn.classList.remove("loading"); btn.disabled = false; }
}

function renderPipeline(el, r) {
  const steps = r.pipeline || [];
  el.innerHTML = `<div class="pipe-card">
    <div class="pipe-head"><span class="mono">${esc(r.draft.draft_id)}</span>
      <span class="badge ${r.publish_allowed ? "badge-ok" : "badge-bad"}">${r.publish_allowed ? "publicación permitida" : "bloqueado"}</span></div>
    <p class="pipe-reason">${esc(r.publish_blocked_reason)}</p>
    <div class="pipe">${steps.map((s, i) => `<div class="pstep ${s.done ? "done" : "todo"}">
      <span class="pstep-dot">${s.done ? "✓" : i + 1}</span><span class="pstep-label">${esc(s.label)}</span></div>`).join("")}</div></div>`;
}

/* =====================================================================
   VIEWS: SIMULATION
   ===================================================================== */
VIEWS.simulation = async function () {
  const meta = await simulationFilters();
  const candidates = await simulationCandidates();
  const portfolioView = await portfolioData().catch(() => null);
  if (!state.simulation.result) {
    state.simulation.result = await runSimulationPayload({
      filters: simulationApiFilters(state.simulation.filters),
      candidate_id: state.simulation.candidate_id,
      controls: state.simulation.controls
    });
  }
  setTopbar(
    "Simulación",
    "Elige un dominio, mueve las palancas de mercado y edita los nodos donde se va el dinero para ver el impacto en vivo.",
    `<button class="btn btn-ghost" id="sim-reset">Restablecer</button>`
  );
  $("#view").innerHTML = simulationLayout(meta, candidates, state.simulation.result, portfolioView);
  bindSimulationControls();
  bindPortfolioEventButtons();
};

VIEWS.supervision = async function () {
  const portfolioView = await portfolioData().catch(() => null);
  const humanTasks = await getJSON("/api/human-tasks").catch(() => []);
  if (!state.supervision.result || !state.supervision.baseline) {
    try {
      const [result, baseline] = await Promise.all([
        supervisionPayload(),
        runSimulationPayload({})
      ]);
      state.supervision.result = result;
      state.supervision.baseline = baseline;
    } catch {
      toast("No se pudo cargar Supervisión", true);
      return;
    }
  }
  setTopbar(
    "Supervisión",
    "Cómo está la cartera hoy: riesgo, clientes, severidad y dónde se pierde dinero.",
    `<button class="btn btn-primary" id="supervision-refresh">Actualizar ahora</button>`
  );
  $("#view").innerHTML = supervisionLayout(state.supervision.result, state.supervision.baseline, portfolioView, humanTasks);
  bindPortfolioEventButtons();
  $("#supervision-refresh").addEventListener("click", async () => {
    $("#supervision-refresh").disabled = true;
    try {
      const [result, baseline] = await Promise.all([supervisionPayload(), runSimulationPayload({})]);
      state.supervision.result = result;
      state.supervision.baseline = baseline;
      go("supervision");
    } catch {
      toast("No se pudo actualizar", true);
      const b = $("#supervision-refresh");
      if (b) b.disabled = false;
    }
  });
};

function supervisionLayout(result, baseline, portfolioView, humanTasks = []) {
  const s = result?.summary || {};
  const t = result?.tables || {};
  const b = baseline?.tables || {};
  const riskScore = Number(s.risk_score || 0);
  const riskTone = riskScore > 70 ? "bad" : riskScore > 55 ? "warn" : "ok";
  const lossRatio = Number(s.loss_ratio || 0);
  const lrTone = lossRatio > 0.7 ? "bad" : lossRatio > 0.5 ? "warn" : "ok";
  const profit = Number(s.profit_bob || 0);
  const brokerSat = Math.round(Number(s.avg_broker_satisfaction || 0));
  const churnPct = Math.round(Number(s.avg_churn_probability || 0) * 100);
  const criticalClaims = (t.cashout_nodes || []).filter((r) => r.side === "current");
  const automation = result?.automation || {};
  const byCity = result?.by_city || [];
  const byLine = result?.by_line || [];
  const riskTrend = result?.risk_trend || [];
  return `<div class="supervision-page">
    ${heroKpi(
      "Riesgo de la cartera",
      esc(riskScore),
      `Siniestralidad ${pctInt(lossRatio)} · frecuencia ${Number(s.accident_frequency || 0).toFixed(2)} reclamos/cliente`,
      riskTone,
      riskTone === "bad" ? "crítico" : riskTone === "warn" ? "vigilar" : "estable"
    )}

    ${bandHead("Macro de la cartera", "resultado económico de la cartera viva (datos mock trazables)")}
    <section class="widget-grid">
      ${statWidget("Prima suscrita", `Bs ${moneyBob(s.premium_bob)}`, "primas anuales en vigor", "info")}
      ${statWidget("Resultado técnico", `${profit >= 0 ? "+" : "−"}Bs ${moneyBob(Math.abs(profit))}`, "prima menos siniestros esperados", profit >= 0 ? "ok" : "bad")}
      ${statWidget("Siniestralidad", pctInt(lossRatio), "siniestros sobre prima", lrTone)}
      ${statWidget("Exposición de caja", `Bs ${moneyBob(s.cashout_exposure_bob)}`, "salida de dinero comprometida", "warn")}
      ${statWidget("Satisfacción de brokers", `${brokerSat}/100`, "promedio de la cartera", brokerSat >= 65 ? "ok" : brokerSat >= 50 ? "warn" : "bad")}
      ${statWidget("Probabilidad de fuga", `${churnPct}%`, "clientes en riesgo de no renovar", churnPct >= 40 ? "warn" : "ok")}
    </section>

    ${bandHead("Operación hoy", "la cartera viva en números")}
    <section class="widget-grid">
      ${statWidget("Clientes activos", esc(s.active_clients || 0), "en la cartera viva", "info")}
      ${statWidget("Reclamos observados", esc(s.claim_count || 0), "en la ventana actual", "info")}
      ${statWidget("Severidad promedio", `Bs ${moneyBob(s.avg_severity_bob)}`, "costo medio por reclamo", "info")}
      ${statWidget("Frecuencia de accidentes", Number(s.accident_frequency || 0).toFixed(2), "reclamos por cliente", "info")}
    </section>

    ${bandHead("Automatización y tiempo ahorrado", "cuánto cierra el motor sin tocar a un humano")}
    ${automationWidgets(automation)}

    ${bandHead("Tendencia de riesgo", "cómo cambian severidad y frecuencia semana a semana (datos mock)")}
    ${riskTrendChart(riskTrend)}

    ${bandHead("Macro por ciudad", "siniestralidad, severidad y resultado por plaza")}
    <section class="supervision-grid">
      ${tableCard("Cartera por ciudad", byCityRows(byCity))}
    </section>

    ${bandHead("Resultado por línea", "suscripción, reclamos y renovación por separado")}
    ${byLineCards(byLine)}

    ${bandHead("Siniestros críticos", "los reclamos que más dinero están costando ahora mismo")}
    ${criticalClaimsWidget(criticalClaims)}

    ${bandHead("Tareas resueltas", "intervenciones humanas cerradas en la Bandeja, para seguimiento")}
    ${resolvedTasksWidget(humanTasks)}

    ${bandHead("Riesgo ahora", "estado operativo de la cartera viva")}
    <section class="supervision-grid">
      ${tableCard("Alertas de riesgo", alertRows(t.risk_alerts || []))}
      ${tableCard("Salud por cliente", clientHealthRows(t.client_health || []))}
      ${tableCard("Frecuencia de accidentes", frequencyRows(t.accident_frequency || []))}
      ${tableCard("Severidad por causa", severityRows(t.severity || []))}
    </section>

    ${bandHead("Por qué y dónde se pierde", "diagnóstico sobre el árbol actual (datos mock trazables)")}
    <section class="supervision-grid">
      ${tableCard("Pérdida por nodo de reclamo", lossRows(b.loss_nodes || []))}
      ${tableCard("Nodos con salida de dinero", cashoutRows(t.cashout_nodes || []))}
      ${tableCard("Cláusulas con fricción de brokers", clauseRows(b.broker_clause_friction || []))}
      ${tableCard("Rutas más recorridas", nodeRows(b.node_hits || []))}
    </section>

    ${bandHead("Renovaciones", "cola priorizada por vencimiento")}
    <section class="supervision-grid">
      ${tableCard("Cola de renovación", renewalRows(t.renewal_queue || []))}
    </section>
    ${portfolioEventPanel("renewal", portfolioView)}

    ${bandHead("Cartera de reclamos", "clientes suscritos, siniestralidad y cola de renovación")}
    ${supervisionPortfolioCard()}
    ${portfolioOpsSection(portfolioView)}
  </div>`;
}

// Compact, flexible stat widget for the Supervisión macro/operation bands.
// tone: "ok" | "warn" | "bad" | "info" → left-edge accent color. value may contain markup.
function statWidget(label, value, sub, tone = "info") {
  const toneClass = tone === "ok" ? "is-ok" : tone === "warn" ? "is-warn" : tone === "bad" ? "is-bad" : "is-info";
  return `<div class="widget ${toneClass}">
    <span class="widget-label">${esc(label)}</span>
    <span class="widget-value">${value}</span>
    ${sub ? `<span class="widget-sub">${esc(sub)}</span>` : ""}
  </div>`;
}

// Automation band: how many packets the engine closed on its own vs how many a
// human had to attend, plus an estimate of the manual time that automation saved.
function automationWidgets(a) {
  if (!a || !a.total_packets) {
    return `<section class="card"><div class="card-body sm" style="padding:16px">Sin paquetes en esta ventana.</div></section>`;
  }
  const lines = a.by_line || {};
  const lineOrder = [["suscripcion", "Suscripción"], ["reclamos", "Reclamos"], ["renovacion", "Renovación"]];
  const lineChips = lineOrder
    .filter(([k]) => lines[k])
    .map(([k, label]) => `<span class="auto-line-chip"><b>${esc(label)}</b> ${esc(lines[k].automated)}/${esc(lines[k].automated + lines[k].human)} auto · ${pctInt(lines[k].automation_rate)}</span>`)
    .join("");
  return `<section class="widget-grid">
    ${statWidget("Atendidos sin humanos", `${esc(a.automated_packets)}/${esc(a.total_packets)}`, "paquetes cerrados por el motor", "ok")}
    ${statWidget("Con intervención humana", esc(a.human_packets), `${esc(a.human_clients)} cliente(s) tocados por un humano`, a.human_packets > 0 ? "warn" : "ok")}
    ${statWidget("Tasa de automatización", pctInt(a.automation_rate), "del total de paquetes", "info")}
    ${statWidget("Tiempo ahorrado (est.)", `${esc(a.time_saved_hours)} h`, `${esc(a.time_saved_minutes)} min de gestión manual evitada`, "ok")}
  </section>
  ${lineChips ? `<div class="auto-line-strip">${lineChips}</div>` : ""}`;
}

// Week-over-week risk: two independently-scaled lines (severity in Bs, frequency
// in claims/client) over the synthetic weekly history. Each series is normalized
// to its own min/max so both fit the same plot; the legend carries the live value
// and the change vs the start of the window.
function riskTrendChart(trend) {
  if (!trend || trend.length < 2) {
    return `<section class="card"><div class="card-body sm" style="padding:16px">Sin histórico de riesgo.</div></section>`;
  }
  const W = 640, H = 240, padL = 14, padR = 14, padT = 18, padB = 34;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = trend.length;
  const xAt = (i) => padL + (innerW * i) / (n - 1);
  const sev = trend.map((t) => Number(t.severity_bob) || 0);
  const freq = trend.map((t) => Number(t.frequency) || 0);
  const yScale = (arr) => {
    const mn = Math.min(...arr), mx = Math.max(...arr), span = (mx - mn) || 1;
    return arr.map((v) => padT + innerH - ((v - mn) / span) * innerH);
  };
  const sy = yScale(sev), fy = yScale(freq);
  const points = (ys) => ys.map((y, i) => `${xAt(i).toFixed(1)},${y.toFixed(1)}`).join(" ");
  const dots = (ys, cls) => ys.map((y, i) => `<circle class="trend-dot ${cls}" cx="${xAt(i).toFixed(1)}" cy="${y.toFixed(1)}" r="${i === n - 1 ? 4 : 2.4}"/>`).join("");
  const xlabels = trend.map((t, i) => `<text class="trend-xlabel" x="${xAt(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(t.label)}</text>`).join("");
  const sevDelta = sev[n - 1] - sev[0], freqDelta = freq[n - 1] - freq[0];
  return `<section class="card trend-card">
    <div class="card-head"><h2>Riesgo semana a semana</h2><span class="band-hint">severidad y frecuencia · datos mock</span></div>
    <div class="card-body">
      <div class="trend-legend">
        <span class="trend-key"><i class="trend-sw is-sev"></i>Severidad <b>Bs ${moneyBob(sev[n - 1])}</b> <span class="${sevDelta >= 0 ? "txt-bad" : "txt-good"}">${signedMoneyBob(sevDelta)} vs inicio</span></span>
        <span class="trend-key"><i class="trend-sw is-freq"></i>Frecuencia <b>${freq[n - 1].toFixed(2)}</b> <span class="${freqDelta >= 0 ? "txt-bad" : "txt-good"}">${signedNumber(freqDelta, 2)} vs inicio</span></span>
      </div>
      <svg class="trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tendencia de riesgo semana a semana">
        <polyline class="trend-line is-sev" points="${points(sy)}"/>
        <polyline class="trend-line is-freq" points="${points(fy)}"/>
        ${dots(sy, "is-sev")}${dots(fy, "is-freq")}
        ${xlabels}
      </svg>
    </div>
  </section>`;
}

// Macro by city: loss ratio (siniestralidad), average severity and technical
// result per plaza — the geographic read on where risk and money concentrate.
function byCityRows(rows) {
  if (!rows.length) return `<table class="gtable"><tbody>${emptyTableRow(7)}</tbody></table>`;
  return `<table class="gtable"><thead><tr>
      <th>Ciudad</th><th>Clientes</th><th>Reclamos</th><th>Prima</th><th>Siniestralidad</th><th>Severidad prom.</th><th>Resultado</th>
    </tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr">
      <td><b>${esc(r.city)}</b></td>
      <td class="num">${esc(r.clients)}</td>
      <td class="num">${esc(r.claim_count)}</td>
      <td class="num">Bs ${moneyBob(r.premium_bob)}</td>
      <td class="num"><span class="${lossRatioClass(r.loss_ratio)}">${pctInt(r.loss_ratio)}</span></td>
      <td class="num">Bs ${moneyBob(r.avg_severity_bob)}</td>
      <td class="num ${Number(r.profit_bob) >= 0 ? "txt-good" : "txt-bad"}">${signedMoneyBob(r.profit_bob)}</td>
    </tr>`).join("")}
  </tbody></table>`;
}

// One profitability card per line of business so reclamos, suscripción and
// renovación each show their own economics side by side.
function byLineCards(rows) {
  if (!rows.length) {
    return `<section class="card"><div class="card-body sm" style="padding:16px">Sin datos por línea.</div></section>`;
  }
  return `<section class="line-grid">${rows.map(lineCard).join("")}</section>`;
}

function lineCard(r) {
  const profitGood = Number(r.profit_bob) >= 0;
  return `<article class="line-card">
    <header class="line-card-head"><h3>${esc(r.label)}</h3><span class="badge badge-muted">${esc(r.count)} casos</span></header>
    <div class="line-card-rows">
      <div class="line-row"><span>Resultado</span><b class="${profitGood ? "txt-good" : "txt-bad"}">${signedMoneyBob(r.profit_bob)}</b></div>
      <div class="line-row"><span>Prima</span><b>Bs ${moneyBob(r.premium_bob)}</b></div>
      <div class="line-row"><span>Siniestralidad</span><b class="${lossRatioClass(r.loss_ratio)}">${pctInt(r.loss_ratio)}</b></div>
      ${r.line === "reclamos" ? `<div class="line-row"><span>Severidad prom.</span><b>Bs ${moneyBob(r.avg_severity_bob)}</b></div>` : ""}
      <div class="line-row"><span>Automatización</span><b>${pctInt(r.automation_rate)}</b></div>
    </div>
  </article>`;
}

// Loss-ratio (siniestralidad) tone: green under 50%, amber to 70%, red above.
function lossRatioClass(ratio) {
  const r = Number(ratio || 0);
  return r > 0.7 ? "txt-bad" : r > 0.5 ? "txt-warn" : "txt-good";
}

// Highlights the costliest claims in the live portfolio so a supervisor sees where
// the money is going. Bar length is relative to the most expensive claim shown.
function criticalClaimsWidget(rows) {
  const top = rows.slice(0, 5);
  if (!top.length) {
    return `<section class="card"><div class="card-body sm" style="padding:16px">Sin siniestros con salida de dinero en esta ventana.</div></section>`;
  }
  const max = Math.max(...top.map((r) => Number(r.cashout_bob) || 0)) || 1;
  return `<section class="crit-grid">
    ${top.map((r, i) => {
      const amount = Number(r.cashout_bob) || 0;
      const width = Math.max(8, Math.round((amount / max) * 100));
      const tone = i === 0 ? "is-bad" : amount / max > 0.5 ? "is-warn" : "is-info";
      return `<article class="crit-card ${tone}">
        <div class="crit-top"><span class="crit-rank">#${i + 1}</span><span class="crit-amount">Bs ${moneyBob(amount)}</span></div>
        <div class="crit-client">${esc(r.client_name)}</div>
        <div class="crit-meta">${esc(titleCase(r.cause || "sin causa"))} · ${esc(r.broker)}</div>
        <div class="crit-node mono">${esc(truncate(r.node_id || "—", 40))}</div>
        <div class="crit-bar"><i style="width:${width}%"></i></div>
      </article>`;
    }).join("")}
  </section>`;
}

// Tracking log of human interventions already closed in the Bandeja. Lets a supervisor
// see what underwriters decided, the fact each task resolved, and when — without opening
// the Bandeja itself.
function resolvedTasksWidget(tasks) {
  const resolved = (tasks || []).filter((t) => t.status === "completed" || t.status === "completed_needs_client_followup");
  resolved.sort((a, b) => String(b.completed_at || b.updated_at || "").localeCompare(String(a.completed_at || a.updated_at || "")));
  if (!resolved.length) {
    return `<section class="card"><div class="card-body sm" style="padding:16px">Aún no hay tareas resueltas en la Bandeja.</div></section>`;
  }
  const fmtWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };
  return `<section class="card resolved-tasks-card">
    <div class="card-head"><h2>Tareas resueltas</h2><span class="badge badge-ok">${resolved.length} cerradas</span></div>
    <div class="card-body resolved-tasks-body">
      ${resolved.map((t) => {
        const ans = t.answer || {};
        const factId = t.requested_fact || ans.fact_id || "";
        const valueLabel = bandejaValueLabel(ans.value, (t.answer_schema || {}).type);
        const resolvedFact = factId ? `${esc(factId)} = <b>${esc(valueLabel)}</b>` : "dictamen manual";
        return `<div class="resolved-task">
          <div class="resolved-task-main">
            <span class="resolved-task-q">${esc(t.question || "Revisión humana")}</span>
            <span class="resolved-task-fact">${resolvedFact}</span>
            ${t.human_notes ? `<span class="resolved-task-note">“${esc(t.human_notes)}”</span>` : ""}
          </div>
          <div class="resolved-task-meta">
            <span class="badge badge-muted">${esc(titleCase(t.engine || "uw"))}</span>
            <span>${esc(t.owner_name || "Santiago Bustillos")}</span>
            <span>${esc(fmtWhen(t.completed_at || t.updated_at))}</span>
          </div>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

// Ratio (0–1) → integer percent string, e.g. 0.683 → "68%".
const pctInt = (ratio) => `${Math.round(Number(ratio || 0) * 100)}%`;
// Simulation "side" → Spanish label. "current" is the live tree, "candidate" the sandbox.
const sideLabel = (side) => (side === "candidate" ? "Sandbox" : "Actual");
// Alert severity → Spanish label.
const severityLabel = (sev) => (sev === "high" ? "alta" : sev === "low" ? "baja" : "media");

// Read-only portfolio overview for supervisión: the full client/claims table that
// used to live in the Reclamos flow. No selection here — operations happen in the flows.
function supervisionPortfolioCard() {
  const claimsCount = DEMO_CLIENTS.reduce((total, client) => total + (client.claims || []).length, 0);
  const cleanCount = DEMO_CLIENTS.filter((client) => !(client.claims || []).length).length;
  return `<section class="card sim-table-card">
    <div class="card-head">
      <h2>Cartera para reclamos</h2>
      <div class="client-browser-stats">
        <span><b>${esc(DEMO_CLIENTS.length)}</b> clientes</span>
        <span><b>${esc(claimsCount)}</b> reclamos</span>
        <span><b>${esc(cleanCount)}</b> sin accidentes</span>
      </div>
    </div>
    <div class="card-body gtable-wrap">
      <table class="client-table">
        <thead><tr><th>Cliente</th><th>Póliza</th><th>Vehículo</th><th>Reclamos</th><th>Renovación</th></tr></thead>
        <tbody>${DEMO_CLIENTS.map(supervisionPortfolioRow).join("")}</tbody>
      </table>
    </div>
  </section>`;
}

function supervisionPortfolioRow(client) {
  const claimCount = (client.claims || []).length;
  const loss = demoLossRatio(client);
  return `<tr class="client-row">
    <td><b>${esc(client.name)}</b><div class="sim-sub">${esc(client.id)} · ${esc(client.broker)}</div></td>
    <td><span class="mono">${esc(client.policy_id)}</span><div class="sim-sub">${esc(client.city)} · ${esc(titleCase(client.policy_status))}</div></td>
    <td>${esc(demoVehicleLabel(client))}<div class="sim-sub">Bs ${moneyBob(((client.underwriting || {}).facts || {}).valor_asegurado)}</div></td>
    <td><span class="claim-pill ${claimCount ? "has-claims" : "is-clean"}">${claimCount ? `${claimCount} reclamo${claimCount === 1 ? "" : "s"}` : "sin accidentes"}</span><div class="sim-sub">LR ${loss.toFixed(2)}</div></td>
    <td>${signedNumber((client.renewal || {}).price_adjustment_percent || 0, 0)}%<div class="sim-sub">${esc(client.renewal_due)}</div></td>
  </tr>`;
}

// The three lenses the user picks between. Each scopes the same simulated cases
// to a domain and surfaces its own stats, critical nodes and headline output.
const SIM_DOMAINS = [
  { id: "suscripcion", label: "Suscripción", hint: "Nuevos negocios: qué entra a la cartera y a qué precio." },
  { id: "reclamos",    label: "Reclamos",    hint: "Cómo responde el árbol de cobertura y dónde sale el dinero." },
  { id: "renovacion",  label: "Renovación",  hint: "Retención de cartera y acción de precio al renovar." },
];

// One place that describes how each editable control renders and formats its value.
const CONTROL_SPECS = {
  uw_antique_age_limit:            { kind: "range", label: "Antigüedad máxima", min: 10, max: 30, step: 1, fmt: (v) => `${Math.round(v)} años` },
  uw_rental_non_petroleum_outcome: { kind: "select", label: "Rent-a-car no petrolero", options: [["decline", "No elegible"], ["refer_process", "Derivar a Case UW"]] },
  coverage_notice_days_limit:      { kind: "range", label: "Aviso tardío", min: 3, max: 20, step: 1, fmt: (v) => `${Math.round(v)} días` },
  coverage_alcohol_outcome:        { kind: "select", label: "Alcoholemia", options: [["not_covered", "No cubrir"], ["refer_adjuster", "Revisión humana"]] },
  coverage_replacement_threshold:  { kind: "range", label: "Cambio de parte", min: 45, max: 80, step: 1, fmt: (v) => `${Math.round(v)}%` },
  coverage_moto_parts_outcome:     { kind: "select", label: "Robo partes moto", options: [["not_covered", "No cubrir"], ["refer_adjuster", "Revisión humana"], ["likely_covered", "Cubrir"]] },
  coverage_price_multiplier:       { kind: "range", label: "Precio de cobertura", min: 0.75, max: 1.5, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  deductible_multiplier:           { kind: "range", label: "Deducible", min: 0.8, max: 1.6, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  accident_frequency_multiplier:   { kind: "range", label: "Frecuencia de siniestros", min: 0.5, max: 2, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  severity_multiplier:             { kind: "range", label: "Severidad (Bs por siniestro)", min: 0.5, max: 2, step: 0.01, fmt: (v) => `${Math.round(v * 100)}%` },
  claims_volume_factor:            { kind: "range", label: "Número de clientes", min: 0.5, max: 2, step: 0.05, fmt: (v) => `${Math.round(v * 100)}% de cartera` },
  renewal_price_change_percent:    { kind: "range", label: "Cambio precio renovación", min: -15, max: 30, step: 1, fmt: (v) => `${signedNumber(v, 0)}%` },
  renewal_churn_elasticity:        { kind: "range", label: "Elasticidad de fuga", min: 0, max: 0.03, step: 0.001, fmt: (v) => Number(v).toFixed(3) },
};

// Spanish labels for the universal per-node outcome override (reclamos).
const OUTCOME_OVERRIDE_LABELS = {
  not_covered: "No cubrir",
  refer_adjuster: "Revisión humana",
  partially_covered: "Cobertura parcial",
  conditionally_covered: "Cobertura condicional",
  likely_covered: "Cubrir",
  missing_document: "Falta documento",
  excluded: "Excluido",
};

function activeSimDomain() {
  return SIM_DOMAINS.find((d) => d.id === state.simulation.domain) || SIM_DOMAINS[0];
}

function simDomainData(result) {
  const domains = result?.domains || {};
  return domains[state.simulation.domain] || domains.suscripcion || {};
}

function simulationEffectiveControls(active) {
  return { ...DEFAULT_SIM_CONTROLS, ...((active && active.overlays) || {}), ...(state.simulation.controls || {}) };
}

function simulationLayout(meta, candidates, result, portfolioView) {
  const db = meta.mock_database || {};
  const counts = db.row_counts || {};
  return `<div class="sim-page">
    <section class="sim-domain-bar">
      ${simSelect("sim-domain", "Dominio", SIM_DOMAINS.map((d) => ({ value: d.id, label: d.label })), state.simulation.domain, "sim-field-lg")}
      ${simSelect("sim-candidate", "Punto de partida", candidates.map((c) => ({ value: c.candidate_id, label: c.label })), state.simulation.candidate_id)}
      <p class="sim-domain-hint">${esc(activeSimDomain().hint)}</p>
      <span class="sim-mock-note"><span class="badge badge-amber">datos mock</span> ${esc(counts.submissions || 0)} solicitudes · ${esc(counts.claims || 0)} reclamos</span>
    </section>

    <div class="sim-sticky" id="sim-outputs-wrap">${simulationOutputs(result)}</div>
    <div id="sim-stats-wrap">${simulationStats(result)}</div>

    <section class="card sim-dials">
      <div class="card-head"><h2>Dinámica de mercado</h2><span class="band-hint">mueve toda la cartera de golpe</span></div>
      <div class="card-body sim-dials-grid" id="sim-dials-wrap">${simulationMacroDials(result)}</div>
    </section>

    <section class="card sim-detail">
      <div class="card-head"><h2>Dónde se va el dinero</h2><span class="band-hint">nodos clave ordenados por Bs en juego — edítalos aquí mismo</span></div>
      <div class="card-body gtable-wrap" id="sim-nodes-wrap">${simulationKeyNodes(result)}</div>
    </section>
    ${portfolioOpsSection(portfolioView)}
  </div>`;
}

function simulationOutputs(result) {
  const dom = simDomainData(result);
  const cur = dom.current || {}, cand = dom.candidate || {}, delta = dom.delta || {};
  const profit = Number(delta.profit_bob || 0);
  const tone = profit > 0 ? "ok" : profit < 0 ? "bad" : "info";
  const hero = heroKpi(
    "Impacto en utilidad (Δ)",
    signedMoneyBob(delta.profit_bob),
    `actual Bs ${moneyBob(cur.profit_bob)} → candidato Bs ${moneyBob(cand.profit_bob)}`,
    tone,
    profit >= 0 ? "favorable" : "adverso"
  );
  let card = "";
  if (state.simulation.domain === "suscripcion") {
    card = outputCard("Clientes nuevos", `${esc(cand.new_clients ?? 0)} / ${esc(cand.submissions ?? 0)}`,
      `${signedNumber(delta.new_clients || 0, 0)} vs actual · ${Math.round((cand.accept_rate || 0) * 100)}% aceptación`,
      Number(delta.new_clients || 0) >= 0 ? "ok" : "bad");
  } else if (state.simulation.domain === "reclamos") {
    card = outputCard("Pérdida en reclamos", `Bs ${moneyBob(cand.incurred_bob)}`,
      `${signedMoneyBob(delta.incurred_bob)} vs actual`,
      Number(delta.incurred_bob || 0) <= 0 ? "ok" : "bad");
  } else {
    card = outputCard("Renovaciones retenidas", `${esc(cand.renewals_retained ?? 0)} / ${esc(cand.pool ?? 0)}`,
      `${signedNumber(delta.renewals_retained || 0, 0)} vs actual · ${Math.round((cand.retention_rate || 0) * 100)}% retención`,
      Number(delta.renewals_retained || 0) >= 0 ? "ok" : "bad");
  }
  return `<div class="sim-outputs">${hero}<section class="kpis sim-output-cards">${card}</section></div>`;
}

function outputCard(label, value, sub, tone) {
  const cls = tone === "ok" ? "is-ok" : tone === "bad" ? "is-bad" : tone === "warn" ? "is-warn" : "is-info";
  return `<div class="kpi ${cls}"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${value}</span><span class="kpi-sub">${esc(sub)}</span></div>`;
}

function simulationStats(result) {
  const dom = simDomainData(result);
  const rows = simDomainStatRows(state.simulation.domain, dom.candidate || {}, dom.delta || {});
  return `<section class="kpis sim-kpis">${rows.map((r) =>
    `<div class="kpi ${r.cls || "is-info"}"><span class="kpi-label">${esc(r.label)}</span><span class="kpi-value">${r.value}</span><span class="kpi-sub">${esc(r.sub || "")}</span></div>`
  ).join("")}</section>`;
}

function simDomainStatRows(domain, c, d) {
  if (domain === "suscripcion") return [
    { label: "Solicitudes", value: esc(c.submissions ?? 0), sub: "en la cohorte" },
    { label: "Aceptación", value: `${Math.round((c.accept_rate || 0) * 100)}%`, sub: `${signedNumber((d.accept_rate || 0) * 100, 0)} pts vs actual` },
    { label: "Prima suscrita", value: `Bs ${moneyBob(c.premium_bob)}`, sub: `${signedMoneyBob(d.premium_bob)} vs actual` },
    { label: "Pérdida esperada", value: `Bs ${moneyBob(c.expected_loss_bob)}`, sub: `${signedMoneyBob(d.expected_loss_bob)} vs actual` },
    { label: "Satisfacción broker", value: Number(c.avg_broker_satisfaction || 0).toFixed(0), sub: `${signedNumber(d.avg_broker_satisfaction || 0, 1)} vs actual` },
  ];
  if (domain === "reclamos") return [
    { label: "Reclamos", value: esc(c.claim_count ?? 0), sub: "en la cohorte" },
    { label: "Loss ratio", value: Number(c.loss_ratio || 0).toFixed(2), sub: `${signedNumber(d.loss_ratio || 0, 3)} vs actual` },
    { label: "Cash-out", value: `Bs ${moneyBob(c.cashout_bob)}`, sub: `${signedMoneyBob(d.cashout_bob)} vs actual` },
    { label: "Severidad prom.", value: `Bs ${moneyBob(c.avg_severity_bob)}`, sub: `${signedMoneyBob(d.avg_severity_bob)} vs actual` },
    { label: "Fricción broker", value: `${Math.round((c.unhappy_rate || 0) * 100)}%`, sub: "reclamos inconformes" },
  ];
  return [
    { label: "Pólizas en renovación", value: esc(c.pool ?? 0), sub: "en la cohorte" },
    { label: "Retención", value: `${Math.round((c.retention_rate || 0) * 100)}%`, sub: `${signedNumber((d.retention_rate || 0) * 100, 1)} pts vs actual` },
    { label: "Prima retenida", value: `Bs ${moneyBob(c.premium_bob)}`, sub: `${signedMoneyBob(d.premium_bob)} vs actual` },
    { label: "Pérdida esperada", value: `Bs ${moneyBob(c.expected_loss_bob)}`, sub: `${signedMoneyBob(d.expected_loss_bob)} vs actual` },
    { label: "Loss ratio", value: Number(c.loss_ratio || 0).toFixed(2), sub: `${signedNumber(d.loss_ratio || 0, 3)} vs actual` },
  ];
}

// The macro dials for the active domain: a small set of market-wide levers that
// move the whole portfolio at once (siniestralidad, número de clientes, etc.).
// These are the "act fast on changing market dynamics" controls. Never
// re-rendered during a live recalc so a slider drag is never interrupted.
function simulationMacroDials(result) {
  const dom = simDomainData(result);
  const controls = simulationEffectiveControls(activeSimCandidate());
  const dials = dom.macro_dials || [];
  if (!dials.length) return `<p class="sim-footnote">Sin palancas de mercado para este dominio.</p>`;
  return dials.map((k) => renderControl(k, controls[k])).join("");
}

// "Dónde se va el dinero": the key nodes for the active domain, ranked by the Bs
// they move (NOT by traversal count). Each row carries its own inline editor —
// a per-node outcome override and/or a numeric parameter — so the user edits the
// node right where they see its cost. Cost cells carry stable data-cost hooks so
// a live recalc can patch the numbers without re-rendering the inputs.
function simulationKeyNodes(result) {
  const dom = simDomainData(result);
  const nodes = dom.key_nodes || [];
  if (!nodes.length) return `<p class="sim-footnote">No hay nodos con dinero en juego para esta selección.</p>`;
  const controls = simulationEffectiveControls(activeSimCandidate());
  const costLabel = nodes[0].cost_label || "Costo";
  return `<table class="gtable sim-keynodes"><thead><tr>
      <th>Nodo</th><th>Volumen</th>
      <th>${esc(costLabel)} actual</th><th>${esc(costLabel)} candidato</th><th>Δ</th>
      <th>Editar aquí</th>
    </tr></thead><tbody>
    ${nodes.map((n) => keyNodeRow(n, controls)).join("")}
  </tbody></table>`;
}

function keyNodeRow(n, controls) {
  return `<tr class="gtr sim-keynode" data-node="${esc(n.node_id)}">
    <td class="sim-keynode-name" data-node-open="${esc(n.node_id)}" role="button" tabindex="0" title="Ver detalle del nodo"><b>${esc(truncate(n.title || n.node_id, 52))}</b><div class="sim-sub mono">${esc(truncate(n.node_id, 50))}</div><span class="sim-node-open-hint">ver detalle ↗</span></td>
    <td class="num">${esc(n.count ?? 0)}<div class="sim-sub">${esc(n.count_label || "")}</div></td>
    <td class="num" data-cost="current">Bs ${moneyBob(n.current_cost_bob)}</td>
    <td class="num" data-cost="candidate">Bs ${moneyBob(n.candidate_cost_bob)}</td>
    <td class="num ${deltaCostClass(n.delta_cost_bob)}" data-cost="delta">${signedMoneyBob(n.delta_cost_bob)}</td>
    <td class="sim-keynode-edit">${keyNodeEditors(n, controls)}</td>
  </tr>`;
}

// Lower cost is always better here (cash-out, blocked premium, premium leaking
// out), so a negative delta is favorable.
function deltaCostClass(value) {
  const d = Number(value || 0);
  return d < 0 ? "sim-delta is-good" : d > 0 ? "sim-delta is-bad" : "sim-delta";
}

function keyNodeEditors(n, controls) {
  const parts = [];
  if (n.override_key && Array.isArray(n.override_options)) parts.push(overrideSelect(n));
  if (n.numeric_control && CONTROL_SPECS[n.numeric_control]) parts.push(renderControl(n.numeric_control, controls[n.numeric_control]));
  if (!parts.length) parts.push(`<span class="sim-sub">Usa las palancas de mercado ↑</span>`);
  return parts.join("");
}

// Universal per-node outcome override (reclamos): force this node's terminal
// outcome regardless of the tree logic. Only sent to the backend once the user
// actually changes it, so by default the natural outcome is preserved.
function overrideSelect(n) {
  const current = n.override_value || n.current_outcome;
  const opts = n.override_options.slice();
  if (current && !opts.includes(current)) opts.unshift(current);
  const options = opts.map((opt) =>
    `<option value="${esc(opt)}" ${String(opt) === String(current) ? "selected" : ""}>${esc(OUTCOME_OVERRIDE_LABELS[opt] || titleCase(opt))}</option>`).join("");
  return `<label class="sim-field sim-field-sm sim-override"><span>Forzar salida</span><select data-sim-control="${esc(n.override_key)}">${options}</select></label>`;
}

// Which decision engine backs each domain's key nodes. Renovación nodes are
// synthetic (they come from the portfolio model, not a graph), so they have no
// engine and fall back to a description built from the simulation data itself.
const SIM_DOMAIN_ENGINE = { suscripcion: "uw", reclamos: "coverage", renovacion: null };

const SIM_SYNTHETIC_NODE_INFO = {
  "renewal.price_action": "Acción de precio al renovar: el cambio porcentual de prima que se aplica a cada póliza en su renovación. Es el principal driver del equilibrio entre retención y prima retenida.",
  "renewal.churn_elasticity": "Elasticidad de fuga: qué tan sensible es la cartera a subir el precio. A mayor elasticidad, más pólizas se pierden por cada punto de aumento de prima.",
};

// Click-to-inspect a key node: mirror the tree's node drawer in a focused modal.
// reclamos/suscripción nodes come from a real engine graph; renovación nodes are
// synthetic and get a description built from the simulation row itself.
async function openSimNodeModal(nodeId) {
  const engine = SIM_DOMAIN_ENGINE[state.simulation.domain];
  const keyNode = (simDomainData(state.simulation.result).key_nodes || []).find((n) => n.node_id === nodeId) || { node_id: nodeId };
  let node = null;
  if (engine) {
    try {
      const data = await graphData(engine);
      node = (data.nodes || []).find((x) => x.id === nodeId) || null;
    } catch { /* fall through to the synthetic panel */ }
  }
  if (node) mountSimNodeModal(simNodeHead(node), simNodeSectionsHtml(node, engine), node);
  else mountSimNodeModal(syntheticNodeHead(keyNode), syntheticNodeHtml(keyNode), null);
}

function simNodeHead(n) {
  return `<div><div class="node-modal-kicker"><span class="ntype nt-${esc(n.type)} big">${esc(titleCase(n.type))}</span><span>${esc(n.process || "sin proceso")}</span></div>
    <h2 class="modal-title">${esc(n.title || n.id)}</h2>
    <p class="modal-sub mono">${esc(n.id)}${n._file ? " · " + esc(n._file) : ""}</p></div>`;
}

function syntheticNodeHead(n) {
  return `<div><div class="node-modal-kicker"><span class="ntype big">Modelo</span><span>renovación</span></div>
    <h2 class="modal-title">${esc(n.title || n.node_id)}</h2>
    <p class="modal-sub mono">${esc(n.node_id)} · sintético</p></div>`;
}

// The two-column informational grid, same sections the tree drawer shows but
// read-only (cross-references are plain text, no graph navigation here).
function simNodeSectionsHtml(n, engine) {
  const link = (t) => `<span class="xtarget">${esc(t && typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : t)}</span>`;
  let branches = "";
  if (Array.isArray(n.branches) && n.branches.length) {
    branches = `<div class="ins-sec"><h4>Ramas · ${n.branches.length}</h4>${n.branches.map((b) => `
      <div class="branch">
        <div class="branch-cond"><code>${esc(humanLogic(b.when || b.evaluate))}</code></div>
        <div class="branch-arrow">→</div>
        <div class="branch-out">
          <span class="branch-outcome">${esc(b.outcome || "")}</span>
          ${b.target ? link(b.target) : ""}
          ${b.reason ? `<p class="branch-reason">${esc(b.reason)}</p>` : ""}
          ${b.source_quote ? `<blockquote class="quote sm">${esc(b.source_quote)}</blockquote>` : ""}
        </div>
      </div>`).join("")}</div>`;
  }
  let evalBlock = "";
  if (n.evaluate && !n.branches) {
    evalBlock = `<div class="ins-sec"><h4>Condición</h4><div class="branch"><div class="branch-cond"><code>${esc(humanLogic(n.evaluate))}</code></div><div class="branch-arrow">→</div>
      <div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div></div>`;
  }
  let outcomeBlock = "";
  if (!n.branches && !n.evaluate && (n.outcome || n.referral_target)) {
    outcomeBlock = `<div class="ins-sec"><h4>Resultado</h4><div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "terminal")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div>`;
  }
  const defs = state.cache.defs[engine] || {};
  const facts = (n.needs_facts || []).map((f) => `<span class="fact-chip" title="${esc((defs[f] && defs[f].prompt) || "")}">${esc(f)}</span>`).join("");
  const flags = nodeFlags(n);
  const flagBlock = flags.length ? `<div class="ins-sec"><h4>Alertas · ${flags.length}</h4>${flags.map((f) => `
    <div class="flag-card mini">
      <div class="flag-top"><span class="flag-kind">${esc(titleCase(f.category))}</span><span class="badge ${f.status === "open" ? "badge-amber" : ""}">${esc(titleCase(f.status))}</span></div>
      <p class="flag-summary">${esc(f.summary || f.title)}</p>
    </div>`).join("")}</div>` : "";
  const links = [];
  if (n.on_no_match) links.push(`<div class="ins-row"><span class="ins-k">si no coincide</span>${link(n.on_no_match)}</div>`);
  if (n.referral_target && n.branches) links.push(`<div class="ins-row"><span class="ins-k">derivación</span>${link(n.referral_target)}</div>`);
  if (Array.isArray(n.see_also)) n.see_also.forEach((s) => links.push(`<div class="ins-row"><span class="ins-k">ver también</span>${link(s)}</div>`));
  return `<div class="node-modal-grid">
    <div class="node-modal-col">
      ${n.source_quote ? `<div class="ins-sec first"><h4>Fuente citada</h4><blockquote class="quote">${esc(n.source_quote)}</blockquote></div>` : ""}
      <div class="ins-sec first"><h4>Condición explicada</h4>${conditionDescriptionHtml(n)}</div>
      ${facts ? `<div class="ins-sec"><h4>Hechos que lee · ${(n.needs_facts || []).length}</h4><div class="step-facts">${facts}</div></div>` : ""}
      ${n.note ? `<div class="ins-sec"><h4>Nota</h4><p class="ins-note">${esc(n.note)}</p></div>` : ""}
    </div>
    <div class="node-modal-col">
      ${evalBlock}${branches}${outcomeBlock}${flagBlock}
      ${links.length ? `<div class="ins-sec"><h4>Enlaces</h4>${links.join("")}</div>` : ""}
    </div>
  </div>`;
}

function syntheticNodeHtml(n) {
  const desc = SIM_SYNTHETIC_NODE_INFO[n.node_id] || "Nodo del modelo de cartera de renovación; no proviene del árbol de decisiones, sino del simulador.";
  const rows = [];
  if (n.count != null) rows.push(`<div class="ins-row"><span class="ins-k">${esc(n.count_label || "volumen")}</span><span>${esc(n.count)}</span></div>`);
  if (n.cost_label) {
    rows.push(`<div class="ins-row"><span class="ins-k">${esc(n.cost_label)} actual</span><span>Bs ${moneyBob(n.current_cost_bob)}</span></div>`);
    rows.push(`<div class="ins-row"><span class="ins-k">${esc(n.cost_label)} candidato</span><span>Bs ${moneyBob(n.candidate_cost_bob)}</span></div>`);
  }
  if (n.numeric_control && CONTROL_SPECS[n.numeric_control]) rows.push(`<div class="ins-row"><span class="ins-k">palanca</span><span>${esc(CONTROL_SPECS[n.numeric_control].label)}</span></div>`);
  return `<div class="node-modal-grid"><div class="node-modal-col">
    <div class="ins-sec first"><h4>Qué representa</h4><p class="ins-note">${esc(desc)}</p></div>
    ${rows.length ? `<div class="ins-sec"><h4>En esta simulación</h4>${rows.join("")}</div>` : ""}
  </div></div>`;
}

function mountSimNodeModal(headHtml, innerHtml, node) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal node-info-modal" role="dialog" aria-modal="true">
    <div class="modal-head">${headHtml}<button class="drawer-x" id="sn-close" title="Cerrar">✕</button></div>
    <div class="modal-body">${innerHtml}</div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="sn-cancel">Cerrar</button>
      ${node ? `<button class="btn btn-primary" id="sn-edit">Editar con chat guiado</button>` : ""}
    </div></div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add("open"));
  const close = () => { back.classList.remove("open"); setTimeout(() => back.remove(), 180); };
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.querySelector("#sn-close").addEventListener("click", close);
  back.querySelector("#sn-cancel").addEventListener("click", close);
  const editBtn = back.querySelector("#sn-edit");
  if (editBtn) editBtn.addEventListener("click", () => { close(); openProposeModal(node); });
}

function renderControl(key, value) {
  const spec = CONTROL_SPECS[key];
  if (!spec) return "";
  if (spec.kind === "select") {
    return `<label class="sim-field sim-field-sm"><span>${esc(spec.label)}</span><select data-sim-control="${esc(key)}">${spec.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
  }
  const display = spec.fmt ? spec.fmt(Number(value)) : value;
  return `<label class="sim-lever"><span>${esc(spec.label)}</span><input data-sim-control="${esc(key)}" type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${esc(value)}"><b>${esc(display)}</b></label>`;
}

// Shared "hero" metric card used at the top of Supervisión and Simulación.
// tone: "ok" | "warn" | "bad" | "info" → color accent; tag is an optional short qualifier.
function heroKpi(label, value, sub, tone = "info", tag = "") {
  const toneClass = tone === "ok" ? "is-ok" : tone === "warn" ? "is-warn" : tone === "bad" ? "is-bad" : "";
  return `<div class="hero-kpi ${toneClass}">
    <span class="hero-label">${esc(label)}</span>
    <span class="hero-value">${esc(value)}</span>
    ${sub ? `<span class="hero-sub">${esc(sub)}</span>` : ""}
    ${tag ? `<span class="badge hero-tag">${esc(tag)}</span>` : ""}
  </div>`;
}

// Labeled band header so a group of tables never floats without context.
function bandHead(title, hint = "") {
  return `<div class="band-head"><h2>${esc(title)}</h2>${hint ? `<span class="band-hint">${esc(hint)}</span>` : ""}</div>`;
}

function tableCard(title, rowsHtml) {
  return `<section class="card sim-table-card">
    <div class="card-head"><h2>${esc(title)}</h2></div>
    <div class="card-body gtable-wrap">${rowsHtml}</div>
  </section>`;
}

function lossRows(rows) {
  return `<table class="gtable"><thead><tr><th>Árbol</th><th>Nodo</th><th>Reclamos</th><th>Pérdida</th><th>Satisf. broker</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(sideLabel(r.side))}</td><td class="mono">${esc(truncate(r.node_id, 44))}</td><td class="num">${esc(r.claim_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="num">${Math.round(Number(r.avg_broker_satisfaction || 0))}/100</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function clauseRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cláusula</th><th>Reclamos</th><th>Inconformes</th><th>Pérdida</th><th>Feedback</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td class="mono">${esc(r.clause_code)}</td><td class="num">${esc(r.claim_count)}</td><td class="num">${esc(r.unhappy_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="sm">${esc(truncate(r.sample_feedback || "—", 90))}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function cashoutRows(rows) {
  return `<table class="gtable"><thead><tr><th>Árbol</th><th>Caso</th><th>Cliente</th><th>Nodo</th><th>Salida</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(sideLabel(r.side))}</td><td class="mono">${esc(r.case_id)}</td><td>${esc(r.client_name)}<div class="sim-sub">${esc(titleCase(r.cause))} · ${esc(r.broker)}</div></td><td class="mono">${esc(truncate(r.node_id, 48))}</td><td class="num">Bs ${moneyBob(r.cashout_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function alertRows(rows) {
  return `<table class="gtable"><thead><tr><th>Prioridad</th><th>Alerta</th><th>Responsable</th><th>Nodo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><span class="badge ${r.severity === "high" ? "badge-bad" : "badge-amber"}">${esc(severityLabel(r.severity))}</span></td><td><b>${esc(r.title)}</b><div class="sim-sub">${esc(r.detail)}</div></td><td>${esc(titleCase(r.owner))}</td><td class="mono">${esc(truncate(r.node, 38))}</td></tr>`).join("") || emptyTableRow(4)}
  </tbody></table>`;
}

function clientHealthRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cliente</th><th>Riesgo</th><th>Siniestr.</th><th>Frec.</th><th>Incurrido</th><th>Nodos</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><b>${esc(r.client_name)}</b><div class="sim-sub">${esc(r.city)} · ${esc(r.broker)}</div></td><td class="num">${esc(r.risk_score)}</td><td class="num">${pctInt(r.loss_ratio)}</td><td class="num">${Number(r.accident_frequency || 0).toFixed(2)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td><td class="mono">${esc(truncate((r.risk_nodes || []).join(", "), 50))}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function frequencyRows(rows) {
  return `<table class="gtable"><thead><tr><th>Ciudad</th><th>Negocio</th><th>Clientes</th><th>Reclamos</th><th>Frec.</th><th>Incurrido</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(r.city)}</td><td>${esc(titleCase(r.business_type))}</td><td class="num">${esc(r.client_count)}</td><td class="num">${esc(r.claim_count)}</td><td class="num">${Number(r.accident_frequency || 0).toFixed(2)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function severityRows(rows) {
  return `<table class="gtable"><thead><tr><th>Causa</th><th>Reclamos</th><th>Incurrido</th><th>Severidad prom.</th><th>Máximo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(titleCase(r.claim_cause))}</td><td class="num">${esc(r.claim_count)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td><td class="num">Bs ${moneyBob(r.avg_severity_bob)}</td><td class="num">Bs ${moneyBob(r.max_case_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function renewalRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cliente</th><th>Prima</th><th>Siniestr.</th><th>Prob. fuga</th><th>Recomendado</th><th>Nodo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><b>${esc(r.client_name)}</b><div class="sim-sub">${esc(r.city)} · ${esc(r.broker)}</div></td><td class="num">Bs ${moneyBob(r.current_premium_bob)}</td><td class="num">${pctInt(r.loss_ratio)}</td><td class="num">${Math.round(Number(r.churn_probability || 0) * 100)}%</td><td class="num">${signedNumber(r.recommended_price_change_percent, 1)}%</td><td class="mono">${esc(r.renewal_node)}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function nodeRows(rows) {
  return `<table class="gtable"><thead><tr><th>Árbol</th><th>Nodo</th><th>Veces</th><th>Pérdida</th><th>Utilidad</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(sideLabel(r.side))}</td><td><span class="mono">${esc(truncate(r.node_id, 48))}</span><div class="sim-sub">${esc(truncate(r.title || "", 70))}</div></td><td class="num">${esc(r.hit_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="num">Bs ${moneyBob(r.profit_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function emptyTableRow(cols) {
  return `<tr><td colspan="${cols}" class="sm">Sin filas para esta selección.</td></tr>`;
}

function simSelect(id, label, rawOptions, selected, extraClass = "") {
  const options = rawOptions.map((item) => typeof item === "object" ? item : { value: item, label: item === "all" ? "Todos" : titleCase(item) });
  return `<label class="sim-field ${extraClass}"><span>${esc(label)}</span><select id="${id}">
    ${options.map((o) => `<option value="${esc(o.value)}" ${String(selected || "all") === String(o.value) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
  </select></label>`;
}

function bindSimulationControls() {
  $("#sim-reset").addEventListener("click", async () => {
    state.simulation.controls = { ...DEFAULT_SIM_CONTROLS };
    state.simulation.candidate_id = "growth_sandbox";
    state.simulation.domain = "suscripcion";
    state.simulation.result = null;
    await go("simulation");
  });
  // Domain change is a pure relens: reuse the result, just re-render for the
  // newly selected domain (no re-run needed — all three domains come from one run).
  $("#sim-domain").addEventListener("change", (e) => {
    state.simulation.domain = e.target.value;
    go("simulation");
  });
  // Candidate change resets the levers to that version's overlays and forces a re-run.
  $("#sim-candidate").addEventListener("change", (e) => {
    state.simulation.candidate_id = e.target.value;
    const candidates = state.cache.simulationCandidates || [];
    const active = candidates.find((c) => c.candidate_id === e.target.value) || candidates[0] || {};
    state.simulation.controls = { ...DEFAULT_SIM_CONTROLS, ...(active.overlays || {}) };
    state.simulation.result = null;
    go("simulation");
  });
  bindSimulationEditorControls();
}

function activeSimCandidate() {
  const candidates = state.cache.simulationCandidates || [];
  return candidates.find((c) => c.candidate_id === state.simulation.candidate_id) || candidates[0] || {};
}

// Apply a single control edit to state. Writing from the fired element (rather
// than re-scanning the whole DOM) avoids a stale duplicate input — e.g. a macro
// dial and an inline node editor that share the same control key — clobbering
// the value the user is actively dragging. Sibling inputs/labels for the same
// key are synced so the two stay consistent.
function applySimControl(el) {
  const key = el.dataset.simControl;
  if (!key) return;
  const value = el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
  state.simulation.controls = { ...(state.simulation.controls || {}), [key]: value };
  $$(`[data-sim-control="${key}"]`).forEach((other) => {
    if (other !== el && String(other.value) !== String(value)) other.value = value;
    const lbl = other.closest(".sim-lever")?.querySelector("b");
    if (lbl) lbl.textContent = liveControlLabel(key, value);
  });
}

let simulationLiveTimer;
function bindSimulationEditorControls() {
  $$("#sim-dials-wrap [data-sim-control], #sim-nodes-wrap [data-sim-control]").forEach((el) => {
    el.addEventListener("input", () => {
      applySimControl(el);
      clearTimeout(simulationLiveTimer);
      simulationLiveTimer = setTimeout(runSimulationLive, 260);
    });
    el.addEventListener("change", () => {
      applySimControl(el);
      clearTimeout(simulationLiveTimer);
      simulationLiveTimer = setTimeout(runSimulationLive, 80);
    });
  });
  $$("#sim-nodes-wrap [data-node-open]").forEach((el) => {
    el.addEventListener("click", () => openSimNodeModal(el.dataset.nodeOpen));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSimNodeModal(el.dataset.nodeOpen); }
    });
  });
}

function liveControlLabel(key, value) {
  const spec = CONTROL_SPECS[key];
  if (spec && spec.fmt) return spec.fmt(Number(value));
  return String(value);
}

// Recalc on edit. The outputs/stats are re-rendered wholesale (no inputs in
// them), but the key-nodes table only has its cost cells patched in place — its
// inline editors are never re-rendered, so a slider drag is never interrupted.
async function runSimulationLive() {
  try {
    state.simulation.result = await runSimulationPayload({
      filters: simulationApiFilters(state.simulation.filters),
      candidate_id: state.simulation.candidate_id,
      controls: state.simulation.controls
    });
    const outputs = $("#sim-outputs-wrap");
    if (outputs) outputs.innerHTML = simulationOutputs(state.simulation.result);
    const stats = $("#sim-stats-wrap");
    if (stats) stats.innerHTML = simulationStats(state.simulation.result);
    patchKeyNodeCosts(state.simulation.result);
  } catch {
    toast("No se pudo recalcular la simulación", true);
  }
}

// Patch the Bs columns of the existing key-node rows without touching the inline
// editor inputs. Row order is intentionally left stable mid-edit; it re-sorts on
// the next full render (domain/candidate change).
function patchKeyNodeCosts(result) {
  const wrap = $("#sim-nodes-wrap");
  if (!wrap) return;
  (simDomainData(result).key_nodes || []).forEach((n) => {
    const row = wrap.querySelector(`[data-node="${n.node_id}"]`);
    if (!row) return;
    const cur = row.querySelector('[data-cost="current"]');
    const cand = row.querySelector('[data-cost="candidate"]');
    const delta = row.querySelector('[data-cost="delta"]');
    if (cur) cur.textContent = `Bs ${moneyBob(n.current_cost_bob)}`;
    if (cand) cand.textContent = `Bs ${moneyBob(n.candidate_cost_bob)}`;
    if (delta) {
      delta.textContent = signedMoneyBob(n.delta_cost_bob);
      delta.className = `num ${deltaCostClass(n.delta_cost_bob)}`;
    }
  });
}

function simulationApiFilters(filters) {
  const out = { engine: filters.engine || "all" };
  if (filters.age_min) out.age_min = Number(filters.age_min);
  if (filters.age_max) out.age_max = Number(filters.age_max);
  for (const key of ["cities", "brokers", "business_types", "vehicle_makes", "policy_types", "claim_causes"]) {
    if (filters[key] && filters[key] !== "all") out[key] = [filters[key]];
  }
  return out;
}

/* ---------- boot ---------- */
async function init() {
  $("#back-btn").addEventListener("click", () => go(DEFAULT_ROUTE));
  $(".brand").addEventListener("click", () => go(DEFAULT_ROUTE));
  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    go(route);
  });
  renderNav();
  await loadCore();
  go(routeFromHash());
}
init();
