#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Installs / updates the OLTRE app on the Oracle VM.
#
# First run (as root, on a box that already ran setup-postgres.sh):
#   sudo ./deploy-app.sh --bootstrap
#
# Every deploy after that:
#   sudo ./deploy-app.sh
#
# Layout — releases are built beside the live one and swapped by symlink, so a
# failed build never takes the site down and rollback is one `ln -s`:
#   /srv/oltre/releases/<timestamp>/   built code
#   /srv/oltre/current -> releases/... live symlink
#   /srv/oltre/shared/.env             secrets, survives deploys
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/3boalazm/momo-shop.git}"
BRANCH="${BRANCH:-main}"
APP_USER=oltre
BASE=/srv/oltre
NODE_MAJOR=22
BOOTSTRAP=false

[[ "${1:-}" == "--bootstrap" ]] && BOOTSTRAP=true

if [[ $EUID -ne 0 ]]; then
  echo "Run me with sudo." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Bootstrap: runtime, user, directories, nginx, systemd. Once per machine.
# ---------------------------------------------------------------------------
if $BOOTSTRAP; then
  echo "==> Installing Node ${NODE_MAJOR}, nginx, certbot, git"
  export DEBIAN_FRONTEND=noninteractive
  if ! command -v node >/dev/null || [[ "$(node -v | cut -c2-3)" != "$NODE_MAJOR" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  fi
  apt-get install -y -qq nodejs nginx certbot python3-certbot-nginx git
  corepack enable
  corepack prepare pnpm@10.4.1 --activate

  echo "==> Creating ${APP_USER} service account"
  # No login shell, no home dir to speak of — it only ever runs one binary.
  id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home-dir "$BASE" "$APP_USER"
  mkdir -p "$BASE"/{releases,shared/uploads}
  chown -R "${APP_USER}:${APP_USER}" "$BASE"

  if [[ ! -f "$BASE/shared/.env" ]]; then
    echo "==> Writing starter ${BASE}/shared/.env"
    cat > "$BASE/shared/.env" <<'ENVEOF'
NODE_ENV=production
# Aiven (../aiven/setup-databases.sh output) or local Postgres
# (/root/.pg-service-passwords if you ran setup-postgres.sh instead).
DATABASE_URL=postgresql://oltre_app:CHANGEME@host:port/oltre_shop
# "require" for Aiven (or any remote DB) — "disable" if Postgres is on this
# same VM (loopback has nothing to encrypt against).
DATABASE_SSL=require
DATABASE_POOL_MAX=10
JWT_SECRET=REPLACE_ME
ADMIN_TOKEN=REPLACE_ME
GMAIL_USER=
GMAIL_APP_PASSWORD=
ADMIN_EMAIL=
PAYMOB_SECRET_KEY=
PAYMOB_PUBLIC_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_HMAC_SECRET=
ENVEOF
    # Generate the two secrets that have no external source.
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" "$BASE/shared/.env"
    sed -i "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$(openssl rand -hex 32)|" "$BASE/shared/.env"
    echo "    !! Set DATABASE_URL + Paymob/Gmail values before the first start."
  fi
  chown root:"$APP_USER" "$BASE/shared/.env"
  chmod 640 "$BASE/shared/.env"

  echo "==> Installing systemd unit"
  cp "$(dirname "$0")/oltre-api.service" /etc/systemd/system/oltre-api.service
  systemctl daemon-reload
  systemctl enable oltre-api

  echo "==> Installing nginx site (edit the domain, then run certbot)"
  cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/oltre
  echo "    -> /etc/nginx/sites-available/oltre — replace DOMAIN_PLACEHOLDER"
fi

# ---------------------------------------------------------------------------
# Build a new release.
# ---------------------------------------------------------------------------
RELEASE="${BASE}/releases/$(date +%Y%m%d-%H%M%S)"
echo "==> Cloning ${BRANCH} -> ${RELEASE}"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$RELEASE"

cd "$RELEASE"
echo "==> Installing dependencies"
# Dev deps are needed to BUILD (vite, esbuild, typescript), so install all.
pnpm install --frozen-lockfile

echo "==> Building client + server"
# The build reads .env for any VITE_* vars baked into the bundle.
cp "$BASE/shared/.env" .env
pnpm build:vm
rm -f .env

# Prove the bundle at least boots and answers before cutting traffic to it.
echo "==> Smoke-testing the new release"
set +e
env $(grep -v '^#' "$BASE/shared/.env" | xargs -d '\n') PORT=3999 HOST=127.0.0.1 \
  node dist/server.js > /tmp/oltre-smoke.log 2>&1 &
SMOKE_PID=$!
sleep 4
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 http://127.0.0.1:3999/api/health)
kill "$SMOKE_PID" 2>/dev/null
wait "$SMOKE_PID" 2>/dev/null
set -e
if [[ "$CODE" != "200" ]]; then
  echo "    Smoke test failed: /api/health returned ${CODE}, expected 200." >&2
  echo "    Log:" >&2; sed 's/^/      /' /tmp/oltre-smoke.log >&2
  echo "    Live site untouched. Release left at ${RELEASE} for inspection." >&2
  exit 1
fi
echo "    /api/health -> 200"

# ---------------------------------------------------------------------------
# Cut over.
# ---------------------------------------------------------------------------
echo "==> Applying database migrations"
cd "$RELEASE"
cp "$BASE/shared/.env" .env
pnpm db:migrate || { echo "    Migration failed — not switching."; rm -f .env; exit 1; }
rm -f .env

echo "==> Switching symlink"
chown -R "${APP_USER}:${APP_USER}" "$RELEASE"
ln -sfn "$RELEASE" "${BASE}/current"
systemctl restart oltre-api
sleep 3

if ! systemctl is-active --quiet oltre-api; then
  echo "    Service failed to start. journalctl -u oltre-api -n 50" >&2
  exit 1
fi

systemctl reload nginx 2>/dev/null || true

# Keep the last 5 releases so rollback stays possible without a rebuild.
echo "==> Pruning old releases (keeping 5)"
cd "${BASE}/releases"
ls -1dt */ | tail -n +6 | xargs -r rm -rf

cat <<DONE

===========================================================================
Deployed: ${RELEASE}

  systemctl status oltre-api
  journalctl -u oltre-api -f
  curl -s localhost:3000/api/health

Rollback to the previous release:
  ln -sfn ${BASE}/releases/<older> ${BASE}/current && systemctl restart oltre-api
===========================================================================
DONE
