-- Artisan Appreciation QR — additive migration
--
-- Safe to run on the live database: it only ADDS one enum, one nullable
-- column and one new table. Nothing existing is altered, dropped or rewritten,
-- and existing rows are untouched.
--
-- Run once (see docs/ARTISAN_APPRECIATION.md):
--   psql "$DATABASE_URL" -f prisma/sql/20260919_artisan_feedback_qr.sql
-- It runs in a single transaction: if any statement fails, nothing is applied.
--
-- Column/constraint names follow Prisma's conventions so `prisma db push` /
-- `prisma migrate diff` see this database as matching prisma/schema.prisma.

BEGIN;

-- CreateEnum
CREATE TYPE "FeedbackQRStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXPIRED');

-- AlterTable: WhatsApp number on artisans (nullable, so no backfill needed)
ALTER TABLE "artisans" ADD COLUMN "whatsappNumber" TEXT;

-- CreateTable
CREATE TABLE "artisan_feedback_qrs" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "productId" TEXT NOT NULL,
    "artisanId" TEXT NOT NULL,
    "status" "FeedbackQRStatus" NOT NULL DEFAULT 'ACTIVE',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "firstScannedAt" TIMESTAMP(3),
    "lastScannedAt" TIMESTAMP(3),
    "whatsappOpenCount" INTEGER NOT NULL DEFAULT 0,
    "lastWhatsappOpenAt" TIMESTAMP(3),
    "regeneratedFromId" TEXT,
    "createdById" TEXT,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artisan_feedback_qrs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artisan_feedback_qrs_token_key" ON "artisan_feedback_qrs"("token");
CREATE INDEX "artisan_feedback_qrs_orderId_idx" ON "artisan_feedback_qrs"("orderId");
CREATE INDEX "artisan_feedback_qrs_orderItemId_status_idx" ON "artisan_feedback_qrs"("orderItemId", "status");
CREATE INDEX "artisan_feedback_qrs_productId_idx" ON "artisan_feedback_qrs"("productId");
CREATE INDEX "artisan_feedback_qrs_artisanId_idx" ON "artisan_feedback_qrs"("artisanId");
CREATE INDEX "artisan_feedback_qrs_status_idx" ON "artisan_feedback_qrs"("status");
CREATE INDEX "artisan_feedback_qrs_createdAt_idx" ON "artisan_feedback_qrs"("createdAt");

-- AddForeignKey
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "artisans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_regeneratedFromId_fkey" FOREIGN KEY ("regeneratedFromId") REFERENCES "artisan_feedback_qrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artisan_feedback_qrs" ADD CONSTRAINT "artisan_feedback_qrs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
