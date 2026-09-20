"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDental } from "@/lib/permissions";

const BASE = "/dashboard/dental-records";

export type DentalState = {
    error?: string;
    values?: Record<string, string>;
};

function refresh() {
    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}

function collect(formData: FormData) {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }
    return values;
}

function validate(values: Record<string, string>) {
    const get = (key: string) => values[key] ?? "";

    if (!get("visitDate") || !get("procedureName")) {
        return "Visit date and procedure are required.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(get("visitDate"))) return "Enter a valid visit date.";
    if (!["completed", "follow-up"].includes(get("status"))) return "Select a valid status.";
    return null;
}

export async function createDental(
    _prev: DentalState,
    formData: FormData
): Promise<DentalState> {
    const values = collect(formData);
    const fail = (error: string): DentalState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageDental(session.role)) {
        return fail("Only dentists and nurses can add dental records.");
    }

    const studentNumber = get("studentNumber");
    if (!studentNumber) return fail("Student number is required.");

    const problem = validate(values);
    if (problem) return fail(problem);

    try {
        const rows = await prisma.$queryRaw<{ student_id: number }[]>`
      SELECT student_id FROM students
      WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        const studentId = rows[0]?.student_id;
        if (!studentId) return fail(`No active student found with number ${studentNumber}.`);

        await prisma.$executeRaw`
      INSERT INTO dental_records
        (student_id, visit_date, procedure_name, tooth, dentist_name, status, notes, recorded_by)
      VALUES
        (${studentId}, CAST(${get("visitDate")} AS DATE), ${get("procedureName")},
         ${get("tooth") || null}, ${get("dentistName") || null}, ${get("status")},
         ${get("notes") || null}, ${session.userId})
    `;
    } catch (err) {
        console.error("Create dental record error:", err);
        return fail("Could not save the record. Please try again.");
    }

    refresh();
    redirect(BASE);
}

export async function updateDental(
    _prev: DentalState,
    formData: FormData
): Promise<DentalState> {
    const values = collect(formData);
    const fail = (error: string): DentalState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageDental(session.role)) {
        return fail("Only dentists and nurses can edit dental records.");
    }

    const dentalId = Number(get("dentalId"));
    if (!dentalId) return fail("Invalid record.");

    const problem = validate(values);
    if (problem) return fail(problem);

    try {
        await prisma.$executeRaw`
      UPDATE dental_records
      SET visit_date     = CAST(${get("visitDate")} AS DATE),
          procedure_name = ${get("procedureName")},
          tooth          = ${get("tooth") || null},
          dentist_name   = ${get("dentistName") || null},
          status         = ${get("status")},
          notes          = ${get("notes") || null}
      WHERE dental_id = ${dentalId}
    `;
    } catch (err) {
        console.error("Update dental record error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    refresh();
    redirect(BASE);
}

export async function archiveDental(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageDental(session.role)) return;

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return;

    await prisma.$executeRaw`
    UPDATE dental_records
    SET archived_at = NOW(), archived_by = ${session.userId}
    WHERE dental_id = ${dentalId} AND archived_at IS NULL
  `;

    refresh();
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

    refresh();
}

export async function deleteDental(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageDental(session.role)) return;

    const dentalId = Number(formData.get("dentalId"));
    if (!dentalId) return;

    await prisma.$executeRaw`
    DELETE FROM dental_records WHERE dental_id = ${dentalId} AND archived_at IS NOT NULL
  `;

    refresh();
}