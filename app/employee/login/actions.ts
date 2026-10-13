"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createEmployeeSession, destroyEmployeeSession } from "@/lib/employee-session";
import {
    getClientIp,
    checkLoginAllowed,
    recordLoginFailure,
    clearLoginFailures,
    LOCK_MINUTES,
    DUMMY_HASH,
} from "@/lib/login-guard";

export type EmployeeLoginState = { error?: string };

type Row = {
    employee_id: number;
    employee_number: string;
    password: string;
    must_change_password: boolean;
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
    const ip = await getClientIp();

    // Check the lockout table BEFORE touching the password.
    // Counts live in login_lockouts, so clearing login_logs cannot reset them.
    const guard = await checkLoginAllowed(employeeNumber, ip);
    if (guard.blocked) {
        await log(employeeNumber, "blocked", device);
        return { error: guard.message };
    }

    const rows = await prisma.$queryRaw<Row[]>`
    SELECT employee_id, employee_number, password, must_change_password
    FROM employees
    WHERE employee_number = ${employeeNumber} AND archived_at IS NULL
    LIMIT 1
  `;
    const employee = rows[0];
    const valid = (await bcrypt.compare(password, employee?.password ?? DUMMY_HASH)) && !!employee;

    if (!employee || !valid) {
        const left = await recordLoginFailure(employeeNumber, ip);
        await log(employeeNumber, "failed", device);

        return {
            error:
                left > 0
                    ? `Invalid employee number or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid employee number or password. This account is now locked for ${LOCK_MINUTES} minutes.`,
        };
    }

    // Correct password: clear the counters for this account and this device.
    await clearLoginFailures(employeeNumber, ip);
    await log(employeeNumber, "success", device);

    await createEmployeeSession({
        employeeId: employee.employee_id,
        employeeNumber: employee.employee_number,
        // When true, proxy.ts sends them to /employee/change-password first.
        mustChangePassword: employee.must_change_password,
    });

    redirect("/employee/dashboard");
}

export async function employeeLogout() {
    await destroyEmployeeSession();
    redirect("/employee/login");
}