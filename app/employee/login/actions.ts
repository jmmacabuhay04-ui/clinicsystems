"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createEmployeeSession, destroyEmployeeSession } from "@/lib/employee-session";

export type EmployeeLoginState = { error?: string };

const MAX_ATTEMPTS = 5; // wrong tries allowed
const WINDOW_MINUTES = 15; // within this many minutes

type Row = {
    employee_id: number;
    employee_number: string;
    password: string;
};

function deviceFrom(ua: string) {
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /Chrome\//.test(ua)
            ? "Chrome"
            : /Firefox\//.test(ua)
                ? "Firefox"
                : /Safari\//.test(ua)
                    ? "Safari"
                    : "Browser";

    const os = /Windows/.test(ua)
        ? "Windows"
        : /Android/.test(ua)
            ? "Android"
            : /iPhone|iPad/.test(ua)
                ? "iOS"
                : /Mac OS X/.test(ua)
                    ? "macOS"
                    : /Linux/.test(ua)
                        ? "Linux"
                        : "Unknown OS";

    return `${browser} · ${os}`;
}

async function log(username: string, status: string, device: string) {
    try {
        await prisma.$executeRaw`
      INSERT INTO login_logs (username, status, device)
      VALUES (${username}, ${status}, ${device})
    `;
    } catch (err) {
        console.error("Login log error:", err);
    }
}

export async function employeeLogin(
    _prev: EmployeeLoginState,
    formData: FormData
): Promise<EmployeeLoginState> {
    const employeeNumber = String(formData.get("employeeNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!employeeNumber || !password) {
        return { error: "Employee number and password are required." };
    }

    const headerList = await headers();
    const device = deviceFrom(headerList.get("user-agent") ?? "");

    // Count recent failed attempts for this employee number
    let recentFails = 0;
    try {
        const failRows = await prisma.$queryRaw<{ fails: bigint }[]>`
      SELECT COUNT(*) AS fails
      FROM login_logs
      WHERE username = ${employeeNumber}
        AND status = 'failed'
        AND created_at > NOW() - (${WINDOW_MINUTES} || ' minutes')::interval
    `;
        recentFails = Number(failRows[0]?.fails ?? 0);
    } catch (err) {
        console.error("Login attempt check error:", err);
    }

    if (recentFails >= MAX_ATTEMPTS) {
        await log(employeeNumber, "blocked", device);
        return {
            error: `Too many failed attempts. This account is locked for ${WINDOW_MINUTES} minutes. Please visit the clinic for help.`,
        };
    }

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT employee_id, employee_number, password
    FROM employees
    WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    const employee = rows[0];
    const valid = employee ? await bcrypt.compare(password, employee.password) : false;

    await log(employeeNumber, valid ? "success" : "failed", device);

    if (!employee || !valid) {
        const left = MAX_ATTEMPTS - (recentFails + 1);
        return {
            error:
                left > 0
                    ? `Invalid employee number or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid employee number or password. This account is now locked for ${WINDOW_MINUTES} minutes.`,
        };
    }

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