"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createStudentSession, deleteStudentSession } from "@/lib/student-session";

export type StudentLoginState = { error?: string };

const MAX_ATTEMPTS = 10; // wrong tries allowed
const WINDOW_MINUTES = 15; // within this many minutes

type StudentRow = {
    student_id: number;
    student_number: string;
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

    // Count recent failed attempts for this student number
    let recentFails = 0;
    try {
        const rows = await prisma.$queryRaw<{ fails: bigint }[]>`
      SELECT COUNT(*) AS fails
      FROM login_logs
      WHERE username = ${studentNumber}
        AND status = 'failed'
        AND created_at > NOW() - (${WINDOW_MINUTES} || ' minutes')::interval
    `;
        recentFails = Number(rows[0]?.fails ?? 0);
    } catch (err) {
        console.error("Login attempt check error:", err);
    }

    if (recentFails >= MAX_ATTEMPTS) {
        await log(studentNumber, "blocked", device);
        return {
            error: `Too many failed attempts. This account is locked for ${WINDOW_MINUTES} minutes. Please visit the clinic for help.`,
        };
    }

    let student: StudentRow | undefined;

    try {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, password
      FROM students
      WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        student = rows[0];
    } catch (err) {
        console.error("Student login error:", err);
        return { error: "Something went wrong. Please try again later." };
    }

    const valid = student ? await bcrypt.compare(password, student.password) : false;

    await log(studentNumber, valid ? "success" : "failed", device);

    if (!student || !valid) {
        const left = MAX_ATTEMPTS - (recentFails + 1);
        return {
            error:
                left > 0
                    ? `Invalid student number or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid student number or password. This account is now locked for ${WINDOW_MINUTES} minutes.`,
        };
    }

    await createStudentSession({
        userId: student.student_id,
        username: student.student_number,
        role: "student",
    });

    redirect("/student/dashboard");
}

export async function studentLogout() {
    await deleteStudentSession();
    redirect("/student/login");
}