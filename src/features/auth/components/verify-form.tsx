"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyAndReset, type VerifyState } from "@/features/auth/verify-otp-actions";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import PasswordInput from "@/components/shared/password-input";
import { authButtonClass, authInputClass } from "./auth-shell";

const initialState: VerifyState = {};

const inputClass = authInputClass;
// Puting eye icon para kita sa madilim
const eyeWrap = "block [&_button]:text-white/60 [&_button:hover]:text-white";

export default function VerifyForm({ email }: { email: string }) {
    const [state, formAction, pending] = useActionState(verifyAndReset, initialState);

    if (state.success) {
        return (
            <div className="space-y-5">
                <p className="flex items-start gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/15 p-3 text-sm text-emerald-100">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {state.success}
                </p>
                <Link href="/login" className={authButtonClass}>
                    Go to Sign In
                </Link>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{state.error}</span>
                </div>
            )}

            <input type="hidden" name="email" value={email} />

            <div className="space-y-2">
                <label htmlFor="code" className="block text-sm font-medium text-white">
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
                    className={`${inputClass} text-center text-2xl font-semibold tracking-[0.5em] md:text-2xl`}
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-white">
                    New Password
                </label>
                <span className={eyeWrap}>
                    <PasswordInput
                        id="password"
                        name="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClass}
                    />
                </span>
            </div>

            <div className="space-y-2">
                <label htmlFor="confirm" className="block text-sm font-medium text-white">
                    Confirm New Password
                </label>
                <span className={eyeWrap}>
                    <PasswordInput
                        id="confirm"
                        name="confirm"
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className={inputClass}
                    />
                </span>
            </div>

            <button
                type="submit"
                disabled={pending}
                suppressHydrationWarning
                className={`${authButtonClass} mt-3`}
            >
                {pending ? "Verifying..." : "Reset Password"}
            </button>

            <p className="pt-2 text-center text-sm text-white/70">
                Didn&apos;t get the code?{" "}
                <Link href="/forgot-password" className="font-semibold text-amber-300 hover:underline">
                    Send again
                </Link>
            </p>
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-white/70 hover:text-amber-300">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
            </Link>
        </form>
    );
}