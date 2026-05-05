-- AlterTable
ALTER TABLE "payments"
ADD COLUMN "fraud_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;

-- Optional index to support admin review queries for suspicious payments
CREATE INDEX "payments_flagged_idx" ON "payments"("flagged");
