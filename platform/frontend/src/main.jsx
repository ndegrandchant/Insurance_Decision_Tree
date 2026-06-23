import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, BookOpen, FileSearch, GitBranch, Play, ShieldCheck } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE ?? "";

const sampleUwFacts = {
  product: "moto_proteccion",
  channel: "directas",
  client_type: "empresa",
  requests_standard_deviation: false,
  is_mass_grouping: false,
  is_public_tender: false,
  vehicle_class: "motocicleta",
  cilindrada_cc: 150,
  es_moto_lujo_o_competicion: false,
  segment: "comercial",
  is_contractor_equipment: false,
  has_plates: true,
  is_competition_offroad: false,
  has_body_modifications: false,
  is_rail_vehicle: false,
  is_rental: false,
  is_learning_vehicle: false,
  vehicle_age_years: 5,
  circula_fuera_pais_actividad_regular: false,
  capacidad_original_mayor_8: false,
  valor_asegurado: 90000,
  servicio_publico_pasajeros: false,
  is_convertible_lona: false,
  is_armored: false,
  is_bomberos_policia_ejercito: false,
  is_ambulance: false,
  has_foreign_plates: false,
  is_brevet_policy: false,
  suscriptor: "Manuel Sauma",
  cantidad_vehiculos: 1,
  has_rc: false,
  has_ap: false,
  is_enlatado: false,
  model_year: 2021,
  make: "Toyota",
  marca_auto: 44,
  model: "Corolla",
  city: "La Paz",
  plaza_auto: 1,
  extraterritorialidad: "no",
  cuotas: 1,
  selected_pricing_option: "option_1"
};

const sampleCoverageFacts = {
  coverage_section: "robo_parcial",
  coverage_included: true,
  event_type: "robo_partes",
  driver_alcohol_over_limit: false,
  driver_under_drugs_or_impairing_medication: false,
  intentional_act: false,
  confiscation_or_authority_measure: false,
  vehicle_type: "auto",
  foreign_territory: false,
  theft_consumated: true,
  parts_verified_and_valued: true,
  parts_permanently_attached_or_declared: true,
  security_measures_requested: false,
  security_measures_completed: false,
  written_security_exception: false,
  attached_clause_codes: [],
  uses_free_choice_workshop: false,
  estimated_replacement_cost_percent_va: 20,
  part_repair_cost_percent_replacement: 80,
  insured_requests_part_replacement: false,
  parts_available_local_market: true,
  local_price_over_import_price_percent: 0,
  police_report_within_6h: true,
  alcohol_test_within_6h: true,
  justified_impediment: false,
  technical_report_available: true,
  insurer_notice_days: 2,
  repair_started_without_authorization: false
};

function App() {
  const [versions, setVersions] = useState([]);
  const [mode, setMode] = useState("uw");
  const [input, setInput] = useState(JSON.stringify(sampleUwFacts, null, 2));
  const [result, setResultado] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/graph-versions`).then((r) => r.json()).then(setVersions);
  }, []);

  useEffect(() => {
    setInput(JSON.stringify(mode === "uw" ? sampleUwFacts : sampleCoverageFacts, null, 2));
    setResultado(null);
  }, [mode]);

  const activeVersion = useMemo(() => versions.find((v) => v.engine === mode), [versions, mode]);

  async function runEngine() {
    const endpoint = mode === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const response = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Role": mode === "uw" ? "uw_user" : "claims_user" },
      body: JSON.stringify({ facts: JSON.parse(input), facts_confirmed: true })
    });
    setResultado(await response.json());
  }

  return (
    <main>
      <aside>
        <div className="brand"><ShieldCheck size={22} /> Suscripción + Cobertura</div>
        <button className={mode === "uw" ? "active" : ""} onClick={() => setMode("uw")}><GitBranch size={16} /> Motor de suscripción</button>
        <button className={mode === "coverage" ? "active" : ""} onClick={() => setMode("coverage")}><FileSearch size={16} /> Motor de cobertura</button>
      </aside>
      <section className="workspace">
        <header>
          <div>
            <h1>{mode === "uw" ? "Corrida de decisión de suscripción" : "Corrida de orientación de cobertura"}</h1>
            <p>{activeVersion?.version_id ?? "Cargando registro de versiones"}</p>
          </div>
          <button onClick={runEngine}><Play size={16} /> Ejecutar</button>
        </header>

        <div className="grid">
          <section className="panel">
            <h2><BookOpen size={16} /> Hechos confirmados</h2>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck="false" />
          </section>
          <section className="panel">
            <h2><Activity size={16} /> Resultado</h2>
            <pre>{result ? JSON.stringify(result, null, 2) : "Aún no se ejecutó."}</pre>
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
