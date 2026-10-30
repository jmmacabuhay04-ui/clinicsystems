"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canViewClinicData } from "@/lib/permissions";

export type PersonHit = {
    kind: "student" | "employee";
    number: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    /** Student: program · year. Employee: position · department */
    detail: string | null;
    avatar: string | null;
    /** true = naka-archive (Deactivated) */
    archived: boolean;
};

// Paghahanap ng STUDENT at EMPLOYEE (pangalan o ID number) para sa search sa itaas ng dashboard.
// Kasama ang mga naka-archive (Deactivated), pero nasa hulihan sila. Hanggang 10 resulta lang.
export async function searchPeople(query: string): Promise<PersonHit[]> {
    const session = await getSession();
    if (!session || !canViewClinicData(String(session.role ?? ""))) return [];

    const q = query.trim().replace(/\s+/g, " ");
    if (q.length < 1) return [];
    // Bawat salita ay dapat nasa pangalan o ID (hal. "john macabuhay", "macabuhay john", "2023-048")
    const words = q.split(" ").map((w) => `%${w}%`);
    const starts = `${q}%`;

    return prisma.$queryRaw<PersonHit[]>`
        SELECT * FROM (
            SELECT 'student' AS kind, student_number AS number, first_name, middle_name, last_name,
                   NULLIF(CONCAT_WS(' · ', NULLIF(program, ''), NULLIF(grade_level, '')), '') AS detail,
                   avatar, (archived_at IS NOT NULL) AS archived,
                   (student_number ILIKE ${starts} OR last_name ILIKE ${starts} OR first_name ILIKE ${starts}) AS starts
            FROM students
            WHERE CONCAT_WS(' ', student_number, first_name, middle_name, last_name) ILIKE ALL (${words}::text[])
            UNION ALL
            SELECT 'employee' AS kind, employee_number AS number, first_name, middle_name, last_name,
                   NULLIF(CONCAT_WS(' · ', NULLIF(position, ''), NULLIF(department, '')), '') AS detail,
                   avatar, (archived_at IS NOT NULL) AS archived,
                   (employee_number ILIKE ${starts} OR last_name ILIKE ${starts} OR first_name ILIKE ${starts}) AS starts
            FROM employees
            WHERE CONCAT_WS(' ', employee_number, first_name, middle_name, last_name) ILIKE ALL (${words}::text[])
        ) p
        ORDER BY archived ASC, starts DESC, last_name ASC, first_name ASC
        LIMIT 10
    `;
}