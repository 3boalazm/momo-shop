-- Migration: redesign users table for real password-based auth (+ staff roles)
-- The old `users` table (open_id/login_method) was never wired to any code — safe to
-- redefine cleanly. Run with: pnpm db:push (or paste into Neon SQL Editor).

-- Extend/replace the role enum: customers = 'user'; staff = 'support' | 'manager' | 'super_admin'
DO $$ BEGIN
  ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'support';
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Drop the old unused columns / constraints, add the real auth columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "open_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "login_method";
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text NOT NULL DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(30);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_signed_in" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_signed_in" DROP DEFAULT;
