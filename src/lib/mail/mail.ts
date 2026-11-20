import { sendMail } from "./mailer";

/** Ipinapadala ang OTP ng Forgot Password sa email ng user. */
export async function sendOtpEmail(to: string, code: string) {
    // Local (next dev) na walang Gmail settings: ipakita ang code sa terminal.
    // Sa production, HINDI ini-print ang code (makikita ito sa logs ng Vercel); error na lang.
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        if (process.env.NODE_ENV !== "development") throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD missing");
        console.log(`\n=== PASSWORD RESET CODE for ${to}: ${code} ===\n`);
        return;
    }

    await sendMail(
        to,
        `Your BCAS Clinic password reset code: ${code}`,
        `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#15664f">BCAS Clinic System</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#15664f">${code}</p>
        <p>This code expires in 10 minutes and can only be used once.</p>
        <p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
    );
}
