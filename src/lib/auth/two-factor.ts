// TWO-FACTOR AUTHENTICATION (staff lang)
//
// Kapag naka-on ang Two-Factor sa Settings:
//   1. Tama ang password -> may 6-digit code na ipapadala sa email ng staff.
//   2. May "pending_2fa" na cookie (10 minuto) na may HMAC ng code (hindi ang code mismo).
//   3. Sa /two-factor, ilalagay ang code. Kapag tama -> saka lang gagawin ang session.
//
// Walang bagong table na kailangan: nasa signed cookie ang lahat, at ang
// limit sa maling code (5 = 15 minutong lock) ay gumagamit ng login_lockouts.

import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getKey } from "@/lib/auth/jwt";
import { sendMail } from "@/lib/mail/mailer";

const COOKIE = "pending_2fa";
export const TWO_FACTOR_MINUTES = 10;

export type PendingTwoFactor = {
    userId: number;
    username: string;
    role: string;
    mac: string;
};

/** HMAC gamit ang SESSION_SECRET (hindi mahuhulaan ang code kahit mabasa ang cookie) */
function macWithSessionKey(data: string) {
    return crypto.createHmac("sha256", Buffer.from(getKey())).update(data).digest("hex");
}

function key() {
    // Iba ang pirma nito sa session cookie (may "2fa:" sa unahan ng HMAC key)
    return new TextEncoder().encode(macWithSessionKey("2fa-cookie-key"));
}

function codeMac(userId: number, code: string) {
    return macWithSessionKey(`2fa:${userId}:${code}`);
}

/** Gumawa ng code, ipadala sa email, at i-save ang pending cookie. */
export async function startTwoFactor(user: { user_id: number; username: string; role: string }) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

    // Local na walang Gmail settings: ipakita ang code sa terminal (gaya ng Forgot Password)
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        if (process.env.NODE_ENV !== "development") throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD missing");
        console.log(`\n=== 2FA CODE for ${user.username}: ${code} ===\n`);
    } else await sendMail(
        user.username,
        "BCAS Clinic – Your sign-in code",
        `
        <div style="font-family:Arial,sans-serif;max-width:480px">
            <h2 style="color:#15664f">BCAS Clinic</h2>
            <p>Use this code to finish signing in to <b>${user.username}</b>:</p>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#15664f">${code}</p>
            <p style="color:#666;font-size:12px">This code expires in ${TWO_FACTOR_MINUTES} minutes. If you did not try to sign in, change your password right away.</p>
        </div>
        `,
    );

    const token = await new SignJWT({
        userId: user.user_id,
        username: user.username,
        role: user.role,
        mac: codeMac(user.user_id, code),
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${TWO_FACTOR_MINUTES}m`)
        .sign(key());

    const store = await cookies();
    store.set(COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TWO_FACTOR_MINUTES * 60,
    });
}

/** Ang naka-pending na login (null kung wala o expired na). */
export async function getPendingTwoFactor(): Promise<PendingTwoFactor | null> {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
        const p = payload as unknown as PendingTwoFactor;
        if (!p.userId || !p.mac) return null;
        return p;
    } catch {
        return null;
    }
}

/** Tama ba ang code? (constant-time na paghahambing) */
export function isCodeCorrect(pending: PendingTwoFactor, code: string) {
    const expected = Buffer.from(pending.mac, "hex");
    const actual = Buffer.from(codeMac(pending.userId, code), "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function clearPendingTwoFactor() {
    const store = await cookies();
    store.delete(COOKIE);
}