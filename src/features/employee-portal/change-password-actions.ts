"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession, createEmployeeSession } from "@/lib/auth/employee-session";
import { validatePasswordPair } from "@/lib/auth/password-policy";

type Row = { password: string };

export async function changePassword(formData: FormData) {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employeeId = Number(session.employeeId);

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const rows = await prisma.$queryRaw<Row[]>`
        SELECT password FROM employees WHERE employee_id = ${employeeId} LIMIT 1
    `;
    if (rows.length === 0) redirect("/employee/login");

    const matches = await bcrypt.compare(currentPassword, rows[0].password);
    if (!matches) {
        redirect("/employee/change-password?notice=bad-current");
    }

    const error = validatePasswordPair(newPassword, confirmPassword);
    if (error) {
        redirect(`/employee/change-password?notice=weak&msg=${encodeURIComponent(error)}`);
    }

    const same = await bcrypt.compare(newPassword, rows[0].password);
    if (same) {
        redirect("/employee/change-password?notice=same");
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.$executeRaw`
        UPDATE employees
        SET password = ${hash}, must_change_password = FALSE
        WHERE employee_id = ${employeeId}
    `;

    // Refresh the session token, otherwise proxy.ts still sees the old
    // mustChangePassword flag and sends them straight back here.
    await createEmployeeSession({
        employeeId,
        employeeNumber: String(session.employeeNumber),
        mustChangePassword: false,
    });

    redirect("/employee/dashboard");
}