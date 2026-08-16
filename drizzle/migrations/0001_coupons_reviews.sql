-- Migration: add coupons + reviews tables
-- Run with: pnpm db:push  (or apply this SQL in Neon SQL Editor)

DO $$ BEGIN
  CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "review_status" AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "discount_type" "discount_type" NOT NULL,
  "value" numeric(10,2) NOT NULL,
  "min_subtotal" numeric(10,2),
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "product_id" integer NOT NULL,
  "author_name" varchar(100) NOT NULL,
  "rating" integer NOT NULL,
  "title" varchar(200),
  "body" text,
  "status" "review_status" DEFAULT 'Pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "reviews_product_idx" ON "reviews" ("product_id");
CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" ("status");

-- Add coupon columns to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount" numeric(10,2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(50);
