"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import image from "next/image";
import {
    Activity,
    Archive,
    Briefcase,
    ClipboardList,
    FileCheck,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    Settings,
    ShieldCheck,
    Stethoscope,
    UserCog,
    Users,
    type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/login/actions";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    roles?: string[];
};

const navItems: NavItem[] = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "doctor", "dentist", "nurse"],
    },
    {
        href: "/dashboard/student-health-records",
        label: "Student Health Records",
        icon: FileText,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/student-health-form",
        label: "Student Health Form",
        icon: FileText,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/health-declaration",
        label: "Health Declaration",
        icon: ClipboardList,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/employee-health-records",
        label: "Employee Health Records",
        icon: Briefcase,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/employee-health-form",
        label: "Employee Health Form",
        icon: Briefcase,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/dental-records",
        label: "Dental Records",
        icon: Stethoscope,
        roles: ["admin", "dentist", "nurse"],
    },
    {
        href: "/dashboard/dental-health-form",
        label: "Dental Health Form",
        icon: ClipboardList,
        roles: ["admin", "dentist", "nurse"],
    },
    {
        href: "/dashboard/health-case-reports",
        label: "Health Case Reports",
        icon: ClipboardList,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/visitor-recording",
        label: "Visitor Recording",
        icon: Users,
        roles: ["admin", "nurse"],
    },
    {
        href: "/dashboard/referral-slips",
        label: "Referral Slips",
        icon: FileCheck,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/illness-alerts",
        label: "Illness Alerts",
        icon: Activity,
        roles: ["admin", "doctor", "nurse"],
    },
    {
        href: "/dashboard/archive-records",
        label: "Archive Records",
        icon: Archive,
        roles: ["admin", "nurse"],
    },
    {
        href: "/dashboard/clinic-staff",
        label: "Clinic Staff",
        icon: UserCog,
        roles: ["admin", "nurse"],
    },
    {
        href: "/dashboard/users",
        label: "User Management",
        icon: ShieldCheck,
        roles: ["ittech", "admin"],
    },

    { href: "/dashboard/settings", label: "Settings", icon: Settings },


];

const roleLabels: Record<string, string> = {
    admin: "Administrator",
    doctor: "Doctor",
    dentist: "Dentist",
    nurse: "Nurse",
    ittech: "IT Technician",
};

type Props = {
    username: string;
    role: string;
};

export default function AdminSidebar({ username, role }: Props) {
    const pathname = usePathname();

    const localPart = username.split("@")[0];
    const baseName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    const displayName = role === "doctor" || role === "dentist" ? `Dr. ${baseName}` : baseName;

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

    const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

    return (
        <aside className="flex w-full shrink-0 flex-col bg-[#15664f] text-white md:sticky md:top-0 md:h-screen md:w-68">
            <div className="border-b border-white/10 px-5 py-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/bcas.jpg"
                        alt="BCAS"
                        className="h-11 w-11 shrink-0 rounded-full bg-white object-contain p-1"
                    />
                    <p className="text-sm font-semibold uppercase tracking-wide text-white/90">
                        BCAS Clinic
                    </p>
                </div>

                <p className="mt-3 truncate text-lg font-semibold" title={username}>
                    {displayName}
                </p>
                <span className="mt-2 inline-block rounded bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {roleLabels[role] ?? role}
                </span>
            </div>

            <nav className="flex-1 overflow-y-auto py-3">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 border-r-4 px-5 py-2.5 text-sm transition-colors ${active
                                ? "border-white bg-white/15 font-medium text-white"
                                : "border-transparent text-white/85 hover:bg-white/10"
                                }`}
                        >
                            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.8} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 px-5 py-5">
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                        <LogOut className="h-4.5 w-4.5" strokeWidth={1.8} />
                        Sign out
                    </button>
                </form>
            </div>
        </aside>
    );
}