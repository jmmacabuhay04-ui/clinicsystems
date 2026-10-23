"use server";

import { redirect } from "next/navigation";
import { destroyEmployeeSession } from "@/lib/auth/employee-session";

export async function employeeLogout() {
    await destroyEmployeeSession();
    redirect("/login");
}