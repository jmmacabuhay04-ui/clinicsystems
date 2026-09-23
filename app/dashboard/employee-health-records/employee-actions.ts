"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";

const BASE = "/dashboard/employee-health-records";

export type EmployeeState = { error?: string; values?: Record<string, string> };

function readValues(formData: FormData) {
    const get = (key: string) => String(formData.get(key) ?? "").trim();
    return {
        employeeNumber: get("employeeNumber"),
        lastName: get("lastName"),
        firstName: get("firstName"),
        middleName: get("middleName"),
        department: get("department"),
        position: get("position"),
        dateOfBirth: get("dateOfBirth"),
        gender: get("gender"),
    };
}

async function verifyStaffPassword(userId: number, input: string) {
    if (!input) return false;
    const staff = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!staff) return false;
    return bcrypt.compare(input, staff.password);
}

export async function createEmployee(
    _prev: EmployeeState,
    formData: FormData
): Promise<EmployeeState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageStudents(session.role)) {
        return { error: "Only the nurse can add employee accounts." };
    }

    const values = readValues(formData);
    const password = String(formData.get("password") ?? "");

    if (!values.employeeNumber || !values.lastName || !values.firstName) {
        return { error: "Employee number, last name, and first name are required.", values };
    }
    if (password.length < 8) {
        return { error: "Password must be at least 8 characters.", values };
    }
    if (password !== String(formData.get("confirmPassword") ?? "")) {
        return { error: "Passwords do not match. Please re-type them.", values };
    }

    const confirmed = await verifyStaffPassword(
        Number(session.userId),
        String(formData.get("staffPassword") ?? "")
    );
    if (!confirmed) {
        return { error: "Your own password is incorrect. The employee account was not created.", values };
    }

    try {
        const dup = await prisma.$queryRaw<{ employee_id: number }[]>`
      SELECT employee_id FROM employees
      WHERE employee_number = ${values.employeeNumber} LIMIT 1
    `;
        if (dup[0]) {
            return { error: `Employee number ${values.employeeNumber} already exists.`, values };
        }

        const hash = await bcrypt.hash(password, 12);

        await prisma.$executeRaw`
      INSERT INTO employees
        (employee_number, last_name, first_name, middle_name, department,
         position, date_of_birth, gender, password)
      VALUES
        (${values.employeeNumber}, ${values.lastName}, ${values.firstName},
         ${values.middleName || null}, ${values.department || null},
         ${values.position || null}, ${values.dateOfBirth || null}::date,
         ${values.gender || null}, ${hash})
    `;
    } catch (err) {
        console.error("Create employee error:", err);
        return { error: "Could not save the employee. Please try again.", values };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?employee=${encodeURIComponent(values.employeeNumber)}`);
}

export async function updateEmployee(
    _prev: EmployeeState,
    formData: FormData
): Promise<EmployeeState> {
    const session = await getSession();
    if (!session) return { error: "Session expired. Please sign in again." };
    if (!canManageStudents(session.role)) {
        return { error: "Only the nurse can edit employee accounts." };
    }

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return { error: "Missing employee." };

    const values = readValues(formData);
    const password = String(formData.get("password") ?? "");

    if (!values.employeeNumber || !values.lastName || !values.firstName) {
        return { error: "Employee number, last name, and first name are required.", values };
    }
    if (password && password.length < 8) {
        return { error: "Password must be at least 8 characters.", values };
    }
    if (password) {
        if (password !== String(formData.get("confirmPassword") ?? "")) {
            return { error: "Passwords do not match. Please re-type them.", values };
        }

        const confirmed = await verifyStaffPassword(
            Number(session.userId),
            String(formData.get("staffPassword") ?? "")
        );
        if (!confirmed) {
            return { error: "Your own password is incorrect. The password was not changed.", values };
        }
    }

    try {
        const dup = await prisma.$queryRaw<{ employee_id: number }[]>`
      SELECT employee_id FROM employees
      WHERE employee_number = ${values.employeeNumber} AND employee_id <> ${employeeId}
      LIMIT 1
    `;
        if (dup[0]) {
            return { error: `Employee number ${values.employeeNumber} is already used.`, values };
        }

        await prisma.$executeRaw`
      UPDATE employees SET
        employee_number = ${values.employeeNumber},
        last_name       = ${values.lastName},
        first_name      = ${values.firstName},
        middle_name     = ${values.middleName || null},
        department      = ${values.department || null},
        position        = ${values.position || null},
        date_of_birth   = ${values.dateOfBirth || null}::date,
        gender          = ${values.gender || null}
      WHERE employee_id = ${employeeId}
    `;

        if (password) {
            const hash = await bcrypt.hash(password, 12);
            await prisma.$executeRaw`
        UPDATE employees SET password = ${hash} WHERE employee_id = ${employeeId}
      `;
        }
    } catch (err) {
        console.error("Update employee error:", err);
        return { error: "Could not save the changes. Please try again.", values };
    }

    revalidatePath(BASE);
    redirect(`${BASE}?employee=${encodeURIComponent(values.employeeNumber)}`);
}

export async function archiveEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    await prisma.$executeRaw`
    UPDATE employees
    SET archived_at = NOW(), archived_by = ${session.username}
    WHERE employee_id = ${employeeId} AND archived_at IS NULL
  `;

    revalidatePath(BASE);
    redirect(BASE);
}

export async function restoreEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    await prisma.$executeRaw`
    UPDATE employees SET archived_at = NULL, archived_by = NULL
    WHERE employee_id = ${employeeId}
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    await prisma.$executeRaw`
    DELETE FROM employees WHERE employee_id = ${employeeId} AND archived_at IS NOT NULL
  `;

    revalidatePath(BASE);
    revalidatePath("/dashboard/archive-records");
}