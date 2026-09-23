import { cookies } from "next/headers";
import { signToken, verifyToken, type SessionPayload } from "./jwt";

const COOKIE = "session";

export async function createSession(user: SessionPayload, minutes = 30) {
    const token = await signToken(user, minutes);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: minutes * 60,
    });
}

export async function getSession() {
    const cookieStore = await cookies();
    const session = await verifyToken(cookieStore.get(COOKIE)?.value);
    return session && session.role !== "student" ? session : null;
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE);
}