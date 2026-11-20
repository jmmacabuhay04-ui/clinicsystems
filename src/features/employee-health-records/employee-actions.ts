"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import { canDeleteYet, formatDeletableOn, RETENTION_YEARS } from "@/lib/retention";
import { logAccess } from "@/lib/access-log";

const BASE = "/dashboard/employee-health-records";

function actorOf(session: { userId: unknown; role: string; username?: unknown }) {
    return {
        userId: Number(session.userId),
        role: session.role,
        name: String(session.username ?? ""),
    };
}

export async function archiveEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    const rows = await prisma.$queryRaw<{ employee_number: string }[]>`
    UPDATE employees
    SET archived_at = NOW(), archived_by = ${session.username}
    WHERE employee_id = ${employeeId} AND archived_at IS NULL
    RETURNING employee_number
  `;

    await logAccess(actorOf(session), "employee_health_record", employeeId, "update", "Employee archived.");

    revalidatePath(BASE);

    // Babalik sa page na may ?employee=<number>. Dahil archived na, hindi na
    // siya "active", kaya lalabas ang "No active employee found..." na message.
    const number = rows[0]?.employee_number;
    redirect(number ? `${BASE}?employee=${encodeURIComponent(number)}` : BASE);
}

export async function restoreEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    await prisma.$executeRaw`
    UPDATE employees SET archived_at = NULL, archived_by = NULL
    WHERE employee_id = ${employeeId}
  `;

    await logAccess(
        actorOf(session),
        "employee_health_record",
        employeeId,
        "update",
        "Employee restored from archive.",
    );

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    // Retention is enforced here as well as in the page. The page only hides
    // the button; a form post straight to this action would otherwise bypass
    // the policy entirely.
    const rows = await prisma.$queryRaw<{ archived_at: Date | null; employee_number: string }[]>`
    SELECT archived_at, employee_number FROM employees WHERE employee_id = ${employeeId} LIMIT 1
  `;
    const target = rows[0];
    if (!target?.archived_at) return;

    if (!canDeleteYet(target.archived_at)) {
        redirect(
            `/dashboard/archive-records?notice=retention&until=${encodeURIComponent(
                formatDeletableOn(target.archived_at)
            )}`
        );
    }

    await prisma.$executeRaw`
    DELETE FROM employees
    WHERE employee_id = ${employeeId}
      AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    await logAccess(
        actorOf(session),
        "employee_health_record",
        employeeId,
        "delete",
        `Permanently deleted after the ${RETENTION_YEARS}-year retention period (${target.employee_number}).`,
    );

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}