"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createStudentSession, deleteStudentSession } from "@/lib/student-session";
import {
    getClientIp,
    checkLoginAllowed,
    recordLoginFailure,
    clearLoginFailures,
    LOCK_MINUTES,
    DUMMY_HASH,
} from "@/lib/login-guard";

export type StudentLoginState = { error?: string };

type StudentRow = {
    student_id: number;
    student_number: string;
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

export async function studentLogin(
    _prev: StudentLoginState,
    formData: FormData
): Promise<StudentLoginState> {
    const studentNumber = String(formData.get("studentNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!studentNumber || !password) {
        return { error: "Enter your student number and password." };
    }

    const headerList = await headers();
    const device = deviceFrom(headerList.get("user-agent") ?? "");
    const ip = await getClientIp();

    // Check the lockout table BEFORE touching the password.
    // Counts live in login_lockouts, so clearing login_logs cannot reset them.
    const guard = await checkLoginAllowed(studentNumber, ip);
    if (guard.blocked) {
        await log(studentNumber, "blocked", device);
        return { error: guard.message };
    }

    let student: StudentRow | undefined;

    try {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, password, must_change_password
      FROM students
      WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        student = rows[0];
    } catch (err) {
        console.error("Student login error:", err);
        return { error: "Something went wrong. Please try again later." };
    }

    const valid = (await bcrypt.compare(password, student?.password ?? DUMMY_HASH)) && !!student;

    if (!student || !valid) {
        const left = await recordLoginFailure(studentNumber, ip);
        await log(studentNumber, "failed", device);

        return {
            error:
                left > 0
                    ? `Invalid student number or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid student number or password. This account is now locked for ${LOCK_MINUTES} minutes.`,
        };
    }

    // Correct password: clear the counters for this account and this device.
    await clearLoginFailures(studentNumber, ip);
    await log(studentNumber, "success", device);

    await createStudentSession({
        userId: student.student_id,
        username: student.student_number,
        role: "student",
        // When true, proxy.ts sends them to /student/change-password first.
        mustChangePassword: student.must_change_password,
    });

    redirect("/student/dashboard");
}

export async function studentLogout() {
    await deleteStudentSession();
    redirect("/student/login");
}