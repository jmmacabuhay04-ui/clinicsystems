"use client";

import { useActionState, useState } from "react";
import { Save, Smartphone } from "lucide-react";
import { saveSessionSettings, type SessionState } from "@/features/settings/actions";
import FlashMessage from "@/components/shared/flash-message";

const initialState: SessionState = {};

const options = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 240, label: "4 hours" },
    { value: 480, label: "8 hours" },
];

type Props = {
    minutes: number;
    twoFactor: boolean;
};

export default function SessionForm({ minutes, twoFactor }: Props) {
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

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Auto-logout after inactivity</span>
                <select
                    name="minutes"
                    defaultValue={minutes}
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <span className="block text-xs text-gray-500">
                    You will be signed out automatically when idle for this long.
                </span>
            </label>

            {/* Toggle switch (checkbox pa rin sa loob, kaya pareho ang pag-save) */}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border-2 border-[#cfe5d9] bg-[#f6faf8] p-4">
                <span className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#15664f]">
                        <Smartphone className="h-4 w-4" />
                    </span>
                    <span>
                        <span className="block text-sm font-semibold text-gray-900">Two-Factor Authentication</span>
                        <span className="block text-xs text-gray-600">Require an OTP code on each login</span>
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