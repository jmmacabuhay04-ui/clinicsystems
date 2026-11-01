"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RETENTION_YEARS } from "@/lib/retention";
import { canManageRecords } from "@/lib/permissions";

const BASE = "/dashboard/referral-slips";

export type SlipState = {
    error?: string;
    success?: string;
};

function refresh() {
    revalidatePath(BASE);
}

export async function issueSlip(_prev: SlipState, formData: FormData): Promise<SlipState> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };
    if (!canManageRecords(session.role)) return { error: "You cannot issue referral slips." };

    const get = (key: string) => String(formData.get(key) ?? "").trim();

    const slipType = get("slipType") === "gate" ? "gate" : "teacher";
    const studentNumber = get("studentNumber");
    const section = get("section");
    const teacherName = get("teacherName");
    const subject = get("subject");
    const reason = get("reason");
    const slipDate = get("slipDate");
    const timeIssued = get("timeIssued");

    if (!studentNumber || !reason || !slipDate || !timeIssued) {
        return { error: "Student, reason, date, and time are required." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slipDate)) return { error: "Enter a valid date." };
    if (!/^\d{2}:\d{2}$/.test(timeIssued)) return { error: "Enter a valid time." };
    if (reason.length > 500) return { error: "Reason is too long." };

    try {
        const rows = await prisma.$queryRaw<{ student_id: number }[]>`
      SELECT student_id FROM students
      WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        const studentId = rows[0]?.student_id;
        if (!studentId) return { error: `No active student found with number ${studentNumber}.` };

        await prisma.$executeRaw`
      INSERT INTO referral_slips
        (slip_type, student_id, section, teacher_name, subject, reason,
         slip_date, time_issued, recorded_by)
      VALUES
        (${slipType}, ${studentId}, ${section || null}, ${teacherName || null},
         ${subject || null}, ${reason}, CAST(${slipDate} AS DATE), ${timeIssued},
         ${session.userId})
    `;
    } catch (err) {
        console.error("Issue referral slip error:", err);
        return { error: "Could not issue the slip. Please try again." };
    }

    refresh();
    return { success: "Referral slip issued." };
}

export async function markReceived(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const slipId = Number(formData.get("slipId"));
    if (!slipId) return;

    await prisma.$executeRaw`
    UPDATE referral_slips SET status = 'received'
    WHERE slip_id = ${slipId} AND archived_at IS NULL
  `;

    refresh();
}

export async function archiveSlip(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const slipId = Number(formData.get("slipId"));
    if (!slipId) return;

    await prisma.$executeRaw`
    UPDATE referral_slips
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE slip_id = ${slipId} AND archived_at IS NULL
  `;

    refresh();
}
export async function restoreSlip(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const slipId = Number(formData.get("slipId"));
    if (!slipId) return;

    await prisma.$executeRaw`
    UPDATE referral_slips
    SET archived_at = NULL, archived_by = NULL
    WHERE slip_id = ${slipId}
  `;

    refresh();
    revalidatePath("/dashboard/archive-records");
}

export async function deleteSlip(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const slipId = Number(formData.get("slipId"));
    if (!slipId) return;

    await prisma.$executeRaw`
    DELETE FROM referral_slips
    WHERE slip_id = ${slipId} AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    refresh();
    revalidatePath("/dashboard/archive-records");
}