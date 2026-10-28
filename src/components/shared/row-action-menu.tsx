"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical, Pencil } from "lucide-react";

// "⋮" na button sa dulo ng row ng table. Pagka-click, lalabas ang maliit na menu
// (hal. View Health Record, Edit Details). May confirmation bago pumunta sa page.
export type RowAction = {
    label: string;
    href: string;
    /** Pamagat at mensahe ng confirmation */
    title: string;
    message: string;
    confirmLabel?: string;
    icon?: "view" | "edit";
};

const ICONS = { view: Eye, edit: Pencil } as const;

export default function RowActionMenu({ actions, label = "Actions" }: { actions: RowAction[]; label?: string }) {
    const router = useRouter();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [pending, setPending] = useState<RowAction | null>(null);

    // Isara ang menu kapag nag-click sa labas, nag-scroll, o pinindot ang Esc
    useEffect(() => {
        if (!pos) return;
        const close = () => setPos(null);
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        document.addEventListener("mousedown", onDown);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [pos]);

    function toggle() {
        if (pos) return setPos(null);
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r) return;
        const width = 208;
        const height = actions.length * 44 + 12;
        // Sa itaas ng button lalabas kapag kulang ang espasyo sa ibaba
        const top = window.innerHeight - r.bottom < height + 8 ? r.top - height - 4 : r.bottom + 4;
        setPos({ top, left: Math.max(8, r.right - width) });
    }

    const menu = pos && (
        <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 w-52 overflow-hidden rounded-xl border border-[#dcebe3] bg-white py-1.5 shadow-xl shadow-[#15664f]/15"
        >
            {actions.map((a) => {
                const Icon = ICONS[a.icon ?? "view"];
                return (
                    <button
                        key={a.label}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setPos(null);
                            setPending(a);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        {a.label}
                    </button>
                );
            })}
        </div>
    );

    const PendingIcon = ICONS[pending?.icon ?? "view"];
    const modal = pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPending(null)}>
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15664f]/10 text-[#15664f]">
                        <PendingIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{pending.title}</h3>
                        <p className="mt-1 break-words text-sm leading-relaxed text-gray-600">{pending.message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setPending(null)}
                        className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const href = pending.href;
                            setPending(null);
                            router.push(href);
                        }}
                        className="h-10 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        {pending.confirmLabel ?? "Continue"}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={!!pos}
                suppressHydrationWarning
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-[#eef6f2] hover:text-[#15664f] ${pos ? "bg-[#eef6f2] text-[#15664f]" : ""
                    }`}
            >
                <MoreVertical className="h-5 w-5" />
            </button>
            {menu && createPortal(menu, document.body)}
            {modal && createPortal(modal, document.body)}
        </>
    );
}