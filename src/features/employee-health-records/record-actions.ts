"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";


const BASE = "/dashboard/employee-health-records";

// Only the two raw-query methods are needed, so describe just those. This
// accepts both the normal client and the `tx` client given by
// prisma.$transaction(async (tx) => ...), whatever Prisma version or
// client extensions the project uses.
type Tx = {
    $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: any[]) => PromiseLike<T>;
    $executeRaw: (query: TemplateStringsArray, ...values: any[]) => PromiseLike<number>;
};

type VisitCase = {
    studentId: number | null;
    employeeId: number | null;
    complaint: string;
    reportDate: string; // YYYY-MM-DD, same as the visit date
    staffName: string | null;
    notes: string | null;
    recordedBy: string | number;
};

async function nextCaseNumber(tx: Tx, year: number) {
    const prefix = `${year}-`;
    const rows = await tx.$queryRaw<{ case_number: string }[]>`
    SELECT case_number FROM health_case_reports
    WHERE case_number LIKE ${prefix + "%"}
    ORDER BY case_number DESC
    LIMIT 1
  `;

    const last = rows[0]?.case_number;
    const n = last ? Number(last.slice(prefix.length)) + 1 : 1;
    return prefix + String(n).padStart(3, "0");
}

/**
 * Creates a pending Health Case Report for a clinic visit that was just saved.
 * Call it inside the same transaction as the visit INSERT, so the visit and
 * its case are saved together or not at all.
 *
 * Returns false (and creates nothing) when the same patient already has an
 * active case with the same complaint on the same date, so a nurse who also
 * files the case by hand does not end up with a duplicate.
 */
async function createCaseFromVisit(tx: Tx, v: VisitCase): Promise<boolean> {
    // Only one save at a time may pick the next case number.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;

    const existing =
        v.studentId !== null
            ? await tx.$queryRaw<{ case_id: number }[]>`
        SELECT case_id FROM health_case_reports
        WHERE archived_at IS NULL
          AND student_id = ${v.studentId}
          AND report_date = CAST(${v.reportDate} AS DATE)
          AND LOWER(TRIM(complaint)) = LOWER(TRIM(${v.complaint}))
        LIMIT 1
      `
            : await tx.$queryRaw<{ case_id: number }[]>`
        SELECT case_id FROM health_case_reports
        WHERE archived_at IS NULL
          AND employee_id = ${v.employeeId}
          AND report_date = CAST(${v.reportDate} AS DATE)
          AND LOWER(TRIM(complaint)) = LOWER(TRIM(${v.complaint}))
        LIMIT 1
      `;

    if (existing.length > 0) return false;

    const caseNumber = await nextCaseNumber(tx, Number(v.reportDate.slice(0, 4)));

    // Exactly one of student_id / employee_id is set; the other stays NULL.
    await tx.$executeRaw`
    INSERT INTO health_case_reports
      (case_number, student_id, employee_id, complaint, report_date,
       staff_name, status, notes, recorded_by)
    VALUES
      (${caseNumber}, ${v.studentId}, ${v.employeeId}, ${v.complaint},
       CAST(${v.reportDate} AS DATE), ${v.staffName}, 'pending',
       ${v.notes}, ${v.recordedBy})
  `;

    return true;
}

export type RecordState = { error?: string; values?: Record<string, string> };

