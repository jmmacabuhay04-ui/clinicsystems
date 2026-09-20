"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createStudentSession, deleteStudentSession } from "@/lib/student-session";

export type StudentLoginState = { error?: string };

type StudentRow = {
    student_id: number;
    student_number: string;
    password: string;
};

export async function studentLogin(
    _prev: StudentLoginState,
    formData: FormData
): Promise<StudentLoginState> {
    const studentNumber = String(formData.get("studentNumber") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!studentNumber || !password) {
        return { error: "Enter your student number and password." };
    }

    let student: StudentRow | undefined;

    try {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, password
      FROM students
            WHERE student_number = ${studentNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        student = rows[0];
    } catch (err) {
        console.error("Student login error:", err);
        return { error: "Something went wrong. Please try again later." };
    }

    const valid = student ? await bcrypt.compare(password, student.password) : false;

    if (!student || !valid) {
        return { error: "Invalid student number or password." };
    }

    await createStudentSession({
        userId: student.student_id,
        username: student.student_number,
        role: "student",
    });

    redirect("/student/dashboard");
}

export async function studentLogout() {
    await deleteStudentSession();
    redirect("/student/login");
}