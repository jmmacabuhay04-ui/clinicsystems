"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDental, canManageRecords } from "@/lib/permissions";
import { canDeleteYet, type RecordKind } from "@/lib/retention";

// ARCHIVE ng Health Forms (Student, Employee, Dental, Health Declaration).
// Hindi binubura ang form: naka-mark lang ng archived_at at nawawala sa listahan.
// Makikita at maibabalik sa Archive Records.

type FormKind = "student" | "employee" | "dental" | "declaration";

const FORM_PAGES: Record<FormKind, string> = {
    student: "/dashboard/student-health-form",
    employee: "/dashboard/employee-health-form",
    dental: "/dashboard/dental-health-form",
    declaration: "/dashboard/health-declaration",
};

// Kapareho ng pahintulot sa pag-edit ng bawat form
function allowed(kind: FormKind, role: string) {
    return kind === "dental" ? canManageDental(role) : canManageRecords(role);
}

function parseKind(v: FormDataEntryValue | null): FormKind | null {
    return v === "student" || v === "employee" || v === "dental" || v === "declaration" ? v : null;
}

// Archive gamit ang ID number ng tao (hindi ang form id), kaya gumagana ito mula sa listahan
async function archiveByNumber(kind: FormKind, number: string, userId: number | null) {
    switch (kind) {
        case "student":
            await prisma.$executeRaw`UPDATE student_health_forms SET archived_at = NOW(), archived_by = ${userId}
        WHERE archived_at IS NULL AND student_id = (SELECT student_id FROM students WHERE student_number = ${number})`;
            return;
        case "employee":
            await prisma.$executeRaw`UPDATE employee_health_forms SET archived_at = NOW(), archived_by = ${userId}
        WHERE archived_at IS NULL AND employee_id = (SELECT employee_id FROM employees WHERE employee_number = ${number})`;
            return;
        case "dental":
            await prisma.$executeRaw`UPDATE dental_health_forms SET archived_at = NOW(), archived_by = ${userId}
        WHERE archived_at IS NULL AND student_id = (SELECT student_id FROM students WHERE student_number = ${number})`;
            return;
        case "declaration":
            await prisma.$executeRaw`UPDATE health_declarations SET archived_at = NOW(), archived_by = ${userId}
        WHERE archived_at IS NULL AND student_id = (SELECT student_id FROM students WHERE student_number = ${number})`;
            return;
    }
}

async function restoreById(kind: FormKind, id: number) {
    switch (kind) {
        case "student":
            await prisma.$executeRaw`UPDATE student_health_forms SET archived_at = NULL, archived_by = NULL WHERE form_id = ${id}`;
            return;
        case "employee":
            await prisma.$executeRaw`UPDATE employee_health_forms SET archived_at = NULL, archived_by = NULL WHERE form_id = ${id}`;
            return;
        case "dental":
            await prisma.$executeRaw`UPDATE dental_health_forms SET archived_at = NULL, archived_by = NULL WHERE form_id = ${id}`;
            return;
        case "declaration":
            await prisma.$executeRaw`UPDATE health_declarations SET archived_at = NULL, archived_by = NULL WHERE declaration_id = ${id}`;
            return;
    }
}

async function archiveById(kind: FormKind, id: number, userId: number | null) {
    switch (kind) {
        case "student":
            await prisma.$executeRaw`UPDATE student_health_forms SET archived_at = NOW(), archived_by = ${userId} WHERE form_id = ${id} AND archived_at IS NULL`;
            return;
        case "employee":
            await prisma.$executeRaw`UPDATE employee_health_forms SET archived_at = NOW(), archived_by = ${userId} WHERE form_id = ${id} AND archived_at IS NULL`;
            return;
        case "dental":
            await prisma.$executeRaw`UPDATE dental_health_forms SET archived_at = NOW(), archived_by = ${userId} WHERE form_id = ${id} AND archived_at IS NULL`;
            return;
        case "declaration":
            await prisma.$executeRaw`UPDATE health_declarations SET archived_at = NOW(), archived_by = ${userId} WHERE declaration_id = ${id} AND archived_at IS NULL`;
            return;
    }
}

