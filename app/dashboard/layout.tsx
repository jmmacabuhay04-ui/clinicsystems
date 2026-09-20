import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminSidebar from "@/components/admin-sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/login");

    return (
        <div className="flex min-h-screen flex-col bg-[#f2efe9] md:flex-row">
            <AdminSidebar username={session.username} role={session.role} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}