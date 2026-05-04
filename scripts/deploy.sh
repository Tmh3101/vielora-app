#!/usr/bin/env bash
# =============================================================================
# Vielora — Deployment Script
# =============================================================================
# Automates the full deployment lifecycle for Docker Compose profiles.
#
# Usage:
#   ./scripts/deploy.sh                          # Interactive menu
#   ./scripts/deploy.sh hybrid                   # Hybrid profile, default .env
#   ./scripts/deploy.sh hybrid .env.production   # Hybrid profile, production env
#   ./scripts/deploy.sh monolith .env.production # Monolith profile, production env
#
# Prerequisites: Docker and Docker Compose must be installed.
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[  OK]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERR!]${NC}  $*"; }
step()    { echo -e "\n${BOLD}▸ $*${NC}"; }
banner()  {
  echo ""
  echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║           VIELORA — Deploy Manager             ║${NC}"
  echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
  echo ""
}

# Project root (script lives in scripts/)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
 
# Variables (populated by args or interactive menu)
PROFILE=""
ENV_FILE=""

# Interactive menu
select_profile() {
  echo -e "${BOLD}  Select deployment topology:${NC}"
  echo ""
  echo -e "    ${CYAN}1)${NC}  hybrid    ${DIM}— Serverless (Web) + Server (Redis, Worker, Cron)${NC}"
  echo -e "    ${CYAN}2)${NC}  monolith  ${DIM}— Server runs everything (Web, Redis, Worker, Cron)${NC}"
  echo -e "    ${CYAN}3)${NC}  web       ${DIM}— Server runs Web only (expects external Redis)${NC}"
  echo ""
  while true; do
    read -rp "  Enter choice [1/2/3]: " choice
    case "$choice" in
      1) PROFILE="hybrid";   return ;;
      2) PROFILE="monolith"; return ;;
      3) PROFILE="web";      return ;;
      *) error "Invalid choice. Please enter 1, 2, or 3." ;;
    esac
  done
}

select_env_file() {
  echo ""
  echo -e "${BOLD}  Select environment file:${NC}"
  echo ""
  echo -e "    ${CYAN}1)${NC}  .env             ${DIM}— Development / Testing${NC}"
  echo -e "    ${CYAN}2)${NC}  .env.production   ${DIM}— Production (live)${NC}"
  echo ""
  while true; do
    read -rp "  Enter choice [1/2]: " choice
    case "$choice" in
      1) ENV_FILE=".env";            return ;;
      2) ENV_FILE=".env.production"; return ;;
      *) error "Invalid choice. Please enter 1 or 2." ;;
    esac
  done
}

confirm_prompt() {
  local message="$1"
  local default="${2:-Y}"
  local hint

  if [[ "$default" == "Y" ]]; then
    hint="Y/n"
  else
    hint="y/N"
  fi

  read -rp "$(echo -e "${YELLOW}[????]${NC}  ${message} [${hint}]: ")" answer
  answer="${answer:-$default}"

  case "$answer" in
    [Yy]*) return 0 ;;
    *)     return 1 ;;
  esac
}

 
# Parse arguments or show interactive menu
banner

