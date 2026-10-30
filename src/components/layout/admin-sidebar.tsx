"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Archive,
    Briefcase,
    ChevronDown,
    ClipboardList,
    FileCheck,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    BarChart3,
    User2,
    ClipboardCheck,
    Settings,
    ShieldCheck,
    ScrollText,
    UserCheck,
    UserCog,
    Users,
    X,
    type LucideIcon,
    Stethoscope,
} from "lucide-react";
import { logout } from "@/features/auth/login-actions";
import ConfirmSubmit from "@/components/shared/confirm-submit";

// Custom tooth icon (same props as the lucide icons used here).
function ToothIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

type NavLink = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    roles?: string[];
    section?: string; // pamagat ng grupo sa sidebar (hal. "Records")
};

// Dropdown group: maraming links sa ilalim ng isang menu item
type NavGroup = {
    label: string;
    icon: LucideIcon;
    children: NavLink[];
    soloLabel?: string; // pangalan kapag isa lang ang child na pwede sa role
    section?: string;
};

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
    return "children" in entry;
}

const navItems: NavEntry[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "doctor", "dentist", "nurse", "ittech"], section: "Overview" },
    { href: "/dashboard/students", label: "Student", icon: User2, roles: ["nurse"], section: "People" },
    { href: "/dashboard/employees", label: "Employee", icon: User2, roles: ["nurse"], section: "People" },
    {
        label: "Record",
        icon: ClipboardCheck,
        section: "Health Records",
        children: [
            { href: "/dashboard/student-health-records", label: "Student Health Records", icon: Stethoscope, roles: ["admin", "doctor", "nurse"] },
            { href: "/dashboard/employee-health-records", label: "Employee Health Records", icon: Stethoscope, roles: ["admin", "doctor", "nurse"] },
            { href: "/dashboard/dental-records", label: "Dental Records", icon: ToothIcon, roles: ["admin", "dentist", "nurse"] },
        ],
    },
    // ALL FORMS -> isang dropdown
    {
        label: "Forms",
        icon: ClipboardList,
        section: "Health Records",
        children: [
            { href: "/dashboard/student-health-form", label: "Student Health Form", icon: FileText, roles: ["admin", "doctor", "nurse"] },
            { href: "/dashboard/health-declaration", label: "Health Declaration", icon: ClipboardList, roles: ["admin", "doctor", "nurse"] },
            { href: "/dashboard/employee-health-form", label: "Employee Health Form", icon: Briefcase, roles: ["admin", "doctor", "nurse"] },
            { href: "/dashboard/dental-health-form", label: "Dental Health Form", icon: ToothIcon, roles: ["admin", "dentist", "nurse"] },
        ],
    },

    { href: "/dashboard/health-case-reports", label: "Health Case Reports", icon: ClipboardList, roles: ["admin", "nurse", "doctor"], section: "Health Records" },
    { href: "/dashboard/illness-alerts", label: "Illness Alerts", icon: BarChart3, roles: ["admin", "nurse", "doctor"], section: "Health Records" },
    { href: "/dashboard/visitor-recording", label: "Visitor Recording", icon: Users, roles: ["admin", "nurse", "doctor", "dentist"], section: "Clinic" },
    { href: "/dashboard/referral-slips", label: "Referral Slips", icon: FileCheck, roles: ["admin", "nurse", "dentist", "doctor"], section: "Clinic" },
    { href: "/dashboard/archive-records", label: "Archive Records", icon: Archive, roles: ["admin", "nurse"], section: "Clinic" },
    { href: "/dashboard/clinic-staff", label: "Clinic Staff", icon: UserCog, roles: ["nurse", "admin"], section: "Clinic" },
    { href: "/dashboard/users", label: "User Management", icon: ShieldCheck, roles: ["admin", "ittech"], section: "Administration" },
    { href: "/dashboard/access-logs", label: "Access Logs", icon: ScrollText, roles: ["admin", "ittech"], section: "Administration" },

    // Password Requests, Walk-in Reset at Settings -> isang dropdown
    {
        label: "Settings",
        icon: Settings,
        soloLabel: "Settings",
        section: "Account",
        children: [
            { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
            { href: "/dashboard/password-requests", label: "Password Requests", icon: KeyRound, roles: ["nurse", "ittech"] },
            { href: "/dashboard/walk-in-reset", label: "Walk-in Reset", icon: UserCheck, roles: ["nurse", "ittech"] },
        ],
    },
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
    /** Display Name mula sa Settings (o galing sa email kung wala pa) */
    displayName?: string;
    role: string;
    avatar?: string | null;
};

