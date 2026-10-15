"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { employeeLogout } from "@/app/employee/login/actions";
import Image from "next/image";
import ConfirmSubmit from "./confirm-submit";

const tabs = [
    { href: "/employee/dashboard", label: "Overview" },
    { href: "/employee/visits", label: "My Visits" },
    { href: "/employee/dental", label: "Dental" },
    { href: "/employee/vitals", label: "Vitals" },
    { href: "/employee/profile", label: "Profile" },
];

type Props = {
    fullName: string;
    initials: string;
};

export default function EmployeeNav({ fullName, initials }: Props) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Isara ang menu kapag lumipat ng page
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Isara ang menu kapag pinindot ang Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <header className="bg-[#15664f] text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:py-4">
                <Link
                    href="/employee/dashboard"
                    aria-label="Go to Overview"
                    className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
                >
                    <div className="rounded-full bg-white p-0.5">
                        <Image
                            src="/bcas.jpg"
                            alt="BCAS logo"
                            width={36}
                            height={36}
                            className="rounded-full"
                        />
                    </div>
                    <span className="text-lg font-semibold">BCAS Clinic</span>
                </Link>

                {/* Hamburger button (mobile lang) */}
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? "Close menu" : "Open menu"}
                    aria-expanded={open}
                    aria-controls="employee-menu"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 hover:bg-white/10 md:hidden"
                >
                    {open ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    )}
                </button>

                {/* Menu: dropdown sa mobile, normal na row sa desktop (md:contents) */}
                <div
                    id="employee-menu"
                    className={`${open ? "flex" : "hidden"} w-full flex-col gap-3 pt-1 md:contents`}
                >
                    <nav aria-label="Employee navigation" className="flex flex-col gap-1 md:flex-row md:items-center">
                        {tabs.map((tab) => {
                            const active = pathname === tab.href;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    aria-current={active ? "page" : undefined}
                                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:py-1.5 ${active ? "bg-white text-[#15664f]" : "text-white/85 hover:bg-white/10"
                                        }`}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3 md:justify-start md:border-0 md:pt-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                                {initials}
                            </div>
                            <span className="text-sm font-medium md:hidden lg:inline">{fullName}</span>
                        </div>
                        <form action={employeeLogout}>
                            <ConfirmSubmit
                                title="Sign out"
                                message="Are you sure you want to sign out?"
                                confirmLabel="Sign out"
                                className="whitespace-nowrap rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                            >
                                Sign out
                            </ConfirmSubmit>
                        </form>
                    </div>
                </div>
            </div>
        </header>
    );
}