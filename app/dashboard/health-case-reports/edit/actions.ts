"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";

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
    if (!canManageRecords(session.role)) return fail("Only nurses can edit case reports.");

    const caseId = Number(get("caseId"));
    const complaint = get("complaint");
    const reportDate = get("reportDate");
    const staffName = get("staffName");
    const status = get("status");
    const notes = get("notes");

    if (!caseId) return fail("Invalid case report.");
    if (!complaint || !reportDate) return fail("Complaint and date are required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return fail("Enter a valid date.");
    if (!["pending", "referred", "resolved"].includes(status)) return fail("Select a valid status.");

    try {
        await prisma.$executeRaw`
      UPDATE health_case_reports
      SET complaint   = ${complaint},
          report_date = CAST(${reportDate} AS DATE),
          staff_name  = ${staffName || null},
          status      = ${status},
          notes       = ${notes || null}
      WHERE case_id = ${caseId}
    `;
    } catch (err) {
        console.error("Update case report error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    revalidatePath(BASE);
    redirect(BASE);
}