-- CreateTable
CREATE TABLE "health_case_reports" (
    "case_id" SERIAL NOT NULL,
    "case_number" VARCHAR(20) NOT NULL,
    "student_id" INTEGER NOT NULL,
    "complaint" VARCHAR(255) NOT NULL,
    "report_date" DATE NOT NULL,
    "staff_name" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "recorded_by" INTEGER,
    "archived_at" TIMESTAMP(3),
    "archived_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_case_reports_pkey" PRIMARY KEY ("case_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_case_reports_case_number_key" ON "health_case_reports"("case_number");

-- CreateIndex
CREATE INDEX "health_case_reports_student_id_idx" ON "health_case_reports"("student_id");
