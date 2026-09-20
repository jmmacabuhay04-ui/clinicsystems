"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    if (password !== confirm) return { error: "Passwords do not match." };

    try {
        const user = await prisma.user.findUnique({ where: { username: email } });
        if (!user) return { error: "Invalid code. Please request a new one." };

        const codeHash = crypto.createHash("sha256").update(code).digest("hex");

        const rows = await prisma.$queryRaw<TokenRow[]>`
      SELECT id, expires_at FROM password_reset_tokens
      WHERE user_id = ${user.user_id}
        AND token_hash = ${codeHash}
        AND used_at IS NULL
      LIMIT 1
    `;
        const record = rows[0];

        if (!record) return { error: "Invalid code. Please check and try again." };
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
    } catch (err) {
        console.error("Verify OTP error:", err);
        return { error: "Something went wrong. Please try again." };
    }

    return { success: "Your password has been reset. You can now sign in." };
}