-- CreateTable
CREATE TABLE "visitor_logs" (
    "visitor_id" SERIAL NOT NULL,
    "visitor_name" VARCHAR(100) NOT NULL,
    "purpose" VARCHAR(150) NOT NULL,
    "relation" VARCHAR(50),
    "visit_date" DATE NOT NULL,
    "time_in" VARCHAR(5) NOT NULL,
    "time_out" VARCHAR(5),
    "recorded_by" INTEGER,
    "archived_at" TIMESTAMP(3),
    "archived_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("visitor_id")
);

-- CreateIndex
CREATE INDEX "visitor_logs_visit_date_idx" ON "visitor_logs"("visit_date");
