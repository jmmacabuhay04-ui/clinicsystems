"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/auth/employee-session";
import { getEmployee } from "./data";

export async function requestPasswordChange(formData: FormData) {
    const session = await getEmployeeSession();
    if (!session) redirect("/employee/login");

    const employee = await getEmployee(session.employeeId);
    if (!employee) redirect("/employee/login");

    const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

    // Only one pending request per employee
    const pending = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM portal_password_requests
        WHERE employee_id = ${employee.employee_id} AND status = 'pending'
    `;
    if (Number(pending[0]?.n ?? 0) === 0) {
        await prisma.$executeRaw`
            INSERT INTO portal_password_requests (employee_id, note)
            VALUES (${employee.employee_id}, ${note})
        `;
    }

    revalidatePath("/employee/profile");
    redirect("/employee/profile?requested=1");
}