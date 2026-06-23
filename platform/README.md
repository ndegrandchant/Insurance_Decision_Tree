# Dynamic UW + Coverage Intelligence Platform

This platform wraps the existing verified Automotores artifacts. It does not edit `representation/`
and does not hand-patch generated `crawlable/graph/*.json`.

## What Is Implemented

- Backend APIs for graph versions, ledger index, fact definitions, UW runs, coverage runs, advisory NL extraction, data discovery, and publish authorization checks.
- `UWEngine` adapter that imports `crawlable/crawler/crawl.py` directly.
- Reusable `ArtifactGraphEngine` for future manuals/coverage domains.
- Coverage slice artifacts for Daños Propios + Robo Parcial in `crawlable/graph_coverage/`.
- Postgres schema for graph versions, portfolio, claims, claim linkage, proposals, simulation, approvals, and audit.
- Local chat with persisted case memory, a live packet rail, and automatic RiskIQ execution when
  enough facts are known.
- Vite/React frontend source plus a dependency-free static preview.

## Local Smoke Server

FastAPI dependencies are declared in `platform/backend/requirements.txt`. For this repo's current
no-dependency environment, the smoke server exposes the same core endpoints:

```bash
python3 platform/backend/dev_server.py 8765
```

Open `http://127.0.0.1:8765`.

## Parser En Español Con Imágenes Y Audio

`/api/nl/extract-facts` combina el extractor determinístico con una capa opcional de OpenAI. Solo
necesita `OPENAI_API_KEY`; los modelos tienen defaults en código. Las sugerencias siguen siendo no
confirmadas: el usuario o un suscriptor debe revisarlas antes de ejecutar el árbol.

Configura las variables desde `.env.example`. El archivo `.env` local está ignorado por git.

## Chat Local Con Memoria

El módulo `Chat` del frontend es un chat local simple. Guarda conversaciones en JSONL, mantiene un
paquete vivo del caso en la columna izquierda, persiste memoria de hechos conocidos/pregunta actual,
trata respuestas como "no", "sí" o "están bien" por intención dentro de la conversación y ejecuta
RiskIQ automáticamente cuando detecta intención de seguro y tiene datos suficientes. `/api/nl/extract-facts`
sigue siendo advisory-only para usos genéricos fuera del chat.

Cuando el árbol se detiene por información faltante, el chat respeta `resolution_channel`:
`client_followup` significa preguntar al cliente/broker y reanudar con el dato confirmado;
`human_task` significa crear paquete humano para el rol profesional correcto. No hay adaptador
externo en esta versión.

El backend expone:

- `/api/chat`
- `/api/chat/{session_id}`
- `/api/nl/extract-facts`
- `/api/uw/run`
- `/api/coverage/run`

## VPS Deployment

Los archivos de despliegue viven en `deploy/`:

- `deploy/docker-compose.vps.yml`
- `deploy/Dockerfile.backend`
- `deploy/Caddyfile`
- `deploy/.env.vps.example`
- `deploy/VPS_SETUP.md`

Usa `deploy/VPS_SETUP.md` como guía operativa para preparar Ubuntu 24.04, configurar `.env`,
levantar servicios, habilitar HTTPS y mantener el chat local con memoria detrás del backend.

## Reusing The Skeleton For Another Manual

1. Create the immutable extraction under `representation/` using the Part-1 method.
2. Generate executable graph artifacts under a domain directory such as `crawlable/graph_<domain>/`.
3. Create `crawlable/facts_<domain>.json` with fact types, prompts, `on_missing`, and source quotes.
4. Configure `ArtifactGraphEngine` with those paths, the section discriminator, allowed sections, and default outcome.
5. Add a validator and reconciler for that domain. They should prove every source element is converted, ledgered, referenced, deferred, or excluded.
6. Register the new graph in `graph_version`; publish only after regenerate + validator GREEN.

The runtime behavior should stay shared. New manuals should be new data and validators, not new bespoke evaluators.
