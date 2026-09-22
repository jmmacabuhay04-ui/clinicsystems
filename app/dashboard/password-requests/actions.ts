"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";

const BASE = "/dashboard/password-requests";

type PendingRow = { student_id: number | null; employee_id: number | null };

// Nurse sets the new password directly from the request row
export async function setPasswordFromRequest(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const requestId = Number(formData.get("requestId"));
    const password = String(formData.get("password") ?? "");
    if (!requestId) return;
    if (password.length < 8) redirect(`${BASE}?error=short`);

    const rows = await prisma.$queryRaw<PendingRow[]>`
        SELECT student_id, employee_id FROM portal_password_requests
        WHERE request_id = ${requestId} AND status = 'pending'
    `;
    const req = rows[0];
    if (!req) redirect(`${BASE}?error=missing`);

    const hash = await bcrypt.hash(password, 12);

    const updateAccount = req.student_id
        ? prisma.$executeRaw`UPDATE students SET password = ${hash} WHERE student_id = ${req.student_id}`
        : prisma.$executeRaw`UPDATE employees SET password = ${hash} WHERE employee_id = ${req.employee_id}`;

    await prisma.$transaction([
        updateAccount,
        prisma.$executeRaw`
            UPDATE portal_password_requests
            SET status = 'done', handled_by = ${session.username}, handled_at = NOW()
            WHERE request_id = ${requestId}
        `,
    ]);

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