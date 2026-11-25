-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "two_factor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "login_logs" (
    "log_id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "device" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "login_logs_username_idx" ON "login_logs"("username");
