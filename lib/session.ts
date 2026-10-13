import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
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

// The token alone is not enough: a deleted account or a changed role must
// take effect right away, not after the (sliding) token finally expires.
// cache() makes this one query per request, however often it is called.
const currentRole = cache(async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { role: true },
    });
    return user?.role ?? null;
});

export async function getSession() {
    const cookieStore = await cookies();
    const session = await verifyToken(cookieStore.get(COOKIE)?.value);

    if (!session) return null;
    if (session.role === "student" || session.role === "employee") return null;

    const role = await currentRole(Number(session.userId));
    if (!role) return null;

    return { ...session, role };
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE);
}