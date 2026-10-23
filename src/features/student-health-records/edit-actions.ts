"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";

export type EditState = {
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

export async function updateHealthRecord(_prev: EditState, formData: FormData): Promise<EditState> {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
    }

    const fail = (error: string): EditState => ({ error, values });
    const get = (key: string) => (values[key] ?? "").trim();

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("Only nurses can edit health records.");

    const recordId = Number(get("recordId"));
    const studentNumber = get("studentNumber");
    const visitDate = get("visitDate");
    const complaint = get("complaint");
    const actionTaken = get("actionTaken");
    const attendingStaff = get("attendingStaff");
    const bloodPressure = get("bloodPressure");

    if (!recordId) return fail("Invalid record.");
    if (!visitDate || !complaint) return fail("Visit date and complaint are required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return fail("Enter a valid visit date.");
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
        await prisma.$executeRaw`
      UPDATE health_records
      SET visit_date      = CAST(${visitDate} AS DATE),
          complaint       = ${complaint},
          action_taken    = ${actionTaken || null},
          attending_staff = ${attendingStaff || null},
          height_cm       = ${height},
          weight_kg       = ${weight},
          heart_rate      = ${heartRate},
          blood_pressure  = ${bloodPressure || null},
          temperature     = ${temperature}
      WHERE record_id = ${recordId}
    `;
    } catch (err) {
        console.error("Update health record error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    revalidatePath("/dashboard/student-health-records");
    redirect(`/dashboard/student-health-records?student=${encodeURIComponent(studentNumber)}`);
}