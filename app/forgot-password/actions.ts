"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mail";

// Minimum seconds between two codes for the same account (anti email-bombing).
const RESEND_COOLDOWN_SECONDS = 60;

export type ForgotState = { error?: string };

export async function requestOtp(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Enter a valid email address." };
    }

    try {
        const user = await prisma.user.findUnique({ where: { username: email } });

        // Skip silently when a code was sent a moment ago. The response is the
        // same either way, so this does not reveal whether the email exists.
        const recent = user
            ? await prisma.$queryRaw<{ n: bigint }[]>`
                SELECT COUNT(*) AS n FROM password_reset_tokens
                WHERE user_id = ${user.user_id}
                  AND used_at IS NULL
                  AND created_at > NOW() - (${RESEND_COOLDOWN_SECONDS} || ' seconds')::interval
            `
            : [];

        if (user && Number(recent[0]?.n ?? 0) === 0) {
            const code = String(crypto.randomInt(100000, 1000000));
            const codeHash = crypto.createHash("sha256").update(code).digest("hex");
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.$executeRaw`
        DELETE FROM password_reset_tokens
        WHERE user_id = ${user.user_id} AND used_at IS NULL
      `;

            await prisma.$executeRaw`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.user_id}, ${codeHash}, ${expiresAt})
      `;

            await sendOtpEmail(email, code);
        }
    } catch (err) {
        console.error("Request OTP error:", err);
        return { error: "Something went wrong. Please try again later." };
    }

    redirect(`/verify-otp?email=${encodeURIComponent(email)}`);
}