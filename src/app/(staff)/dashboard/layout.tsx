import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/layout/admin-sidebar";
import IdleLogout from "@/components/layout/idle-logout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({ where: { user_id: session.userId } });

    return (
        <div className="flex min-h-screen flex-col bg-[#e7f3e2] md:flex-row">
            <IdleLogout minutes={user?.session_minutes ?? 60} />
            <AdminSidebar
                username={session.username}
                role={session.role}
                avatar={user?.avatar ?? null}
            />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}