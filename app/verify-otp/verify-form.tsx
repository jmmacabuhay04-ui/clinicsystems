"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyAndReset, type VerifyState } from "./actions";
import PasswordInput from "@/components/password-input";

const initialState: VerifyState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20";

export default function VerifyForm({ email }: { email: string }) {
    const [state, formAction, pending] = useActionState(verifyAndReset, initialState);

    if (state.success) {
        return (
            <div className="mt-8 space-y-5">
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
                <Link
                    href="/login"
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0d6e56] font-semibold text-white hover:bg-[#0a5a46]"
                >
                    Go to Sign In
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className="mt-8 space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="email" value={email} />

            <div className="space-y-2">
                <label htmlFor="code" className="block text-sm font-semibold text-gray-700">
                    6-Digit Code
                </label>
                <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    required
                    suppressHydrationWarning
                    className={`${inputClass} text-center text-2xl font-semibold tracking-[0.5em]`}
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    New Password
                </label>
                <PasswordInput
                    id="password"
                    name="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-11 w-full rounded-lg border border-gray-300 pl-3 text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700">
                    Confirm New Password
                </label>
                <PasswordInput
                    id="confirm"
                    name="confirm"
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-11 w-full rounded-lg border border-gray-300 pl-3 text-gray-900 outline-none focus:border-[#0d6e56] focus:ring-2 focus:ring-[#0d6e56]/20"
                />
            </div>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className="h-11 w-full rounded-lg bg-[#0d6e56] font-semibold text-white transition-colors hover:bg-[#0a5a46] disabled:opacity-60"
            >
                {pending ? "Verifying..." : "Reset Password"}
            </button>

            <p className="pt-2 text-center text-sm text-gray-600">
                Didn&apos;t get the code?{" "}
                <Link href="/forgot-password" className="font-semibold text-[#0d6e56] hover:underline">
                    Send again
                </Link>
            </p>
        </form>
    );
}