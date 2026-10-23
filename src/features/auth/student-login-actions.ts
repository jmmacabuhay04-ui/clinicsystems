"use server";

import { redirect } from "next/navigation";
import { deleteStudentSession } from "@/lib/auth/student-session";

export async function studentLogout() {
    await deleteStudentSession();
    redirect("/login");
}