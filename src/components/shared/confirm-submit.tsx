"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Trash2 } from "lucide-react";

type Props = {
    title: string;
    message: string;
    confirmLabel?: string;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    /** "danger" = pula (hal. Delete). Kusang pula rin kapag may "Delete" sa confirmLabel. */
    tone?: "default" | "danger";
    children: React.ReactNode;
};

export default function ConfirmSubmit({
    title,
    message,
    confirmLabel = "Confirm",
    className,
    icon,
    disabled,
    tone,
    children,
}: Props) {
    const danger = tone ? tone === "danger" : /delete/i.test(confirmLabel);
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    function handleOpen() {
        const form = anchorRef.current?.closest("form");
        if (form && !form.reportValidity()) return;
        setOpen(true);
    }

    function handleConfirm() {
        const form = anchorRef.current?.closest("form");
        if (form) form.requestSubmit();
        setOpen(false);
    }

    const modal = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center whitespace-normal bg-black/40 p-4"
            onClick={() => setOpen(false)}
        >
            <div
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl"
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-100 text-red-600" : "bg-[#15664f]/10 text-[#15664f]"
                            }`}
                    >
                        {icon ?? (danger ? <Trash2 className="h-5 w-5" /> : <LogOut className="h-5 w-5" />)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="mt-1 break-words text-sm leading-relaxed text-gray-600">{message}</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        suppressHydrationWarning
                        className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        suppressHydrationWarning
                        className={`h-10 rounded-lg px-4 text-sm font-semibold text-white ${danger ? "bg-red-600 shadow-lg shadow-red-600/25 hover:bg-red-700" : "bg-[#15664f] hover:bg-[#10523f]"
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                onClick={handleOpen}
                disabled={disabled}
                suppressHydrationWarning
                className={className}
            >
                {children}
            </button>

            {open && createPortal(modal, document.body)}
        </>
    );
}