#!/usr/bin/env bash
# Atlas Synapse — interactive local dev setup
# Usage: bash scripts/setup.sh
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}Atlas Synapse — Local Dev Setup${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "This script creates apps/web/.env.local and apps/edge/.dev.vars"
echo "then installs dependencies."
echo ""

# ── helper: prompt with default ──────────────────────────────────────────────
ask() {
  local prompt="$1"
  local default="$2"
  local var
  if [[ -n "$default" ]]; then
    read -rp "$(echo -e "${CYAN}${prompt}${RESET} [${default}]: ")" var
    echo "${var:-$default}"
  else
    read -rp "$(echo -e "${CYAN}${prompt}${RESET}: ")" var
    echo "$var"
  fi
}

# ── helper: prompt for secret (no echo) ──────────────────────────────────────
ask_secret() {
  local prompt="$1"
  local var
  read -rsp "$(echo -e "${CYAN}${prompt}${RESET}: ")" var
  echo ""
  echo "$var"
}

echo -e "${BOLD}[1/3] Supabase${RESET}"
echo "Get these from https://supabase.com/dashboard → your project → Settings → API"
echo ""
SUPABASE_URL=$(ask "Supabase project URL (e.g. https://xxxx.supabase.co)")
SUPABASE_ANON=$(ask_secret "Supabase anon/public key")
SUPABASE_SERVICE=$(ask_secret "Supabase service_role key (secret)")
echo ""
echo "Get DB connection strings from Settings → Database → Connection string"
echo "Use the 'URI' format, Transaction mode for DATABASE_URL (port 6543),"
echo "and Session mode for DIRECT_URL (port 5432)."
echo ""
DB_URL=$(ask "DATABASE_URL (Transaction mode, port 6543)")
DIRECT_URL=$(ask "DIRECT_URL (Session/direct mode, port 5432)")

echo ""
echo -e "${BOLD}[2/3] AI & Email (optional — press Enter to skip)${RESET}"
ANTHROPIC_KEY=$(ask "Anthropic API key (for evaluator)" "")
BREVO_KEY=$(ask "Brevo API key (for email alerts)" "")
BREVO_EMAIL=$(ask "Alert sender email" "alerts@yourdomain.com")
BREVO_NAME=$(ask "Alert sender name" "Atlas Synapse")
ADMIN_EMAIL=$(ask "Admin alert email (receives eval pipeline errors)" "")

echo ""
echo -e "${BOLD}[3/3] Generating secrets…${RESET}"
INGEST_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✓ INGEST_WORKER_SECRET generated${RESET}"
echo -e "${GREEN}✓ CRON_SECRET generated${RESET}"

# ── Write apps/web/.env.local ─────────────────────────────────────────────────
mkdir -p apps/web
cat > apps/web/.env.local <<EOF
# Database (Supabase connection pooler — port 6543)
DATABASE_URL="${DB_URL}"

# Database (direct connection for migrations — port 5432)
DIRECT_URL="${DIRECT_URL}"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE}"

# Edge → Web HMAC
INGEST_WORKER_SECRET="${INGEST_SECRET}"

# Edge worker target (local dev)
WEB_INGEST_URL="http://localhost:3000/api/ingest"

# LLM — Anthropic evaluator (claude-sonnet-4-5)
ANTHROPIC_API_KEY="${ANTHROPIC_KEY}"

# Email alerts (Brevo)
BREVO_API_KEY="${BREVO_KEY}"
BREVO_FROM_EMAIL="${BREVO_EMAIL}"
BREVO_FROM_NAME="${BREVO_NAME}"

# Admin alert email — receives cron health alerts when the eval pipeline fails
ADMIN_ALERT_EMAIL="${ADMIN_EMAIL}"

# Vercel Cron protection
CRON_SECRET="${CRON_SECRET}"

# Public app URL (no trailing slash — leave as localhost for local dev)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF

echo -e "${GREEN}✓ apps/web/.env.local written${RESET}"

# ── Write apps/edge/.dev.vars ─────────────────────────────────────────────────
mkdir -p apps/edge
cat > apps/edge/.dev.vars <<EOF
INGEST_WORKER_SECRET="${INGEST_SECRET}"
WEB_INGEST_URL="http://localhost:3000/api/ingest"
EOF

echo -e "${GREEN}✓ apps/edge/.dev.vars written${RESET}"

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Installing dependencies…${RESET}"
pnpm install

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  ${YELLOW}1. Run DB migrations${RESET}"
echo "     Open your Supabase project → SQL Editor, then paste and run each"
echo "     migration file from packages/db/prisma/migrations/ in order."
echo "     (Direct port 5432 is blocked in most cloud dev environments.)"
echo ""
echo -e "  ${YELLOW}2. Start the web app${RESET}"
echo "     pnpm --filter @atlas/web dev"
echo "     → http://localhost:3000"
echo ""
echo -e "  ${YELLOW}3. Start the edge worker (separate terminal)${RESET}"
echo "     pnpm --filter @atlas/edge dev"
echo "     → http://localhost:8787"
echo ""
echo -e "  ${YELLOW}4. Send a test trace${RESET}"
echo "     bash scripts/seed-connection.mjs (requires a running web app)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  Production app: ${CYAN}https://atlassynapseai.com/MVP${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
