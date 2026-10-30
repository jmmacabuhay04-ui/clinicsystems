"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Text input na may listahan ng pagpipilian. Lumalabas sa baba; kapag kulang ang
// espasyo sa baba ng screen, sa itaas ng input ito lalabas.
// Puwedeng pumili sa listahan o mag-type ng sariling sagot.
//
// Ang listahan ay "nakalutang" (fixed, nasa document.body), kaya HINDI humahaba o
// gumagalaw ang page kapag bumukas ito, kahit lumampas ito sa ibaba ng card.
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

type Box = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

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
    const [box, setBox] = useState<Box | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Kalkulahin kung saan ilalagay ang listahan: sa baba o sa itaas ng input
    function measure() {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const below = window.innerHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const up = below < 200 && above > below;
        const maxHeight = Math.max(120, Math.min(240, up ? above : below));
        setBox(
            up
                ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4, maxHeight }
                : { left: rect.left, width: rect.width, top: rect.bottom + 4, maxHeight },
        );
    }

    function openList() {
        measure();
        setOpen(true);
    }

    // Habang bukas: sumunod sa input kapag nag-scroll o nag-resize ang page
    useLayoutEffect(() => {
        if (!open) return;
        measure();
        window.addEventListener("scroll", measure, true);
        window.addEventListener("resize", measure);
        return () => {
            window.removeEventListener("scroll", measure, true);
            window.removeEventListener("resize", measure);
        };
    }, [open]);

    // Isara kapag nag-click sa labas (hindi sa input at hindi sa listahan)
    useEffect(() => {
        if (!open) return;
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node;
            if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
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

    const list =
        open && box && matches.length > 0 ? (
            <ul
                ref={listRef}
                style={{
                    left: box.left,
                    width: box.width,
                    top: box.top,
                    bottom: box.bottom,
                    maxHeight: box.maxHeight,
                }}
                className="fixed z-50 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
                {matches.map((s) => (
                    <li key={s.value}>
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setValue(s.value);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#eef6f2] ${s.value === value ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900"
                                }`}
                        >
                            <span>{s.label ?? s.value}</span>
                            {s.label && <span className="shrink-0 text-sm text-gray-600">{s.value}</span>}
                        </button>
                    </li>
                ))}
            </ul>
        ) : null;

    return (
        <div ref={wrapRef} className="relative">
            <input
                name={name}
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    if (!open) openList();
                }}
                onFocus={openList}
                onKeyDown={(e) => {
                    if (e.key === "Escape" || e.key === "Tab") setOpen(false);
                }}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                autoComplete="off"
                suppressHydrationWarning
                className={className}
            />
            {list && createPortal(list, document.body)}
        </div>
    );
}