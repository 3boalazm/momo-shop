#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Provisions Postgres 16 + PgBouncer on a fresh Oracle Cloud VM (Ubuntu 22.04
# or 24.04, x86 or Ampere ARM — both work unmodified).
#
# Creates one database per backend service, each owned by its own role, so a
# leaked credential for one service cannot read another's data.
#
# Usage (on the VM, as the default `ubuntu` user):
#   chmod +x setup-postgres.sh
#   sudo ./setup-postgres.sh
#
# Idempotent: safe to re-run. Existing roles/databases are left alone; only
# their passwords are reset to whatever is in /root/.pg-service-passwords.
# ---------------------------------------------------------------------------
set -euo pipefail

PG_VERSION=16
PGB_PORT=6432
SECRETS_FILE=/root/.pg-service-passwords

# With the API running on this same VM, nothing outside needs to reach the
# database — so PgBouncer listens on loopback only and port 6432 stays closed.
# Set EXPOSE_DB=1 only if you genuinely need an external client (a laptop, a
# service on another host); that opens 6432 to the internet.
EXPOSE_DB="${EXPOSE_DB:-0}"

# One database per service. Role name == database name.
SERVICES=(iam products inventory crm sales accounting)

# The storefront's own database (what DATABASE_URL in this repo points at).
APP_DB=oltre_shop
APP_ROLE=oltre_app

if [[ $EUID -ne 0 ]]; then
  echo "Run me with sudo." >&2
  exit 1
fi

echo "==> Installing Postgres ${PG_VERSION} + PgBouncer"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  "postgresql-${PG_VERSION}" "postgresql-client-${PG_VERSION}" \
  pgbouncer openssl ufw

PGDATA="/etc/postgresql/${PG_VERSION}/main"

# ---------------------------------------------------------------------------
# 1. Passwords — generated once, then reused on every re-run.
# ---------------------------------------------------------------------------
if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "==> Generating service passwords -> ${SECRETS_FILE}"
  : > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  for svc in "${SERVICES[@]}" "$APP_ROLE"; do
    echo "${svc}=$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)" >> "$SECRETS_FILE"
  done
else
  echo "==> Reusing existing passwords from ${SECRETS_FILE}"
fi
# shellcheck disable=SC1090
declare -A PW
while IFS='=' read -r k v; do [[ -n "$k" ]] && PW["$k"]="$v"; done < "$SECRETS_FILE"

# ---------------------------------------------------------------------------
# 2. Roles + databases. Each role owns exactly one database.
# ---------------------------------------------------------------------------
create_db() {
  local role="$1" db="$2" pw="$3"
  sudo -u postgres psql -v ON_ERROR_STOP=1 --quiet <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
    CREATE ROLE ${role} LOGIN PASSWORD '${pw}';
  ELSE
    ALTER ROLE ${role} WITH LOGIN PASSWORD '${pw}';
  END IF;
END
\$\$;
SQL
  # CREATE DATABASE cannot run inside a DO block / transaction.
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    sudo -u postgres createdb -O "${role}" "${db}"
  fi
  # Strip the implicit public-schema grant every other role gets by default.
  sudo -u postgres psql -v ON_ERROR_STOP=1 --quiet -d "${db}" <<SQL
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO ${role};
REVOKE CONNECT ON DATABASE ${db} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${db} TO ${role};
SQL
  echo "    ok: ${db} (owner ${role})"
}

echo "==> Creating databases"
create_db "$APP_ROLE" "$APP_DB" "${PW[$APP_ROLE]}"
for svc in "${SERVICES[@]}"; do
  create_db "${svc}_svc" "${svc}_db" "${PW[$svc]}"
done

# ---------------------------------------------------------------------------
# 3. TLS. Self-signed by default — swap in a real cert if you have a domain.
# ---------------------------------------------------------------------------
if [[ ! -f "/var/lib/postgresql/${PG_VERSION}/main/server.crt" ]]; then
  echo "==> Generating self-signed TLS cert (10y)"
  openssl req -new -x509 -days 3650 -nodes -text \
    -out "/var/lib/postgresql/${PG_VERSION}/main/server.crt" \
    -keyout "/var/lib/postgresql/${PG_VERSION}/main/server.key" \
    -subj "/CN=$(curl -s --max-time 5 ifconfig.me || hostname -f)" 2>/dev/null
  chmod 600 "/var/lib/postgresql/${PG_VERSION}/main/server.key"
  chown postgres:postgres "/var/lib/postgresql/${PG_VERSION}/main/server."{crt,key}
fi

# ---------------------------------------------------------------------------
# 4. Postgres config. Only PgBouncer (localhost) talks to Postgres directly.
# ---------------------------------------------------------------------------
echo "==> Writing postgresql.conf overrides"
mkdir -p "${PGDATA}/conf.d"
cat > "${PGDATA}/conf.d/99-app.conf" <<CONF
listen_addresses = 'localhost'
port = 5432
max_connections = 200
ssl = on
# Tuned for the Always Free Ampere shape (4 OCPU / 24 GB). Scale with the VM.
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 512MB
random_page_cost = 1.1
log_min_duration_statement = 500
CONF
grep -q "include_dir 'conf.d'" "${PGDATA}/postgresql.conf" \
  || echo "include_dir 'conf.d'" >> "${PGDATA}/postgresql.conf"

