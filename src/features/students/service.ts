// Students service: business rules at permissions.
// Tinatawag ng actions.ts at ng mga page; ang repository lang ang kumakausap sa DB.
import bcrypt from "bcryptjs";
import { canManageRecords } from "@/lib/permissions";
import { canDeleteYet, formatDeletableOn, RETENTION_YEARS } from "@/lib/retention";
import { logAccess } from "@/lib/access-log";
import { studentRepository } from "./repository";
import { toStudentInput, validateStudent } from "./schema";
import type { Actor, StudentFilters } from "./types";

export const STUDENTS_PAGE_SIZE = 10;

/** Re-authentication: the staff member must type their own password. */
async function verifyStaffPassword(userId: number, input: string) {
    if (!input) return false;
    const hash = await studentRepository.findStaffPasswordHash(userId);
    if (!hash) return false;
    return bcrypt.compare(input, hash);
}

// ------------------------------------------------------------------ reads

export async function listStudents(filters: StudentFilters, page: number) {
    const offset = (page - 1) * STUDENTS_PAGE_SIZE;
    const [students, total] = await Promise.all([
        studentRepository.findPage(filters, STUDENTS_PAGE_SIZE, offset),
        studentRepository.count(filters),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));
    return { students, total, totalPages };
}

export function getStudentFilterOptions() {
    return studentRepository.filterOptions();
}

export function getActiveStudent(studentNumber: string) {
    return studentRepository.findActiveByNumber(studentNumber);
}

// ----------------------------------------------------------------- writes
// Ibinabalik ang error message (string) kapag may problema, o null kapag OK.

export async function createStudent(actor: Actor, values: Record<string, string>) {
    if (!canManageRecords(actor.role)) return "Only nurses can create student accounts.";

    const problem = validateStudent(values, true);
    if (problem) return problem;

    // The form asks for the staff password, so the server must verify it.
    const confirmed = await verifyStaffPassword(actor.userId, values["staffPassword"] ?? "");
    if (!confirmed) {
        return "Your own password is incorrect. The student account was not created.";
    }

    const data = toStudentInput(values);

    try {
        if (await studentRepository.numberTaken(data.studentNumber)) {
            return `Student number ${data.studentNumber} is already registered.`;
        }
        if (data.email && (await studentRepository.emailTaken(data.email))) {
            return `${data.email} is already used by another student.`;
        }

        const hashed = await bcrypt.hash(values["password"] ?? "", 12);
        await studentRepository.insert(data, hashed);
    } catch (err) {
        console.error("Create student error:", err);
        return "Could not create the student account. Please try again.";
    }

    return null;
}

export async function updateStudent(actor: Actor, values: Record<string, string>) {
    if (!canManageRecords(actor.role)) return "Only nurses can edit student accounts.";

    const studentId = Number(values["studentId"] ?? "");
    if (!studentId) return "Invalid student.";

    const problem = validateStudent(values, false);
    if (problem) return problem;

    const newPassword = values["password"] ?? "";

    // Only a password change needs re-authentication; editing the name does not.
    if (newPassword) {
        const confirmed = await verifyStaffPassword(actor.userId, values["staffPassword"] ?? "");
        if (!confirmed) return "Your own password is incorrect. The password was not changed.";
    }

    const data = toStudentInput(values);

    try {
        if (await studentRepository.numberTaken(data.studentNumber, studentId)) {
            return `Student number ${data.studentNumber} belongs to another student.`;
        }
        if (data.email && (await studentRepository.emailTaken(data.email, studentId))) {
            return `${data.email} is already used by another student.`;
        }

        await studentRepository.update(studentId, data);

        if (newPassword) {
            // Same reasoning as on create: the nurse knows this password.
            const hashed = await bcrypt.hash(newPassword, 12);
            await studentRepository.setPassword(studentId, hashed);
        }
    } catch (err) {
        console.error("Update student error:", err);
        return "Could not save the changes. Please try again.";
    }

    return null;
}

export async function archiveStudent(actor: Actor, studentId: number) {
    if (!canManageRecords(actor.role) || !studentId) return;

    await studentRepository.archive(studentId, actor.userId);
    await logAccess(actor, "student_health_record", studentId, "update", "Student archived.");
}

export async function restoreStudent(actor: Actor, studentId: number) {
    if (!canManageRecords(actor.role) || !studentId) return;

    await studentRepository.restore(studentId);
    await logAccess(
        actor,
        "student_health_record",
        studentId,
        "update",
        "Student restored from archive.",
    );
}

export type DeleteStudentResult =
    | { status: "skipped" }
    | { status: "retention"; deletableOn: string }
    | { status: "deleted" };

export async function deleteStudent(actor: Actor, studentId: number): Promise<DeleteStudentResult> {
    if (!canManageRecords(actor.role) || !studentId) return { status: "skipped" };

    const target = await studentRepository.findArchiveInfo(studentId);

    // Not archived at all: nothing to delete here.
    if (!target || !target.archived_at) return { status: "skipped" };

    // Data retention policy. A health record may still be needed years after
    // the student leaves, so it cannot be erased before the period is over.
    if (!canDeleteYet(target.archived_at)) {
        return { status: "retention", deletableOn: formatDeletableOn(target.archived_at) };
    }

    await studentRepository.deleteAfterRetention(studentId, RETENTION_YEARS);
    await logAccess(
        actor,
        "student_health_record",
        studentId,
        "delete",
        `Permanently deleted after the ${RETENTION_YEARS}-year retention period (${target.student_number}).`,
    );

    return { status: "deleted" };
}
