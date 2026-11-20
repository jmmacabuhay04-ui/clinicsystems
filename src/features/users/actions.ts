"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canCreateAccounts } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/auth/password-policy";

export type CreateUserState = {
    error?: string;
    success?: string;
};

const ROLES = ["admin", "nurse", "doctor", "dentist", "ittech"];

/**
 * Checks the password against the system-wide policy, and against the
 * confirmation field when the form provides one.
 */
function checkPassword(formData: FormData, password: string): string | null {
    const strength = validatePasswordStrength(password);
    if (strength) return strength;

    const confirm = formData.get("confirmPassword");
    if (confirm !== null && String(confirm) !== password) {
        return "Password and Confirm Password do not match.";
    }

    return null;
}

export async function createUser(
    _prev: CreateUserState,
    formData: FormData
): Promise<CreateUserState> {
    const session = await getSession();
    if (!session || !canCreateAccounts(session.role)) {
        return { error: "You are not allowed to create accounts." };
    }
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!email || !password || !role) return { error: "All fields are required." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
    if (!ROLES.includes(role)) return { error: "Invalid role." };
    // Security: Administrator lang ang puwedeng gumawa ng Administrator account
    // (para hindi makagawa ang IT Tech ng account na may access sa lahat ng records)
    if (role === "admin" && session.role !== "admin") {
        return { error: "Only an Administrator can create Administrator accounts." };
    }

    // Staff accounts can read every health record, so the policy matters most here.
    const passwordError = checkPassword(formData, password);
    if (passwordError) return { error: passwordError };

    const existing = await prisma.user.findUnique({ where: { username: email } });
    if (existing) return { error: "That email is already registered." };

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.create({
        data: { username: email, password: hashed, role },
    });

    revalidatePath("/dashboard/users");
    return { success: `Account "${email}" created.` };
}

/* ---------- Edit / Delete ---------- */

const BACK = "/dashboard/users";

async function requireManager() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (session.role !== "admin" && session.role !== "ittech") redirect("/dashboard");
    return session;
}

export async function updateUser(formData: FormData) {
    const session = await requireManager();

    const userId = Number(formData.get("userId"));
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "");

    if (!userId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) || !ROLES.includes(role)) {
        redirect(`${BACK}?reset=invalid`);
    }

    const target = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!target) redirect(`${BACK}?reset=notfound`);

    const taken = await prisma.user.findFirst({
        where: { username, NOT: { user_id: userId } },
    });
    if (taken) redirect(`${BACK}?reset=exists`);

    // Security: hindi puwedeng palitan ang sariling role (hal. gawing Administrator ang sarili)
    if (target.user_id === session.userId && role !== target.role) redirect(`${BACK}?reset=selfrole`);
    // Security: Administrator lang ang puwedeng gumawa/magbago ng Administrator account
    if ((role === "admin" || target.role === "admin") && session.role !== "admin") {
        redirect(`${BACK}?reset=adminonly`);
    }

    // Don't demote the last admin
    if (target.role === "admin" && role !== "admin") {
        const admins = await prisma.user.count({ where: { role: "admin" } });
        if (admins <= 1) redirect(`${BACK}?reset=lastadmin`);
    }

    await prisma.user.update({
        where: { user_id: userId },
        data: { username, role },
    });

    revalidatePath(BACK);
    redirect(`${BACK}?reset=updated`);
}

