"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

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

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) return { error: "Enter your email and password." };

    const headerList = await headers();
    const device = deviceFrom(headerList.get("user-agent") ?? "");

    const user = await prisma.user.findUnique({ where: { username: email } });
    const valid = user ? await bcrypt.compare(password, user.password) : false;

    try {
        await prisma.$executeRaw`
      INSERT INTO login_logs (username, status, device)
      VALUES (${email}, ${valid ? "success" : "failed"}, ${device})
    `;
    } catch (err) {
        console.error("Login log error:", err);
    }

    if (!user || !valid) return { error: "Invalid email or password." };

    await createSession(
        { userId: user.user_id, username: user.username, role: user.role },
        user.session_minutes ?? 60
    );

    redirect("/dashboard");
}

export async function logout() {
    await deleteSession();
    redirect("/login");
}