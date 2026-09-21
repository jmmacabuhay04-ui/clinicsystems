"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

type Props = {
    href: string;
    title: string;
    message: string;
    confirmLabel?: string;
    className?: string;
    children: React.ReactNode;
};

export default function ConfirmLink({
    href,
    title,
    message,
    confirmLabel = "View",
    className,
    children,
}: Props) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    function handleConfirm() {
        setOpen(false);
        router.push(href);
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15664f]/10 text-[#15664f]">
                        <Eye className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="mt-1 break-words text-sm leading-relaxed text-gray-600">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        suppressHydrationWarning
                        className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        suppressHydrationWarning
                        className="h-10 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
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
                type="button"
                onClick={() => setOpen(true)}
                suppressHydrationWarning
                className={className}
            >
                {children}
            </button>

            {open && createPortal(modal, document.body)}
        </>
    );
}