"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sendMail } from "@/lib/mail/mailer";

const BACK = "/dashboard/users";
const MAX_ATTEMPTS = 3;

type DeleteRequestRow = { id: number; otp_hash: string; attempts: number };

// Admin / IT Tech lang, at hinahanap ang account ng naka-login mula sa database
// para sa tamang email na pagpapadalhan ng OTP.
async function requireManager() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (session.role !== "admin" && session.role !== "ittech") redirect("/dashboard");

    const s = session as any;
    const id = Number(s.userId ?? s.user_id ?? s.id ?? 0);
    const name = String(s.username ?? s.email ?? "").trim().toLowerCase();

    const actor = id
        ? await prisma.user.findUnique({ where: { user_id: id } })
        : name
            ? await prisma.user.findUnique({ where: { username: name } })
            : null;

    if (!actor) redirect(`${BACK}?reset=noactor`);
    return actor;
}

// Ibinabalik ang notice key kung bawal burahin ang account, o null kung puwede.
async function deleteBlocker(
    actorId: number,
    target: { user_id: number; role: string }
): Promise<string | null> {
    if (target.user_id === actorId) return "self";
    if (target.role === "admin") {
        const admins = await prisma.user.count({ where: { role: "admin" } });
        if (admins <= 1) return "lastadmin";
    }
    return null;
}

// STEP 1: pinindot ang Delete -> OTP ang ipapadala sa email ng account na BUBURAHIN (target).
// Ibibigay ng may-ari ng account ang code sa admin para makumpirma.
export async function requestDeleteOtp(formData: FormData) {
    const actor = await requireManager();

    const userId = Number(formData.get("userId"));
    if (!userId) redirect(`${BACK}?reset=invalid`);

    const target = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!target) redirect(`${BACK}?reset=notfound`);

    const blocked = await deleteBlocker(actor.user_id, target);
    if (blocked) redirect(`${BACK}?reset=${blocked}`);

    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
    const otpHash = await bcrypt.hash(otp, 10);

    // Isang aktibong request lang bawat admin.
    // Nasa iisang transaction ang delete at insert para walang race, at
    // nahuhuli ang DB error (hal. kulang na table) imbes na mag-crash ang page.
    // Nasa labas ng try ang redirect() dahil nagta-throw ito nang sadya.
    let saved = true;
    try {
        await prisma.$transaction([
            prisma.$executeRaw`DELETE FROM delete_account_requests WHERE requested_by = ${actor.user_id}`,
            prisma.$executeRaw`
                INSERT INTO delete_account_requests (target_user_id, requested_by, otp_hash, expires_at)
                VALUES (${userId}, ${actor.user_id}, ${otpHash}, NOW() + INTERVAL '5 minutes')
            `,
        ]);
    } catch (err) {
        console.error("Delete OTP request could not be saved:", err);
        saved = false;
    }
    if (!saved) redirect(`${BACK}?reset=delsavefailed`);

    let sent = true;
    try {
        await sendMail(
            target.username,
            "BCAS Clinic – Account deletion OTP",
            `
            <div style="font-family:Arial,sans-serif;max-width:480px">
                <h2 style="color:#15664f">BCAS Clinic</h2>
                <p>An administrator (<b>${actor.username}</b>) has requested to permanently delete your account <b>${target.username}</b>.</p>
                <p>If you agree, give this code to the administrator to confirm the deletion:</p>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#b91c1c">${otp}</p>
                <p style="color:#666;font-size:12px">This code expires in 5 minutes and can be used only once. If you do not agree, do not share this code and your account will not be deleted.</p>
            </div>
            `
        );
    } catch (err) {
        console.error("Delete OTP email failed:", err);
        sent = false;
        await prisma.$executeRaw`DELETE FROM delete_account_requests WHERE requested_by = ${actor.user_id}`;
    }

    redirect(sent ? `${BACK}?del=${userId}` : `${BACK}?reset=delmailfailed`);
}

// STEP 2: tama ang OTP -> saka lang buburahin ang account
export async function confirmDeleteOtp(formData: FormData) {
    const actor = await requireManager();

    const userId = Number(formData.get("userId"));
    const otp = String(formData.get("otp") ?? "").trim();
    if (!userId) redirect(`${BACK}?reset=invalid`);
    if (!/^\d{6}$/.test(otp)) redirect(`${BACK}?del=${userId}&derr=1`);

    const rows = await prisma.$queryRaw<DeleteRequestRow[]>`
        SELECT id, otp_hash, attempts
        FROM delete_account_requests
        WHERE target_user_id = ${userId}
          AND requested_by = ${actor.user_id}
          AND expires_at > NOW()
        ORDER BY id DESC
        LIMIT 1
    `;
    const r = rows[0];
    if (!r) redirect(`${BACK}?reset=delexpired`);

    if (r.attempts >= MAX_ATTEMPTS) {
        await prisma.$executeRaw`DELETE FROM delete_account_requests WHERE id = ${r.id}`;
        redirect(`${BACK}?reset=dellocked`);
    }

    const ok = await bcrypt.compare(otp, r.otp_hash);
    if (!ok) {
        await prisma.$executeRaw`UPDATE delete_account_requests SET attempts = attempts + 1 WHERE id = ${r.id}`;
        redirect(`${BACK}?del=${userId}&derr=1`);
    }

    // Isang beses lang magagamit ang code, kaya binubura muna ang request
    await prisma.$executeRaw`DELETE FROM delete_account_requests WHERE id = ${r.id}`;

    // Ulitin ang mga pagsusuri, dahil maaaring nagbago ang sitwasyon mula noong nag-request
    const target = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!target) redirect(`${BACK}?reset=notfound`);

    const blocked = await deleteBlocker(actor.user_id, target);
    if (blocked) redirect(`${BACK}?reset=${blocked}`);

    let result = "deleted";
    try {
        await prisma.user.delete({ where: { user_id: userId } });
    } catch (e: any) {
        // P2003 = may linked records (foreign key)
        result = e?.code === "P2003" ? "linked" : "deletefailed";
    }

    revalidatePath(BACK);
    redirect(`${BACK}?reset=${result}`);
}