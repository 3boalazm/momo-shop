# Self-hosting on an Oracle Cloud VM

Moves the storefront's API off Vercel onto a single Oracle Cloud VM. The
`api/**` handlers are unchanged — they run under Express instead of Vercel's
runtime ([../../server-vm/index.ts](../../server-vm/index.ts)).

> **Database**: this VM used to also run Postgres itself (`setup-postgres.sh`,
> still here and working). If you're instead using **Aiven** for the database,
> skip straight to [../aiven/README.md](../aiven/README.md) after step 2 below
> — the VM only needs to host the app, not Postgres.

## Why self-host the app

On Vercel, each serverless instance opened its own TCP connection to a
database. Neon's HTTP driver hid that; a plain Postgres host would not. A
long-lived process on a VM sidesteps it: one process, a normal connection
pool, no per-instance connection multiplication.

The trade you accept: one box, one point of failure for the app tier.
Snapshots and a documented rebuild path matter more here than they did on
Vercel.

## The VM

Always Free tier gives you **4 OCPU / 24 GB RAM on Ampere A1** — far more than
the workload needs. Create it as:

- **Shape**: VM.Standard.A1.Flex, 4 OCPU, 24 GB
- **Image**: Canonical Ubuntu 24.04
- **Boot volume**: 100 GB (still inside the free 200 GB)
- **Networking**: assign a public IPv4, and save the SSH private key — Oracle
  shows it once and there is no recovery.

If the console says "Out of host capacity" for A1, that region is full. Retry
later or pick another region. You cannot move instances between regions after
the fact, and your account's home region is fixed at signup.

## Order of operations

```bash
# 0. From your laptop
ssh -i ~/.ssh/oracle_key ubuntu@<VM_IP>

# 1. Database — SKIP this if using Aiven instead (see the note above)
sudo ./setup-postgres.sh

# 2. App: runtime, service account, nginx, systemd
sudo ./deploy-app.sh --bootstrap

# 3. Fill in secrets — DATABASE_URL (from /root/.pg-service-passwords if you
#    ran step 1, or from ../aiven/setup-databases.sh's output if not),
#    plus JWT_SECRET, ADMIN_TOKEN, Paymob and Gmail values.
sudo nano /srv/oltre/shared/.env
sudo systemctl restart oltre-api
```

Then, in the **Oracle console** (the scripts cannot do this — it is a
cloud-side control, separate from the VM's own firewall):

> VCN → Security Lists → Default Security List → Add Ingress Rules
> Source `0.0.0.0/0`, TCP, destination ports **80** and **443**.

Finally, point your domain's A record at the VM's IP and get a certificate:

```bash
sudo sed -i "s/DOMAIN_PLACEHOLDER/yourdomain.com/g" /etc/nginx/sites-available/oltre
sudo ln -sf /etc/nginx/sites-available/oltre /etc/nginx/sites-enabled/oltre
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Moving the data off Neon

Run from your laptop, not the VM — it needs to reach both ends. Set
`EXPOSE_DB=1` when running `setup-postgres.sh` if you want to restore remotely;
otherwise copy the dump to the VM and restore over loopback.

```bash
NEON_URL='postgresql://...neon.tech/neondb?sslmode=require' \
TARGET_URL='postgresql://oltre_app:pw@127.0.0.1:6432/oltre_shop' \
./migrate-from-neon.sh
```

It refuses to restore over a non-empty target, verifies row counts afterwards,
and keeps the dump file. **Leave the Neon project alive** until real orders have
landed in the new database.

## Deploying afterwards

```bash
sudo /srv/oltre/current/infra/oracle-vm/deploy-app.sh
```

Each deploy builds into a fresh `releases/<timestamp>`, smoke-tests
`/api/health` on a throwaway port, runs migrations, and only then moves the
`current` symlink. A failed build or a failing health check leaves the running
site untouched.

Rollback keeps the last 5 releases:

```bash
sudo ln -sfn /srv/oltre/releases/<older> /srv/oltre/current
sudo systemctl restart oltre-api
```

## Databases

`setup-postgres.sh` creates one database per service, each owned by a distinct
role with `CONNECT` revoked from `PUBLIC`, so one leaked credential does not
expose the others:

| Database | Owner | For |
|---|---|---|
| `oltre_shop` | `oltre_app` | this repo |
| `iam_db` | `iam_svc` | identity / auth service |
| `products_db` | `products_svc` | catalogue |
| `inventory_db` | `inventory_svc` | stock |
| `crm_db` | `crm_svc` | customers |
| `sales_db` | `sales_svc` | orders / sales |
| `accounting_db` | `accounting_svc` | ledger |

Passwords are generated once into `/root/.pg-service-passwords` and reused on
re-runs. Cross-database joins are not possible in Postgres — services talk over
their APIs, or you add `postgres_fdw` deliberately.

## Operating

```bash
systemctl status oltre-api
journalctl -u oltre-api -f
curl -s localhost:3000/api/health | jq
sudo -u postgres psql -c "\l"
```

**Back up.** Nothing does this for you:

```bash
# Nightly dump, keep 14 days
echo '0 3 * * * postgres pg_dump oltre_shop | gzip > /var/backups/oltre-$(date +\%F).sql.gz && find /var/backups -name "oltre-*.sql.gz" -mtime +14 -delete' \
  | sudo tee /etc/cron.d/oltre-backup
```

Also enable **boot volume backups** in the Oracle console — a nightly dump on
the same disk does not survive losing the disk.

## Not done here

- The dump cron above is written to a file but never tested against a restore.
  Verify it restores into a scratch database before trusting it.
- No monitoring/alerting. If the box goes down you find out from customers.
- `server/` and `_legacy/` still contain the unused tRPC + MySQL scaffold from
  the original template. Not touched — dead weight, but harmless.
