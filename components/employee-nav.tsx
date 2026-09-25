"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { employeeLogout } from "@/app/employee/login/actions";
import ConfirmSubmit from "./confirm-submit";

const tabs = [
    { label: "Overview", href: "/employee/dashboard" },
    { label: "My Visits", href: "/employee/visits" },
    { href: "/employee/dental", label: "Dental" },
    { label: "Vitals", href: "/employee/vitals" },
    { label: "Profile", href: "/employee/profile" },
];

type Props = {
    fullName: string;
    initials: string;
};

export default function EmployeeNav({ fullName, initials }: Props) {
    const pathname = usePathname();

    return (
        <header className="bg-[#15664f] text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
                <Link
                    href="/employee/dashboard"
                    aria-label="Go to Overview"
                    className="flex items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
                >
                    <img
                        src="/bcas.jpg"
                        alt="BCAS"
                        className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1"
                    />
                    <span className="text-lg font-semibold">BCAS Clinic</span>
                </Link>

                <nav className="flex flex-wrap items-center gap-1">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-white text-[#15664f]" : "text-white/85 hover:bg-white/10"
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                        {initials}
                    </div>
                    <span className="hidden text-sm font-medium sm:inline">{fullName}</span>
                    <form action={employeeLogout}>
                        <ConfirmSubmit
                            title="Sign out"
                            message="Are you sure you want to sign out?"
                            confirmLabel="Sign out"
                            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                        >
                            Sign out
                        </ConfirmSubmit>
                    </form>
                </div>
            </div>
        </header>
    );
}