// Naka-collapse ba ang sidebar (icons only)? Nakatabi sa localStorage para matandaan.
const COLLAPSE_KEY = "sidebar-collapsed";
const COLLAPSE_EVENT = "sidebar-collapsed-change";
function subscribeCollapsed(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(COLLAPSE_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(COLLAPSE_EVENT, onChange);
    };
}
function readCollapsed() {
    try {
        return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
        return false;
    }
}

export default function AdminSidebar({ username, displayName: savedName, role, avatar }: Props) {
    const pathname = usePathname();
    // desktop: icons only (false habang nire-render sa server)
    const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
    const [mobileOpen, setMobileOpen] = useState(false); // phone: show/hide drawer
    // Pangalan ng menu na lumalabas sa tabi ng icon kapag naka-collapse (icons only)
    const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
    const tipProps = (label: string) => ({
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            if (!collapsed) return;
            const r = e.currentTarget.getBoundingClientRect();
            setTip({ label, top: r.top + r.height / 2, left: r.right + 12 });
        },
        onFocus: (e: React.FocusEvent<HTMLElement>) => {
            if (!collapsed) return;
            const r = e.currentTarget.getBoundingClientRect();
            setTip({ label, top: r.top + r.height / 2, left: r.right + 12 });
        },
        onMouseLeave: () => setTip(null),
        onBlur: () => setTip(null),
    });


    // Kapag bukas ang drawer sa phone: huwag mag-scroll ang page sa likod, at isara gamit ang Esc
    useEffect(() => {
        if (!mobileOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMobileOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener("keydown", onKey);
        };
    }, [mobileOpen]);

    function toggleCollapsed() {
        try {
            localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
        } catch {
            /* walang localStorage: hayaan na lang */
        }
        window.dispatchEvent(new Event(COLLAPSE_EVENT));
    }

    const localPart = username.split("@")[0];
    const baseName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    const displayName = savedName || (role === "doctor" || role === "dentist" ? `Dr. ${baseName}` : baseName);

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

    // Salain ayon sa role; ang dropdown ay mawawala kung walang child na pwede sa role
    const visibleItems: NavEntry[] = navItems.flatMap<NavEntry>((entry) => {
        if (isGroup(entry)) {
            const children = entry.children.filter((c) => !c.roles || c.roles.includes(role));
            if (children.length === 0) return [];
            // Isa lang ang pwede sa role -> gawing normal link, hindi na dropdown
            if (children.length === 1) {
                return [{ ...children[0], label: entry.soloLabel ?? children[0].label, section: entry.section }];
            }
            return [{ ...entry, children }];
        }
        return !entry.roles || entry.roles.includes(role) ? [entry] : [];
    });

    // Dropdown na may laman ang kasalukuyang page (awtomatikong bukas)
    const activeGroup =
        visibleItems.find((e): e is NavGroup => isGroup(e) && e.children.some((c) => isActive(c.href)))?.label ?? null;
    const [openGroup, setOpenGroup] = useState<string | null>(activeGroup); // aling dropdown ang bukas

    // Pagpalit ng page: isara ang drawer (phone) at buksan ang dropdown ng bagong page.
    // Ginagawa habang nagre-render (hindi sa useEffect) ayon sa rekomendasyon ng React.
    const [lastPath, setLastPath] = useState(pathname);
    if (pathname !== lastPath) {
        setLastPath(pathname);
        setMobileOpen(false);
        if (activeGroup) setOpenGroup(activeGroup);
    }

    return (
        <>
            {/* PHONE: top bar na laging nasa taas (nakatago sa md pataas) */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[#15664f] px-4 text-white shadow-md md:hidden">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5"
                >
                    <img src="/bcas.jpg" alt="BCAS" className="h-9 w-9 rounded-full bg-white object-contain" />
                    <span className="text-sm font-semibold uppercase tracking-wider">BCAS Clinic</span>
                </Link>
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                    aria-expanded={mobileOpen}
                    className="rounded-lg p-2 hover:bg-white/10"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </header>

            {/* PHONE: madilim na background; pindutin para isara ang drawer */}
            <div
                aria-hidden="true"
                onClick={() => setMobileOpen(false)}
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-gradient-to-b from-[#176b52] via-[#11593f] to-[#0b3f2e] text-white shadow-xl transition-[transform,visibility] duration-200 md:h-screen md:max-w-none md:shrink-0 md:translate-x-0 md:transition-[width] md:visible ${mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
                    } ${collapsed ? "md:w-[72px]" : "md:w-[260px]"}`}
            >
                {/* Header: logo + menu button */}
                <div
                    className={`relative flex items-center justify-center border-b border-white/10 px-4 pb-5 pt-6 ${collapsed ? "md:border-b-0 md:px-2 md:py-4" : ""
                        }`}
                >
                    <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        title="Go to Dashboard"
                        className={`flex w-full min-w-0 select-none flex-col items-center gap-1 overflow-hidden px-3 text-center hover:opacity-90 ${collapsed ? "md:hidden" : ""
                            }`}
                    >
                        {/* Kapareho ng login page: walang border, malambot na liwanag sa likod at lumulutang na anino */}
                        <span className="relative">
                            <span
                                aria-hidden
                                className="absolute -inset-3 rounded-full bg-gradient-to-br from-white/30 via-[#3fae86]/30 to-amber-300/40 blur-xl"
                            />
                            <img
                                src="/bcas.jpg"
                                alt="BCAS"
                                className="relative h-24 w-24 shrink-0 rounded-full bg-white object-contain shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]"
                            />
                        </span>

                        {/* Pangalan (gaya ng login page) */}
                        <span className="mt-2 text-xl font-bold tracking-tight text-white">School Clinic</span>
                    </Link>

                    {/* Phone: isara ang drawer */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                        className="absolute right-2 top-2 rounded-lg p-2 hover:bg-white/10 md:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Desktop: collapse/expand */}
                    <button
                        type="button"
                        suppressHydrationWarning
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                        title={collapsed ? "Expand menu" : "Collapse menu"}
                        className={`hidden rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white md:inline-flex ${collapsed ? "" : "md:absolute md:right-2 md:top-2"
                            }`}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>

                {/* Green at dilaw na alon sa ibaba ng sidebar (pang-dekorasyon) */}
                <svg
                    aria-hidden="true"
                    viewBox="0 0 260 120"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 w-full"
                >
                    <path d="M0 40 C 60 10, 120 20, 170 50 C 210 74, 240 80, 260 76 V120 H0 Z" fill="#2f8a6d" fillOpacity="0.45" />
                    <path d="M0 64 C 70 34, 130 48, 180 76 C 214 94, 240 100, 260 98 V120 H0 Z" fill="#0b3f2e" fillOpacity="0.55" />
                    <path d="M0 52 C 70 22, 130 36, 178 64 C 214 84, 240 90, 260 88" fill="none" stroke="#f2c94c" strokeWidth="3" />
                </svg>
                {/* Body (nasa ibabaw ng alon) */}
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                    {/* Menu */}
                    <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3" onScroll={() => setTip(null)}>
                        {visibleItems.map((item, index) => {
                            const Icon = item.icon;
                            // Pamagat ng section kapag iba ito sa nauna
                            const prevSection = index > 0 ? visibleItems[index - 1].section : undefined;
                            const sectionHeader =
                                item.section && item.section !== prevSection ? (
                                    <p
                                        className={`px-3 pb-1 text-sm font-medium uppercase tracking-[0.14em] text-white/40 ${index > 0 ? "pt-4" : "pt-1"} ${collapsed ? "md:hidden" : ""}`}
                                    >
                                        {item.section}
                                    </p>
                                ) : null;
                            // Sa icons-only: manipis na guhit sa pagitan ng mga section
                            const sectionDivider =
                                item.section && item.section !== prevSection && index > 0 ? (
                                    <div className={`mx-3 my-2 hidden border-t border-white/10 ${collapsed ? "md:block" : ""}`} />
                                ) : null;

                            // ---------- DROPDOWN GROUP ----------
                            if (isGroup(item)) {
                                const open = openGroup === item.label;
                                const hasActiveChild = item.children.some((c) => isActive(c.href));

                                return (
                                    <div key={item.label} className="mb-1">
                                        {sectionHeader}
                                        {sectionDivider}
                                        <button
                                            type="button"
                                            {...tipProps(item.label)}
                                            aria-label={item.label}
                                            aria-expanded={open}
                                            onClick={() => {
                                                // Kung icons-only, i-expand muna ang sidebar para makita ang dropdown
                                                if (collapsed) {
                                                    setTip(null);
                                                    toggleCollapsed();
                                                    setOpenGroup(item.label);
                                                } else {
                                                    setOpenGroup(open ? null : item.label);
                                                }
                                            }}
                                            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-all ${collapsed ? "md:justify-center md:px-0" : ""
                                                } ${hasActiveChild && !open
                                                    ? "bg-[#4f9a7c]/70 font-semibold text-white shadow-sm shadow-black/10 ring-1 ring-white/15"
                                                    : hasActiveChild
                                                        ? "bg-white/10 font-semibold text-white"
                                                        : "text-white/85 hover:bg-white/10 hover:text-white"
                                                }`}
                                        >
                                            {hasActiveChild && !open && (
                                                <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-amber-300" />
                                            )}
                                            <Icon
                                                className={`h-5 w-5 shrink-0 ${hasActiveChild ? "text-amber-300" : ""}`}
                                                strokeWidth={1.8}
                                            />
                                            <span className={`flex-1 truncate text-left ${collapsed ? "md:hidden" : ""}`}>
                                                {item.label}
                                            </span>
                                            <ChevronDown
                                                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
                                                    } ${collapsed ? "md:hidden" : ""}`}
                                                strokeWidth={2}
                                            />
                                        </button>

                                        {open && (
                                            <div
                                                className={`mt-1 ml-5 space-y-0.5 border-l-2 border-white/15 pl-3 ${collapsed ? "md:hidden" : ""
                                                    }`}
                                            >
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;
                                                    const childActive = isActive(child.href);
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            title={child.label}
                                                            onClick={() => setMobileOpen(false)}
                                                            className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] transition-all ${childActive
                                                                ? "bg-[#4f9a7c]/70 font-semibold text-white shadow-sm shadow-black/10 ring-1 ring-white/15"
                                                                : "text-white/75 hover:bg-white/10 hover:text-white"
                                                                }`}
                                                        >
                                                            <ChildIcon
                                                                className={`h-[18px] w-[18px] shrink-0 ${childActive ? "text-amber-300" : ""}`}
                                                                strokeWidth={1.8}
                                                            />
                                                            <span className="truncate">{child.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // ---------- NORMAL LINK ----------
                            const active = isActive(item.href);
                            return (
                                <div key={item.href} className="mb-1">
                                    {sectionHeader}
                                    {sectionDivider}
                                    <Link
                                        href={item.href}
                                        {...tipProps(item.label)}
                                        aria-label={item.label}
                                        onClick={() => {
                                            setTip(null);
                                            setMobileOpen(false);
                                        }}
                                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-all ${collapsed ? "md:justify-center md:px-0" : ""
                                            } ${active
                                                ? "bg-[#4f9a7c]/70 font-semibold text-white shadow-sm shadow-black/10 ring-1 ring-white/15"
                                                : "text-white/85 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        {/* amber na marka sa kaliwa ng aktibong page */}
                                        {active && (
                                            <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-amber-300" />
                                        )}
                                        <Icon
                                            className={`h-5 w-5 shrink-0 ${active ? "text-amber-300" : ""}`}
                                            strokeWidth={1.8}
                                        />
                                        <span className={`truncate ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
                                    </Link>
                                </div>
                            );
                        })}
                    </nav>

                    <div className={`relative p-3 ${collapsed ? "md:px-2" : ""}`}>
                        <div
                            className={`relative flex items-center gap-3 rounded-xl bg-white/10 p-2.5 backdrop-blur-sm ${collapsed ? "md:flex-col md:justify-center md:bg-transparent md:p-0" : ""
                                }`}
                        >
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-amber-400"
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-semibold text-[#14532D]"
                                >
                                    {displayName.replace(/^Dr\.?\s*/i, "").charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
                                <p className="truncate text-base font-semibold" title={username}>
                                    {displayName}
                                </p>
                                <span className="mt-0.5 inline-block rounded-full bg-amber-400/90 px-2 py-0.5 text-sm font-semibold text-[#14532D]">
                                    {roleLabels[role] ?? role}
                                </span>
                            </div>

                            <form action={logout} className="shrink-0" title="Sign out ">
                                <ConfirmSubmit
                                    title="Sign out"
                                    message="Are you sure you want to sign out?"
                                    confirmLabel="Sign out"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-amber-400 hover:text-[#10523f]"
                                >
                                    <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                    <span className="sr-only">Sign out</span>
                                </ConfirmSubmit>
                            </form>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Pangalan ng menu sa tabi ng icon (kapag naka-collapse lang, desktop) */}
            {collapsed && tip && (
                <div
                    role="tooltip"
                    style={{ top: tip.top, left: tip.left }}
                    className="pointer-events-none fixed z-[60] hidden -translate-y-1/2 items-center md:flex"
                >
                    <span className="-mr-1.5 h-3 w-3 rotate-45 border-b border-l border-[#cfe5d9] bg-white" />
                    <span className="whitespace-nowrap rounded-xl border border-[#cfe5d9] bg-white px-4 py-2 text-base font-semibold text-[#10523f] shadow-xl shadow-black/15">
                        {tip.label}
                    </span>
                </div>
            )}

            {/* Desktop: nakapirmi (fixed) ang sidebar sa kaliwa at laging buong taas ng screen,
                kaya kailangan ng pamalit na espasyo para hindi matakpan ang laman. */}
            <div
                aria-hidden="true"
                className={`hidden shrink-0 transition-[width] duration-200 md:block ${collapsed ? "md:w-[72px]" : "md:w-[260px]"}`}
            />
        </>
    );
}