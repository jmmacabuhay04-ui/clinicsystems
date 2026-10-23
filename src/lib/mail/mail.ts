import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, code: string) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.log("\n==============================================");
        console.log(`OTP CODE for ${to}: ${code}`);
        console.log("==============================================\n");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });

    await transporter.sendMail({
        from: `"BCAS Clinic System" <${user}>`,
        to,
        subject: `Your BCAS Clinic password reset code: ${code}`,
        html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#15664f">BCAS Clinic System</h2>
        <p>Use this code to reset your password:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#15664f">${code}</p>
        <p>This code expires in 10 minutes and can only be used once.</p>
        <p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
    });
}