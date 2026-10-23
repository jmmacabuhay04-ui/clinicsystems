"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { changePassword, type PasswordState } from "@/features/settings/actions";
import PasswordInput from "@/components/shared/password-input";
import FlashMessage from "@/components/shared/flash-message";

const initialState: PasswordState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

export default function PasswordForm() {
    const [state, formAction, pending] = useActionState(changePassword, initialState);
    // Nadadagdagan bawat submit para lumabas ulit ang 3-second message.
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
                <span className="text-sm font-semibold text-gray-800">Current Password</span>
                <PasswordInput
                    name="current"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                />
            </label>

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">New Password</span>
                <PasswordInput
                    name="next"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClass}
                />
            </label>

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-800">Confirm New Password</span>
                <PasswordInput
                    name="confirm"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClass}
                />
            </label>

            <p className="text-xs text-gray-500">Use at least 8 characters. Mixing letters, numbers, and symbols is safer.</p>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:opacity-60 sm:w-auto"
            >
                <KeyRound className="h-4 w-4" />
                {pending ? "Updating..." : "Update Password"}
            </button>
        </form>
    );
}