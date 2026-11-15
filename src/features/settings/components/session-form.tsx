"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clock, Save, Smartphone } from "lucide-react";
import { saveSessionSettings, type SessionState } from "@/features/settings/actions";
import FlashMessage from "@/components/shared/flash-message";

const initialState: SessionState = {};

type Props = {
    twoFactor: boolean;
    /** Naka-save na auto-logout (minuto). 5, 10 o 15 lang; iba = 15 */
    minutes?: number | null;
};

// Pagpipilian ng auto-logout. Maikli lang lahat kasi health records ang laman ng system.
const OPTIONS = [5, 10, 15] as const;

export default function SessionForm({ twoFactor, minutes }: Props) {
    const saved = OPTIONS.includes(minutes as (typeof OPTIONS)[number]) ? (minutes as number) : 15;
    const [chosen, setChosen] = useState<number>(saved);
    const [state, formAction, pending] = useActionState(saveSessionSettings, initialState);
    const [submitKey, setSubmitKey] = useState(0);

    return (
        <form
            action={(formData) => {
                setSubmitKey((k) => k + 1);
                formAction(formData);
            }}
            className="space-y-4"
        >
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}
            {state.success && !state.error && <FlashMessage key={submitKey}>{state.success}</FlashMessage>}

            <fieldset className="rounded-lg border-2 border-[#cfe5d9] bg-[#f6faf8] p-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#15664f]">
                        <Clock className="h-4 w-4" />
                    </span>
                    <span>
                        <legend className="block text-sm font-semibold text-gray-900">Auto-logout</legend>
                        <span className="block text-sm text-gray-600">
                            For security, you are signed out after {chosen} minutes of no activity.
                        </span>
                    </span>
                </div>

                {/* Dropdown: 5, 10 o 15 minuto */}
                <MinutesDropdown value={chosen} onChange={setChosen} />
            </fieldset>

            {/* Toggle switch (checkbox pa rin sa loob, kaya pareho ang pag-save) */}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border-2 border-[#cfe5d9] bg-[#f6faf8] p-4">
                <span className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#15664f]">
                        <Smartphone className="h-4 w-4" />
                    </span>
                    <span>
                        <span className="block text-sm font-semibold text-gray-900">Two-Factor Authentication</span>
                        <span className="block text-sm text-gray-600">Require an OTP code on each login</span>
                    </span>
                </span>
                <span className="relative inline-flex shrink-0">
                    <input
                        type="checkbox"
                        name="twoFactor"
                        defaultChecked={twoFactor}
                        suppressHydrationWarning
                        className="peer sr-only"
                    />
                    <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-[#15664f] peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/40" />
                    <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                </span>
            </label>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:opacity-60 sm:w-auto"
            >
                <Save className="h-4 w-4" />
                {pending ? "Saving..." : "Save Session Settings"}
            </button>
        </form>
    );
}

// Sariling dropdown (kapareho ng ibang filter sa system): puting listahan, green ang napili
function MinutesDropdown({ value, onChange }: { value: number; onChange: (m: number) => void }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    // Isara kapag nag-click sa labas o pinindot ang Esc
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={boxRef} className="relative mt-3 w-full sm:w-56">
            {/* Ito ang ipinapadala sa server */}
            <input type="hidden" name="sessionMinutes" value={value} />
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Auto-logout"
                onClick={() => setOpen((o) => !o)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-none hover:border-[#9fcdb6] focus-visible:border-[#15664f] focus-visible:ring-2 focus-visible:ring-[#15664f]/20"
            >
                <span>{value} minutes</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <ul
                    role="listbox"
                    className="absolute left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#dcebe3] bg-white py-1 shadow-lg shadow-[#15664f]/10"
                >
                    {OPTIONS.map((m) => {
                        const selected = m === value;
                        return (
                            <li key={m} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(m);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${selected ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900 hover:bg-[#f6faf8]"
                                        }`}
                                >
                                    <span>{m} minutes</span>
                                    {selected && <Check className="h-4 w-4 shrink-0" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}