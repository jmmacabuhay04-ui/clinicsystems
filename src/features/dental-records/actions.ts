"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { RETENTION_YEARS } from "@/lib/retention";
import { canManageDental } from "@/lib/permissions";
import { examinerName } from "@/features/dental-health-form/chart-data";

const BASE = "/dashboard/dental-records";

export type DentalState = { error?: string; values?: Record<string, string> };

function readValues(formData: FormData) {
    const get = (key: string) => String(formData.get(key) ?? "").trim();
    return {
        patientType: get("patientType") === "employee" ? "employee" : "student",
        patientNumber: get("patientNumber"),
        visitDate: get("visitDate"),
        procedure: get("procedure"),
        tooth: get("tooth"),
        status: get("status") === "follow-up" ? "follow-up" : "completed",
        notes: get("notes"),
    };
}

type Values = ReturnType<typeof readValues>;

function validate(values: Values) {
    if (!values.patientNumber) {
        return values.patientType === "employee"
            ? "Employee number is required."
            : "Student number is required.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.visitDate)) return "Enter a valid visit date.";
    if (!values.procedure) return "Procedure is required.";
    if (values.procedure.length > 150) return "Procedure is too long.";
    return null;
}

async function findPatient(values: Values) {
    if (values.patientType === "employee") {
        const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT employee_id AS id FROM employees
      WHERE employee_number = ${values.patientNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        return rows[0] ? { studentId: null, employeeId: rows[0].id } : null;
    }

    const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT student_id AS id FROM students
    WHERE student_number = ${values.patientNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    return rows[0] ? { studentId: rows[0].id, employeeId: null } : null;
}

/**
 * The name of the signed-in clinician, for the Attending Dentist column.
 *
 * Falls back through every source so the column is never left blank: the
 * formatted name, then the raw name from users, then the login name.
 */
async function attendingDentist(session: {
    userId?: unknown;
    username?: unknown;
}): Promise<string> {
    const me = await prisma.$queryRaw<{ full_name: string | null; username: string }[]>`
    SELECT full_name, username FROM users WHERE user_id = ${session.userId} LIMIT 1
  `;

    const fallbackLogin = String(session.username ?? "");

    return (
        examinerName(me[0]?.full_name ?? null, me[0]?.username ?? fallbackLogin) ||
        me[0]?.full_name ||
        me[0]?.username ||
        fallbackLogin
    );
}

export async function createDental(
    _prev: DentalState,
    formData: FormData
): Promise<DentalState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageDental(session.role)) {
        return { error: "You do not have permission to add dental records." };
    }

    const values = readValues(formData);
    const problem = validate(values);
    if (problem) return { error: problem, values };

    try {
        const dentistName = await attendingDentist(session);

        const patient = await findPatient(values);
        if (!patient) {
            return {
                error: `No active ${values.patientType} found with number ${values.patientNumber}.`,
                values,
            };
        }

        await prisma.$executeRaw`
      INSERT INTO dental_records
        (student_id, employee_id, visit_date, procedure_name, tooth,
         dentist_name, status, notes)
      VALUES
        (${patient.studentId}, ${patient.employeeId}, ${values.visitDate}::date,
         ${values.procedure}, ${values.tooth || null}, ${dentistName},
         ${values.status}, ${values.notes || null})
    `;
    } catch (err) {
        console.error("Create dental record error:", err);
        return { error: "Could not save the dental record. Please try again.", values };
    }

    revalidatePath(BASE);
    redirect(BASE);
}

export async function updateDental(
    _prev: DentalState,
    formData: FormData
): Promise<DentalState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageDental(session.role)) {
        return { error: "You do not have permission to edit dental records." };
    }

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return { error: "Missing dental record." };

    const values = readValues(formData);
    const problem = validate(values);
    if (problem) return { error: problem, values };

    try {
        const patient = await findPatient(values);
        if (!patient) {
            return {
                error: `No active ${values.patientType} found with number ${values.patientNumber}.`,
                values,
            };
        }

        // dentist_name is deliberately NOT updated. The field is read-only in
        // the form and is never submitted, so writing it here would overwrite
        // the real dentist with an empty value on every edit. The dentist who
        // performed the procedure stays as recorded on creation.
        await prisma.$executeRaw`
      UPDATE dental_records SET
        student_id     = ${patient.studentId},
        employee_id    = ${patient.employeeId},
        visit_date     = ${values.visitDate}::date,
        procedure_name = ${values.procedure},
        tooth          = ${values.tooth || null},
        status         = ${values.status},
        notes          = ${values.notes || null}
      WHERE dental_id = ${dentalId}
    `;
    } catch (err) {
        console.error("Update dental record error:", err);
        return { error: "Could not save the changes. Please try again.", values };
    }

    revalidatePath(BASE);
    revalidatePath("/dashboard/student-health-records");
    revalidatePath("/dashboard/employee-health-records");

    // Bumalik kung saan nanggaling (hal. Dental Records tab ng health record)
    const returnTo = String(formData.get("returnTo") ?? "");
    redirect(returnTo.startsWith("/dashboard/") ? returnTo : BASE);
}

export async function archiveDental(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageDental(session.role)) return;

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return;

    await prisma.$executeRaw`
    UPDATE dental_records SET archived_at = NOW()
    WHERE dental_id = ${dentalId} AND archived_at IS NULL
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
    revalidatePath("/dashboard");

    // Galing sa Dental Visit Record: bumalik sa pinanggalingan (wala na kasi ang record)
    const returnTo = String(formData.get("returnTo") ?? "");
    if (returnTo.startsWith("/dashboard")) redirect(returnTo);
}

export async function restoreDental(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageDental(session.role)) return;

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return;

    await prisma.$executeRaw`
    UPDATE dental_records SET archived_at = NULL, archived_by = NULL
    WHERE dental_id = ${dentalId}
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteDental(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageDental(session.role)) return;

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return;

    await prisma.$executeRaw`
    DELETE FROM dental_records WHERE dental_id = ${dentalId} AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}