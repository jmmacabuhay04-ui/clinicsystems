"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mail";

export type ForgotState = { error?: string };

export async function requestOtp(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Enter a valid email address." };
    }

    try {
        const user = await prisma.user.findUnique({ where: { username: email } });

        if (user) {
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