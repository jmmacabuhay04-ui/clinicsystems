"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { logAccess } from "@/lib/access-log";

const BASE = "/dashboard/password-requests";

type PendingRow = { student_id: number | null; employee_id: number | null };

// Nurse sets the new password directly from the request row
export async function setPasswordFromRequest(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const requestId = Number(formData.get("requestId"));
    const password = String(formData.get("password") ?? "");
    if (!requestId) return;

    // Same policy as every other place a password is set.
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
        redirect(`${BASE}?error=short&msg=${encodeURIComponent(passwordError)}`);
    }

    const rows = await prisma.$queryRaw<PendingRow[]>`
        SELECT student_id, employee_id FROM portal_password_requests
        WHERE request_id = ${requestId} AND status = 'pending'
    `;
    const req = rows[0];
    if (!req) redirect(`${BASE}?error=missing`);

    const hash = await bcrypt.hash(password, 12);

    // must_change_password = TRUE because the nurse chose this password and
    // therefore knows it. The owner replaces it at their next login.
    const updateAccount = req.student_id
        ? prisma.$executeRaw`
            UPDATE students
            SET password = ${hash}, must_change_password = TRUE
            WHERE student_id = ${req.student_id}
          `
        : prisma.$executeRaw`
            UPDATE employees
            SET password = ${hash}, must_change_password = TRUE
            WHERE employee_id = ${req.employee_id}
          `;

    await prisma.$transaction([
        updateAccount,
        prisma.$executeRaw`
            UPDATE portal_password_requests
            SET status = 'done', handled_by = ${session.username}, handled_at = NOW()
            WHERE request_id = ${requestId}
        `,
    ]);

    // Audit trail, the same as a walk-in reset.
    await logAccess(
        {
            userId: Number(session.userId),
            role: session.role,
            name: String(session.username ?? ""),
        },
        req.student_id ? "student_health_record" : "employee_health_record",
        req.student_id ?? req.employee_id,
        "update",
        "Password set from a portal password request.",
    );

    revalidatePath(BASE);
    redirect(`${BASE}?done=1`);
}

export async function dismissRequest(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const requestId = Number(formData.get("requestId"));
    if (!requestId) return;

    await prisma.$executeRaw`
        UPDATE portal_password_requests
        SET status = 'dismissed', handled_by = ${session.username}, handled_at = NOW()
        WHERE request_id = ${requestId} AND status = 'pending'
    `;
    revalidatePath(BASE);
}