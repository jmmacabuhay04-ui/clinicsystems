"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageAccounts, canCreateAccounts } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/password-policy";

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

export async function resetPassword(
    _prev: CreateUserState,
    formData: FormData
): Promise<CreateUserState> {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return { error: "Only admins can reset passwords." };
    }

    const userId = Number(formData.get("userId"));
    const password = String(formData.get("password") ?? "");

    if (!userId) return { error: "Invalid user." };

    const passwordError = checkPassword(formData, password);
    if (passwordError) return { error: passwordError };

    const target = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!target) return { error: "That account no longer exists." };

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
        where: { user_id: userId },
        data: { password: hashed },
    });

    revalidatePath("/dashboard/users");
    return { success: `Password reset for "${target.username}".` };
}