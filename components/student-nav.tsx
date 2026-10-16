"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentLogout } from "@/app/student/login/actions";
import Image from "next/image";
import ConfirmSubmit from "./confirm-submit";

const tabs = [
    { href: "/student/dashboard", label: "Overview" },
    { href: "/student/visits", label: "My Visits" },
    { href: "/student/dental", label: "Dental" },
    { href: "/student/vitals", label: "Vitals" },
    { href: "/student/profile", label: "Profile" },
];

type Props = {
    fullName: string;
    initials: string;
};

const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export default function StudentNav({ fullName, initials }: Props) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);

    // Isara ang lahat kapag lumipat ng page
    useEffect(() => {
        setMenuOpen(false);
        setUserOpen(false);
    }, [pathname]);

    // Isara kapag pinindot ang Escape
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

    // Isara ang user dropdown kapag nag-click sa labas
    useEffect(() => {
        if (!userOpen) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as Element;
            // Huwag isara ang dropdown kapag nag-click sa confirm dialog
            if (target.closest?.('[role="dialog"], [role="alertdialog"], dialog')) return;
            if (userRef.current && !userRef.current.contains(target)) {
                setUserOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [userOpen]);

    return (
        <>
            <header className="bg-[#15664f] text-white">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    {/* Hamburger (kaliwa) */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={menuOpen}
                        aria-controls="student-drawer"
                        className={iconBtn}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M3 6h18M3 12h18M3 18h18" />
                        </svg>
                    </button>

                    {/* Mga icon (kanan) */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* User dropdown */}
                        <div className="relative" ref={userRef}>
                            <button
                                type="button"
                                onClick={() => setUserOpen((v) => !v)}
                                aria-label="Account menu"
                                aria-expanded={userOpen}
                                aria-haspopup="menu"
                                className={iconBtn}
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 21a8 8 0 0 1 16 0" />
                                </svg>
                            </button>

                            {(
                                <div
                                    role="menu"
                                    className={`absolute right-0 top-12 z-50 w-64 rounded-xl bg-white p-3 text-gray-800 shadow-xl ring-1 ring-black/5 ${userOpen ? "" : "hidden"}`}
                                >
                                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-sm font-bold text-white">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">{fullName}</p>
                                            <p className="text-xs text-gray-500">Student</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/student/profile"
                                        role="menuitem"
                                        className="mt-2 block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                                    >
                                        My Profile
                                    </Link>
                                    <form action={studentLogout} className="mt-1">
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
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Drawer (bubukas kapag pinindot ang hamburger) */}
            {menuOpen && (
                <div className="fixed inset-0 z-40">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setMenuOpen(false)}
                        className="absolute inset-0 bg-black/40"
                    />
                    <aside
                        id="student-drawer"
                        className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl"
                    >
                        <div className="flex h-16 items-center justify-between bg-[#15664f] px-4 text-white">
                            <Link
                                href="/student/dashboard"
                                aria-label="Go to Overview"
                                className="flex items-center gap-3"
                            >
                                <div className="rounded-full bg-white p-0.5">
                                    <Image
                                        src="/bcas.jpg"
                                        alt="BCAS logo"
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                    />
                                </div>
                                <span className="text-lg font-semibold">BCAS Clinic</span>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMenuOpen(false)}
                                aria-label="Close menu"
                                className={iconBtn}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </div>

                        <nav aria-label="Student navigation" className="flex flex-col gap-1 p-3">
                            {tabs.map((tab) => {
                                const active = pathname === tab.href;
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        aria-current={active ? "page" : undefined}
                                        className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
                                            ? "bg-[#15664f] text-white"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        {tab.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    );
}