"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createEmployeeSession, destroyEmployeeSession } from "@/lib/employee-session";

export type EmployeeLoginState = { error?: string };

type Row = {
    employee_id: number;
    employee_number: string;
    password: string;
};

export async function employeeLogin(
    _prev: EmployeeLoginState,
    formData: FormData
): Promise<EmployeeLoginState> {
    const employeeNumber = String(formData.get("employeeNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!employeeNumber || !password) {
        return { error: "Employee number and password are required." };
    }

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT employee_id, employee_number, password
    FROM employees
    WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    const employee = rows[0];
    if (!employee) return { error: "Invalid employee number or password." };

    const valid = await bcrypt.compare(password, employee.password);
    if (!valid) return { error: "Invalid employee number or password." };

    await createEmployeeSession({
        employeeId: employee.employee_id,
        employeeNumber: employee.employee_number,
    });

    redirect("/employee/dashboard");
}

export async function employeeLogout() {
    await destroyEmployeeSession();
    redirect("/employee/login");
}