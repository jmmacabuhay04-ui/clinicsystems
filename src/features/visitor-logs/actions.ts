"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";

const BASE = "/dashboard/visitor-recording";

export type VisitorState = {
    error?: string;
    success?: string;
};

function refresh() {
    revalidatePath(BASE);
    revalidatePath("/dashboard");
}

export async function logVisitor(
    _prev: VisitorState,
    formData: FormData
): Promise<VisitorState> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };
    if (!canManageRecords(session.role)) return { error: "Only nurses can log visitors." };

    const name = String(formData.get("visitorName") ?? "").trim();
    const purpose = String(formData.get("purpose") ?? "").trim();
    const relation = String(formData.get("relation") ?? "").trim();
    const visitDate = String(formData.get("visitDate") ?? "").trim();
    const timeIn = String(formData.get("timeIn") ?? "").trim();

    if (!name || !purpose || !visitDate || !timeIn) {
        return { error: "Visitor name, purpose, date, and time in are required." };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return { error: "Enter a valid date." };
    if (!/^\d{2}:\d{2}$/.test(timeIn)) return { error: "Enter a valid time in." };

    try {
        await prisma.$executeRaw`
      INSERT INTO visitor_logs
        (visitor_name, purpose, relation, visit_date, time_in, recorded_by)
      VALUES
        (${name}, ${purpose}, ${relation || null}, CAST(${visitDate} AS DATE),
         ${timeIn}, ${session.userId})
    `;
    } catch (err) {
        console.error("Log visitor error:", err);
        return { error: "Could not save the visitor. Please try again." };
    }

    refresh();
    return { success: `${name} has been logged in.` };
}

export async function setTimeOut(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const visitorId = Number(formData.get("visitorId"));
    const timeOut = String(formData.get("timeOut") ?? "");

    if (!visitorId || !/^\d{2}:\d{2}$/.test(timeOut)) return;

    await prisma.$executeRaw`
    UPDATE visitor_logs SET time_out = ${timeOut}
    WHERE visitor_id = ${visitorId} AND archived_at IS NULL
  `;

    refresh();
}

export async function archiveVisitor(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const visitorId = Number(formData.get("visitorId"));
    if (!visitorId) return;

    await prisma.$executeRaw`
    UPDATE visitor_logs
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE visitor_id = ${visitorId} AND archived_at IS NULL
  `;

    refresh();
}