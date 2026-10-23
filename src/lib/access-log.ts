// lib/access-log.ts
// Audit log for viewing and changing health records.
// One line per page that displays a record is all it takes.

import { headers } from "next/headers";
import { prisma } from "./prisma";

export type RecordType =
    | "student_health_record"
    | "employee_health_record"
    | "health_case_report"
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
 * Records access to a single record.
 * Never throws: if logging fails, the page still renders.
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
        console.error("[access-log] failed to record:", error);
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
    // Resolved from the record id, so the log shows 2023-048 instead of #19.
    subject_number: string | null;
    subject_name: string | null;
};

/**
 * Used by the Access Logs page for admin / IT Tech.
 *
 * The record id is joined back to students and employees so the page can
 * show the number the clinic actually uses. A deleted record simply comes
 * back as null and the page falls back to the id.
 */
export async function getAccessLogs(limit = 200): Promise<AccessLogRow[]> {
    return prisma.$queryRaw<AccessLogRow[]>`
        SELECT l.id, l.actor_id, l.actor_role, l.actor_name, l.record_type,
               l.record_id, l.action, l.detail, l.ip, l.created_at,
               COALESCE(s.student_number, e.employee_number) AS subject_number,
               CASE
                   WHEN s.student_id IS NOT NULL
                       THEN s.last_name || ', ' || s.first_name
                   WHEN e.employee_id IS NOT NULL
                       THEN e.last_name || ', ' || e.first_name
                   ELSE NULL
               END AS subject_name
        FROM record_access_logs l
        LEFT JOIN health_case_reports c
               ON c.case_id = l.record_id
              AND l.record_type = 'health_case_report'
        LEFT JOIN students s
               ON s.student_id = CASE
                                    WHEN l.record_type = 'health_case_report' THEN c.student_id
                                    ELSE l.record_id
                                END
              AND l.record_type IN ('student_health_record', 'visit', 'vitals',
                                    'health_declaration', 'referral_slip',
                                    'health_case_report')
        LEFT JOIN employees e
               ON e.employee_id = CASE
                                      WHEN l.record_type = 'health_case_report' THEN c.employee_id
                                      ELSE l.record_id
                                  END
              AND l.record_type IN ('employee_health_record', 'health_case_report')
        ORDER BY l.created_at DESC
        LIMIT ${limit}
    `;

}