function num(formData: FormData, key: string) {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function readValues(formData: FormData) {
    const get = (key: string) => String(formData.get(key) ?? "").trim();
    return {
        employeeNumber: get("employeeNumber"),
        dateOfBirth: get("dateOfBirth"),
        gender: get("gender"),
        visitDate: get("visitDate"),
        visitTime: get("visitTime"), // HH:MM, optional
        complaint: get("complaint"),
        notes: get("notes"), // symptoms / notes, optional
        actionTaken: get("actionTaken"),
        attendingStaff: get("attendingStaff"),
        heightCm: get("heightCm"),
        weightKg: get("weightKg"),
        heartRate: get("heartRate"),
        bloodPressure: get("bloodPressure"),
        temperature: get("temperature"),
    };
}

export async function createEmployeeRecord(
    _prev: RecordState,
    formData: FormData
): Promise<RecordState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageRecords(session.role)) {
        return { error: "You do not have permission to add records." };
    }

    const values = readValues(formData);
    if (!values.employeeNumber || !values.visitDate || !values.complaint) {
        return { error: "Employee, visit date, and complaint are required.", values };
    }
    if (values.visitTime && !/^\d{2}:\d{2}$/.test(values.visitTime)) {
        return { error: "Enter a valid visit time.", values };
    }
    if (values.notes.length > 500) {
        return { error: "Symptoms / notes must be 500 characters or less.", values };
    }

    try {
        const rows = await prisma.$queryRaw<{ employee_id: number }[]>`
      SELECT employee_id FROM employees
      WHERE employee_number = ${values.employeeNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        const employeeId = rows[0]?.employee_id;
        if (!employeeId) {
            return { error: `No active employee found with number ${values.employeeNumber}.`, values };
        }

        // The visit, the optional detail refresh, and the automatic case report
        // are saved together. If any step fails, nothing is saved.
        await prisma.$transaction(async (tx) => {
            // Optional refresh of the employee's own details. COALESCE keeps the
            // current value whenever the field was left blank, so adding a visit
            // never erases what is already on the master record.
            if (values.dateOfBirth || values.gender) {
                await tx.$executeRaw`
        UPDATE employees SET
          date_of_birth = COALESCE(${values.dateOfBirth || null}::date, date_of_birth),
          gender        = COALESCE(${values.gender || null}, gender)
        WHERE employee_id = ${employeeId}
      `;
            }

            await tx.$executeRaw`
      INSERT INTO employee_health_records
        (employee_id, visit_date, visit_time, complaint, notes, action_taken, attending_staff,
         height_cm, weight_kg, heart_rate, blood_pressure, temperature, recorded_by)
      VALUES
        (${employeeId}, ${values.visitDate}::date, CAST(${values.visitTime || null} AS TIME),
         ${values.complaint}, ${values.notes || null},
         ${values.actionTaken || null}, ${values.attendingStaff || null},
         ${num(formData, "heightCm")}, ${num(formData, "weightKg")},
         ${num(formData, "heartRate")}, ${values.bloodPressure || null},
         ${num(formData, "temperature")}, ${session.username})
    `;

            // Every clinic visit becomes a pending Health Case Report.
            await createCaseFromVisit(tx, {
                studentId: null,
                employeeId,
                complaint: values.complaint,
                reportDate: values.visitDate,
                staffName: values.attendingStaff || null,
                notes: values.actionTaken || null,
                recordedBy: session.userId,
            });
        });
    } catch (err) {
        console.error("Create employee record error:", err);
        return { error: "Could not save the record. Please try again.", values };
    }

    revalidatePath(BASE);
    revalidatePath("/dashboard/health-case-reports");
    revalidatePath("/dashboard/illness-alerts");
    revalidatePath("/dashboard");
    redirect(`${BASE}?employee=${encodeURIComponent(values.employeeNumber)}`);
}

export async function updateEmployeeRecord(
    _prev: RecordState,
    formData: FormData
): Promise<RecordState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageRecords(session.role)) {
        return { error: "You do not have permission to edit records." };
    }

    const recordId = Number(formData.get("recordId"));
    if (!recordId) return { error: "Missing record." };

    const values = readValues(formData);
    if (!values.visitDate || !values.complaint) {
        return { error: "Visit date and complaint are required.", values };
    }

    try {
        await prisma.$executeRaw`
      UPDATE employee_health_records SET
        visit_date      = ${values.visitDate}::date,
        complaint       = ${values.complaint},
        action_taken    = ${values.actionTaken || null},
        attending_staff = ${values.attendingStaff || null},
        height_cm       = ${num(formData, "heightCm")},
        weight_kg       = ${num(formData, "weightKg")},
        heart_rate      = ${num(formData, "heartRate")},
        blood_pressure  = ${values.bloodPressure || null},
        temperature     = ${num(formData, "temperature")}
      WHERE record_id = ${recordId}
    `;
    } catch (err) {
        console.error("Update employee record error:", err);
        return { error: "Could not save the changes. Please try again.", values };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?employee=${encodeURIComponent(values.employeeNumber)}`);
}

export async function archiveEmployeeRecord(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const recordId = Number(formData.get("recordId"));
    if (!recordId) return;

    await prisma.$executeRaw`
    UPDATE employee_health_records
    SET archived_at = NOW(), archived_by = ${session.username}
    WHERE record_id = ${recordId} AND archived_at IS NULL
  `;

    revalidatePath(BASE);
}

export async function restoreEmployeeRecord(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const recordId = Number(formData.get("recordId"));
    if (!recordId) return;

    await prisma.$executeRaw`
    UPDATE employee_health_records SET archived_at = NULL, archived_by = NULL
    WHERE record_id = ${recordId}
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteEmployeeRecord(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageRecords(session.role)) return;

    const recordId = Number(formData.get("recordId"));
    if (!recordId) return;

    // No retention period on a single visit entry. The archived_at check is
    // what matters: only an archived record can be deleted, never a live one.
    await prisma.$executeRaw`
    DELETE FROM employee_health_records
    WHERE record_id = ${recordId} AND archived_at IS NOT NULL
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}