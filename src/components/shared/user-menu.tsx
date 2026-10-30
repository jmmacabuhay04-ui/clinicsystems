"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { logout } from "@/features/auth/login-actions";

// Pangalan + larawan sa itaas ng dashboard. Pagka-click, may maliit na menu:
// Account Settings at Sign out (may confirmation bago mag-sign out).
export default function UserMenu({
    displayName,
    roleName,
    avatar,
    initials,
}: {
    displayName: string;
    roleName: string;
    avatar?: string | null;
    initials: string;
}) {
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [pending, setPending] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    // Isara kapag nag-click sa labas o pinindot ang Esc
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

    const modal = confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setConfirm(false)}>
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <LogOut className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">Sign out</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">Are you sure you want to sign out?</p>
                    </div>
                </div>
                <form action={logout} onSubmit={() => setPending(true)} className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirm(false)}
                        className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        {pending ? "Signing out..." : "Sign out"}
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div ref={boxRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${displayName} account menu`}
                className={`flex items-center gap-2.5 rounded-full border border-[#dcebe3] bg-white p-1 shadow-sm sm:pr-3 shadow-[#15664f]/5 transition hover:bg-[#eef6f2] ${open ? "bg-[#eef6f2]" : ""
                    }`}
            >
                {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#15664f] text-sm font-semibold text-white">
                        {initials}
                    </span>
                )}
                <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm font-semibold text-gray-900">{displayName}</span>
                    <span className="block text-sm text-gray-600">{roleName}</span>
                </span>
                <ChevronDown className={`hidden h-4 w-4 text-gray-600 transition sm:block ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#dcebe3] bg-white py-1.5 shadow-xl shadow-[#15664f]/15"
                >
                    <div className="border-b border-gray-100 px-4 pb-2.5 pt-1.5">
                        <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                        <p className="text-sm text-gray-600">{roleName}</p>
                    </div>
                    <Link
                        href="/dashboard/settings"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="mt-1 flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                    >
                        <Settings className="h-4 w-4" />
                        Account Settings
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            setConfirm(true);
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}

            {modal && createPortal(modal, document.body)}
        </div>
    );
}