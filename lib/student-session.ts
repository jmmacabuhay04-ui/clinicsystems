import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { signToken, verifyToken, type SessionPayload } from "./jwt";

export const STUDENT_COOKIE = "student_session";

export async function createStudentSession(student: SessionPayload) {
    const token = await signToken(student);
    const cookieStore = await cookies();
    cookieStore.set(STUDENT_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });
}

// An archived or deleted student must lose access immediately.
const isActiveStudent = cache(async (studentId: number) => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`
        SELECT 1 AS ok FROM students
        WHERE student_id = ${studentId} AND archived_at IS NULL
        LIMIT 1
    `;
    return rows.length > 0;
});

export async function getStudentSession() {
    const cookieStore = await cookies();
    const session = await verifyToken(cookieStore.get(STUDENT_COOKIE)?.value);
    if (!session || session.role !== "student") return null;
    if (!(await isActiveStudent(Number(session.userId)))) return null;
    return session;
}

export async function deleteStudentSession() {
    const cookieStore = await cookies();
    cookieStore.delete(STUDENT_COOKIE);
}