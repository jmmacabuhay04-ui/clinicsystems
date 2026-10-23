import { cookies } from "next/headers";
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

export async function getStudentSession() {
    const cookieStore = await cookies();
    const session = await verifyToken(cookieStore.get(STUDENT_COOKIE)?.value);
    return session && session.role === "student" ? session : null;
}

export async function deleteStudentSession() {
    const cookieStore = await cookies();
    cookieStore.delete(STUDENT_COOKIE);
}