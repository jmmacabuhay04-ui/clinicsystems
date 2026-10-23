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

    const patientType = get("patientType") === "employee" ? "employee" : "student";
    const patientNumber = get("patientNumber");
    const complaint = get("complaint");
    const reportDate = get("reportDate");
    const staffName = get("staffName");
    const status = get("status") || "pending";
    const notes = get("notes");
    const actionTaken = get("actionTaken").trim();

    const label = patientType === "student" ? "Student number" : "Employee number";

    if (!patientNumber || !complaint || !reportDate) {
        return fail(`${label}, complaint, and date are required.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return fail("Enter a valid date.");
    if (!["pending", "referred", "resolved"].includes(status)) return fail("Select a valid status.");

    try {
        // The patient may have been switched between student and employee,
        // so both columns are rewritten: one gets the id, the other NULL.
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

        const done = await prisma.$executeRaw`
            UPDATE health_case_reports
            SET student_id  = ${studentId},
                employee_id = ${employeeId},
                complaint   = ${complaint},
                report_date = CAST(${reportDate} AS DATE),
                staff_name  = ${staffName || null},
                status      = ${status},
                notes       = ${notes || null},
                action_taken = ${actionTaken || null}
            WHERE case_id = ${caseId} AND archived_at IS NULL
        `;

        if (done === 0) return fail("This case report no longer exists or has been archived.");

        await logAccess(
            {
                userId: Number((session as any).userId ?? 0),
                role: session.role,
                name: String((session as any).fullName ?? (session as any).username ?? ""),
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
    redirect(BASE);
}