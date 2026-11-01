"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Activity,
    ChevronDown,
    ChevronRight,
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
    const box = size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-sm";
    return avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={avatar}
            alt=""
            className={`${box} shrink-0 rounded-full object-cover ring-2 ${employee ? "ring-amber-300" : "ring-white/80"}`}
        />
    ) : (
        <span
            className={`${box} flex shrink-0 items-center justify-center rounded-full font-semibold ${employee ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white ring-2 ring-white/80"
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

    // Isara ang lahat kapag lumipat ng page.
    // Ginagawa habang nagre-render (hindi sa useEffect) para walang "setState in effect" na error.
    const [lastPath, setLastPath] = useState(pathname);
    if (lastPath !== pathname) {
        setLastPath(pathname);
        setMenuOpen(false);
        setUserOpen(false);
    }

    // Laging nakareserba ang puwang ng scrollbar. Kung wala ito, may page na mahaba (may scrollbar)
    // at may maikli (wala), kaya umuusog pakaliwa/pakanan ang buong nav tuwing lilipat ng tab.
    useEffect(() => {
        const html = document.documentElement;
        const previous = html.style.scrollbarGutter;
        html.style.scrollbarGutter = "stable";
        return () => {
            html.style.scrollbarGutter = previous;
        };
    }, []);

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
                                <span className="block text-sm font-semibold uppercase tracking-wider">BCAS Clinic</span>
                                <span className="block text-sm text-white/70">{roleLabel} Portal</span>
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
                                    // Iisang kapal ng font (semibold) sa lahat ng tab para hindi lumapad o kumitid
                                    // ang tab kapag napili, kaya hindi gumagalaw ang nav.
                                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${active
                                        ? "bg-amber-400 text-[#14532D] shadow-sm"
                                        : "text-white/85 hover:bg-white/10 hover:text-white"
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
                                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-sm font-semibold ${roleLabel === "Employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
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
                                    <User className="h-4 w-4 text-gray-600" />
                                    My Profile
                                </Link>
                                <Link
                                    href={changePasswordHref}
                                    role="menuitem"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[#eef6f2] hover:text-[#15664f]"
                                >
                                    <LockKeyhole className="h-4 w-4 text-gray-600" />
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

            {/* Drawer para sa phone/tablet: kapareho ng sidebar ng nurse/staff */}
            <aside
                id="portal-drawer"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-gradient-to-b from-[#176b52] via-[#11593f] to-[#0b3f2e] text-white shadow-xl transition-[transform,visibility] duration-200 xl:hidden ${menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
            >
                {/* Header: malaking logo (gaya ng login page) */}
                <div className="relative flex items-center justify-center border-b border-white/10 px-4 pb-5 pt-6">
                    <Link
                        href={homeHref}
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full min-w-0 select-none flex-col items-center gap-2 overflow-hidden px-3 text-center hover:opacity-90"
                    >
                        {/* Logo (public/bcas.jpg): ginupit nang bilog gamit ang clip-path para walang puting kanto
                            o gray na gilid; ang anino ay nasa lalagyan para hindi rin magupit */}
                        <span className="shrink-0 drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]">
                            <Image
                                src="/bcas.jpg"
                                alt="BCAS"
                                width={96}
                                height={96}
                                className="block h-24 w-24 rounded-full bg-white object-cover [clip-path:circle(49%)]"
                            />
                        </span>
                        <span className="text-2xl font-bold tracking-tight text-white">School Clinic</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close menu"
                        className="absolute right-2 top-2 rounded-lg p-2 hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Dekorasyon sa pinakababa: green na alon, dalawang dilaw na guhit at mga dahon */}
                <svg
                    aria-hidden="true"
                    viewBox="0 0 260 110"
                    preserveAspectRatio="xMidYMax slice"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 w-full"
                >
                    <path d="M0 110 V58 C 60 40, 130 50, 190 66 C 220 74, 244 72, 260 66 V110 Z" fill="#2f8a6d" fillOpacity="0.45" />
                    <path d="M0 52 C 60 34, 130 44, 192 60 C 222 68, 246 66, 260 60" fill="none" stroke="#f2c94c" strokeWidth="3" />
                    <path d="M0 62 C 62 46, 132 56, 194 72 C 224 80, 246 78, 260 72" fill="none" stroke="#f2c94c" strokeOpacity="0.55" strokeWidth="1.5" />
                    <path d="M0 110 V78 C 70 64, 140 76, 200 90 C 228 96, 248 94, 260 90 V110 Z" fill="#0b3f2e" fillOpacity="0.9" />
                    {/* Mga dahon sa kanan */}
                    <path d="M196 108 C 186 84, 194 60, 222 46 C 230 74, 222 96, 196 108 Z" fill="#3fae86" fillOpacity="0.75" />
                    <path d="M196 108 C 204 88, 212 70, 222 46" fill="none" stroke="#0b3f2e" strokeOpacity="0.45" strokeWidth="1" />
                    <path d="M222 110 C 220 82, 236 60, 262 52 C 264 80, 250 102, 222 110 Z" fill="#2f8a6d" fillOpacity="0.9" />
                    <path d="M222 110 C 234 90, 248 70, 262 52" fill="none" stroke="#0b3f2e" strokeOpacity="0.45" strokeWidth="1" />
                    <path d="M176 110 C 166 96, 166 80, 178 70 C 188 82, 188 98, 176 110 Z" fill="#3fae86" fillOpacity="0.5" />
                </svg>

                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                    <nav aria-label={`${roleLabel} navigation`} className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
                        <p className="px-3 pb-1 pt-1 text-sm font-medium uppercase tracking-[0.14em] text-white/40">Menu</p>
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
                                    onClick={() => setMenuOpen(false)}
                                    className={`group relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-base transition-all ${active
                                        ? "bg-[#4f9a7c]/70 font-semibold text-white shadow-sm shadow-black/10 ring-1 ring-white/15"
                                        : "text-white/85 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    {active && (
                                        <span className="absolute -left-3 top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-r-full bg-amber-300" />
                                    )}
                                    <Icon className={`h-5 w-5 shrink-0 ${active ? "text-amber-300" : ""}`} strokeWidth={1.8} />
                                    <span className="truncate">{tab.label}</span>
                                    {tab.path !== "dashboard" && (
                                        <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-white/50" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Ibaba: user card, Log Out at tagline (kapareho ng nurse sidebar) */}
                    <div className="relative px-3 pb-[4.5rem] pt-2">
                        <div className="mx-2 mb-3 border-t border-white/15" />
                        {/* User card (gaya ng dati): larawan, pangalan, role at Log Out icon sa kanan */}
                        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-2.5">
                            {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatar}
                                    alt=""
                                    className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${roleLabel === "Employee" ? "ring-amber-300" : "ring-white/80"}`}
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    // Student = green, Employee = dilaw (kapareho ng profile sa itaas na nav)
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-2 ring-white/80 ${roleLabel === "Employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                        }`}
                                >
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold" title={fullName}>
                                    {fullName}
                                </p>
                                <span
                                    className={`mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${roleLabel === "Employee"
                                        ? "bg-amber-50 text-amber-800 ring-amber-500/30"
                                        : "bg-emerald-50 text-emerald-800 ring-emerald-600/25"
                                        }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${roleLabel === "Employee" ? "bg-amber-500" : "bg-emerald-500"}`} />
                                    {roleLabel}
                                </span>
                            </div>
                            <form action={logoutAction} className="shrink-0" title="Sign out">
                                <ConfirmSubmit
                                    title="Sign out"
                                    message="Are you sure you want to sign out?"
                                    confirmLabel="Sign out"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-amber-400 hover:text-[#10523f]"
                                >
                                    <LogOut className="h-5 w-5" strokeWidth={1.8} />
                                    <span className="sr-only">Sign out</span>
                                </ConfirmSubmit>
                            </form>
                        </div>

                    </div>
                </div>
            </aside>
        </>
    );
}