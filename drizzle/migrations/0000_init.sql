-- Momo Collective — initial Postgres schema (Neon)
-- Run with: pnpm drizzle-kit migrate  (or paste into Neon SQL editor)

DO $$ BEGIN
  CREATE TYPE "role" AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "category" AS ENUM ('tees', 'denim', 'hoodies');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "size" AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "order_status" AS ENUM ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_method" AS ENUM ('COD', 'Online');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('Unpaid', 'Paid', 'Refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "open_id" varchar(64) NOT NULL UNIQUE,
  "name" text,
  "email" varchar(320),
  "login_method" varchar(64),
  "role" "role" DEFAULT 'user' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_signed_in" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "category" "category" NOT NULL,
  "base_price" numeric(10,2) NOT NULL,
  "compare_at_price" numeric(10,2),
  "images" json NOT NULL,
  "size_guide" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL,
  "color" varchar(100) NOT NULL,
  "size" "size" NOT NULL,
  "stock" integer DEFAULT 0 NOT NULL,
  "sku" varchar(100) NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY,
  "user_id" integer,
  "order_number" varchar(50) NOT NULL UNIQUE,
  "status" "order_status" DEFAULT 'Pending' NOT NULL,
  "subtotal" numeric(10,2) NOT NULL,
  "shipping_cost" numeric(10,2) DEFAULT '0' NOT NULL,
  "total" numeric(10,2) NOT NULL,
  "payment_method" "payment_method" DEFAULT 'COD' NOT NULL,
  "payment_status" "payment_status" DEFAULT 'Unpaid' NOT NULL,
  "shipping_first_name" varchar(100) NOT NULL,
  "shipping_last_name" varchar(100) NOT NULL,
  "shipping_email" varchar(320) NOT NULL,
  "shipping_phone" varchar(20) NOT NULL,
  "shipping_address" text NOT NULL,
  "shipping_city" varchar(100) NOT NULL,
  "shipping_postal_code" varchar(20),
  "shipping_country" varchar(100) DEFAULT 'Egypt' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY,
  "order_id" integer NOT NULL,
  "variant_id" integer,
  "product_name" varchar(255) NOT NULL,
  "product_slug" varchar(255),
  "color" varchar(100) NOT NULL,
  "size" varchar(10) NOT NULL,
  "quantity" integer NOT NULL,
  "price_per_unit" numeric(10,2) NOT NULL,
  "subtotal" numeric(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "orders_created_idx" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");
