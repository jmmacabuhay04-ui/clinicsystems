"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth/session";

const BASE = "/dashboard/settings";

export type PasswordState = { error?: string; success?: string };
export type SessionState = { error?: string; success?: string };
export type AvatarState = { error?: string; success?: string };

export async function changePassword(
    _prev: PasswordState,
    formData: FormData
): Promise<PasswordState> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };

    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (!current || !next || !confirm) return { error: "All password fields are required." };
    if (next.length < 8) return { error: "New password must be at least 8 characters." };
    if (next !== confirm) return { error: "New passwords do not match." };
    if (next === current) return { error: "New password must be different from the current one." };

    try {
        const user = await prisma.user.findUnique({ where: { user_id: session.userId } });
        if (!user) return { error: "Account not found." };

        const ok = await bcrypt.compare(current, user.password);
        if (!ok) return { error: "Your current password is incorrect." };

        const hashed = await bcrypt.hash(next, 12);
        await prisma.user.update({
            where: { user_id: session.userId },
            data: { password: hashed },
        });
    } catch (err) {
        console.error("Change password error:", err);
        return { error: "Could not update the password. Please try again." };
    }

    revalidatePath(BASE);
    return { success: "Your password has been updated." };
}

export async function saveSessionSettings(
    _prev: SessionState,
    formData: FormData
): Promise<SessionState> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };

    const minutes = Number(formData.get("minutes"));
    const twoFactor = formData.get("twoFactor") === "on";

    if (![15, 30, 60, 240, 480].includes(minutes)) {
        return { error: "Select a valid auto-logout time." };
    }

    try {
        await prisma.user.update({
            where: { user_id: session.userId },
            data: { session_minutes: minutes, two_factor: twoFactor },
        });

        await createSession(
            { userId: session.userId, username: session.username, role: session.role },
            minutes
        );
    } catch (err) {
        console.error("Save session settings error:", err);
        return { error: "Could not save the settings. Please try again." };
    }

    revalidatePath(BASE);
    return { success: "Session settings saved." };
}

export async function saveAvatar(
    _prev: AvatarState,
    formData: FormData
): Promise<AvatarState> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };

    const data = String(formData.get("avatar") ?? "");

    if (!data) return { error: "Choose a photo first." };
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)) {
        return { error: "Invalid image. Please choose a JPG or PNG photo." };
    }
    if (data.length > 300_000) {
        return { error: "The image is too large. Please choose a smaller one." };
    }

    try {
        await prisma.user.update({
            where: { user_id: session.userId },
            data: { avatar: data },
        });
    } catch (err) {
        console.error("Save avatar error:", err);
        return { error: "Could not save the picture. Please try again." };
    }

    revalidatePath("/dashboard", "layout");
    return { success: "Profile picture updated." };
}

export async function removeAvatar() {
    const session = await getSession();
    if (!session) return;

    await prisma.user.update({
        where: { user_id: session.userId },
        data: { avatar: null },
    });

    revalidatePath("/dashboard", "layout");
}