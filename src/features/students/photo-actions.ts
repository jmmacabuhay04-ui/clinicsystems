"use server";

// Pag-upload o pagtanggal ng nurse ng picture ng student o employee
// mula sa Health Record page (staff dashboard).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/permissions";

export type PhotoResult = { error?: string; success?: string };

type PersonType = "student" | "employee";

function refresh() {
    revalidatePath("/dashboard/student-health-records");
    revalidatePath("/dashboard/employee-health-records");
    revalidatePath("/student", "layout");
    revalidatePath("/employee", "layout");
}

export async function savePersonPhoto(type: PersonType, id: number, data: string): Promise<PhotoResult> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };
    if (!canManageStudents(session.role)) return { error: "Only nurses can change profile pictures." };

    if (type !== "student" && type !== "employee") return { error: "Invalid record." };
    if (!Number.isInteger(id) || id <= 0) return { error: "Invalid record." };
    if (!data) return { error: "Choose a photo first." };
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)) {
        return { error: "Invalid image. Please choose a JPG or PNG photo." };
    }
    if (data.length > 300_000) {
        return { error: "The image is too large. Please choose a smaller one." };
    }

    try {
        if (type === "student") {
            await prisma.$executeRaw`UPDATE students SET avatar = ${data} WHERE student_id = ${id}`;
        } else {
            await prisma.$executeRaw`UPDATE employees SET avatar = ${data} WHERE employee_id = ${id}`;
        }
    } catch (err) {
        console.error("Save person photo error:", err);
        return { error: "Could not save the picture. Please try again." };
    }

    refresh();
    return { success: "Profile picture updated." };
}

export async function removePersonPhoto(type: PersonType, id: number): Promise<PhotoResult> {
    const session = await getSession();
    if (!session) return { error: "Your session has expired. Please sign in again." };
    if (!canManageStudents(session.role)) return { error: "Only nurses can change profile pictures." };

    if (type !== "student" && type !== "employee") return { error: "Invalid record." };
    if (!Number.isInteger(id) || id <= 0) return { error: "Invalid record." };

    try {
        if (type === "student") {
            await prisma.$executeRaw`UPDATE students SET avatar = NULL WHERE student_id = ${id}`;
        } else {
            await prisma.$executeRaw`UPDATE employees SET avatar = NULL WHERE employee_id = ${id}`;
        }
    } catch (err) {
        console.error("Remove person photo error:", err);
        return { error: "Could not remove the picture. Please try again." };
    }

    refresh();
    return { success: "Profile picture removed." };
}