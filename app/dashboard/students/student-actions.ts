
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import { canDeleteYet, formatDeletableOn, RETENTION_YEARS } from "@/lib/retention";
import { logAccess } from "@/lib/access-log";

function refresh() {
    revalidatePath("/dashboard/student-health-records");
    revalidatePath("/dashboard/archive-records");
    revalidatePath("/dashboard");
}

export async function archiveStudent(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const studentId = Number(formData.get("studentId"));
    if (!studentId) return;

    await prisma.$executeRaw`
    UPDATE students
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE student_id = ${studentId} AND archived_at IS NULL
  `;

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        studentId,
        "update",
        "Student archived.",
    );

    refresh();
}

export async function restoreStudent(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const studentId = Number(formData.get("studentId"));
    if (!studentId) return;

    await prisma.$executeRaw`
    UPDATE students
    SET archived_at = NULL, archived_by = NULL
    WHERE student_id = ${studentId}
  `;

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        studentId,
        "update",
        "Student restored from archive.",
    );

    refresh();
}

type ArchivedRow = { archived_at: Date | null; student_number: string };

export async function deleteStudent(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const studentId = Number(formData.get("studentId"));
    if (!studentId) return;

    const rows = await prisma.$queryRaw<ArchivedRow[]>`
    SELECT archived_at, student_number FROM students
    WHERE student_id = ${studentId} LIMIT 1
  `;
    const target = rows[0];

    // Not archived at all: nothing to delete here.
    if (!target || !target.archived_at) {
        refresh();
        return;
    }

    // Data retention policy. A health record may still be needed years after
    // the student leaves, so it cannot be erased before the period is over.
    if (!canDeleteYet(target.archived_at)) {
        redirect(
            `/dashboard/archive-records?notice=retention&until=${encodeURIComponent(
                formatDeletableOn(target.archived_at)
            )}`
        );
    }

    await prisma.$executeRaw`
    DELETE FROM students
    WHERE student_id = ${studentId}
      AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    await logAccess(
        { userId: Number(session.userId), role: session.role, name: String(session.username ?? "") },
        "student_health_record",
        studentId,
        "delete",
        `Permanently deleted after the ${RETENTION_YEARS}-year retention period (${target.student_number}).`,
    );

    refresh();
    redirect("/dashboard/archive-records?notice=deleted")
};
