import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/layout/admin-sidebar";
import IdleLogout from "@/components/layout/idle-logout";
import { staffDisplayName } from "@/lib/display-name";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({ where: { user_id: session.userId } });

    return (
        // Desktop: buong taas ng screen ang sidebar; ang laman lang ang nag-i-scroll.
        // Kaya hindi na naiiwan ang sidebar kahit may dropdown na lumampas sa ibaba ng page.
        <div className="flex min-h-screen flex-col bg-[#e7f3e2] md:h-screen md:flex-row md:overflow-hidden">
            <IdleLogout minutes={user?.session_minutes ?? 60} />
            <AdminSidebar
                username={session.username}
                displayName={staffDisplayName(user?.full_name, session.username, session.role)}
                role={session.role}
                avatar={user?.avatar ?? null}
            />
            {/* scrollbar-gutter: stable = laging may nakareserbang puwang para sa scrollbar.
                Kaya hindi na gumagalaw (umuusog pakaliwa) ang page kapag may dropdown na nagpahaba
                sa page at biglang lumabas ang scrollbar, hal. sa "Action Taken" ng Case Report. */}
            <div className="min-w-0 flex-1 md:overflow-y-auto md:[scrollbar-gutter:stable]">{children}</div>
        </div>
    );
}