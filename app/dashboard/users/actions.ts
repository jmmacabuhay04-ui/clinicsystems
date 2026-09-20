"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type CreateUserState = {
    error?: string;
    success?: string;
};

const ROLES = ["admin", "doctor", "dentist", "nurse"];

export async function createUser(
    _prev: CreateUserState,
    formData: FormData
): Promise<CreateUserState> {
    const session = await getSession();
    if (!session || session.role !== "admin") {
        return { error: "Only admins can create accounts." };
    }

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!email || !password || !role) return { error: "All fields are required." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    if (!ROLES.includes(role)) return { error: "Invalid role." };

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
    if (password.length < 8) return { error: "Min. 8 characters." };

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.update({
        where: { user_id: userId },
        data: { password: hashed },
    });

    revalidatePath("/dashboard/users");
    return { success: "Password reset." };
}