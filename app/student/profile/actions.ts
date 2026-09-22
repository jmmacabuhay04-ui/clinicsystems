"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";
import { getStudent } from "@/lib/student-data";

export async function requestPasswordChange(formData: FormData) {
    const session = await getStudentSession();
    if (!session) redirect("/student/login");

    const student = await getStudent(Number(session.userId));
    if (!student) redirect("/student/login");

    const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

    // Only one pending request per student
    const pending = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM portal_password_requests
        WHERE student_id = ${student.student_id} AND status = 'pending'
    `;
    if (Number(pending[0]?.n ?? 0) === 0) {
        await prisma.$executeRaw`
            INSERT INTO portal_password_requests (student_id, note)
            VALUES (${student.student_id}, ${note})
        `;
    }

    revalidatePath("/student/profile");
    redirect("/student/profile?requested=1");
}