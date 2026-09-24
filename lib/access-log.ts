// lib/access-log.ts
// Audit log para sa pagtingin at pagbago ng health records.
// Isang linya lang ang kailangan sa bawat page na nagtitingin ng record.

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type RecordType =
    | "student_health_record"
    | "employee_health_record"
    | "dental_record"
    | "visit"
    | "vitals"
    | "health_declaration"
    | "referral_slip"
    | "clinic_staff";

export type AccessAction = "view" | "create" | "update" | "delete" | "print" | "export";

type Actor = {
    userId?: number | null;
    role?: string | null;
    name?: string | null;
};

async function clientIp(): Promise<string | null> {
    try {
        const h = await headers();
        const forwarded = h.get("x-forwarded-for");
        if (forwarded) return forwarded.split(",")[0].trim();
        return h.get("x-real-ip");
    } catch {
        return null;
    }
}

/**
 * Nagtatala ng access sa isang record.
 * Hindi kailanman nagta-throw: kung bumagsak ang log, tuloy pa rin ang page.
 */
export async function logAccess(
    actor: Actor,
    recordType: RecordType,
    recordId: number | null,
    action: AccessAction = "view",
    detail?: string,
): Promise<void> {
    try {
        const ip = await clientIp();

        await prisma.$executeRaw`
            INSERT INTO record_access_logs
                (actor_id, actor_role, actor_name, record_type, record_id, action, detail, ip)
            VALUES
                (${actor.userId ?? null}, ${actor.role ?? null}, ${actor.name ?? null},
                 ${recordType}, ${recordId}, ${action}, ${detail ?? null}, ${ip})
        `;
    } catch (error) {
        console.error("[access-log] hindi naitala:", error);
    }
}

export type AccessLogRow = {
    id: number;
    actor_id: number | null;
    actor_role: string | null;
    actor_name: string | null;
    record_type: string;
    record_id: number | null;
    action: string;
    detail: string | null;
    ip: string | null;
    created_at: Date;
};

/** Para sa Access Logs page ng admin / IT Tech. */
export async function getAccessLogs(limit = 200): Promise<AccessLogRow[]> {
    return prisma.$queryRaw<AccessLogRow[]>`
        SELECT id, actor_id, actor_role, actor_name, record_type,
               record_id, action, detail, ip, created_at
        FROM record_access_logs
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}
