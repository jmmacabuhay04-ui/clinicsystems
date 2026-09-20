-- CreateTable
CREATE TABLE "clinic_staff" (
    "staff_id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "contact" VARCHAR(30),
    "license_no" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "recorded_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_staff_pkey" PRIMARY KEY ("staff_id")
);
