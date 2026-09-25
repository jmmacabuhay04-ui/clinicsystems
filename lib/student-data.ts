import { prisma } from "@/lib/prisma";

export type StudentInfo = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

export type VisitRecord = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};


export async function getStudent(studentId: number) {
    const rows = await prisma.$queryRaw<StudentInfo[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender,
           contact_number, email
    FROM students
    WHERE student_id = ${studentId} AND archived_at IS NULL
    LIMIT 1
  `;
    return rows[0];
}

export async function getVisits(studentId: number) {
    return prisma.$queryRaw<VisitRecord[]>`
    SELECT record_id, visit_date, complaint, action_taken, attending_staff,
           height_cm, weight_kg, heart_rate, blood_pressure, temperature
    FROM health_records
    WHERE student_id = ${studentId} AND archived_at IS NULL
    ORDER BY visit_date DESC, record_id DESC
  `;
}

export function formatDate(date: Date | null, month: "short" | "long" = "long") {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month,
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "—" : `${value}${unit}`;
}

export function initialsOf(first: string, last: string) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
export type DentalVisit = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    notes: string | null;
};

export async function getStudentDental(studentId: number) {
    return prisma.$queryRaw<DentalVisit[]>`
    SELECT dental_id, visit_date, procedure_name, tooth, dentist_name, status, notes
    FROM dental_records
    WHERE student_id = ${studentId} AND archived_at IS NULL
    ORDER BY visit_date DESC, dental_id DESC
  `;
}