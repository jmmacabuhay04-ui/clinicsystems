"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/auth/password-policy";

export type StudentState = {
    error?: string;
    values?: Record<string, string>;
};

const BASE = "/dashboard/student-health-records";

function collect(formData: FormData) {
    const values: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (typeof value === "string" && !key.startsWith("$")) values[key] = value.trim();
    }
    return values;
}

/**
 * Password policy check. The confirmation field is only enforced when the
 * form actually sends one, so this works with or without it.
 */
function checkPassword(values: Record<string, string>): string | null {
    const password = values["password"] ?? "";

    const strength = validatePasswordStrength(password);
    if (strength) return strength;

    if ("confirmPassword" in values && values["confirmPassword"] !== password) {
        return "Password and Confirm Password do not match.";
    }

    return null;
}

function validate(values: Record<string, string>, requirePassword: boolean) {
    const get = (key: string) => values[key] ?? "";

    if (!get("studentNumber") || !get("lastName") || !get("firstName")) {
        return "Student number, last name, and first name are required.";
    }
    if (get("studentNumber").length > 20) return "Student number is too long.";

    // On create a password is required; on edit it is optional, but when one
    // is supplied it must still satisfy the policy.
    if (requirePassword || get("password")) {
        const passwordError = checkPassword(values);
        if (passwordError) return passwordError;
    }

    if (get("dateOfBirth") && !/^\d{4}-\d{2}-\d{2}$/.test(get("dateOfBirth"))) {
        return "Enter a valid date of birth.";
    }
    if (get("gender") && get("gender") !== "Male" && get("gender") !== "Female") {
        return "Select a valid gender.";
    }
    return null;
}

export async function createStudent(
    _prev: StudentState,
    formData: FormData
): Promise<StudentState> {
    const values = collect(formData);
    const fail = (error: string): StudentState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("Only nurses can create student accounts.");

    const problem = validate(values, true);
    if (problem) return fail(problem);

    const studentNumber = get("studentNumber");

    try {
        const existing = await prisma.$queryRaw<{ student_id: number }[]>`
      SELECT student_id FROM students WHERE student_number = ${studentNumber} LIMIT 1
    `;
        if (existing[0]) return fail(`Student number ${studentNumber} is already registered.`);

        const hashed = await bcrypt.hash(get("password"), 12);

        // must_change_password = TRUE because the nurse chose this password
        // and therefore knows it. The student is forced to replace it at
        // first login. Change TRUE to FALSE below to turn this off.
        await prisma.$executeRaw`
      INSERT INTO students
        (student_number, password, last_name, first_name, middle_name,
         grade_level, program, date_of_birth, gender, must_change_password)
      VALUES
        (${studentNumber}, ${hashed}, ${get("lastName")}, ${get("firstName")},
         ${get("middleName") || null}, ${get("gradeLevel") || null}, ${get("program") || null},
         CAST(${get("dateOfBirth") || null} AS DATE), ${get("gender") || null}, TRUE)
    `;
    } catch (err) {
        console.error("Create student error:", err);
        return fail("Could not create the student account. Please try again.");
    }

    revalidatePath(BASE);
    revalidatePath("/dashboard");
    redirect(`${BASE}?student=${encodeURIComponent(studentNumber)}`);
}

export async function updateStudent(
    _prev: StudentState,
    formData: FormData
): Promise<StudentState> {
    const values = collect(formData);
    const fail = (error: string): StudentState => ({ error, values });
    const get = (key: string) => values[key] ?? "";

    const session = await getSession();
    if (!session) return fail("Your session has expired. Please sign in again.");
    if (!canManageRecords(session.role)) return fail("Only nurses can edit student accounts.");

    const studentId = Number(get("studentId"));
    if (!studentId) return fail("Invalid student.");

    const problem = validate(values, false);
    if (problem) return fail(problem);

    const studentNumber = get("studentNumber");

    try {
        const clash = await prisma.$queryRaw<{ student_id: number }[]>`
      SELECT student_id FROM students
      WHERE student_number = ${studentNumber} AND student_id <> ${studentId}
      LIMIT 1
    `;
        if (clash[0]) return fail(`Student number ${studentNumber} belongs to another student.`);

        await prisma.$executeRaw`
      UPDATE students
      SET student_number = ${studentNumber},
          last_name      = ${get("lastName")},
          first_name     = ${get("firstName")},
          middle_name    = ${get("middleName") || null},
          grade_level    = ${get("gradeLevel") || null},
          program        = ${get("program") || null},
          date_of_birth  = CAST(${get("dateOfBirth") || null} AS DATE),
          gender         = ${get("gender") || null}
      WHERE student_id = ${studentId}
    `;

        if (get("password")) {
            const hashed = await bcrypt.hash(get("password"), 12);

            // Same reasoning as on create: the nurse knows this password,
            // so the student is asked to replace it at next login.
            await prisma.$executeRaw`
        UPDATE students
        SET password = ${hashed}, must_change_password = TRUE
        WHERE student_id = ${studentId}
      `;
        }
    } catch (err) {
        console.error("Update student error:", err);
        return fail("Could not save the changes. Please try again.");
    }

    revalidatePath(BASE);
    redirect(`${BASE}?student=${encodeURIComponent(studentNumber)}`);
}