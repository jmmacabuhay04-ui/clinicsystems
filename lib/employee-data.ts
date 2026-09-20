import { prisma } from "@/lib/prisma";

export type EmployeeInfo = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
};

export type EmployeeVisit = {
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

export async function getEmployee(employeeId: number) {
    const rows = await prisma.$queryRaw<EmployeeInfo[]>`
    SELECT employee_id, employee_number, last_name, first_name, middle_name,
           department, position, date_of_birth, gender
    FROM employees
    WHERE employee_id = ${employeeId}
    LIMIT 1
  `;
    return rows[0];
}

export async function getEmployeeVisits(employeeId: number) {
    return prisma.$queryRaw<EmployeeVisit[]>`
    SELECT record_id, visit_date, complaint, action_taken, attending_staff,
           height_cm, weight_kg, heart_rate, blood_pressure, temperature
    FROM employee_health_records
    WHERE employee_id = ${employeeId} AND archived_at IS NULL
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