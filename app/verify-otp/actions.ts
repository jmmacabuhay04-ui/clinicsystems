"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/password-policy";
import {
    getClientIp,
    checkLoginAllowed,
    recordLoginFailure,
    clearLoginFailures,
} from "@/lib/login-guard";

export type VerifyState = { error?: string; success?: string };

type TokenRow = {
    id: number;
    expires_at: Date;
};

export async function verifyAndReset(
    _prev: VerifyState,
    formData: FormData
): Promise<VerifyState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const code = String(formData.get("code") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (!email || !code) return { error: "Enter the code sent to your email." };
    if (!/^\d{6}$/.test(code)) return { error: "The code must be 6 digits." };
    const weak = validatePasswordStrength(password);
    if (weak) return { error: weak };
    if (password !== confirm) return { error: "Passwords do not match." };

    // Rate limit OTP guesses per email and per IP. A 6-digit code can be
    // brute-forced in minutes without this. The "otp:" prefix keeps these
    // counters apart from the normal login counters.
    const guardKey = `otp:${email}`;
    const ip = await getClientIp();
    const guard = await checkLoginAllowed(guardKey, ip);
    if (guard.blocked) return { error: guard.message };

    try {
        const user = await prisma.user.findUnique({ where: { username: email } });
        if (!user) {
            await recordLoginFailure(guardKey, ip);
            return { error: "Invalid code. Please request a new one." };
        }

        const codeHash = crypto.createHash("sha256").update(code).digest("hex");

        const rows = await prisma.$queryRaw<TokenRow[]>`
      SELECT id, expires_at FROM password_reset_tokens
      WHERE user_id = ${user.user_id}
        AND token_hash = ${codeHash}
        AND used_at IS NULL
      LIMIT 1
    `;
        const record = rows[0];

        if (!record) {
            await recordLoginFailure(guardKey, ip);
            return { error: "Invalid code. Please check and try again." };
        }
        if (new Date(record.expires_at) < new Date()) {
            return { error: "This code has expired. Please request a new one." };
        }

        const hashed = await bcrypt.hash(password, 12);

        await prisma.$transaction([
            prisma.user.update({
                where: { user_id: user.user_id },
                data: { password: hashed },
            }),
            prisma.$executeRaw`
        UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${record.id}
      `,
        ]);
        await clearLoginFailures(guardKey, ip);
    } catch (err) {
        console.error("Verify OTP error:", err);
        return { error: "Something went wrong. Please try again." };
    }

    return { success: "Your password has been reset. You can now sign in." };
}