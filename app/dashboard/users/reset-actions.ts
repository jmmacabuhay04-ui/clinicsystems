"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageAccounts } from "@/lib/permissions";

export async function resetUserPassword(formData: FormData) {
    const session = await getSession();
    if (!session || !canManageAccounts(session.role)) return;

    const userId = Number(formData.get("userId"));
    const password = String(formData.get("password") ?? "");

    if (!userId || password.length < 8) return;

    const hash = await bcrypt.hash(password, 12);

    await prisma.$executeRaw`
    UPDATE users SET password = ${hash} WHERE user_id = ${userId}
  `;

    revalidatePath("/dashboard/users");
}