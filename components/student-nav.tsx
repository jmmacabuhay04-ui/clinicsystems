"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { studentLogout } from "@/app/student/login/actions";
import Image from "next/image";

const tabs = [
    { href: "/student/dashboard", label: "Overview" },
    { href: "/student/visits", label: "My Visits" },
    { href: "/student/vitals", label: "Vitals" },
    { href: "/student/profile", label: "Profile" },
];

type Props = {
    fullName: string;
    initials: string;
};

export default function StudentNav({ fullName, initials }: Props) {
    const pathname = usePathname();

    return (
        <header className="bg-[#15664f] text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="flex items-center gap-3">
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
                </div>

                <nav className="flex flex-wrap items-center gap-1">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-white text-[#15664f]" : "text-white/85 hover:bg-white/10"
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
                    <form action={studentLogout}>
                        <button
                            type="submit"
                            suppressHydrationWarning
                            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </div>
        </header>
    );
}