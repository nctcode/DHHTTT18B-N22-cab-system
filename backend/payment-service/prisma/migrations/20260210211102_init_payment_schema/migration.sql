-- Create Enum Types
CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
    'CASH',
    'MOMO',
    'VNPAY',
    'WALLET',
    'CARD'
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "payments_ride_id_idx" ON "payments"("ride_id");
CREATE INDEX "payments_passenger_id_idx" ON "payments"("passenger_id");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- Saga Status
CREATE TYPE "SagaStatus" AS ENUM (
    'STARTED',
    'CHARGE_SUCCESS',
    'CHARGE_FAILED',
    'WALLET_CREDITED',
    'COMPENSATED',
    'RETRY_EXHAUSTED'
);

ALTER TABLE "payments"
ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "max_retry" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "saga_status" "SagaStatus",
ADD COLUMN "idempotency_key" TEXT UNIQUE,
ADD COLUMN "psp_reference" TEXT,
ADD COLUMN "last_error" TEXT;
