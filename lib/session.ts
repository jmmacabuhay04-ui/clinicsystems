import { cookies } from "next/headers";
import { signToken, verifyToken, type SessionPayload } from "./jwt";

const COOKIE = "session";

export async function createSession(user: SessionPayload, minutes = 30) {
    const token = await signToken(user, minutes);
    const cookieStore = await cookies();

    cookieStore.set(COOKIE, token, {
        // Not readable by JavaScript, so an XSS bug cannot steal the token.
        httpOnly: true,
        // Only sent over HTTPS in production; stays off on localhost.
        secure: process.env.NODE_ENV === "production",
        // Blocks other sites from riding on this cookie (CSRF).
        sameSite: "lax",
        // Match the cookie lifetime to the token lifetime.
        maxAge: minutes * 60,
        path: "/",
    });
}

export async function getSession() {
    const cookieStore = await cookies();
    const session = await verifyToken(cookieStore.get(COOKIE)?.value);

    if (!session) return null;
    if (session.role === "student" || session.role === "employee") return null;

    return session;
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE);
}