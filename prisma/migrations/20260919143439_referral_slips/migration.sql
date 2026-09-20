-- CreateTable
CREATE TABLE "referral_slips" (
    "slip_id" SERIAL NOT NULL,
    "slip_type" VARCHAR(20) NOT NULL DEFAULT 'teacher',
    "student_id" INTEGER NOT NULL,
    "section" VARCHAR(50),
    "teacher_name" VARCHAR(100),
    "subject" VARCHAR(100),
    "reason" VARCHAR(500) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "slip_date" DATE NOT NULL,
    "time_issued" VARCHAR(5) NOT NULL,
    "recorded_by" INTEGER,
    "archived_at" TIMESTAMP(3),
    "archived_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_slips_pkey" PRIMARY KEY ("slip_id")
);

-- CreateIndex
CREATE INDEX "referral_slips_student_id_idx" ON "referral_slips"("student_id");
