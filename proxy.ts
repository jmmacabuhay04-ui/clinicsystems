import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyToken } from "@/lib/jwt";

// Mga page na pwedeng buksan ng IT Tech. Walang clinical data dito.
const IT_TECH_ALLOWED = [
    "/dashboard/users",
    "/dashboard/settings",
    "/dashboard/access-logs",
];

// Session expires after this many minutes of inactivity
const DEFAULT_IDLE_MINUTES = 30;

type Renew = { cookie: string; payload: Record<string, unknown> } | null;

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    let renew: Renew = null;

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

        renew = { cookie: "session", payload: staff as unknown as Record<string, unknown> };
    }

    if (pathname.startsWith("/student/") && pathname !== "/student/login") {
        const student = await verifyToken(req.cookies.get("student_session")?.value);
        if (!student || student.role !== "student") {
            return NextResponse.redirect(new URL("/student/login", req.url));
        }

        // Pilitin ang pagpapalit ng password kapag ang clinic staff ang gumawa nito.
        if (
            (student as Record<string, unknown>).mustChangePassword &&
            !pathname.startsWith("/student/change-password")
        ) {
            return NextResponse.redirect(
                new URL("/student/change-password?forced=1", req.url),
            );
        }

        renew = { cookie: "student_session", payload: student as unknown as Record<string, unknown> };
    }

    if (pathname.startsWith("/employee/") && pathname !== "/employee/login") {
        const employee = await verifyToken(req.cookies.get("employee_session")?.value);
        if (!employee || employee.role !== "employee") {
            return NextResponse.redirect(new URL("/employee/login", req.url));
        }

        if (
            (employee as Record<string, unknown>).mustChangePassword &&
            !pathname.startsWith("/employee/change-password")
        ) {
            return NextResponse.redirect(
                new URL("/employee/change-password?forced=1", req.url),
            );
        }

        renew = { cookie: "employee_session", payload: employee as unknown as Record<string, unknown> };
    }

    const res = NextResponse.next();

    // Sliding session: every page visit extends the session
    if (renew) {
        try {
            const { exp, iat, sm, ...payload } = renew.payload;
            void exp;
            void iat;

            // Keep the lifetime the session was created with (user setting).
            const minutes =
                typeof sm === "number" && sm >= 5 && sm <= 480 ? sm : DEFAULT_IDLE_MINUTES;

            const token = await signToken(payload as never, minutes);
            res.cookies.set(renew.cookie, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: minutes * 60,
            });
        } catch (err) {
            console.error("Session renew error:", err);
        }
    }

    return res;
}

export const config = {
    matcher: ["/dashboard/:path*", "/student/:path*", "/employee/:path*"],
};