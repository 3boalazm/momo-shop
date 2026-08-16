#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Creates one database + role per backend service inside a SINGLE Aiven
# PostgreSQL service. Aiven bills per service, not per database, so this
# mirrors the same per-service isolation as infra/oracle-vm/setup-postgres.sh
# (one owner role per db, PUBLIC connect revoked) without paying for seven
# separate services.
#
# Run from your laptop (needs the `psql` client — same major version as the
# Aiven service or newer):
#
#   ADMIN_URL='postgres://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=require' \
#   ./setup-databases.sh
#
# Get ADMIN_URL from the Aiven console: Services > your service > Overview >
# "Service URI". Idempotent — re-running reuses existing passwords instead of
# rotating them.
# ---------------------------------------------------------------------------
set -euo pipefail

: "${ADMIN_URL:?set ADMIN_URL to the Aiven service admin (avnadmin) connection string}"

SECRETS_FILE="./aiven-service-passwords.txt"

# One database per service. Role name == database name + _svc.
SERVICES=(iam products inventory crm sales accounting)

# The storefront's own database (what DATABASE_URL in this repo points at).
APP_DB=oltre_shop
APP_ROLE=oltre_app

command -v psql >/dev/null || { echo "psql not found — install postgresql-client." >&2; exit 1; }

echo "==> Checking connection"
psql "$ADMIN_URL" -tAc "select version()" >/dev/null || {
  echo "Could not connect with ADMIN_URL. Check host/port/password and that" >&2
  echo "sslmode=require (or higher) is in the string — Aiven refuses plaintext." >&2
  exit 1
}

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
declare -A PW
while IFS='=' read -r k v; do [[ -n "$k" ]] && PW["$k"]="$v"; done < "$SECRETS_FILE"

# Swaps the dbname segment of ADMIN_URL, keeping host/port/user/pass/query.
url_for_db() {
  sed -E "s#(/)[A-Za-z0-9_]+(\?|$)#\1$1\2#" <<<"$ADMIN_URL"
}

# ---------------------------------------------------------------------------
# 2. Roles + databases.
# ---------------------------------------------------------------------------
create_db() {
  local role="$1" db="$2" pw="$3"

  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 --quiet <<SQL
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
  if ! psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db} OWNER ${role}"
  fi

  # Strip the implicit public-schema grant every other role gets by default —
  # connect to the new db itself for this (can't do it from defaultdb).
  psql "$(url_for_db "$db")" -v ON_ERROR_STOP=1 --quiet <<SQL
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

HOST_PORT=$(sed -E 's#^[a-z]+://[^@]+@##; s#/.*$##' <<<"$ADMIN_URL")
cat <<DONE

===========================================================================
Done. Databases created on this Aiven service:

  ${APP_DB}  (owner ${APP_ROLE})   <- this repo's DATABASE_URL
$(for svc in "${SERVICES[@]}"; do printf '  %s_db  (owner %s_svc)\n' "$svc" "$svc"; done)

Passwords: ${SECRETS_FILE}  (move somewhere safe, then delete this copy)

Storefront connection string:
  postgresql://${APP_ROLE}:${PW[$APP_ROLE]}@${HOST_PORT}/${APP_DB}?sslmode=require

Note: all databases on this service share ONE storage quota (1 GB on the
Free plan). Fine for now — revisit if any service's data grows.

Next: run migrate-from-neon.sh with TARGET_URL set to the line above.
===========================================================================
DONE
