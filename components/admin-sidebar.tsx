"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    Archive,
    Briefcase,
    ClipboardList,
    FileCheck,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    Stethoscope,
    UserCog,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import ConfirmSubmit from "@/components/confirm-submit";


type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    roles?: string[];
};

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "doctor", "dentist", "nurse"] },
    { href: "/dashboard/student-health-records", label: "Student Health Records", icon: FileText, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/student-health-form", label: "Student Health Form", icon: FileText, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/health-declaration", label: "Health Declaration", icon: ClipboardList, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/employee-health-records", label: "Employee Health Records", icon: Briefcase, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/employee-health-form", label: "Employee Health Form", icon: Briefcase, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/dental-records", label: "Dental Records", icon: Stethoscope, roles: ["admin", "dentist", "nurse"] },
    { href: "/dashboard/dental-health-form", label: "Dental Health Form", icon: ClipboardList, roles: ["admin", "dentist", "nurse"] },
    { href: "/dashboard/health-case-reports", label: "Health Case Reports", icon: ClipboardList, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/visitor-recording", label: "Visitor Recording", icon: Users, roles: ["admin", "nurse"] },
    { href: "/dashboard/referral-slips", label: "Referral Slips", icon: FileCheck, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/illness-alerts", label: "Illness Alerts", icon: Activity, roles: ["admin", "doctor", "nurse"] },
    { href: "/dashboard/archive-records", label: "Archive Records", icon: Archive, roles: ["admin", "nurse"] },
    { href: "/dashboard/clinic-staff", label: "Clinic Staff", icon: UserCog, roles: ["nurse"] },
    { href: "/dashboard/users", label: "User Management", icon: ShieldCheck, roles: ["admin", "ittech"] },
    { href: "/dashboard/password-requests", label: "Password Requests", icon: KeyRound, roles: ["nurse"] },
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
    const [collapsed, setCollapsed] = useState(false); // desktop: icons only
    const [mobileOpen, setMobileOpen] = useState(false); // phone: show/hide menu

    // Tandaan ang huling pinili (collapsed o hindi)
    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
        } catch { }
    }, []);

    function toggleCollapsed() {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
            } catch { }
            return next;
        });
    }

    const localPart = username.split("@")[0];
    const baseName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    const displayName = role === "doctor" || role === "dentist" ? `Dr. ${baseName}` : baseName;

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

    const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

    return (
        <aside
            className={`flex w-full shrink-0 flex-col bg-[#15664f] text-white transition-[width] duration-200 md:sticky md:top-0 md:h-screen ${collapsed ? "md:w-20" : "md:w-72"
                }`}
        >
            {/* Header: logo + menu button */}
            <div
                className={`relative flex items-center justify-center border-b border-white/10 px-4 py-6 ${collapsed ? "md:px-2 md:py-4" : ""
                    }`}
            >
                <Link
                    href={role === "ittech" ? "/dashboard/users" : "/dashboard"}
                    onClick={() => setMobileOpen(false)}
                    title="Go to Dashboard"
                    className={`flex flex-col items-center gap-2 text-center hover:opacity-90 ${collapsed ? "md:hidden" : ""
                        }`}
                >
                    <img
                        src="/bcas.jpg"
                        alt="BCAS"
                        className="h-20 w-20 rounded-full bg-white object-contain"
                    />
                    <p className="text-base font-semibold uppercase tracking-wider text-white/90">
                        BCAS Clinic
                    </p>
                </Link>

                {/* Phone: open/close menu */}
                <button
                    type="button"
                    onClick={() => setMobileOpen((o) => !o)}
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    className="absolute right-3 top-3 rounded-lg p-2 hover:bg-white/10 md:hidden"
                >
                    {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Desktop: collapse/expand */}
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                    title={collapsed ? "Expand menu" : "Collapse menu"}
                    className={`hidden rounded-lg p-2 hover:bg-white/10 md:inline-flex ${collapsed ? "" : "md:absolute md:right-3 md:top-3"
                        }`}
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* Body: hidden on phone until menu is opened */}
            <div className={`${mobileOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex`}>
                {/* Profile */}
                <div className={`border-b border-white/10 px-5 py-5 ${collapsed ? "md:hidden" : ""}`}>
                    <p className="truncate text-xl font-semibold" title={username}>
                        {displayName}
                    </p>
                    <span className="mt-2 inline-block rounded bg-white/20 px-2.5 py-0.5 text-sm font-medium">
                        {roleLabels[role] ?? role}
                    </span>
                </div>

                {/* Menu */}
                <nav className="no-scrollbar flex-1 overflow-y-auto py-3">
                    {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={item.label}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3.5 border-r-4 px-5 py-3 text-[0.95rem] transition-colors ${collapsed ? "md:justify-center md:px-0" : ""
                                    } ${active
                                        ? "border-white bg-white/15 font-semibold text-white"
                                        : "border-transparent text-white/85 hover:bg-white/10"
                                    }`}
                            >
                                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                                <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sign out */}
                <div className={`border-t border-white/10 px-4 py-4 ${collapsed ? "md:px-2" : ""}`}>
                    <form action={logout}>
                        <ConfirmSubmit
                            title="Sign out"
                            message="Are you sure you want to sign out?"
                            confirmLabel="Sign out"
                            className={`flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-white/90 hover:bg-white/10 ${collapsed ? "md:justify-center md:px-0" : ""
                                }`}
                        >
                            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                            <span className={collapsed ? "md:hidden" : ""}>Sign out</span>
                        </ConfirmSubmit>
                    </form>
                </div>
            </div>
        </aside>
    );
}