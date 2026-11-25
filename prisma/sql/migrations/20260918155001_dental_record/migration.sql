-- CreateTable
CREATE TABLE "dental_records" (
    "dental_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "visit_date" DATE NOT NULL,
    "procedure_name" VARCHAR(150) NOT NULL,
    "tooth" VARCHAR(50),
    "dentist_name" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "recorded_by" INTEGER,
    "archived_at" TIMESTAMP(3),
    "archived_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dental_records_pkey" PRIMARY KEY ("dental_id")
);

-- CreateIndex
CREATE INDEX "dental_records_student_id_idx" ON "dental_records"("student_id");
