"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";

const BASE = "/dashboard/health-case-reports";

export type CaseState = {
    error?: string;
    values?: Record<string, string>;
};

type Tx = {
    $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => PromiseLike<T>;
    $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => PromiseLike<number>;
};

async function nextCaseNumber(tx: Tx, year: number) {
    const prefix = `${year}-`;
    // Isa-isa ang pagkuha ng numero (walang dobleng case number kahit sabay mag-save ang dalawang nurse)
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(424242)::text`;
    const rows = await tx.$queryRaw<{ case_number: string }[]>`
    SELECT case_number FROM health_case_reports
    WHERE case_number LIKE ${prefix + "%"}
    -- Numero ang ayos (para tama pa rin pagdating sa 2026-1000)
    ORDER BY LENGTH(case_number) DESC, case_number DESC
    LIMIT 1
  `;

    const last = rows[0]?.case_number;
    const n = last ? Number(last.slice(prefix.length)) + 1 : 1;
    return prefix + String(n).padStart(3, "0");
}

export async function createCaseReport(
    _prev: CaseState,
    formData: FormData
): Promise<CaseState> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }

    const fail = (error: string): CaseState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("Only nurses can create case reports.");

    const patientType = get("patientType") === "employee" ? "employee" : "student";
    const patientNumber = get("patientNumber");
    // Optional ang complaint: kapag blangko, "Vital Signs" ang itatala (vital signs check lang)
    const complaint = get("complaint") || "Vital Signs";
    const reportDate = get("reportDate");
    // Oras ng report (HH:MM). Opsyonal.
    const reportTime = get("reportTime");
    const staffName = get("staffName");
    const status = get("status") || "pending";
    const notes = get("notes");
    const actionTaken = get("actionTaken").trim();

    const label = patientType === "student" ? "Student number" : "Employee number";

    if (!patientNumber || !reportDate) {
        return fail(`${label} and date are required.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return fail("Enter a valid date.");
    if (reportTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reportTime)) return fail("Enter a valid time.");
    if (!["pending", "referred", "resolved"].includes(status)) return fail("Select a valid status.");


    try {
        // Look the patient up in the table that matches the chosen type.
        let studentId: number | null = null;
        let employeeId: number | null = null;

        if (patientType === "student") {
            const rows = await prisma.$queryRaw<{ student_id: number }[]>`
        SELECT student_id FROM students
        WHERE student_number = ${patientNumber} AND archived_at IS NULL
        LIMIT 1
      `;
            studentId = rows[0]?.student_id ?? null;
            if (!studentId) return fail(`No active student found with number ${patientNumber}.`);
        } else {
            const rows = await prisma.$queryRaw<{ employee_id: number }[]>`
        SELECT employee_id FROM employees
        WHERE employee_number = ${patientNumber} AND archived_at IS NULL
        LIMIT 1
      `;
            employeeId = rows[0]?.employee_id ?? null;
            if (!employeeId) return fail(`No active employee found with number ${patientNumber}.`);
        }

        // Kunin ang numero at i-save sa iisang transaction (kasama ang lock)
        await prisma.$transaction(async (tx) => {
            const num = await nextCaseNumber(tx, Number(reportDate.slice(0, 4)));

            // Exactly one of student_id / employee_id is set; the other stays NULL.
            await tx.$executeRaw`
      INSERT INTO health_case_reports
        (case_number, student_id, employee_id, complaint, report_date, report_time,
         staff_name, status, notes, action_taken, recorded_by)
      VALUES
        (${num}, ${studentId}, ${employeeId}, ${complaint},
         CAST(${reportDate} AS DATE), CAST(NULLIF(${reportTime}, '') AS TIME),
         ${staffName || null}, ${status},
         ${notes || null}, ${actionTaken || null}, ${session.userId})
    `;
        });
    } catch (err) {
        console.error("Create case report error:", err);
        return fail("Could not save the case report. Please try again.");
    }

    revalidatePath(BASE);
    revalidatePath("/dashboard/illness-alerts");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/student-health-records");
    revalidatePath("/dashboard/employee-health-records");
    // Pagka-save: diretso sa Health Case Reports (nasa itaas ang bagong case)
    redirect(BASE);
}