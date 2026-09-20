"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";

const BASE = "/dashboard/employee-health-records";

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
        visitDate: get("visitDate"),
        complaint: get("complaint"),
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

        await prisma.$executeRaw`
      INSERT INTO employee_health_records
        (employee_id, visit_date, complaint, action_taken, attending_staff,
         height_cm, weight_kg, heart_rate, blood_pressure, temperature, recorded_by)
      VALUES
        (${employeeId}, ${values.visitDate}::date, ${values.complaint},
         ${values.actionTaken || null}, ${values.attendingStaff || null},
         ${num(formData, "heightCm")}, ${num(formData, "weightKg")},
         ${num(formData, "heartRate")}, ${values.bloodPressure || null},
         ${num(formData, "temperature")}, ${session.username})
    `;
    } catch (err) {
        console.error("Create employee record error:", err);
        return { error: "Could not save the record. Please try again.", values };
    }

    revalidatePath(BASE);
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

    await prisma.$executeRaw`
    DELETE FROM employee_health_records
    WHERE record_id = ${recordId} AND archived_at IS NOT NULL
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}