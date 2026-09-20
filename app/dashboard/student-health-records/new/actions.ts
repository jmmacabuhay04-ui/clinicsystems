"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";

export type RecordState = {
    error?: string;
    values?: Record<string, string>;
};

class ValidationError extends Error { }

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

    if (!studentNumber || !visitDate || !complaint) {
        return fail("Student number, visit date, and complaint are required.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return fail("Enter a valid visit date.");
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return fail("Enter a valid date of birth.");
    if (gender && gender !== "Male" && gender !== "Female") return fail("Select a valid gender.");
    if (bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
        return fail("Blood pressure must look like 110/70.");
    }

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

        await prisma.$transaction([
            prisma.$executeRaw`
        INSERT INTO health_records
          (student_id, visit_date, complaint, action_taken, attending_staff,
           height_cm, weight_kg, heart_rate, blood_pressure, temperature, recorded_by)
        VALUES
          (${studentId}, CAST(${visitDate} AS DATE), ${complaint}, ${actionTaken || null},
           ${attendingStaff || null}, ${height}, ${weight}, ${heartRate},
           ${bloodPressure || null}, ${temperature}, ${session.userId})
      `,
            prisma.$executeRaw`
        UPDATE students
        SET date_of_birth = COALESCE(CAST(${dateOfBirth || null} AS DATE), date_of_birth),
            gender = COALESCE(CAST(${gender || null} AS VARCHAR), gender)
        WHERE student_id = ${studentId}
      `,
        ]);
    } catch (err) {
        console.error("Add health record error:", err);
        return fail("Could not save the record. Please try again.");
    }

    revalidatePath("/dashboard/student-health-records");
    redirect(`/dashboard/student-health-records?student=${encodeURIComponent(studentNumber)}`);
}