"use client";

import { useEffect, useRef, useState } from "react";

// Text input na may listahan ng pagpipilian na LAGING lumalabas sa baba.
// Puwedeng pumili sa listahan o mag-type ng sariling sagot.
export type Suggestion = { value: string; label?: string };

type Props = {
    name: string;
    suggestions: Suggestion[];
    defaultValue?: string;
    placeholder?: string;
    maxLength?: number;
    required?: boolean;
    className?: string;
};

export default function SuggestInput({
    name,
    suggestions,
    defaultValue = "",
    placeholder,
    maxLength,
    required,
    className,
}: Props) {
    const [value, setValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Isara kapag nag-click sa labas.
    useEffect(() => {
        if (!open) return;
        function onDocClick(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    const text = value.trim().toLowerCase();
    const matches = suggestions
        .filter(
            (s) =>
                !text ||
                s.value.toLowerCase().includes(text) ||
                (s.label ?? "").toLowerCase().includes(text),
        )
        .slice(0, 50);

    return (
        <div ref={wrapRef} className="relative">
            <input
                name={name}
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                autoComplete="off"
                suppressHydrationWarning
                className={className}
            />
            {open && matches.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {matches.map((s) => (
                        <li key={s.value}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    setValue(s.value);
                                    setOpen(false);
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-900 hover:bg-[#eef6f2]"
                            >
                                <span>{s.label ?? s.value}</span>
                                {s.label && <span className="shrink-0 text-xs text-gray-500">{s.value}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}