"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import DentalModel from "./dental-model";

/**
 * Tooth field na may dropdown: pagka-click, lalabas ang Dental Model sa ilalim.
 * Puwede pa ring mag-type nang direkta (hal. "#16" o "Full mouth").
 * Laging naka-mount ang model (nakatago lang kapag sarado) para hindi mawala ang mga napili.
 */
export default function ToothPicker({
    defaultValue = "",
    name = "tooth",
    maxLength = 50,
    className = "",
}: {
    defaultValue?: string;
    name?: string;
    maxLength?: number;
    /** Class ng input (kapareho ng ibang field sa form) */
    className?: string;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    // Isara kapag nag-click sa labas o pinindot ang Esc
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={boxRef} className="relative">
            <div className="relative">
                <input
                    name={name}
                    defaultValue={defaultValue}
                    placeholder="e.g. #16 or Full mouth (or pick on the dental model)"
                    maxLength={maxLength}
                    autoComplete="off"
                    suppressHydrationWarning
                    onFocus={() => setOpen(true)}
                    className={`${className} pr-11`}
                />
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-label={open ? "Hide dental model" : "Show dental model"}
                    aria-expanded={open}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
            </div>

            {/* Dropdown: Dental Model */}
            <div
                className={`${open ? "" : "hidden"} absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border-2 border-[#cfe5d9] bg-white p-4 shadow-xl shadow-[#15664f]/15`}
            >
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-600">Click a tooth, then add it to the Tooth field.</p>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-9 shrink-0 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        Done
                    </button>
                </div>
                <DentalModel initialValue={defaultValue} inputName={name} />
            </div>
        </div>
    );
}