// Dalawang gamit: ⋮ menu sa listahan (personNumber) at button sa detail view (formId + returnTo)
export async function archiveHealthForm(formData: FormData) {
    const session = await getSession();
    if (!session) return;
    const kind = parseKind(formData.get("kind"));
    if (!kind || !allowed(kind, session.role)) return;

    const formId = Number(formData.get("formId"));
    const number = String(formData.get("personNumber") ?? "").trim();
    if (formId) {
        await archiveById(kind, formId, session.userId);
    } else if (number) {
        await archiveByNumber(kind, number, session.userId);
    } else {
        return;
    }

    // returnTo: panloob na path lang (hal. "/dashboard/...") para hindi mapunta sa ibang site
    const returnTo = String(formData.get("returnTo") ?? "");
    const target = returnTo.startsWith("/dashboard/") ? returnTo : FORM_PAGES[kind];
    revalidatePath(FORM_PAGES[kind]);
    revalidatePath("/dashboard/archive-records");
    redirect(target);
}

async function restoreHealthForm(kind: FormKind, formData: FormData) {
    const session = await getSession();
    if (!session || !allowed(kind, session.role)) return;
    const id = Number(formData.get("formId"));
    if (!id) return;

    await restoreById(kind, id);

    revalidatePath(FORM_PAGES[kind]);
    revalidatePath("/dashboard/archive-records");
}

export async function restoreStudentForm(formData: FormData) {
    return restoreHealthForm("student", formData);
}
export async function restoreEmployeeForm(formData: FormData) {
    return restoreHealthForm("employee", formData);
}
export async function restoreDentalForm(formData: FormData) {
    return restoreHealthForm("dental", formData);
}
export async function restoreDeclarationForm(formData: FormData) {
    return restoreHealthForm("declaration", formData);
}

const RETENTION_KIND: Record<FormKind, RecordKind> = {
    student: "student_form",
    employee: "employee_form",
    dental: "dental_form",
    declaration: "health_declaration",
};

async function archivedAtById(kind: FormKind, id: number): Promise<Date | null> {
    const rows = await (kind === "student"
        ? prisma.$queryRaw<{ archived_at: Date | null }[]>`SELECT archived_at FROM student_health_forms WHERE form_id = ${id}`
        : kind === "employee"
            ? prisma.$queryRaw<{ archived_at: Date | null }[]>`SELECT archived_at FROM employee_health_forms WHERE form_id = ${id}`
            : kind === "dental"
                ? prisma.$queryRaw<{ archived_at: Date | null }[]>`SELECT archived_at FROM dental_health_forms WHERE form_id = ${id}`
                : prisma.$queryRaw<{ archived_at: Date | null }[]>`SELECT archived_at FROM health_declarations WHERE declaration_id = ${id}`);
    return rows[0]?.archived_at ?? null;
}

async function deleteById(kind: FormKind, id: number) {
    switch (kind) {
        case "student":
            await prisma.$executeRaw`DELETE FROM student_health_forms WHERE form_id = ${id} AND archived_at IS NOT NULL`;
            return;
        case "employee":
            await prisma.$executeRaw`DELETE FROM employee_health_forms WHERE form_id = ${id} AND archived_at IS NOT NULL`;
            return;
        case "dental":
            await prisma.$executeRaw`DELETE FROM dental_health_forms WHERE form_id = ${id} AND archived_at IS NOT NULL`;
            return;
        case "declaration":
            await prisma.$executeRaw`DELETE FROM health_declarations WHERE declaration_id = ${id} AND archived_at IS NOT NULL`;
            return;
    }
}

// Permanent delete: bawal bago lumampas ang retention period (5 years)
async function deleteHealthForm(kind: FormKind, formData: FormData) {
    const session = await getSession();
    if (!session || !allowed(kind, session.role)) return;
    const id = Number(formData.get("formId"));
    if (!id) return;
    const archivedAt = await archivedAtById(kind, id);
    if (!archivedAt || !canDeleteYet(archivedAt, RETENTION_KIND[kind])) return;

    await deleteById(kind, id);

    revalidatePath(FORM_PAGES[kind]);
    revalidatePath("/dashboard/archive-records");
}

export async function deleteStudentForm(formData: FormData) {
    return deleteHealthForm("student", formData);
}
export async function deleteEmployeeForm(formData: FormData) {
    return deleteHealthForm("employee", formData);
}
export async function deleteDentalForm(formData: FormData) {
    return deleteHealthForm("dental", formData);
}
export async function deleteDeclarationForm(formData: FormData) {
    return deleteHealthForm("declaration", formData);
}