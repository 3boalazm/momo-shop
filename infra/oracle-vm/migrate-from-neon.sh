#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Copies the storefront database out of Neon and into the Oracle VM Postgres.
#
# Run this from your laptop (needs postgresql-client 16+ installed), NOT on the
# VM — it needs to reach both ends.
#
#   NEON_URL='postgresql://...neon.tech/neondb?sslmode=require' \
#   TARGET_URL='postgresql://oltre_app:pw@<VM_IP>:6432/oltre_shop' \
#   ./migrate-from-neon.sh
#
# Dumps to a file first rather than piping, so a failed restore can be retried
# without re-reading Neon (and so you keep a rollback copy).
# ---------------------------------------------------------------------------
set -euo pipefail

: "${NEON_URL:?set NEON_URL to the Neon connection string}"
: "${TARGET_URL:?set TARGET_URL to the Oracle VM connection string}"

STAMP=$(date +%Y%m%d-%H%M%S)
DUMP="neon-dump-${STAMP}.sql"

echo "==> [1/4] Dumping Neon -> ${DUMP}"
# --no-owner / --no-acl: Neon's role names do not exist on the new server.
pg_dump "$NEON_URL" \
  --no-owner --no-acl --no-comments \
  --format=plain \
  --file="$DUMP"
echo "    $(wc -l < "$DUMP") lines, $(du -h "$DUMP" | cut -f1)"

echo "==> [2/4] Checking the target is empty"
EXISTING=$(psql "$TARGET_URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [[ "$EXISTING" -ne 0 ]]; then
  echo "    Target already has ${EXISTING} tables in public." >&2
  echo "    Refusing to restore over them. Drop them first, or restore into a" >&2
  echo "    fresh database, then re-run." >&2
  exit 1
fi

echo "==> [3/4] Restoring into target"
# PgBouncer is in transaction pooling mode; restore over a direct 5432 link if
# this errors on session-level commands. ON_ERROR_STOP surfaces real failures
# instead of leaving a half-restored database that looks fine.
psql "$TARGET_URL" -v ON_ERROR_STOP=1 --quiet -f "$DUMP"

echo "==> [4/4] Verifying row counts match"
for tbl in products product_variants orders order_items customers; do
  src=$(psql "$NEON_URL"   -tAc "SELECT count(*) FROM ${tbl}" 2>/dev/null || echo "n/a")
  dst=$(psql "$TARGET_URL" -tAc "SELECT count(*) FROM ${tbl}" 2>/dev/null || echo "n/a")
  if [[ "$src" == "$dst" ]]; then
    printf '    ok   %-18s %s\n' "$tbl" "$src"
  else
    printf '    DIFF %-18s neon=%s target=%s\n' "$tbl" "$src" "$dst"
  fi
done

cat <<DONE

Dump kept at ./${DUMP} — keep it until the new DB has run in production for a
few days, then delete it (it contains customer data).

Next: set DATABASE_URL to TARGET_URL in Vercel, redeploy, and hit /api/health.
Leave the Neon project alive until you have confirmed orders are writing to the
new database.
DONE
