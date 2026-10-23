"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { createStudentSession } from "@/lib/auth/student-session";
import { createEmployeeSession } from "@/lib/auth/employee-session";
import {
    getClientIp,
    checkLoginAllowed,
    recordLoginFailure,
    clearLoginFailures,
    LOCK_MINUTES,
} from "@/lib/auth/login-guard";

export type LoginState = { error?: string } | undefined;

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

type StudentRow = {
    student_id: number;
    student_number: string;
    password: string;
    must_change_password: boolean;
};

type EmployeeRow = {
    employee_id: number;
    employee_number: string;
    password: string;
    must_change_password: boolean;
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const identifier = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) return { error: "Enter your email or ID number and password." };

    const headerList = await headers();
    const device = deviceFrom(headerList.get("user-agent") ?? "");
    const ip = await getClientIp();

    const guard = await checkLoginAllowed(identifier, ip);
    if (guard.blocked) {
        await log(identifier, "blocked", device);
        return { error: guard.message };
    }

    let staff: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
    let student: StudentRow | undefined;
    let employee: EmployeeRow | undefined;

    try {
        const [staffRow, studentRows, employeeRows] = await Promise.all([
            prisma.user.findUnique({ where: { username: identifier.toLowerCase() } }),
            prisma.$queryRaw<StudentRow[]>`
                SELECT student_id, student_number, password, must_change_password
                FROM students
                WHERE student_number = ${identifier} AND archived_at IS NULL
                LIMIT 1
            `,
            prisma.$queryRaw<EmployeeRow[]>`
                SELECT employee_id, employee_number, password, must_change_password
                FROM employees
                WHERE employee_number = ${identifier} AND archived_at IS NULL
                LIMIT 1
            `,
        ]);
        staff = staffRow;
        student = studentRows[0];
        employee = employeeRows[0];
    } catch (err) {
        console.error("Login lookup error:", err);
        return { error: "Something went wrong. Please try again later." };
    }

    const staffOk = staff ? await bcrypt.compare(password, staff.password) : false;
    const studentOk = student ? await bcrypt.compare(password, student.password) : false;
    const employeeOk = employee ? await bcrypt.compare(password, employee.password) : false;

    if (!staffOk && !studentOk && !employeeOk) {
        const left = await recordLoginFailure(identifier, ip);
        await log(identifier, "failed", device);

        return {
            error:
                left > 0
                    ? `Invalid email/ID number or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid email/ID number or password. This account is now locked for ${LOCK_MINUTES} minutes.`,
        };
    }

    await clearLoginFailures(identifier, ip);
    await log(identifier, "success", device);

    if (staffOk && staff) {
        await createSession(
            { userId: staff.user_id, username: staff.username, role: staff.role },
            staff.session_minutes ?? 30
        );
        redirect("/dashboard");
    }

    if (studentOk && student) {
        await createStudentSession({
            userId: student.student_id,
            username: student.student_number,
            role: "student",
            mustChangePassword: student.must_change_password,
        });
        redirect("/student/dashboard");
    }

    if (employeeOk && employee) {
        await createEmployeeSession({
            employeeId: employee.employee_id,
            employeeNumber: employee.employee_number,
            mustChangePassword: employee.must_change_password,
        });
        redirect("/employee/dashboard");
    }

    return { error: "Something went wrong. Please try again later." };
}

export async function logout() {
    await deleteSession();
    redirect("/login");
}