# scram-sha-256 for every local TCP login; no trust, no md5.
echo "==> Writing pg_hba.conf"
cat > "${PGDATA}/pg_hba.conf" <<'HBA'
local   all             postgres                                peer
local   all             all                                     scram-sha-256
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
HBA

systemctl restart postgresql

# ---------------------------------------------------------------------------
# 5. PgBouncer — the only thing exposed to the internet. Transaction pooling
#    keeps a handful of real backends behind hundreds of serverless clients.
# ---------------------------------------------------------------------------
echo "==> Configuring PgBouncer"
{
  echo "[databases]"
  echo "${APP_DB} = host=127.0.0.1 port=5432 dbname=${APP_DB}"
  for svc in "${SERVICES[@]}"; do
    echo "${svc}_db = host=127.0.0.1 port=5432 dbname=${svc}_db"
  done
  echo
  echo "[pgbouncer]"
  if [[ "$EXPOSE_DB" == "1" ]]; then
    echo "listen_addr = 0.0.0.0"
  else
    echo "listen_addr = 127.0.0.1"
  fi
  cat <<'CONF'
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 5
server_tls_sslmode = prefer
CONF
  # TLS only matters when the socket leaves the box; on loopback it is pure
  # overhead and would force DATABASE_SSL on the app for no gain.
  if [[ "$EXPOSE_DB" == "1" ]]; then
    echo "client_tls_sslmode = require"
    echo "client_tls_cert_file = /var/lib/postgresql/${PG_VERSION}/main/server.crt"
    echo "client_tls_key_file = /var/lib/postgresql/${PG_VERSION}/main/server.key"
  fi
  echo "admin_users = postgres"
  echo "logfile = /var/log/pgbouncer/pgbouncer.log"
  echo "pidfile = /var/run/pgbouncer/pgbouncer.pid"
} > /etc/pgbouncer/pgbouncer.ini

# userlist must carry the SCRAM verifiers, not the plaintext passwords.
sudo -u postgres psql -tAc \
  "SELECT '\"'||rolname||'\" \"'||rolpassword||'\"' FROM pg_authid WHERE rolpassword IS NOT NULL AND rolcanlogin" \
  > /etc/pgbouncer/userlist.txt
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 600 /etc/pgbouncer/userlist.txt
# PgBouncer needs read access to the cert it serves.
usermod -aG postgres pgbouncer 2>/dev/null || true
chmod 640 "/var/lib/postgresql/${PG_VERSION}/main/server.key"

systemctl enable --now pgbouncer
systemctl restart pgbouncer

# ---------------------------------------------------------------------------
# 6. Host firewall. The OCI Security List must ALSO allow 6432 — that is a
#    separate control in the Oracle console and this script cannot set it.
# ---------------------------------------------------------------------------
echo "==> Firewall: allowing 22, 80, 443"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
# Ubuntu images on OCI ship a REJECT-all iptables rule that outranks ufw, so
# each port needs an explicit ACCEPT there too.
for port in 80 443; do
  iptables -C INPUT -p tcp --dport $port -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport $port -j ACCEPT
done
if [[ "$EXPOSE_DB" == "1" ]]; then
  echo "    also exposing ${PGB_PORT} (EXPOSE_DB=1)"
  ufw allow ${PGB_PORT}/tcp >/dev/null
  iptables -C INPUT -p tcp --dport ${PGB_PORT} -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport ${PGB_PORT} -j ACCEPT
fi
ufw --force enable >/dev/null
netfilter-persistent save >/dev/null 2>&1 || true

IP=$(curl -s --max-time 5 ifconfig.me || echo "<VM_PUBLIC_IP>")
cat <<DONE

===========================================================================
Done. Databases created:

  ${APP_DB}  (owner ${APP_ROLE})   <- this repo's DATABASE_URL
$(for svc in "${SERVICES[@]}"; do printf '  %s_db  (owner %s_svc)\n' "$svc" "$svc"; done)

Passwords: ${SECRETS_FILE}  (root-only)

Storefront connection string (for /srv/oltre/shared/.env):
  DATABASE_URL=postgresql://${APP_ROLE}:${PW[$APP_ROLE]}@127.0.0.1:${PGB_PORT}/${APP_DB}
  DATABASE_SSL=disable        # loopback — nothing to encrypt against
  DATABASE_POOL_MAX=10        # one long-lived process, not N lambdas

$(if [[ "$EXPOSE_DB" == "1" ]]; then
  printf '  PgBouncer is listening on 0.0.0.0:%s — restrict the source range in\n  the OCI Security List, 0.0.0.0/0 opens it to the whole internet.\n' "$PGB_PORT"
else
  printf '  PgBouncer is bound to loopback only. Nothing external can reach the DB.\n'
fi)
Still to do BY HAND in the Oracle console:
  VCN > Security Lists > add ingress rules for TCP 80 and 443.

Next: ./deploy-app.sh --bootstrap
===========================================================================
DONE
