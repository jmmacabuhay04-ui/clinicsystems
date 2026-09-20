-- AlterTable
ALTER TABLE "health_records" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" INTEGER;
