"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Activity,
    ChevronDown,
    ClipboardList,
    FileText,
    LayoutDashboard,
    LockKeyhole,
    LogOut,
    Menu,
    User,
    X,
    type LucideIcon,
} from "lucide-react";
import ConfirmSubmit from "@/components/shared/confirm-submit";

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

type TabIcon = LucideIcon | typeof ToothIcon;

const tabs: { path: string; label: string; icon: TabIcon }[] = [
    { path: "dashboard", label: "Overview", icon: LayoutDashboard },
    { path: "visits", label: "My Visits", icon: ClipboardList },
    { path: "case-reports", label: "Case Reports", icon: FileText },
    { path: "dental", label: "Dental", icon: ToothIcon },
    { path: "vitals", label: "Vitals", icon: Activity },
    { path: "profile", label: "Profile", icon: User },
];

type Props = {
    basePath: "/student" | "/employee";
    roleLabel: "Student" | "Employee";
    fullName: string;
    initials: string;
    avatar?: string | null;
    logoutAction: () => void | Promise<void>;
};

// Student = green, Employee = yellow (kapareho ng badge sa buong system)
function Avatar({
    avatar,
    initials,
    size,
    employee,
}: {
    avatar?: string | null;
    initials: string;
    size: "sm" | "md";
    employee: boolean;
}) {
    const box = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
    return avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={avatar}
            alt=""
            className={`${box} shrink-0 rounded-full object-cover ring-2 ${employee ? "ring-amber-300" : "ring-white/80"}`}
        />
    ) : (
        <span
            className={`${box} flex shrink-0 items-center justify-center rounded-full font-bold ${employee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white ring-2 ring-white/80"
                }`}
        >
            {initials}
        </span>
    );
}

