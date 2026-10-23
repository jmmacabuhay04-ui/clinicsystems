"use server";

import { getSession, createSession, deleteSession } from "@/lib/auth/session";

// Gaano katagal ang session cookie tuwing pinapahaba (dapat mas mahaba sa 15 min na idle timer).
const COOKIE_MINUTES = 30;

/** Tinatawag habang ginagamit ang system: pinapahaba ang session. */
export async function refreshSession(): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;

    await createSession(
        { userId: session.userId, username: session.username, role: session.role },
        COOKIE_MINUTES,
    );
    return true;
}

/** Tinatawag pagkatapos ng 15 minutong walang galaw. */
export async function logoutSession(): Promise<void> {
    await deleteSession();
}