"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
    message: string;
    title?: string;
    confirmLabel?: string;
    danger?: boolean;
    disabled?: boolean;
    className?: string;
    children: React.ReactNode;
};

export default function ConfirmButton({
    message,
    title = "Please confirm",
    confirmLabel = "Confirm",
    danger = false,
    disabled = false,
    className,
    children,
}: Props) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    const accent = danger ? "bg-red-600 hover:bg-red-700" : "bg-[#15664f] hover:bg-[#10523f]";
    const iconBg = danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600";

    function handleConfirm() {
        const form = anchorRef.current?.closest("form");
        if (form) {
            form.requestSubmit();
        }
        setOpen(false);
    }

    return (
        <>
            <button
                ref={anchorRef}
                type="button"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className={className}
                suppressHydrationWarning
            >
                {children}
            </button>

            {open ? (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                        backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                >
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className={`shrink-0 rounded-full p-2.5 ${iconBg}`}>
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">
                                    {message}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                suppressHydrationWarning
                                className={`h-10 rounded-lg px-5 text-sm font-semibold text-white ${accent}`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}