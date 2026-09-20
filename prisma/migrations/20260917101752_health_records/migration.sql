-- AlterTable
ALTER TABLE "students" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "gender" VARCHAR(10);

-- CreateTable
CREATE TABLE "health_records" (
    "record_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "visit_date" DATE NOT NULL,
    "complaint" VARCHAR(255) NOT NULL,
    "action_taken" VARCHAR(255),
    "attending_staff" VARCHAR(100),
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "heart_rate" INTEGER,
    "blood_pressure" VARCHAR(10),
    "temperature" DOUBLE PRECISION,
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("record_id")
);

-- CreateIndex
CREATE INDEX "health_records_student_id_idx" ON "health_records"("student_id");

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
