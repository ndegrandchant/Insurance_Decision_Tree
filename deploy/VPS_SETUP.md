# RiskIQ VPS Setup

Target: a small Ubuntu 24.04 VPS. The laptop only needs a browser; the VPS runs the backend,
follow-up scheduler, Postgres, and reverse proxy. The chat is served by the backend as a simple
local-memory workflow.

## 1. Server Baseline

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Log out/in after adding the user to the Docker group.

## 2. Deploy Files

```bash
git clone <repo-url> riskiq
cd riskiq
cp deploy/.env.vps.example deploy/.env.vps
```

Edit `deploy/.env.vps`:

- `RISKIQ_DOMAIN`: DNS name pointing to the VPS.
- `POSTGRES_PASSWORD`: strong password.
- `OPENAI_API_KEY`: required for the parser.

## 3. Start Stack

```bash
cd deploy
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d postgres backend scheduler caddy
```

Caddy obtains TLS automatically once DNS points at the VPS.

Useful checks:

```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps ps
docker compose -f docker-compose.vps.yml --env-file .env.vps logs -f backend
curl -s https://$RISKIQ_DOMAIN/api/health
```

## 4. Chat Memory

The backend exposes `/api/chat` and `/api/chat/{session_id}`. Chat sessions persist to the app data
volume as JSONL and keep the case packet, known facts, pending question, and last RiskIQ result.

## 5. Follow-Ups

The scheduler runs `python -m app.scheduler` every `FOLLOWUP_SCHEDULER_INTERVAL_SECONDS` seconds.
The default follow-up rule is 3 hours (`180` minutes). Change or add rules from the API/UI instead of
editing code.

## 6. Backups

Postgres:

```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup-$(date +%F).sql"
```

Local JSONL operational store:

```bash
docker run --rm -v deploy_app_db:/data -v "$PWD":/backup alpine \
  tar czf /backup/app-db-$(date +%F).tgz /data
```

## 7. Restart / Upgrade

```bash
git pull
cd deploy
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
```
