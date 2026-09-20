import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const IT_TECH_ALLOWED = ["/dashboard/users", "/dashboard/settings"];

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/dashboard")) {
        const staff = await verifyToken(req.cookies.get("session")?.value);
        if (!staff || staff.role === "student" || staff.role === "employee") {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        if (staff.role === "ittech") {
            const allowed = IT_TECH_ALLOWED.some((path) => pathname.startsWith(path));
            if (!allowed) {
                return NextResponse.redirect(new URL("/dashboard/users", req.url));
            }
        }
    }

    if (pathname.startsWith("/student/") && pathname !== "/student/login") {
        const student = await verifyToken(req.cookies.get("student_session")?.value);
        if (!student || student.role !== "student") {
            return NextResponse.redirect(new URL("/student/login", req.url));
        }
    }

    if (pathname.startsWith("/employee/") && pathname !== "/employee/login") {
        const employee = await verifyToken(req.cookies.get("employee_session")?.value);
        if (!employee || employee.role !== "employee") {
            return NextResponse.redirect(new URL("/employee/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/student/:path*", "/employee/:path*"],
};