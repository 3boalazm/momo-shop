-- Migration: add abandoned_carts table
-- Run with: pnpm db:push  (or paste into Neon SQL Editor)

DO $$ BEGIN
  CREATE TYPE "abandoned_cart_status" AS ENUM ('Open', 'Contacted', 'Recovered', 'Dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "abandoned_carts" (
  "id" serial PRIMARY KEY NOT NULL,
  "phone" varchar(30) NOT NULL,
  "name" varchar(100),
  "items" json NOT NULL,
  "subtotal" numeric(10,2) NOT NULL,
  "status" "abandoned_cart_status" DEFAULT 'Open' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "abandoned_carts_status_idx" ON "abandoned_carts" ("status");
