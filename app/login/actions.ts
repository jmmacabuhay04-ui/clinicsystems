"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

const MAX_ATTEMPTS = 5; // wrong tries allowed
const WINDOW_MINUTES = 15; // within this many minutes

function deviceFrom(ua: string) {
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /Chrome\//.test(ua)
            ? "Chrome"
            : /Firefox\//.test(ua)
                ? "Firefox"
                : /Safari\//.test(ua)
                    ? "Safari"
                    : "Browser";

    const os = /Windows/.test(ua)
        ? "Windows"
        : /Android/.test(ua)
            ? "Android"
            : /iPhone|iPad/.test(ua)
                ? "iOS"
                : /Mac OS X/.test(ua)
                    ? "macOS"
                    : /Linux/.test(ua)
                        ? "Linux"
                        : "Unknown OS";

    return `${browser} · ${os}`;
}

async function log(username: string, status: string, device: string) {
    try {
        await prisma.$executeRaw`
      INSERT INTO login_logs (username, status, device)
      VALUES (${username}, ${status}, ${device})
    `;
    } catch (err) {
        console.error("Login log error:", err);
    }
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) return { error: "Enter your email and password." };

    const headerList = await headers();
    const device = deviceFrom(headerList.get("user-agent") ?? "");

    // Count recent failed attempts for this email
    let recentFails = 0;
    try {
        const rows = await prisma.$queryRaw<{ fails: bigint }[]>`
      SELECT COUNT(*) AS fails
      FROM login_logs
      WHERE username = ${email}
        AND status = 'failed'
        AND created_at > NOW() - (${WINDOW_MINUTES} || ' minutes')::interval
    `;
        recentFails = Number(rows[0]?.fails ?? 0);
    } catch (err) {
        console.error("Login attempt check error:", err);
    }

    if (recentFails >= MAX_ATTEMPTS) {
        await log(email, "blocked", device);
        return {
            error: `Too many failed attempts. This account is locked for ${WINDOW_MINUTES} minutes. Please try again later or ask the IT Technician for help.`,
        };
    }

    const user = await prisma.user.findUnique({ where: { username: email } });
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    await log(email, valid ? "success" : "failed", device);

    if (!user || !valid) {
        const left = MAX_ATTEMPTS - (recentFails + 1);
        return {
            error:
                left > 0
                    ? `Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid email or password. This account is now locked for ${WINDOW_MINUTES} minutes.`,
        };
    }

    await createSession(
        { userId: user.user_id, username: user.username, role: user.role },
        user.session_minutes ?? 30
    );

    redirect("/dashboard");
}

export async function logout() {
    await deleteSession();
    redirect("/login");
}