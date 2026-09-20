"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import PasswordInput from "@/components/password-input";

const initialState: PasswordState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

export default function PasswordForm() {
    const [state, formAction, pending] = useActionState(changePassword, initialState);

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
                <span className="text-sm font-semibold text-gray-700">Current Password</span>
                <PasswordInput
                    name="current"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                    className={inputClass}
                />
            </label>

            <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-gray-700">New Password</span>
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
                <span className="text-sm font-semibold text-gray-700">Confirm New Password</span>
                <PasswordInput
                    name="confirm"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className={inputClass}
                />
            </label>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="h-11 rounded-lg bg-[#15664f] px-5 font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
            >
                {pending ? "Updating..." : "Update Password"}
            </button>
        </form>
    );
}