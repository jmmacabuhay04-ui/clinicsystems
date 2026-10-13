"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import {
    getClientIp,
    checkLoginAllowed,
    recordLoginFailure,
    clearLoginFailures,
    LOCK_MINUTES,
    DUMMY_HASH,
} from "@/lib/login-guard";

export type LoginState = { error?: string } | undefined;

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
    const ip = await getClientIp();

    // Check the lockout table BEFORE touching the password.
    // Counts live in login_lockouts, so clearing login_logs cannot reset them.
    const guard = await checkLoginAllowed(email, ip);
    if (guard.blocked) {
        await log(email, "blocked", device);
        return { error: guard.message };
    }

    const user = await prisma.user.findUnique({ where: { username: email } });
    const valid = (await bcrypt.compare(password, user?.password ?? DUMMY_HASH)) && !!user;

    if (!user || !valid) {
        const left = await recordLoginFailure(email, ip);
        await log(email, "failed", device);

        return {
            error:
                left > 0
                    ? `Invalid email or password. ${left} attempt${left === 1 ? "" : "s"} left before this account is locked.`
                    : `Invalid email or password. This account is now locked for ${LOCK_MINUTES} minutes.`,
        };
    }

    // Correct password: clear the counters for this user and this device.
    await clearLoginFailures(email, ip);
    await log(email, "success", device);

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