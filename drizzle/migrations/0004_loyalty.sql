-- Migration: loyalty points (balance on users + transaction ledger)
-- Run with: pnpm db:push (or paste into Neon SQL Editor)

DO $$ BEGIN
  CREATE TYPE "loyalty_type" AS ENUM ('earn', 'redeem');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "type" "loyalty_type" NOT NULL,
  "points" integer NOT NULL,
  "order_id" integer,
  "note" varchar(200),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "loyalty_transactions_user_idx" ON "loyalty_transactions" ("user_id");
