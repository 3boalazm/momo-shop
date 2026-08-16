-- Migration: store governorate separately on orders (for geography analytics)
-- Run with: pnpm db:push (or paste into Neon SQL Editor)

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_governorate" varchar(100);
