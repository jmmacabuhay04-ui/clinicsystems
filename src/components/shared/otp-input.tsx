"use client";

import { useRef, useState } from "react";

// Code na hiwa-hiwalay na kahon (hal. 6 na kahon ng numero).
// - Kusang lilipat sa susunod na kahon pagka-type
// - Backspace: babalik sa naunang kahon
// - Paste ng buong code: mapupuno lahat ng kahon
// Ang buong code ay nasa nakatagong <input name={name}> para sa form.
export default function OtpInput({
    name = "code",
    length = 6,
    autoFocus = false,
    id,
    compact = false,
}: {
    name?: string;
    length?: number;
    autoFocus?: boolean;
    /** id ng unang kahon (para sa <label htmlFor>) */
    id?: string;
    /** Mas maliit na kahon (hal. sa loob ng card) */
    compact?: boolean;
}) {
    const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
    const boxes = useRef<(HTMLInputElement | null)[]>([]);

    const focusBox = (i: number) => {
        const el = boxes.current[Math.max(0, Math.min(length - 1, i))];
        el?.focus();
        el?.select();
    };

    // Ilagay ang mga numero simula sa kahon i (para sa pag-type at sa paste)
    const fillFrom = (i: number, text: string) => {
        const nums = text.replace(/\D/g, "").slice(0, length - i).split("");
        if (nums.length === 0) return;
        setDigits((d) => {
            const next = [...d];
            nums.forEach((n, k) => (next[i + k] = n));
            return next;
        });
        focusBox(i + nums.length);
    };

    return (
        // Grid na pantay ang hati: hindi lalampas sa lalagyan kahit makitid (hal. sa loob ng card)
        <div
            className={`grid w-full gap-1.5 ${compact ? "max-w-[18rem]" : "mx-auto max-w-[24rem] sm:gap-3"}`}
            style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
        >
            <input type="hidden" name={name} value={digits.join("")} />
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        boxes.current[i] = el;
                    }}
                    id={i === 0 ? id : undefined}
                    value={d}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    autoFocus={autoFocus && i === 0}
                    aria-label={`Digit ${i + 1} of ${length}`}
                    maxLength={length}
                    suppressHydrationWarning
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                            setDigits((s) => s.map((x, k) => (k === i ? "" : x)));
                            return;
                        }
                        // Kung may laman na ang kahon, ang bagong na-type ay nasa dulo
                        fillFrom(i, v.length > 1 && d ? v.replace(d, "") || v : v);
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        fillFrom(i, e.clipboardData.getData("text"));
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Backspace" && !d && i > 0) {
                            e.preventDefault();
                            setDigits((s) => s.map((x, k) => (k === i - 1 ? "" : x)));
                            focusBox(i - 1);
                        } else if (e.key === "ArrowLeft") {
                            e.preventDefault();
                            focusBox(i - 1);
                        } else if (e.key === "ArrowRight") {
                            e.preventDefault();
                            focusBox(i + 1);
                        }
                    }}
                    className={`w-full min-w-0 rounded-xl border-2 border-gray-300 p-0 bg-white text-center font-semibold text-gray-900 outline-none transition focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10 ${compact ? "h-11 text-xl" : "h-14 text-2xl sm:h-16 sm:text-3xl"
                        }`}
                />
            ))}
        </div>
    );
}