"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import { logAccess } from "@/lib/access-log";

const BASE = "/dashboard/health-case-reports";

export type EditCaseState = {
    error?: string;
    values?: Record<string, string>;
};

export async function updateCaseReport(
    _prev: EditCaseState,
    formData: FormData
): Promise<EditCaseState> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }

    const fail = (error: string): EditCaseState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("You are not allowed to edit case reports.");

    const caseId = Number(get("caseId"));
    if (!caseId) return fail("Missing case report.");

    const complaint = get("complaint");
    const reportDate = get("reportDate");
    // Oras ng report (HH:MM). Opsyonal.
    const reportTime = get("reportTime");
    const staffName = get("staffName");
    const status = get("status") || "pending";
    const notes = get("notes");
    const actionTaken = get("actionTaken").trim();

    // Blangkong Complaint o Date: hindi papalitan (mananatili ang dati)
    if (reportDate && !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return fail("Enter a valid date.");
    if (reportTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reportTime)) return fail("Enter a valid time.");
    if (!["pending", "referred", "resolved"].includes(status)) return fail("Select a valid status.");

    try {
        // The patient (student_id / employee_id) is NEVER changed here: a case
        // report cannot be moved to another person or from student to employee.
        // Whatever patientType / patientNumber the form sends is ignored.
        const owner = await prisma.$queryRaw<{ patient_number: string | null }[]>`
            SELECT COALESCE(s.student_number, e.employee_number) AS patient_number
            FROM health_case_reports c
            LEFT JOIN students  s ON s.student_id  = c.student_id
            LEFT JOIN employees e ON e.employee_id = c.employee_id
            WHERE c.case_id = ${caseId} AND c.archived_at IS NULL
            LIMIT 1
        `;
        if (owner.length === 0) return fail("This case report no longer exists or has been archived.");
        const patientNumber = owner[0].patient_number ?? "";

        const done = await prisma.$executeRaw`
            UPDATE health_case_reports
            SET complaint   = COALESCE(NULLIF(${complaint}, ''), complaint),
                report_date = COALESCE(CAST(NULLIF(${reportDate}, '') AS DATE), report_date),
                report_time = CAST(NULLIF(${reportTime}, '') AS TIME),
                staff_name  = ${staffName || null},
                status      = ${status},
                notes       = ${notes || null},
                action_taken = ${actionTaken || null}
            WHERE case_id = ${caseId} AND archived_at IS NULL
        `;

        if (done === 0) return fail("This case report no longer exists or has been archived.");

        await logAccess(
            {
                userId: Number(session.userId ?? 0),
                role: session.role,
                name: String(session.username ?? ""),
            },
            "health_case_report",
            caseId,
            "update",
            `${patientNumber} - ${complaint}`
        );
    } catch (err) {
        console.error("Update case report error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    revalidatePath(BASE);
    revalidatePath("/dashboard/illness-alerts");
    revalidatePath("/dashboard/student-health-records");
    // Bumalik kung saan nanggaling (hal. Case Reports tab ng file ng pasyente)
    const returnTo = get("returnTo");
    redirect(returnTo.startsWith("/dashboard/") ? returnTo : BASE);
}