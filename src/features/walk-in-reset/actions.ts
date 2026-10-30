"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { validatePasswordPair } from "@/lib/auth/password-policy";
import { logAccess } from "@/lib/access-log";

// Who can perform a walk-in reset? Nurse and admin.
const ALLOWED_ROLES = ["nurse", "admin", "ittech"];

export async function walkInReset(formData: FormData) {
    const session = await getSession();
    if (!session) redirect("/login");
    if (!ALLOWED_ROLES.includes(session.role)) redirect("/dashboard");

    const actorId = Number(session.userId);
    const actorName = String(session.username ?? "");

    const subjectType = String(formData.get("subjectType") ?? "");
    const subjectId = Number(formData.get("subjectId") ?? 0);
    const idPresented = String(formData.get("idPresented") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const staffPassword = String(formData.get("staffPassword") ?? "");

    // Every early exit below returns, so nothing after it can run.
    const stay = (notice: string, msg?: string) => {
        const params = new URLSearchParams({
            type: subjectType,
            id: String(subjectId),
            notice,
        });
        if (msg) params.set("msg", msg);
        return `/dashboard/walk-in-reset?${params.toString()}`;
    };

    if (subjectType !== "student" && subjectType !== "employee") {
        return redirect(stay("invalid"));
    }
    if (!subjectId) {
        return redirect(stay("invalid"));
    }
    if (!idPresented) {
        return redirect(stay("no-id"));
    }

    const passwordError = validatePasswordPair(newPassword, confirmPassword);
    if (passwordError) {
        return redirect(stay("weak", passwordError));
    }

    // Re-authentication: staff must type their own password.
    if (!staffPassword) {
        return redirect(stay("no-auth"));
    }

    const staff = await prisma.user.findUnique({ where: { user_id: actorId } });
    if (!staff) {
        return redirect(stay("no-auth"));
    }

    const staffOk = await bcrypt.compare(staffPassword, staff.password);
    if (!staffOk) {
        return redirect(stay("bad-auth"));
    }

    // Everything below only runs once the staff password is verified.
    const hash = await bcrypt.hash(newPassword, 12);

    if (subjectType === "student") {
        await prisma.$executeRaw`
            UPDATE students
            SET password = ${hash}, must_change_password = TRUE
            WHERE student_id = ${subjectId}
        `;
    } else {
        await prisma.$executeRaw`
            UPDATE employees
            SET password = ${hash}, must_change_password = TRUE
            WHERE employee_id = ${subjectId}
        `;
    }

    // Identity verification trail - the evidence that someone checked an ID.
    await prisma.$executeRaw`
        INSERT INTO identity_verifications
            (subject_type, subject_id, id_presented, verified_by, verified_by_name, note)
        VALUES
            (${subjectType}, ${subjectId}, ${idPresented}, ${actorId}, ${actorName}, ${note || null})
    `;

    await logAccess(
        { userId: actorId, role: session.role, name: actorName },
        subjectType === "student" ? "student_health_record" : "employee_health_record",
        subjectId,
        "update",
        `Walk-in password reset. ID presented: ${idPresented}`,
    );

    // Back to the search list with a clean URL, so no stale notice lingers.
    return redirect(`/dashboard/walk-in-reset?type=${subjectType}&notice=done`);
}