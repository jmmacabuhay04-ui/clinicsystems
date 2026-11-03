"use client";

import { useActionState, useState } from "react";
import { Clock, Save, Smartphone } from "lucide-react";
import { saveSessionSettings, type SessionState } from "@/features/settings/actions";
import FlashMessage from "@/components/shared/flash-message";

const initialState: SessionState = {};

type Props = {
    twoFactor: boolean;
};

// Auto-logout: laging 15 minuto para sa lahat (health records ang laman ng system),
// kaya wala nang pagpipilian dito.
export default function SessionForm({ twoFactor }: Props) {
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

            <div className="flex items-start gap-3 rounded-lg border-2 border-[#cfe5d9] bg-[#f6faf8] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#15664f]">
                    <Clock className="h-4 w-4" />
                </span>
                <span>
                    <span className="block text-sm font-semibold text-gray-900">Auto-logout: 15 minutes</span>
                    <span className="block text-sm text-gray-600">
                        For security, you are signed out after 15 minutes of no activity.
                    </span>
                </span>
            </div>

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