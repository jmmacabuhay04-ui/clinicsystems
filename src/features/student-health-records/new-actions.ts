"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";

export type RecordState = {
    error?: string;
    values?: Record<string, string>;
};

class ValidationError extends Error { }

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

function optionalNumber(raw: string, label: string, min: number, max: number): number | null {
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) {
        throw new ValidationError(`${label} must be between ${min} and ${max}.`);
    }
    return n;
}

export async function addHealthRecord(_prev: RecordState, formData: FormData): Promise<RecordState> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
    }

    const fail = (error: string): RecordState => ({ error, values });
    const get = (key: string) => (values[key] ?? "").trim();

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("Only nurses can add health records.");

    const studentNumber = get("studentNumber");
    const visitDate = get("visitDate");
    const complaint = get("complaint");
    const actionTaken = get("actionTaken");
    const attendingStaff = get("attendingStaff");
    const bloodPressure = get("bloodPressure");
    const dateOfBirth = get("dateOfBirth");
    const gender = get("gender");
    const visitTime = get("visitTime"); // HH:MM, optional
    const notes = get("notes"); // symptoms / notes, optional

    if (!studentNumber || !visitDate || !complaint) {
        return fail("Student number, visit date, and complaint are required.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return fail("Enter a valid visit date.");
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return fail("Enter a valid date of birth.");
    if (gender && gender !== "Male" && gender !== "Female") return fail("Select a valid gender.");
    if (bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
        return fail("Blood pressure must look like 110/70.");
    }
    if (visitTime && !/^\d{2}:\d{2}$/.test(visitTime)) return fail("Enter a valid visit time.");
    if (notes.length > 500) return fail("Symptoms / notes must be 500 characters or less.");

    let height: number | null;
    let weight: number | null;
    let heartRate: number | null;
    let temperature: number | null;

    try {
        height = optionalNumber(get("height"), "Height (cm)", 30, 250);
        weight = optionalNumber(get("weight"), "Weight (kg)", 2, 300);
        heartRate = optionalNumber(get("heartRate"), "Heart rate (bpm)", 20, 250);
        temperature = optionalNumber(get("temperature"), "Temperature (°C)", 30, 45);
    } catch (err) {
        if (err instanceof ValidationError) return fail(err.message);
        throw err;
    }

    if (heartRate !== null) heartRate = Math.round(heartRate);

    try {
        const rows = await prisma.$queryRaw<{ student_id: number }[]>`
      SELECT student_id FROM students WHERE student_number = ${studentNumber} LIMIT 1
    `;
        const studentId = rows[0]?.student_id;
        if (!studentId) return fail(`No student found with number ${studentNumber}.`);

        // The visit, the student's details, and the automatic case report are
        // saved together. If any step fails, nothing is saved.
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
        INSERT INTO health_records
          (student_id, visit_date, visit_time, complaint, notes, action_taken, attending_staff,
           height_cm, weight_kg, heart_rate, blood_pressure, temperature, recorded_by)
        VALUES
          (${studentId}, CAST(${visitDate} AS DATE), CAST(${visitTime || null} AS TIME),
           ${complaint}, ${notes || null}, ${actionTaken || null},
           ${attendingStaff || null}, ${height}, ${weight}, ${heartRate},
           ${bloodPressure || null}, ${temperature}, ${session.userId})
      `;

            await tx.$executeRaw`
        UPDATE students
        SET date_of_birth = COALESCE(CAST(${dateOfBirth || null} AS DATE), date_of_birth),
            gender = COALESCE(CAST(${gender || null} AS VARCHAR), gender)
        WHERE student_id = ${studentId}
      `;

            // Every clinic visit becomes a pending Health Case Report.
            await createCaseFromVisit(tx, {
                studentId,
                employeeId: null,
                complaint,
                reportDate: visitDate,
                staffName: attendingStaff || null,
                notes: actionTaken || null,
                recordedBy: session.userId,
            });
        });
    } catch (err) {
        console.error("Add health record error:", err);
        return fail("Could not save the record. Please try again.");
    }

    revalidatePath("/dashboard/student-health-records");
    revalidatePath("/dashboard/health-case-reports");
    revalidatePath("/dashboard/illness-alerts");
    revalidatePath("/dashboard");
    redirect(`/dashboard/student-health-records?student=${encodeURIComponent(studentNumber)}`);
}