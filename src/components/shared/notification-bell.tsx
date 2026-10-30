"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";

export type BellItem = {
    label: string;
    hint: string;
    count: number;
    href: string;
    /** Kulay ng maliit na bilog sa kaliwa */
    tone: "green" | "amber";
};

// Bell sa itaas ng dashboard. Ang numero = kabuuan ng lahat ng kailangang asikasuhin.
// Pagka-click, may listahan (hal. Pending Case Reports, Dental Follow-ups) na may link.
export default function NotificationBell({ items }: { items: BellItem[] }) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const total = items.reduce((sum, i) => sum + i.count, 0);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (items.length === 0) return null;

    return (
        <div ref={boxRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={`${total} notification${total === 1 ? "" : "s"}`}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dcebe3] bg-white text-[#15664f] shadow-sm shadow-[#15664f]/5 hover:bg-[#eef6f2] ${open ? "bg-[#eef6f2]" : ""
                    }`}
            >
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {total > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-sm font-semibold leading-none text-[#10523f] ring-2 ring-[#e7f3e2]">
                        {total > 99 ? "99+" : total}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#dcebe3] bg-white shadow-xl shadow-[#15664f]/15"
                >
                    <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Notifications</p>
                    <ul className="py-1">
                        {items.map((i) => (
                            <li key={i.label}>
                                <Link
                                    href={i.href}
                                    role="menuitem"
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#f6faf8]"
                                >
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${i.tone === "amber" ? "bg-amber-400" : "bg-[#15664f]"
                                            }`}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-gray-900">{i.label}</span>
                                        <span className="block text-sm text-gray-600">{i.hint}</span>
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-semibold ${i.count > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {i.count}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}