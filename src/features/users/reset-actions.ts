"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canCreateAccounts } from "@/lib/permissions";
import { sendMail } from "@/lib/mail/mailer";

const MAX_ATTEMPTS = 5;
type ResetRow = { id: number; new_password_hash: string; otp_hash: string; attempts: number };

// STEP 1: Admin / IT Tech enters new password -> OTP is emailed to the account owner
export async function resetUserPassword(formData: FormData) {
  const session = await getSession();
  if (!session || !canCreateAccounts(session.role)) return;

  const userId = Number(formData.get("userId"));
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) return;

  const rows = await prisma.$queryRaw<{ email: string }[]>`
        SELECT username AS email FROM users WHERE user_id = ${userId}
    `;
  const email = rows[0]?.email;
  if (!email) return;

  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  const passwordHash = await bcrypt.hash(password, 12);
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.$executeRaw`DELETE FROM password_reset_requests WHERE user_id = ${userId}`;
  await prisma.$executeRaw`
        INSERT INTO password_reset_requests (user_id, new_password_hash, otp_hash, expires_at)
        VALUES (${userId}, ${passwordHash}, ${otpHash}, NOW() + INTERVAL '10 minutes')
    `;

  let sent = true;
  try {
    await sendMail(
      email,
      "BCAS Clinic – Password reset OTP",
      `
            <div style="font-family:Arial,sans-serif;max-width:480px">
                <h2 style="color:#15664f">BCAS Clinic</h2>
                <p>An administrator requested a password reset for your account (<b>${email}</b>).</p>
                <p>Give this code to the administrator <b>only if you agree</b> to the reset:</p>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#15664f">${otp}</p>
                <p style="color:#666;font-size:12px">This code expires in 10 minutes. If you did not expect this, ignore this email — your password will not change.</p>
            </div>
            `
    );
  } catch (err) {
    console.error("OTP email failed:", err);
    sent = false;
    await prisma.$executeRaw`DELETE FROM password_reset_requests WHERE user_id = ${userId}`;
  }

  redirect(sent ? `/dashboard/users?otp=${userId}` : "/dashboard/users?reset=failed");
}

// STEP 2: Admin / IT Tech enters the OTP given by the owner -> password is changed
export async function verifyResetOtp(formData: FormData) {
  const session = await getSession();
  if (!session || !canCreateAccounts(session.role)) return;

  const userId = Number(formData.get("userId"));
  const otp = String(formData.get("otp") ?? "").trim();
  if (!userId || !otp) return;

  const rows = await prisma.$queryRaw<ResetRow[]>`
        SELECT id, new_password_hash, otp_hash, attempts
        FROM password_reset_requests
        WHERE user_id = ${userId} AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;
  const r = rows[0];
  if (!r) redirect("/dashboard/users?reset=expired");

  if (r.attempts >= MAX_ATTEMPTS) {
    await prisma.$executeRaw`DELETE FROM password_reset_requests WHERE id = ${r.id}`;
    redirect("/dashboard/users?reset=locked");
  }

  const ok = await bcrypt.compare(otp, r.otp_hash);
  if (!ok) {
    await prisma.$executeRaw`UPDATE password_reset_requests SET attempts = attempts + 1 WHERE id = ${r.id}`;
    redirect(`/dashboard/users?otp=${userId}&err=1`);
  }

  await prisma.$transaction([
    prisma.$executeRaw`UPDATE users SET password = ${r.new_password_hash} WHERE user_id = ${userId}`,
    prisma.$executeRaw`DELETE FROM password_reset_requests WHERE user_id = ${userId}`,
  ]);

  redirect("/dashboard/users?reset=done");
}