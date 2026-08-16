# Postgres on Aiven

This repo (Express + Drizzle ORM, **not** NestJS/Prisma) gets its database
from a single Aiven PostgreSQL service instead of self-hosting Postgres on the
Oracle VM. The API itself still runs on the Oracle VM
([../oracle-vm/README.md](../oracle-vm/README.md)) — only the database moved.

## 1. Create the service

In the Aiven console: **Create service → PostgreSQL**.

- **Free tier**: $0, but **powers itself off when idle**. Fine for setup and
  testing; do not point production traffic at it — the first request after
  any quiet period will fail or hang while it wakes back up.
- **Developer tier** (~$5/mo): stays up continuously. This is the minimum tier
  for a storefront customers actually use.
- Region: pick whatever is geographically closest to your customers — Europe
  is a reasonable default if targeting Egypt/MENA and Middle East isn't listed.

Neither Free nor Developer includes Aiven's connection pooler ("No
integrations or connection pooling" on the plan card) — the app pools its own
connections via `DATABASE_POOL_MAX` in `server-lib/db.ts`, so this only
matters if you also connect other tools directly and need to watch the total
against the plan's `max_connections`.

## 2. Get the connection info

Once the service is `Running`: **Overview → Connection information**. You need:

- **Service URI** — the admin (`avnadmin`) connection string
- **CA Certificate** — download it if you intend to use `DATABASE_SSL=verify-full`

## 3. Create per-service databases

Aiven bills per service, not per database, so — same as the Oracle VM script —
one Postgres service holds one database per backend service, each with its
own role:

```bash
ADMIN_URL='postgres://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=require' \
./setup-databases.sh
```

Creates `oltre_shop` (this repo) plus `iam_db`, `products_db`, `inventory_db`,
`crm_db`, `sales_db`, `accounting_db` — each owned by its own role with
`CONNECT` revoked from `PUBLIC`. Passwords land in
`./aiven-service-passwords.txt`; move them somewhere safe and delete the file.

## 4. Move the data off Neon

Same script as the Oracle path — it just takes a different `TARGET_URL`:

```bash
NEON_URL='postgresql://...neon.tech/neondb?sslmode=require' \
TARGET_URL='postgresql://oltre_app:<password>@<host>:<port>/oltre_shop?sslmode=require' \
../oracle-vm/migrate-from-neon.sh
```

It refuses to restore over a non-empty database, verifies row counts after,
and keeps the dump file. This also recreates the schema — no separate
`db:push`/`db:migrate` step needed for this first load.

## 5. Point the app at it

On the Oracle VM, in `/srv/oltre/shared/.env`:

```bash
DATABASE_URL=postgresql://oltre_app:<password>@<host>:<port>/oltre_shop
DATABASE_SSL=require       # Aiven rejects plaintext connections outright
DATABASE_POOL_MAX=10       # keep comfortably under the plan's max_connections
```

`DATABASE_SSL=require` encrypts the connection but doesn't verify Aiven's
certificate chain — fine for most cases. For stricter verification, use
`DATABASE_SSL=verify-full` with `DATABASE_CA` set to the contents of the CA
certificate downloaded in step 2.

```bash
sudo systemctl restart oltre-api
curl -s localhost:3000/api/health | jq
```

## What this changes from the Oracle-VM-only plan

`infra/oracle-vm/setup-postgres.sh` (self-hosted Postgres + PgBouncer) is no
longer needed for this database — skip it. Everything else in
`infra/oracle-vm/` (the VM, nginx, systemd, `deploy-app.sh`) is unchanged: the
API still runs there, it just reaches out to Aiven over the network instead of
to Postgres on localhost.
