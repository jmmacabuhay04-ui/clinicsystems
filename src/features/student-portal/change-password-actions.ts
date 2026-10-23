"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getStudentSession, createStudentSession } from "@/lib/auth/student-session";
import { validatePasswordPair } from "@/lib/auth/password-policy";

type Row = { password: string };

export async function changePassword(formData: FormData) {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const studentId = Number(session.userId);

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const rows = await prisma.$queryRaw<Row[]>`
        SELECT password FROM students WHERE student_id = ${studentId} LIMIT 1
    `;
    if (rows.length === 0) redirect("/student/login");

    const matches = await bcrypt.compare(currentPassword, rows[0].password);
    if (!matches) {
        redirect("/student/change-password?notice=bad-current");
    }

    const error = validatePasswordPair(newPassword, confirmPassword);
    if (error) {
        redirect(`/student/change-password?notice=weak&msg=${encodeURIComponent(error)}`);
    }

    const same = await bcrypt.compare(newPassword, rows[0].password);
    if (same) {
        redirect("/student/change-password?notice=same");
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.$executeRaw`
        UPDATE students
        SET password = ${hash}, must_change_password = FALSE
        WHERE student_id = ${studentId}
    `;

    // Refresh the session token, otherwise proxy.ts still sees the old
    // mustChangePassword flag and sends them straight back here.
    await createStudentSession({
        userId: studentId,
        username: String(session.username),
        role: "student",
        mustChangePassword: false,
    });

    redirect("/student/dashboard");
}