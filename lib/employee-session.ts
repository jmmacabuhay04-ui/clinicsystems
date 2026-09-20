import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/jwt";

const EMPLOYEE_COOKIE = "employee_session";

type TokenPayload = Parameters<typeof signToken>[0];

export type EmployeeSession = {
    employeeId: number;
    employeeNumber: string;
    role: "employee";
};

export async function createEmployeeSession(
    employee: { employeeId: number; employeeNumber: string },
    minutes = 480
) {
    const payload = { ...employee, role: "employee" } as unknown as TokenPayload;
    const token = await signToken(payload, minutes);

    const store = await cookies();
    store.set(EMPLOYEE_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: minutes * 60,
    });
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
    try {
        const store = await cookies();
        const token = store.get(EMPLOYEE_COOKIE)?.value;
        if (!token) return null;

        const payload = (await verifyToken(token)) as unknown as EmployeeSession | null;
        if (!payload || payload.role !== "employee") return null;
        return payload;
    } catch {
        return null;
    }
}

export async function destroyEmployeeSession() {
    const store = await cookies();
    store.delete(EMPLOYEE_COOKIE);
}