"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentLogout } from "@/app/student/login/actions";
import Image from "next/image";
const tabs = [
    { href: "/student/dashboard", label: "Overview" },
    { href: "/student/visits", label: "My Visits" },
    { href: "/student/vitals", label: "Vitals" },
    { href: "/student/profile", label: "My Profile" },
];

type Props = {
    fullName: string;
    initials: string;
};

export default function StudentNav({ fullName, initials }: Props) {
    const pathname = usePathname();

    return (
        <header className="bg-[#15664f] text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-2">
                <div className="flex items-center gap-2">
                    <div className="rounded-full bg-white p-0.5">
                        <Image src="/bcas.jpg" alt="BCAS logo" width={28} height={28} className="rounded-full" />
                    </div>
                    <p className="font-semibold">BCAS Clinic</p>
                </div>
                <nav className="flex flex-wrap gap-1">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${active ? "bg-white/20 font-medium" : "text-white/85 hover:bg-white/10"
                                    }`}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-xs font-semibold">
                        {initials}
                    </div>
                    <span className="hidden text-sm sm:inline">{fullName}</span>
                    <form action={studentLogout}>
                        <button
                            type="submit"
                            className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </div>
        </header>
    );
}