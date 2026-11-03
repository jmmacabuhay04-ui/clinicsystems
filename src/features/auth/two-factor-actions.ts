"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth/session";
import {
    clearPendingTwoFactor,
    getPendingTwoFactor,
    isCodeCorrect,
    startTwoFactor,
} from "@/lib/auth/two-factor";
import {
    checkLoginAllowed,
    clearLoginFailures,
    getClientIp,
    recordLoginFailure,
} from "@/lib/auth/login-guard";

export type TwoFactorState = { error?: string; success?: string };

// Kapareho ng normal na login (30 min na cookie, 15 min na idle logout sa browser)
const SESSION_MINUTES = 30;

function deviceFrom(ua: string) {
    if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
    return "Desktop";
}

async function log(username: string, status: string) {
    try {
        const h = await headers();
        const device = deviceFrom(h.get("user-agent") ?? "");
        await prisma.$executeRaw`
            INSERT INTO login_logs (username, status, device)
            VALUES (${username}, ${status}, ${device})
        `;
    } catch {
        // Hindi dapat pigilan ng log ang pag-login
    }
}

/** Ilagay ang 6-digit code na ipinadala sa email. */
export async function verifyTwoFactor(_prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
    const pending = await getPendingTwoFactor();
    if (!pending) return { error: "Your sign-in code has expired. Please sign in again." };

    const code = String(formData.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) return { error: "The code must be 6 digits." };

    // 5 maling code = 15 minutong lock (gamit ang login lock)
    const ip = await getClientIp();
    const guardKey = `2fa:${pending.username.toLowerCase()}`;
    const guard = await checkLoginAllowed(guardKey, ip);
    if (guard.blocked) return { error: guard.message };

    if (!isCodeCorrect(pending, code)) {
        const left = await recordLoginFailure(guardKey, ip);
        await log(pending.username, "failed");
        if (left <= 0) {
            await clearPendingTwoFactor();
            return { error: "Too many wrong codes. Please wait 15 minutes, then sign in again." };
        }
        return { error: `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` };
    }

    // Siguraduhing umiiral pa ang account at naka-on pa ang 2FA
    const user = await prisma.user.findUnique({ where: { user_id: pending.userId } });
    if (!user) {
        await clearPendingTwoFactor();
        return { error: "This account no longer exists." };
    }

    await clearLoginFailures(guardKey, ip);
    await clearPendingTwoFactor();
    await createSession({ userId: user.user_id, username: user.username, role: user.role }, SESSION_MINUTES);
    redirect("/dashboard");
}

/** Magpadala ng bagong code. */
export async function resendTwoFactor(): Promise<TwoFactorState> {
    const pending = await getPendingTwoFactor();
    if (!pending) return { error: "Your sign-in code has expired. Please sign in again." };

    const user = await prisma.user.findUnique({ where: { user_id: pending.userId } });
    if (!user) return { error: "This account no longer exists." };

    try {
        await startTwoFactor(user);
    } catch (err) {
        console.error("2FA resend failed:", err);
        return { error: "Could not send the code. Please try again." };
    }
    return { success: "A new code was sent to your email." };
}

/** Bumalik sa Sign In (kanselahin ang pending na login). */
export async function cancelTwoFactor() {
    await clearPendingTwoFactor();
    redirect("/login");
}