export default function PortalNav({ basePath, roleLabel, fullName, initials, avatar, logoutAction }: Props) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);

    const homeHref = `${basePath}/dashboard`;
    const profileHref = `${basePath}/profile`;
    const changePasswordHref = `${basePath}/change-password`;
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    // Isara ang lahat kapag lumipat ng page
    useEffect(() => {
        setMenuOpen(false);
        setUserOpen(false);
    }, [pathname]);

    // Escape para isara
    useEffect(() => {
        if (!menuOpen && !userOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMenuOpen(false);
                setUserOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen, userOpen]);

    // Bukas ang drawer: bawal mag-scroll ang page sa likod
    useEffect(() => {
        if (!menuOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [menuOpen]);

    // Click sa labas ng user dropdown
    useEffect(() => {
        if (!userOpen) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as Element;
            // Huwag isara kapag nag-click sa confirm dialog
            if (target.closest?.('[role="dialog"], [role="alertdialog"], dialog')) return;
            if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [userOpen]);

    const firstName = fullName.split(" ")[0] ?? fullName;

    return (
        <>
            <header className="sticky top-0 z-30 bg-gradient-to-r from-[#15664f] to-[#0f4d3b] text-white shadow-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
                    {/* Kaliwa: hamburger (phone/tablet) + logo */}
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                            aria-controls="portal-drawer"
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 xl:hidden"
                        >
                            <Menu className="h-6 w-6" strokeWidth={2} />
                        </button>
                        <Link href={homeHref} className="flex min-w-0 items-center gap-2.5">
                            <Image
                                src="/bcas.jpg"
                                alt="BCAS logo"
                                width={36}
                                height={36}
                                className="h-9 w-9 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/30"
                            />
                            <span className="hidden min-w-0 leading-tight sm:block">
                                <span className="block text-sm font-bold uppercase tracking-wider">BCAS Clinic</span>
                                <span className="block text-[11px] text-white/70">{roleLabel} Portal</span>
                            </span>
                        </Link>
                    </div>

                    {/* Gitna: tabs (desktop lang) */}
                    <nav aria-label={`${roleLabel} navigation`} className="hidden items-center gap-1 xl:flex">
                        {tabs.map((tab) => {
                            const href = `${basePath}/${tab.path}`;
                            const active = isActive(href);
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? "page" : undefined}
                                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${active
                                        ? "bg-amber-400 font-semibold text-[#14532D] shadow-sm"
                                        : "font-medium text-white/85 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={1.9} />
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Kanan: user dropdown */}
                    <div className="relative" ref={userRef}>
                        <button
                            type="button"
                            onClick={() => setUserOpen((v) => !v)}
                            aria-label="Account menu"
                            aria-expanded={userOpen}
                            aria-haspopup="menu"
                            aria-controls="portal-user-menu"
                            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:pr-3"
                        >
                            <Avatar avatar={avatar} initials={initials} size="sm" employee={roleLabel === "Employee"} />
                            <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline">{firstName}</span>
                            <ChevronDown
                                className={`hidden h-4 w-4 transition-transform sm:block ${userOpen ? "rotate-180" : ""}`}
                            />
                        </button>

                        {/* Laging naka-mount para hindi mawala ang confirm dialog; itinatago lang */}
                        <div
                            id="portal-user-menu"
                            role="menu"
                            className={`absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-xl bg-white text-gray-800 shadow-xl ring-1 ring-black/5 ${userOpen ? "" : "hidden"}`}
                        >
                            <div className="flex items-center gap-3 bg-[#eef6f2] p-4">
                                <Avatar avatar={avatar} initials={initials} size="md" employee={roleLabel === "Employee"} />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900" title={fullName}>
                                        {fullName}
                                    </p>
                                    <span
                                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleLabel === "Employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                            }`}
                                    >
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                            <div className="p-2">
                                <Link
                                    href={profileHref}
                                    role="menuitem"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#eef6f2] hover:text-[#15664f]"
                                >
                                    <User className="h-4 w-4 text-gray-500" />
                                    My Profile
                                </Link>
                                <Link
                                    href={changePasswordHref}
                                    role="menuitem"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#eef6f2] hover:text-[#15664f]"
                                >
                                    <LockKeyhole className="h-4 w-4 text-gray-500" />
                                    Change Password
                                </Link>
                                <form action={logoutAction} className="mt-1 border-t border-gray-100 pt-1">
                                    <ConfirmSubmit
                                        title="Sign out"
                                        message="Are you sure you want to sign out?"
                                        confirmLabel="Sign out"
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </ConfirmSubmit>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Madilim na background */}
            <div
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 xl:hidden ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />

            {/* Drawer para sa phone/tablet (kapareho ng admin sidebar) */}
            <aside
                id="portal-drawer"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-[#15664f] to-[#0c3f30] text-white shadow-xl transition-[transform,visibility] duration-200 xl:hidden ${menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
            >
                <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-4 pr-12">
                    <Image
                        src="/bcas.jpg"
                        alt="BCAS logo"
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/30"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-bold uppercase tracking-wider">BCAS Clinic</p>
                        <p className="text-[11px] text-white/60">{roleLabel} Portal</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav aria-label={`${roleLabel} navigation`} className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
                    <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Menu</p>
                    {tabs.map((tab) => {
                        const href = `${basePath}/${tab.path}`;
                        const active = isActive(href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={href}
                                href={href}
                                title={tab.label}
                                aria-current={active ? "page" : undefined}
                                className={`relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-all ${active
                                    ? "bg-amber-400 font-semibold text-[#14532D] shadow-md shadow-black/10"
                                    : "text-white/85 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                {active && (
                                    <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-white" />
                                )}
                                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                                <span className="truncate">{tab.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User card sa ibaba */}
                <div className="border-t border-white/10 p-3">
                    <div className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5">
                        <Avatar avatar={avatar} initials={initials} size="sm" employee={roleLabel === "Employee"} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold" title={fullName}>
                                {fullName}
                            </p>
                            <span className="mt-0.5 inline-block rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-semibold text-[#14532D]">
                                {roleLabel}
                            </span>
                        </div>
                        <form action={logoutAction} className="shrink-0">
                            <ConfirmSubmit
                                title="Sign out"
                                message="Are you sure you want to sign out?"
                                confirmLabel="Sign out"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-red-500/90 hover:text-white"
                            >
                                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                <span className="sr-only">Sign out</span>
                            </ConfirmSubmit>
                        </form>
                    </div>
                </div>
            </aside>
        </>
    );
}