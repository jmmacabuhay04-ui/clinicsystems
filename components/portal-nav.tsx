"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, LayoutDashboard, Menu, User, X, type LucideIcon } from "lucide-react";
import ConfirmSubmit from "./confirm-submit";

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

const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export default function PortalNav({ basePath, roleLabel, fullName, initials, avatar, logoutAction }: Props) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);

    const homeHref = `${basePath}/dashboard`;
    const profileHref = `${basePath}/profile`;
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

    return (
        <>
            <header className="sticky top-0 z-30 bg-[#14532D] text-white shadow-sm">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    {/* Kaliwa: hamburger + logo */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                            aria-controls="portal-drawer"
                            className={iconBtn}
                        >
                            <Menu className="h-7 w-7" strokeWidth={2} />
                        </button>
                        <Link href={homeHref} className="hidden items-center gap-2.5 sm:flex">
                            <Image
                                src="/bcas.jpg"
                                alt="BCAS logo"
                                width={32}
                                height={32}
                                className="h-8 w-8 rounded-full bg-white object-contain"
                            />
                            <span className="text-sm font-semibold uppercase tracking-wider">BCAS Clinic</span>
                        </Link>
                    </div>

                    {/* Kanan: user dropdown */}
                    <div className="relative" ref={userRef}>
                        <button
                            type="button"
                            onClick={() => setUserOpen((v) => !v)}
                            aria-label="Account menu"
                            aria-expanded={userOpen}
                            aria-haspopup="menu"
                            aria-controls="portal-user-menu"
                            className={iconBtn}
                        >
                            {avatar ? (
                                <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                                <User className="h-7 w-7" strokeWidth={2} />
                            )}
                        </button>

                        {/* Laging naka-mount para hindi mawala ang confirm dialog; itinatago lang */}
                        <div
                            id="portal-user-menu"
                            role="menu"
                            className={`absolute right-0 top-12 z-50 w-64 rounded-xl bg-white p-3 text-gray-800 shadow-xl ring-1 ring-black/5 ${userOpen ? "" : "hidden"}`}
                        >
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt=""
                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#14532D] text-sm font-bold text-white">
                                        {initials}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold" title={fullName}>{fullName}</p>
                                    <span className="mt-0.5 inline-block rounded bg-[#14532D]/10 px-2 py-0.5 text-xs font-medium text-[#14532D]">
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href={profileHref}
                                role="menuitem"
                                className="mt-2 block rounded-lg px-3 py-2 text-sm font-medium hover:bg-amber-400 hover:text-[#14532D]"
                            >
                                My Profile
                            </Link>
                            <form action={logoutAction} className="mt-1">
                                <ConfirmSubmit
                                    title="Sign out"
                                    message="Are you sure you want to sign out?"
                                    confirmLabel="Sign out"
                                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                    Sign out
                                </ConfirmSubmit>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Madilim na background */}
            <div
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
            />

            {/* Drawer (kapareho ng admin sidebar) */}
            <aside
                id="portal-drawer"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#14532D] text-white shadow-xl transition-[transform,visibility] duration-200 ${menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
            >
                <div className="relative flex items-center justify-center border-b border-white/10 px-4 py-4">
                    <Link
                        href={homeHref}
                        title="Go to Overview"
                        className="flex flex-col items-center gap-2 text-center hover:opacity-90"
                    >
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-full bg-white object-contain"
                        />
                        <p className="text-sm font-semibold uppercase tracking-wider text-white/90">BCAS Clinic</p>
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

                <nav aria-label={`${roleLabel} navigation`} className="no-scrollbar flex-1 overflow-y-auto px-2 py-2">
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
                                className={`group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${active
                                    ? "bg-amber-400 font-semibold text-[#14532D]"
                                    : "text-white hover:bg-amber-400 hover:font-semibold hover:text-[#14532D]"
                                    }`}
                            >
                                <Icon
                                    className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#14532D]" : "group-hover:text-[#14532D]"}`}
                                    strokeWidth={1.8}
                                />
                                <span className="truncate">{tab.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}