if [[ $# -ge 1 ]]; then
  # Argument mode
  PROFILE="$1"
  ENV_FILE="${2:-.env}"

  # Validate profile argument
  if [[ "$PROFILE" != "hybrid" && "$PROFILE" != "monolith" && "$PROFILE" != "web" ]]; then
    error "Invalid profile '${PROFILE}'. Must be 'hybrid', 'monolith', or 'web'."
    echo ""
    echo -e "  ${DIM}Usage: ./scripts/deploy.sh <hybrid|monolith|web> [.env|.env.production]${NC}"
    exit 1
  fi

  info "Profile:  ${BOLD}${PROFILE}${NC}"
  info "Env file: ${BOLD}${ENV_FILE}${NC}"
else
  # Interactive mode
  select_profile
  select_env_file
fi

# STEP 1 — Pre-flight checks
step "Pre-flight checks"

# 1a. Docker available?
if ! command -v docker &>/dev/null; then
  error "Docker is not installed or not in PATH. Aborting."
  exit 1
fi
success "Docker found: $(docker --version | head -1)"

# 1b. Docker Compose available?
if ! docker compose version &>/dev/null; then
  error "Docker Compose plugin is not installed. Aborting."
  exit 1
fi
success "Docker Compose found: $(docker compose version | head -1)"

# 1c. Docker daemon running?
if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  exit 1
fi
success "Docker daemon is running"

# 1d. Env file exists?
ENV_PATH="$PROJECT_DIR/$ENV_FILE"
if [[ ! -f "$ENV_PATH" ]]; then
  error "Environment file '${ENV_FILE}' not found at: ${ENV_PATH}"
  error "Create it first:  cp .env.example ${ENV_FILE}"
  exit 1
fi
success "Environment file found: ${ENV_FILE}"

# 1e. REDIS_PASSWORD is set in env file?
if ! grep -q '^REDIS_PASSWORD=.\+' "$ENV_PATH"; then
  error "REDIS_PASSWORD is empty or missing in '${ENV_FILE}'. Aborting."
  exit 1
fi
success "REDIS_PASSWORD is configured"

# STEP 2 — Safe transition (teardown the OTHER profile)
step "Safe topology transition"

if [[ "$PROFILE" == "hybrid" ]]; then
  info "Tearing down monolith profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile monolith down 2>/dev/null || true
  info "Tearing down web profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile web down 2>/dev/null || true
elif [[ "$PROFILE" == "web" ]]; then
  info "Tearing down monolith profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile monolith down 2>/dev/null || true
  info "Tearing down hybrid profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile hybrid down 2>/dev/null || true
else
  info "Tearing down hybrid profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile hybrid down 2>/dev/null || true
  info "Tearing down web profile (if running)…"
  docker compose --env-file "$ENV_FILE" --profile web down 2>/dev/null || true
fi
success "Topology transition complete"

# STEP 3 — Deploy
step "Deploying → ${BOLD}${PROFILE}${NC} with ${BOLD}${ENV_FILE}${NC}"

echo ""
info "Command: docker compose --env-file ${ENV_FILE} --profile ${PROFILE} up -d --build"
echo ""

if ! docker compose --env-file "$ENV_PATH" --profile "$PROFILE" up -d --build; then
  error "Deployment failed! Check the logs above for details."
  error "Debug with: docker compose --env-file ${ENV_FILE} --profile ${PROFILE} logs"
  exit 1
fi

echo ""
success "Containers are up!"

# STEP 4 — Post-deployment status
step "Post-deployment status"

docker compose --env-file "$ENV_PATH" --profile "$PROFILE" ps

# STEP 5 — Cleanup dangling images
step "Disk cleanup"

DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null | wc -l | tr -d ' ')

if [[ "$DANGLING" -gt 0 ]]; then
  info "Pruning ${DANGLING} dangling image(s)…"
  docker image prune -f
  success "Disk space reclaimed"
else
  success "No dangling images to clean up"
fi

# DONE
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║         ✔  Deployment complete!               ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${DIM}Profile:   ${NC}${BOLD}${PROFILE}${NC}"
echo -e "  ${DIM}Env file:  ${NC}${BOLD}${ENV_FILE}${NC}"
echo ""
echo -e "  ${DIM}Useful commands:${NC}"
echo -e "    ${CYAN}docker compose --profile ${PROFILE} logs -f${NC}          ${DIM}# Follow all logs${NC}"
echo -e "    ${CYAN}docker logs -f vielora-worker${NC}                    ${DIM}# Worker logs${NC}"
echo -e "    ${CYAN}docker logs -f vielora-cron${NC}                      ${DIM}# Cron logs${NC}"

if [[ "$PROFILE" == "monolith" || "$PROFILE" == "web" ]]; then
  echo -e "    ${CYAN}docker logs -f vielora-web${NC}                       ${DIM}# Web logs${NC}"
fi

echo -e "    ${CYAN}docker compose --profile ${PROFILE} down${NC}             ${DIM}# Stop all${NC}"
echo ""
