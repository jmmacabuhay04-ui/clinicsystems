"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageStudents } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/password-policy";
import { canDeleteYet, formatDeletableOn, RETENTION_YEARS } from "@/lib/retention";
import { logAccess } from "@/lib/access-log";
import { saveStudentPhoto, deleteStudentPhoto } from "@/lib/student-photo";

// Saan pupunta pagkatapos mag-save / archive.
const BASE = "/dashboard/employee-health-records";
// Bagong route ng employees (para ma-refresh din ang cache nito).
const EMPLOYEES = "/dashboard/employees";

function actorOf(session: { userId: unknown; role: string; username?: unknown }) {
    return {
        userId: Number(session.userId),
        role: session.role,
        name: String(session.username ?? ""),
    };
}

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
        contactNumber: get("contactNumber").replace(/[\s-]/g, ""),
        email: get("email").toLowerCase(),
    };
}

/** Contact details are optional, but must be well formed when supplied. */
function checkContact(values: { contactNumber: string; email: string }): string | null {
    if (values.contactNumber && !/^09\d{9}$/.test(values.contactNumber)) {
        return "Contact number must be 11 digits starting with 09, e.g. 09171234567.";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        return "Enter a valid email address.";
    }
    return null;
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

    const contactError = checkContact(values);
    if (contactError) {
        return { error: contactError, values };
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
        return { error: passwordError, values };
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

    // Tracks the uploaded file so it can be removed again if the save fails.
    let savedPhotoUrl: string | null = null;
    let committed = false;

    try {
        const dup = await prisma.$queryRaw<{ employee_id: number }[]>`
      SELECT employee_id FROM employees
      WHERE employee_number = ${values.employeeNumber} LIMIT 1
    `;
        if (dup[0]) {
            return { error: `Employee number ${values.employeeNumber} already exists.`, values };
        }

        if (values.email) {
            const emailClash = await prisma.$queryRaw<{ employee_id: number }[]>`
        SELECT employee_id FROM employees WHERE LOWER(email) = ${values.email} LIMIT 1
      `;
            if (emailClash[0]) {
                return { error: `${values.email} is already used by another employee.`, values };
            }
        }

        // Profile photo (optional). Checked only after the other checks pass,
        // so a rejected form does not leave a file behind.
        const photo = await saveStudentPhoto(formData.get("photo"), "employees");
        if (!photo.ok) {
            return { error: photo.error, values };
        }
        savedPhotoUrl = photo.url;

        const hash = await bcrypt.hash(password, 12);

        // must_change_password = TRUE because the nurse chose this password
        // and therefore knows it. The employee replaces it at first login.
        // Change TRUE to FALSE below to turn this off.
        const created = await prisma.$queryRaw<{ employee_id: number }[]>`
      INSERT INTO employees
        (employee_number, last_name, first_name, middle_name, department,
         position, date_of_birth, gender, contact_number, email,
         password, must_change_password, photo_url)
      VALUES
        (${values.employeeNumber}, ${values.lastName}, ${values.firstName},
         ${values.middleName || null}, ${values.department || null},
         ${values.position || null}, ${values.dateOfBirth || null}::date,
         ${values.gender || null}, ${values.contactNumber || null},
         ${values.email || null}, ${hash}, TRUE, ${photo.url})
      RETURNING employee_id
    `;
        committed = true;

        await logAccess(
            actorOf(session),
            "employee_health_record",
            created[0]?.employee_id ?? null,
            "create",
            `Employee account created (${values.employeeNumber}).`,
        );
    } catch (err) {
        console.error("Create employee error:", err);
        if (!committed) await deleteStudentPhoto(savedPhotoUrl);
        return { error: "Could not save the employee. Please try again.", values };
    }

    revalidatePath(BASE);
    revalidatePath(EMPLOYEES);
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

    const contactError = checkContact(values);
    if (contactError) {
        return { error: contactError, values };
    }

    if (password) {
        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            return { error: passwordError, values };
        }
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

    // Tracks the uploaded file so it can be removed again if the save fails.
    let savedPhotoUrl: string | null = null;
    let committed = false;

    try {
        const dup = await prisma.$queryRaw<{ employee_id: number }[]>`
      SELECT employee_id FROM employees
      WHERE employee_number = ${values.employeeNumber} AND employee_id <> ${employeeId}
      LIMIT 1
    `;
        if (dup[0]) {
            return { error: `Employee number ${values.employeeNumber} is already used.`, values };
        }

        if (values.email) {
            const emailClash = await prisma.$queryRaw<{ employee_id: number }[]>`
        SELECT employee_id FROM employees
        WHERE LOWER(email) = ${values.email} AND employee_id <> ${employeeId}
        LIMIT 1
      `;
            if (emailClash[0]) {
                return { error: `${values.email} is already used by another employee.`, values };
            }
        }

        // Profile photo: keep the current one unless a new file was chosen
        // or "Remove" was pressed.
        const current = await prisma.$queryRaw<{ photo_url: string | null }[]>`
      SELECT photo_url FROM employees WHERE employee_id = ${employeeId} LIMIT 1
    `;
        const oldPhotoUrl = current[0]?.photo_url ?? null;

        const photo = await saveStudentPhoto(formData.get("photo"), "employees");
        if (!photo.ok) {
            return { error: photo.error, values };
        }
        savedPhotoUrl = photo.url;

        let newPhotoUrl = oldPhotoUrl;
        if (photo.url) {
            newPhotoUrl = photo.url;
        } else if (formData.get("removePhoto") === "1") {
            newPhotoUrl = null;
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
        gender          = ${values.gender || null},
        contact_number  = ${values.contactNumber || null},
        email           = ${values.email || null},
        photo_url       = ${newPhotoUrl}
      WHERE employee_id = ${employeeId}
    `;
        committed = true;

        // The old file is no longer used, so remove it from disk.
        if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl) {
            await deleteStudentPhoto(oldPhotoUrl);
        }

        if (password) {
            const hash = await bcrypt.hash(password, 12);

            // Same reasoning as on create: the nurse knows this password,
            // so the employee is asked to replace it at next login.
            await prisma.$executeRaw`
        UPDATE employees
        SET password = ${hash}, must_change_password = TRUE
        WHERE employee_id = ${employeeId}
      `;
        }

        await logAccess(
            actorOf(session),
            "employee_health_record",
            employeeId,
            "update",
            password
                ? `Employee details updated and password reset (${values.employeeNumber}).`
                : `Employee details updated (${values.employeeNumber}).`,
        );
    } catch (err) {
        console.error("Update employee error:", err);
        if (!committed) await deleteStudentPhoto(savedPhotoUrl);
        return { error: "Could not save the changes. Please try again.", values };
    }

    revalidatePath(BASE);
    revalidatePath(EMPLOYEES);
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

    await logAccess(actorOf(session), "employee_health_record", employeeId, "update", "Employee archived.");

    revalidatePath(BASE);
    revalidatePath(EMPLOYEES);
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

    await logAccess(
        actorOf(session),
        "employee_health_record",
        employeeId,
        "update",
        "Employee restored from archive.",
    );

    revalidatePath(BASE);
    revalidatePath(EMPLOYEES);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteEmployee(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageStudents(session.role)) return;

    const employeeId = Number(formData.get("employeeId"));
    if (!employeeId) return;

    // Retention is enforced here as well as in the page. The page only hides
    // the button; a form post straight to this action would otherwise bypass
    // the policy entirely.
    const rows = await prisma.$queryRaw<
        { archived_at: Date | null; employee_number: string; photo_url: string | null }[]
    >`
    SELECT archived_at, employee_number, photo_url FROM employees
    WHERE employee_id = ${employeeId} LIMIT 1
  `;
    const target = rows[0];
    if (!target?.archived_at) return;

    if (!canDeleteYet(target.archived_at)) {
        redirect(
            `/dashboard/archive-records?notice=retention&until=${encodeURIComponent(
                formatDeletableOn(target.archived_at)
            )}`
        );
    }

    await prisma.$executeRaw`
    DELETE FROM employees
    WHERE employee_id = ${employeeId}
      AND archived_at IS NOT NULL
      AND archived_at < NOW() - (${RETENTION_YEARS} || ' years')::interval
  `;

    // The record is gone, so its photo file should go too.
    await deleteStudentPhoto(target.photo_url);

    await logAccess(
        actorOf(session),
        "employee_health_record",
        employeeId,
        "delete",
        `Permanently deleted after the ${RETENTION_YEARS}-year retention period (${target.employee_number}).`,
    );

    revalidatePath(BASE);
    revalidatePath(EMPLOYEES);
    revalidatePath("/dashboard/archive-records");
}