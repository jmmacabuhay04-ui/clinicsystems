"use client";

import { useActionState } from "react";
import { saveSessionSettings, type SessionState } from "./actions";

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

    return (
        <form action={formAction} className="max-w-md space-y-4">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}
            {state.success && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
            )}

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-700">Auto-logout after inactivity</span>
                <select
                    name="minutes"
                    defaultValue={minutes}
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f]"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex items-start justify-between gap-4 rounded-lg bg-[#f2efe9] p-4">
                <span>
                    <span className="block text-sm font-semibold text-gray-800">
                        Two-Factor Authentication
                    </span>
                    <span className="block text-xs text-gray-600">Require OTP on each login</span>
                </span>
                <input
                    type="checkbox"
                    name="twoFactor"
                    defaultChecked={twoFactor}
                    suppressHydrationWarning
                    className="mt-1 h-5 w-5 accent-[#15664f]"
                />
            </label>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="h-11 rounded-lg bg-[#15664f] px-5 font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
            >
                {pending ? "Saving..." : "Save Session Settings"}
            </button>
        </form>
    );
}