"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";

const BASE = "/dashboard/clinic-staff";

export type StaffState = {
    error?: string;
    values?: Record<string, string>;
};

function collect(formData: FormData) {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }
    return values;
}

function validate(values: Record<string, string>) {
    const get = (key: string) => values[key] ?? "";

    if (!get("fullName") || !get("position")) return "Name and role are required.";
    if (get("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email"))) {
        return "Enter a valid email address.";
    }
    if (!["active", "inactive"].includes(get("status"))) return "Select a valid status.";
    return null;
}

export async function createStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
    const values = collect(formData);
    const fail = (error: string): StaffState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageStaff(session.role)) return fail("You cannot manage clinic staff.");

    const problem = validate(values);
    if (problem) return fail(problem);

    try {
        await prisma.$executeRaw`
      INSERT INTO clinic_staff
        (full_name, position, email, contact, license_no, status, recorded_by)
      VALUES
        (${get("fullName")}, ${get("position")}, ${get("email") || null},
         ${get("contact") || null}, ${get("licenseNo") || null}, ${get("status")},
         ${session.userId})
    `;
    } catch (err) {
        console.error("Create staff error:", err);
        return fail("Could not save the staff record. Please try again.");
    }

    revalidatePath(BASE);
    redirect(BASE);
}

export async function updateStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
    const values = collect(formData);
    const fail = (error: string): StaffState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageStaff(session.role)) return fail("You cannot manage clinic staff.");

    const staffId = Number(get("staffId"));
    if (!staffId) return fail("Invalid staff record.");

    const problem = validate(values);
    if (problem) return fail(problem);

    try {
        await prisma.$executeRaw`
      UPDATE clinic_staff
      SET full_name  = ${get("fullName")},
          position   = ${get("position")},
          email      = ${get("email") || null},
          contact    = ${get("contact") || null},
          license_no = ${get("licenseNo") || null},
          status     = ${get("status")}
      WHERE staff_id = ${staffId}
    `;
    } catch (err) {
        console.error("Update staff error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    revalidatePath(BASE);
    redirect(BASE);
}

export async function deleteStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStaff(session.role)) return;

    const staffId = Number(formData.get("staffId"));
    if (!staffId) return;

    await prisma.$executeRaw`DELETE FROM clinic_staff WHERE staff_id = ${staffId}`;

    revalidatePath(BASE);
}
export async function archiveStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStaff(session.role)) return;

    const staffId = Number(formData.get("staffId"));
    if (!staffId) return;

    await prisma.$executeRaw`
        UPDATE clinic_staff SET archived_at = CURRENT_TIMESTAMP WHERE staff_id = ${staffId}
    `;

    revalidatePath("/dashboard/clinic-staff");
    revalidatePath("/dashboard/archive-records");
}

export async function restoreStaff(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStaff(session.role)) return;

    const staffId = Number(formData.get("staffId"));
    if (!staffId) return;

    await prisma.$executeRaw`
        UPDATE clinic_staff SET archived_at = NULL WHERE staff_id = ${staffId}
    `;

    revalidatePath("/dashboard/clinic-staff");
    revalidatePath("/dashboard/archive-records");
}