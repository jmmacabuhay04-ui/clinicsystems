"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth/employee-session";

export type AvatarState = { error?: string; success?: string };

export async function saveEmployeeAvatar(
    _prev: AvatarState,
    formData: FormData
): Promise<AvatarState> {
    const session = await getEmployeeSession();
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
        await prisma.$executeRaw`
      UPDATE employees SET avatar = ${data} WHERE employee_id = ${session.employeeId}
    `;
    } catch (err) {
        console.error("Save employee avatar error:", err);
        return { error: "Could not save the picture. Please try again." };
    }

    revalidatePath("/employee", "layout");
    return { success: "Profile picture updated." };
}

export async function removeEmployeeAvatar() {
    const session = await getEmployeeSession();
    if (!session) return;

    await prisma.$executeRaw`
    UPDATE employees SET avatar = NULL WHERE employee_id = ${session.employeeId}
  `;

    revalidatePath("/employee", "layout");
}