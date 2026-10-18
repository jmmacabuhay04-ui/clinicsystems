"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

export type AvatarState = { error?: string; success?: string };

export async function saveStudentAvatar(
    _prev: AvatarState,
    formData: FormData
): Promise<AvatarState> {
    const session = await getStudentSession();
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
      UPDATE students SET avatar = ${data} WHERE student_id = ${Number(session.userId)}
    `;
    } catch (err) {
        console.error("Save student avatar error:", err);
        return { error: "Could not save the picture. Please try again." };
    }

    revalidatePath("/student", "layout");
    return { success: "Profile picture updated." };
}

export async function removeStudentAvatar() {
    const session = await getStudentSession();
    if (!session) return;

    await prisma.$executeRaw`
    UPDATE students SET avatar = NULL WHERE student_id = ${Number(session.userId)}
  `;

    revalidatePath("/student", "layout");
}